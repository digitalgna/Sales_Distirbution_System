const { Return, Item, User, Warehouse } = require("../models");
const { Op } = require("sequelize");


exports.createReturn = async (req, res) => {
  try {
    const newReturn = await Return.create(req.body);
    return res.status(201).json({ message: "Return created successfully", data: newReturn });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create return", error: error.message });
  }
};


exports.getAllReturns = async (req, res) => {
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


exports.getReturnById = async (req, res) => {
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


exports.updateReturn = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ message: "Return not found" });

    await ret.update(req.body);
    return res.status(200).json({ message: "Return updated successfully", data: ret });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update return", error: error.message });
  }
};

// ✅ DELETE RETURN
exports.deleteReturn = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ message: "Return not found" });

    await ret.destroy();
    return res.status(200).json({ message: "Return deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete return", error: error.message });
  }
};

// --- Additional Functionalities ---

// Return by itemId
exports.getReturnsByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const returns = await Return.findAll({ where: { itemId } });

    if (!returns.length) {
      return res.status(404).json({ message: "No returns found for this item" });
    }

    res.status(200).json(returns);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Return by userId
exports.getReturnsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const returns = await Return.findAll({ where: { userId } });

    if (!returns.length) {
      return res.status(404).json({ message: "No returns found for this user" });
    }

    res.status(200).json(returns);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Return by warehouseId
exports.getReturnsByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const returns = await Return.findAll({ where: { warehouseId } });

    if (!returns.length) {
      return res.status(404).json({ message: "No returns found for this warehouse" });
    }

    res.status(200).json(returns);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- Report by date range ---
exports.getReturnReportByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Please provide startDate and endDate" });
    }

    const returns = await Return.findAll({
      where: {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
      },
      order: [["createdAt", "DESC"]],
    });

    if (!returns.length) {
      return res.status(404).json({ message: "No returns found in this date range" });
    }

    res.status(200).json({
      message: "Return report generated successfully",
      count: returns.length,
      data: returns,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};