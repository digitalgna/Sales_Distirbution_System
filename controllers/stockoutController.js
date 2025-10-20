const sequelize = require("../config/db");
const Stockout = require("../models/stockout");
const Store = require("../models/store");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse");
const User = require("../models/user");
const Car = require("../models/carInfo");
const { Op } = require("sequelize");


exports.createStockout = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { itemId, carId, userId, warehouseId, amount, sponsor, bonus, status } = req.body;
    const store = await Store.findOne({
      where: { itemId, warehouseId },
      transaction: t,
    });

    if (!store) {
      await t.rollback();
      return res.status(404).json({ message: "Item not found in this warehouse store" });
    }

    if (store.quantity < amount) {
      await t.rollback();
      return res.status(400).json({ message: "Insufficient stock in store" });
    }

    const stockout = await Stockout.create(
      {
        itemId,
        carId,
        userId,
        warehouseId,
        amount,
        sponsor,
        bonus,
        status: status || "pending",
      },
      { transaction: t }
    );

    if (status === "approved") {
      store.quantity = parseInt(store.quantity) - parseInt(amount);
      await store.save({ transaction: t });
    }

    await t.commit();
    res.status(201).json(stockout);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// Get all stockouts
exports.getAllStockouts = async (req, res) => {
  try {
    const stockouts = await Stockout.findAll({
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json(stockouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get stockout by ID
exports.getStockoutById = async (req, res) => {
  try {
    const stockout = await Stockout.findByPk(req.params.id, {
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: User,  attributes: ["id", "fullName"] },
      ],
    });

    if (!stockout) return res.status(404).json({ message: "Stockout not found" });
    res.status(200).json(stockout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update stockout
exports.updateStockout = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const stockout = await Stockout.findByPk(req.params.id);
    if (!stockout) return res.status(404).json({ message: "Stockout not found" });

    if (stockout.status !== "pending") {
      return res.status(400).json({ message: "Cannot modify approved/rejected stockouts" });
    }

    await stockout.update(req.body, { transaction: t });
    await t.commit();
    res.json(stockout);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

// Delete stockout
exports.deleteStockout = async (req, res) => {
  try {
    const stockout = await Stockout.findByPk(req.params.id);
    if (!stockout) return res.status(404).json({ message: "Stockout not found" });

    await stockout.destroy();
    res.json({ message: "Stockout deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStockoutStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body; // "approved" or "rejected"
    const stockout = await Stockout.findByPk(req.params.id);

    if (!stockout) return res.status(404).json({ message: "Stockout not found" });

    if (stockout.status !== "pending") {
      return res.status(400).json({ message: "Status already processed" });
    }

    if (status === "approved") {
      const store = await Store.findOne({
        where: { itemId: stockout.itemId, warehouseId: stockout.warehouseId },
        transaction: t,
      });

      if (!store || store.quantity < stockout.amount) {
        await t.rollback();
        return res.status(400).json({ message: "Insufficient stock to approve" });
      }

      // Deduct stock
      store.quantity -= stockout.amount;
      await store.save({ transaction: t });
    }

    stockout.status = status;
    await stockout.save({ transaction: t });

    await t.commit();
    res.json({ message: `Stockout ${status} successfully`, stockout });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.filterStockouts = async (req, res) => {
  try {
    const { itemId, userId, warehouseId, carId, status } = req.body;

    // Build dynamic filter
    const whereClause = {};
    if (itemId) whereClause.itemId = itemId;
    if (userId) whereClause.userId = userId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (carId) whereClause.carId = carId;
    if (status) whereClause.status = status;

    const stockouts = await Stockout.findAll({
      where: whereClause,
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(stockouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStockoutReport = async (req, res) => {
  try {
    const {
      itemId,
      userId,
      warehouseId,
      carId,
      status,
      startDate,
      endDate,
    } = req.body;

    const whereClause = {};

    // --- Optional filters ---
    if (itemId) whereClause.itemId = itemId;
    if (userId) whereClause.userId = userId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (carId) whereClause.carId = carId;
    if (status) whereClause.status = status;

    // --- Optional date filter ---
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      whereClause.createdAt = { [Op.gte]: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (whereClause.createdAt) {
        whereClause.createdAt[Op.lte] = end;
      } else {
        whereClause.createdAt = { [Op.lte]: end };
      }
    }

    // --- Fetch stockouts ---
    const stockouts = await Stockout.findAll({
      where: whereClause,
      attributes: ["id", "amount", "status", "createdAt"],
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    // --- Compute totals ---
    const totalStockouts = stockouts.length;
    const totalQuantity = stockouts.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );

    // --- Format response ---
    const report = stockouts.map((s) => ({
      id: s.id,
      item: s.Item?.name,
      warehouse: s.Warehouse?.name,
      car: s.Car?.carPlate,
      user: s.User?.fullName,
      status: s.status,
      amount: s.amount,
      createdAt: s.createdAt,
    }));

    res.status(200).json({
      summary: {
        totalStockouts,
        totalQuantity,
      },
      report,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to generate stockout report",
      error: error.message,
    });
  }
};

