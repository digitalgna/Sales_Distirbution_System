const { Return, Item, User, Warehouse } = require("../models");
const { Op } = require("sequelize");

/**
 * Create a new return entry
 * Expected body: { itemId, returnQuantity, reason, userId, warehouseId, type, description }
 */
const createReturn = async (req, res) => {
  try {
    const newReturn = await Return.create(req.body);
    return res.status(201).json({ message: "Return created successfully", data: newReturn });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create return", error: error.message });
  }
};

/**
 * Get all return entries
 * Optional query params: status, type, warehouseId, userId
 */
const getAllReturns = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.type) filters.type = req.query.type;
    if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId;
    if (req.query.userId) filters.userId = req.query.userId;

    const returns = await Return.findAll({
      where: filters,
      include: [
        { model: Item, as: "item", attributes: ["id", "name"] },
        { model: User, as: "user", attributes: ["id", "fullName"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ data: returns });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch returns", error: error.message });
  }
};

/**
 * Get a single return entry by ID
 */
const getReturnById = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id, {
      include: [
        { model: Item, as: "item", attributes: ["id", "name"] },
        { model: User, as: "user", attributes: ["id", "fullName"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name"] },
      ],
    });

    if (!ret) return res.status(404).json({ message: "Return not found" });
    return res.status(200).json({ data: ret });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch return", error: error.message });
  }
};

/**
 * Update a return entry
 * Can update: returnQuantity, reason, status, description
 */
const updateReturn = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ message: "Return not found" });

    await ret.update(req.body);
    return res.status(200).json({ message: "Return updated successfully", data: ret });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update return", error: error.message });
  }
};

/**
 * Delete a return entry
 */
const deleteReturn = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ message: "Return not found" });

    await ret.destroy();
    return res.status(200).json({ message: "Return deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete return", error: error.message });
  }
};

/**
 * Approve or reject a return
 * Expected body: { status: 'approved' | 'rejected' }
 */
const changeReturnStatus = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ message: "Return not found" });

    const { status } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    await ret.update({ status });
    return res.status(200).json({ message: `Return ${status}`, data: ret });
  } catch (error) {
    return res.status(500).json({ message: "Failed to change return status", error: error.message });
  }
};

/**
 * Reporting: Get return summary grouped by warehouse and/or item
 * Optional query params: warehouseId, itemId, status, type, startDate, endDate
 */
const getReturnReport = async (req, res) => {
  try {
    const { warehouseId, itemId, status, type, startDate, endDate } = req.query;
    const filters = {};

    if (warehouseId) filters.warehouseId = warehouseId;
    if (itemId) filters.itemId = itemId;
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt[Op.gte] = new Date(startDate);
      if (endDate) filters.createdAt[Op.lte] = new Date(endDate);
    }

    const report = await Return.findAll({
      where: filters,
      attributes: [
        "itemId",
        "warehouseId",
        "status",
        "type",
        [sequelize.fn("SUM", sequelize.col("returnQuantity")), "totalQuantity"],
      ],
      include: [
        { model: Item, as: "item", attributes: ["id", "name"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name"] },
      ],
      group: ["itemId", "warehouseId", "status", "type", "item.id", "warehouse.id"],
    });

    return res.status(200).json({ data: report });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate return report", error: error.message });
  }
};

module.exports = {
  createReturn,
  getAllReturns,
  getReturnById,
  updateReturn,
  deleteReturn,
  changeReturnStatus,
  getReturnReport,
};
