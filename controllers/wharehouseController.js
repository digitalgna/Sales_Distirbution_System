const { Op } = require("sequelize");
const { Warehouse, User, Item, Store, Lending, Purchase, Stockout, Return } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

// ✅ CREATE WAREHOUSE
const createWarehouse = async (req, res) => {
  try {
    const { name, address, size } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Warehouse name is required" });
    }

    const newWarehouse = await Warehouse.create({ name, address, size });
    res.status(201).json({ message: "Warehouse created successfully", data: newWarehouse });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL WAREHOUSES
const getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json(warehouses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE WAREHOUSE
const getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(id);

    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    res.status(200).json(warehouse);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE WAREHOUSE
const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    await warehouse.update(updates);
    res.status(200).json({ message: "Warehouse updated successfully", data: warehouse });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE WAREHOUSE
const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    await warehouse.destroy();
    res.status(200).json({ message: "Warehouse deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//===================== ADDITIONAL FUNCTIONALITIES ======================

// Check warehouse capacity utilization
const checkWarehouseCapacity = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Fetch total items in warehouse
    const storeItems = await Store.findAll({
      where: { warehouseId },
      include: [{ model: Item, attributes: ["name"] }],
      attributes: [[sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"]],
      raw: true,
    });

    const totalItems = storeItems[0]?.totalQuantity || 0;
    const capacity = parseFloat(warehouse.size) || 1000; // Assume size is in units, default to 1000 if not numeric

    // Calculate utilization percentage
    const utilization = (totalItems / capacity) * 100;

    return res.status(200).json({
      warehouse: warehouse.name,
      totalItems,
      capacity,
      utilization: utilization.toFixed(2) + "%",
    });
  } catch (error) {
    console.error("Error checking warehouse capacity:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Assign users to a warehouse
const assignUsersToWarehouse = async (req, res) => {
  try {
    const { warehouseId, userIds } = req.body;

    // Validate inputs
    if (!warehouseId || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "warehouseId and non-empty userIds array are required" });
    }

    // Verify warehouse exists
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Verify users exist
    const users = await User.findAll({ where: { id: { [Op.in]: userIds } } });
    if (users.length !== userIds.length) {
      return res.status(404).json({ error: "One or more users not found" });
    }

    // Update users' warehouseId
    await User.update(
      { warehouseId },
      { where: { id: { [Op.in]: userIds } } }
    );

    // Notify users (optional)
    for (const user of users) {
      await sendEmail({
        to: user.email,
        subject: "Warehouse Assignment",
        text: `You have been assigned to warehouse: ${warehouse.name}.`,
      });
    }

    return res.status(200).json({ message: `Users assigned to warehouse ${warehouse.name}` });
  } catch (error) {
    console.error("Error assigning users to warehouse:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Generate warehouse inventory overview
const getWarehouseInventoryOverview = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Fetch inventory details
    const inventory = await Store.findAll({
      where: { warehouseId },
      include: [
        { model: Item, attributes: ["name", "categoryId"], include: [{ model: Category, attributes: ["name"] }] },
      ],
      attributes: ["quantity"],
    });

    // Calculate total stock value (assuming Item has a price field)
    const totalValue = await Store.findAll({
      where: { warehouseId },
      include: [{ model: Item, attributes: ["price"] }],
      attributes: [[sequelize.fn("SUM", sequelize.literal("Store.quantity * Item.price")), "totalValue"]],
      raw: true,
    });

    return res.status(200).json({
      warehouse: warehouse.name,
      inventory,
      totalItems: inventory.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: totalValue[0]?.totalValue || 0,
    });
  } catch (error) {
    console.error("Error generating warehouse inventory overview:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Log warehouse activity (purchases, stockouts, lendings, returns)
const getWarehouseActivityLog = async (req, res) => {
  try {
    const { warehouseId, startDate, endDate } = req.query;

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Build date filter
    const dateFilter = startDate && endDate ? { createdAt: { [Op.between]: [new Date(startDate), new Date(endDate)] } } : {};

    // Fetch activities
    const purchases = await Purchase.findAll({
      where: { warehouseId, ...dateFilter },
      include: [{ model: Item, attributes: ["name"] }],
      attributes: ["id", "quantity", "createdAt"],
    });

    const stockouts = await Stockout.findAll({
      where: { warehouseId, ...dateFilter },
      include: [{ model: Item, attributes: ["name"] }],
      attributes: ["id", "amount", "sponsor", "createdAt"],
    });

    const lendings = await Lending.findAll({
      where: { warehouseId, ...dateFilter },
      include: [{ model: Item, attributes: ["name"] }],
      attributes: ["id", "quantity", "createdAt"],
    });

    const returns = await Return.findAll({
      where: { warehouseId, ...dateFilter },
      include: [{ model: Item, attributes: ["name"] }],
      attributes: ["id", "quantity", "createdAt"],
    });

    return res.status(200).json({
      warehouse: warehouse.name,
      activities: {
        purchases: purchases.map(p => ({ type: "Purchase", id: p.id, item: p.Item.name, quantity: p.quantity, date: p.createdAt })),
        stockouts: stockouts.map(s => ({ type: "Stockout", id: s.id, item: s.Item.name, amount: s.amount, sponsor: s.sponsor, date: s.createdAt })),
        lendings: lendings.map(l => ({ type: "Lending", id: l.id, item: l.Item.name, quantity: l.quantity, date: l.createdAt })),
        returns: returns.map(r => ({ type: "Return", id: r.id, item: r.Item.name, quantity: r.quantity, date: r.createdAt })),
      },
    });
  } catch (error) {
    console.error("Error fetching warehouse activity log:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Monitor warehouse health (e.g., critical stock or capacity issues)
const monitorWarehouseHealth = async (req, res) => {
  try {
    const { warehouseId, stockThreshold = 10, capacityThreshold = 90 } = req.query; // Configurable thresholds

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Check low stock items
    const lowStockItems = await Store.findAll({
      where: { warehouseId, quantity: { [Op.lt]: stockThreshold } },
      include: [{ model: Item, attributes: ["name"] }],
    });

    // Check capacity utilization
    const storeItems = await Store.findAll({
      where: { warehouseId },
      attributes: [[sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"]],
      raw: true,
    });
    const totalItems = storeItems[0]?.totalQuantity || 0;
    const capacity = parseFloat(warehouse.size) || 1000;
    const utilization = (totalItems / capacity) * 100;

    // Send alerts if issues detected
    let alerts = [];
    if (lowStockItems.length > 0) {
      alerts.push(`Low stock detected: ${lowStockItems.length} items below ${stockThreshold} units.`);
    }
    if (utilization > capacityThreshold) {
      alerts.push(`High capacity utilization: ${utilization.toFixed(2)}% (threshold: ${capacityThreshold}%).`);
    }

    // Notify users if alerts exist
    if (alerts.length > 0) {
      const users = await User.findAll({ where: { warehouseId }, attributes: ["email"] });
      for (const user of users) {
        await sendEmail({
          to: user.email,
          subject: "Warehouse Health Alert",
          text: `Issues in warehouse ${warehouse.name}:\n${alerts.join("\n")}`,
        });
      }
    }

    return res.status(200).json({
      warehouse: warehouse.name,
      lowStockItems,
      capacityUtilization: utilization.toFixed(2) + "%",
      alerts,
    });
  } catch (error) {
    console.error("Error monitoring warehouse health:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  checkWarehouseCapacity,
  assignUsersToWarehouse,
  getWarehouseInventoryOverview,
  getWarehouseActivityLog,
  monitorWarehouseHealth,
};