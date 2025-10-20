const Lending = require('../models/lending');
const User = require('../models/user');
const Customer = require('../models/customer');
const Item = require('../models/item');
const { Warehouse } = require('../models');

const { Op } = require("sequelize");

exports.createLending = async (req, res) => {
  try {
    const { userId, customerId, itemId, quantity, warehouseId, lendingDate } = req.body;

    if (!userId || !itemId || !quantity || !warehouseId || !lendingDate) {
      return res.status(400).json({
        message: "userId, itemId, quantity, warehouseId, and lendingDate are required."
      });
    }

    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    await item.update({ quantity: item.quantity - quantity });

    const lending = await Lending.create({
      userId,
      customerId,
      itemId,
      quantity,
      warehouseId,
      lendingDate
    });

    res.status(201).json({
      message: "Lending created successfully and item stock updated",
      lending
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create lending",
      error: err.message
    });
  }
};

exports.getAllLendings = async (req, res) => {
  try {
    const lendings = await Lending.findAll({ 
        include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] },
        ],
    });
    res.json(lendings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingById = async (req, res) => {
  try {
    const lending = await Lending.findByPk(req.params.id);
    if (!lending) return res.status(404).json({ error: 'Lending not found' });
    res.json(lending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLending = async (req, res) => {
  try {
    const lending = await Lending.findByPk(req.params.id);
    if (!lending) return res.status(404).json({ error: 'Lending not found' });

    await lending.update(req.body);
    res.json(lending);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteLending = async (req, res) => {
  try {
    const lending = await Lending.findByPk(req.params.id);
    if (!lending) return res.status(404).json({ error: 'Lending not found' });

    await lending.destroy();
    res.json({ message: 'Lending deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingsByUser = async (req, res) => {
  try {
    const lendings = await Lending.findAll({ where: { userId: req.params.userId } });
    res.json(lendings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingsByCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const lendings = await Lending.findAll({
      where: { customerId },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] },
      ],
    });
    res.status(200).json(lendings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lendings by customer", error: error.message });
  }
};

exports.getLendingsByWarehouse = async (req, res) => {
  try {
    const lendings = await Lending.findAll({ where: { warehouseId: req.params.warehouseId }, 
          include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"]},
      ],
    });
    res.json(lendings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingsByItem = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const lendings = await Lending.findAll({
      where: { itemId },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Warehouse, attributes: ["id", "name"]},
      ],
    });
    res.status(200).json(lendings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lendings by item", error: error.message });
  }
};


exports.getLendingReportByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, userId, customerId, itemId, warehouseId } = req.body;

    const whereClause = {};

    // Optional foreign key filters
    if (userId) whereClause.userId = userId;
    if (customerId) whereClause.customerId = customerId;
    if (itemId) whereClause.itemId = itemId;
    if (warehouseId) whereClause.warehouseId = warehouseId;

    // Optional date filters
    if (startDate) {
      const start = new Date(startDate);
      whereClause.lendingDate = { [Op.gte]: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      if (whereClause.lendingDate) {
        whereClause.lendingDate[Op.lt] = end;
      } else {
        whereClause.lendingDate = { [Op.lt]: end };
      }
    }

    // Fetch filtered data
    const lendings = await Lending.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
      order: [["lendingDate", "ASC"]],
    });

    // Summary
    const totalQuantity = lendings.reduce(
      (sum, lend) => sum + parseInt(lend.quantity || 0),
      0
    );

    // Format report
    const report = lendings.map((l) => ({
      id: l.id,
      user: l.User?.fullName,
      customer: l.Customer?.name,
      item: l.Item?.name,
      warehouse: l.Warehouse?.name,
      quantity: l.quantity,
      lendingDate: l.lendingDate,
    }));

    res.status(200).json({
      totalQuantity,
      count: lendings.length,
      report,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to generate lending report", error: error.message });
  }
};

