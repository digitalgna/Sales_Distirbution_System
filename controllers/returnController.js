const Return = require("../models/return");
const Item = require("../models/item");
const User = require("../models/user");
const Warehouse = require("../models/wharehouse");

// ✅ CREATE RETURN
exports.createReturn = async (req, res) => {
  try {
    const { itemId, returnQuantity, reason, userId, warehouseId, type, description } = req.body;

    // Basic validation
    if (!itemId || !returnQuantity || !userId || !warehouseId || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check related models
    const item = await Item.findByPk(itemId);
    const user = await User.findByPk(userId);
    const warehouse = await Warehouse.findByPk(warehouseId);

    if (!item || !user || !warehouse) {
      return res.status(404).json({ message: "Item, User, or Warehouse not found" });
    }

    const newReturn = await Return.create({
      itemId,
      returnQuantity,
      reason,
      userId,
      warehouseId,
      type,
      description,
      status: 'pending'
    });

    res.status(201).json({ message: "Return created successfully", data: newReturn });
  } catch (error) {
    console.error("Error creating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL RETURNS
exports.getReturns = async (req, res) => {
  try {
    const { itemId, userId, warehouseId, type, status } = req.query;
    const where = {};

    if (itemId) where.itemId = itemId;
    if (userId) where.userId = userId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (status) where.status = status;

    const returns = await Return.findAll({
      where,
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(returns);
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE RETURN
exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = await Return.findByPk(id, {
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullname"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });

    if (!returnRecord) return res.status(404).json({ message: "Return not found" });

    res.status(200).json(returnRecord);
  } catch (error) {
    console.error("Error fetching return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE RETURN
exports.updateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const returnRecord = await Return.findByPk(id);
    if (!returnRecord) return res.status(404).json({ message: "Return not found" });

    await returnRecord.update(updates);
    res.status(200).json({ message: "Return updated successfully", data: returnRecord });
  } catch (error) {
    console.error("Error updating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE RETURN
exports.deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = await Return.findByPk(id);
    if (!returnRecord) return res.status(404).json({ message: "Return not found" });

    await returnRecord.destroy();
    res.status(200).json({ message: "Return deleted successfully" });
  } catch (error) {
    console.error("Error deleting return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
