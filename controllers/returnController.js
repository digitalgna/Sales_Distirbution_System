const Return = require("../models/return");
const Item = require("../models/item");
const User = require("../models/user");
const Warehouse = require("../models/wharehouse");
const Store = require("../models/store");
const { Op } = require("sequelize");


exports.createReturn = async (req, res) => {
  try {
    const { itemId, returnQuantity, reason, userId, warehouseId, type, description, returnDate } = req.body;

    // Basic validation
    if (!itemId || !returnQuantity || !userId || !warehouseId ) {
      return res.status(400).json({ message: "itemId, returnQuantity, reason, warehouseId are require" });
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
      status: 'pending',
      returnDate
    });

    res.status(201).json({ message: "Return created successfully", data: newReturn });
  } catch (error) {
    console.error("Error creating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


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

exports.getReturnsByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const returns = await Return.findAll({
      where: { userId },
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!returns || returns.length === 0) {
      return res.status(404).json({ message: "No returns found for this user." });
    }

    const cleanedReturns = returns.map((r) => {
      const { itemId, userId, warehouseId, createdAt, updatedAt, ...rest } = r.toJSON();
      return rest;
    });

    res.status(200).json(cleanedReturns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.updateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const returnRecord = await Return.findByPk(id);
    if (!returnRecord) 
      return res.status(404).json({ message: "Return not found" });

    // Only update store if status is changed to "approved"
    const statusChangedToApproved =
      updates.status === "approved" && returnRecord.status !== "approved";

    await returnRecord.update(updates);

    if (statusChangedToApproved) {
      // Find store record for this item and warehouse
      const store = await Store.findOne({
        where: {
          itemId: returnRecord.itemId,
          warehouseId: returnRecord.warehouseId,
        },
      });

      if (store) {
        // Add returnQuantity to store quantity
        store.quantity += returnRecord.returnQuantity;
        await store.save();
      } else {
        // Optional: create store record if it doesn't exist
        await Store.create({
          itemId: returnRecord.itemId,
          warehouseId: returnRecord.warehouseId,
          quantity: returnRecord.returnQuantity,
        });
      }
    }

    res.status(200).json({ message: "Return updated successfully", data: returnRecord });
  } catch (error) {
    console.error("Error updating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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

exports.getReturnReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      itemId,
      warehouseId,
      type,
      status
    } = req.body;

    const whereClause = {};

    // Optional filters
    if (userId) whereClause.userId = userId;
    if (itemId) whereClause.itemId = itemId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    // Optional date filters
    if (startDate) {
      const start = new Date(startDate);
      whereClause.returnDate = { [Op.gte]: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      if (whereClause.returnDate) {
        whereClause.returnDate[Op.lt] = end;
      } else {
        whereClause.returnDate = { [Op.lt]: end };
      }
    }

    // Fetch returns with associations
    const returns = await Return.findAll({
      where: whereClause,
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
      order: [["returnDate", "DESC"]],
    });

    // Summary
    const totalReturnedQty = returns.reduce(
      (sum, r) => sum + parseInt(r.returnQuantity || 0),
      0
    );

    // Format data
    const report = returns.map((r) => ({
      id: r.id,
      item: r.Item?.name,
      user: r.User?.fullName,
      warehouse: r.Warehouse?.name,
      type: r.type,
      status: r.status,
      reason: r.reason,
      description: r.description,
      returnQuantity: r.returnQuantity,
      returnDate: r.returnDate,
    }));

    res.status(200).json({
      totalReturnedQty,
      count: returns.length,
      report,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to generate return report",
      error: error.message,
    });
  }
};
