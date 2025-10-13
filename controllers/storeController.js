const Store = require("../models/store");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse");

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
