const { Op } = require("sequelize");
const { Store, Item, Warehouse, User } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

// ✅ CREATE STORE RECORD
exports.createStore = async (req, res) => {
  try {
    const { itemId, warehouseId, quantity } = req.body;

    if (!itemId || !warehouseId) {
      return res.status(400).json({ message: "ItemId and WarehouseId are required" });
    }

    const item = await Item.findByPk(itemId);
    const warehouse = await Warehouse.findByPk(warehouseId);

    if (!item || !warehouse) {
      return res.status(404).json({ message: "Item or Warehouse not found" });
    }

    const newStore = await Store.create({
      itemId,
      warehouseId,
      quantity: quantity || 0
    });

    res.status(201).json({ message: "Store record created successfully", data: newStore });
  } catch (error) {
    console.error("Error creating store:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL STORE RECORDS
exports.getStores = async (req, res) => {
  try {
    const { itemId, warehouseId } = req.query;
    const where = {};

    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;

    const stores = await Store.findAll({
      where,
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE STORE RECORD
exports.getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findByPk(id, {
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });

    if (!store) return res.status(404).json({ message: "Store record not found" });

    res.status(200).json(store);
  } catch (error) {
    console.error("Error fetching store:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE STORE RECORD
exports.updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const store = await Store.findByPk(id);
    if (!store) return res.status(404).json({ message: "Store record not found" });

    await store.update(updates);
    res.status(200).json({ message: "Store updated successfully", data: store });
  } catch (error) {
    console.error("Error updating store:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE STORE RECORD
exports.deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findByPk(id);
    if (!store) return res.status(404).json({ message: "Store record not found" });

    await store.destroy();
    res.status(200).json({ message: "Store record deleted successfully" });
  } catch (error) {
    console.error("Error deleting store:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ====================== ADDITIONAL FUNCTIONALITIES ======================

// Adjust stock quantity (e.g., for manual corrections or reconciliations)
exports.adjustStockQuantity = async (req, res) => {
  try {
    const { itemId, warehouseId, adjustment, reason } = req.body;

    // Validate required fields
    if (!itemId || !warehouseId || !adjustment || !reason) {
      return res.status(400).json({ error: "itemId, warehouseId, adjustment, and reason are required" });
    }

    // Find store record
    const store = await Store.findOne({ where: { itemId, warehouseId } });
    if (!store) {
      return res.status(404).json({ error: "Stock not found for item in warehouse" });
    }

    // Validate adjustment
    const newQuantity = store.quantity + adjustment;
    if (newQuantity < 0) {
      return res.status(400).json({ error: "Adjustment would result in negative stock" });
    }

    // Update quantity
    store.quantity = newQuantity;
    await store.save();

    // Log adjustment (could be stored in a separate audit log table)
    // For simplicity, returning reason in response
    return res.status(200).json({
      message: "Stock quantity adjusted successfully",
      newQuantity,
      reason,
    });
  } catch (error) {
    console.error("Error adjusting stock quantity:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Check and alert for low stock levels
exports.checkLowStock = async (req, res) => {
  try {
    const { warehouseId, threshold = 10 } = req.query; // Configurable threshold

    // Build where clause
    const where = { quantity: { [Op.lt]: threshold } };
    if (warehouseId) where.warehouseId = warehouseId;

    // Find low stock items
    const lowStockItems = await Store.findAll({
      where,
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
      ],
    });

    // If low stock items found, notify relevant users
    if (lowStockItems.length > 0) {
      const users = await User.findAll({
        where: { warehouseId: { [Op.in]: lowStockItems.map((s) => s.warehouseId) } },
        attributes: ["email"],
      });

      for (const item of lowStockItems) {
        for (const user of users) {
          await sendEmail({
            to: user.email,
            subject: "Low Stock Alert",
            text: `Stock for item ${item.Item.name} in warehouse ${item.Warehouse.name} is low: ${item.quantity} units remaining.`,
          });
        }
      }
    }

    return res.status(200).json({
      message: "Low stock check completed",
      lowStockItems,
    });
  } catch (error) {
    console.error("Error checking low stock:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Transfer stock between warehouses
exports.transferStock = async (req, res) => {
  try {
    const { itemId, fromWarehouseId, toWarehouseId, quantity } = req.body;

    // Validate required fields
    if (!itemId || !fromWarehouseId || !toWarehouseId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: "itemId, fromWarehouseId, toWarehouseId, and valid quantity are required" });
    }

    // Check if source and destination warehouses are different
    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ error: "Source and destination warehouses must be different" });
    }

    // Find source store
    const sourceStore = await Store.findOne({ where: { itemId, warehouseId: fromWarehouseId } });
    if (!sourceStore || sourceStore.quantity < quantity) {
      return res.status(400).json({ error: "Insufficient stock in source warehouse" });
    }

    // Find or create destination store
    let destinationStore = await Store.findOne({ where: { itemId, warehouseId: toWarehouseId } });
    if (!destinationStore) {
      destinationStore = await Store.create({
        itemId,
        warehouseId: toWarehouseId,
        quantity: 0,
      });
    }

    // Update quantities
    sourceStore.quantity -= quantity;
    destinationStore.quantity += quantity;

    // Save changes in a transaction
    await sequelize.transaction(async (t) => {
      await sourceStore.save({ transaction: t });
      await destinationStore.save({ transaction: t });
    });

    return res.status(200).json({ message: "Stock transferred successfully" });
  } catch (error) {
    console.error("Error transferring stock:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Generate stock summary report
exports.generateStockSummary = async (req, res) => {
  try {
    const { warehouseId, itemId } = req.query;

    // Build where clause
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;

    // Fetch stock summary
    const summary = await Store.findAll({
      where,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"],
        [sequelize.fn("COUNT", sequelize.col("id")), "itemCount"],
      ],
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
      ],
      group: ["itemId", "warehouseId", "Item.name", "Warehouse.name"],
      raw: true,
    });

    return res.status(200).json(summary);
  } catch (error) {
    console.error("Error generating stock summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Track stock history for auditing
exports.getStockHistory = async (req, res) => {
  try {
    const { itemId, warehouseId } = req.query;

    // Build where clause
    const where = {};
    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;

    // Fetch stock history (including updates)
    const history = await Store.findAll({
      where,
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching stock history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

