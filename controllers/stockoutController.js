const sequelize = require("../config/db");
const Stockout = require("../models/stockout");
const Store = require("../models/store");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse");
const User = require("../models/user");
const Car = require("../models/carInfo");
const { Op } = require("sequelize");


const StockoutItem = require("../models/stockoutItem");

exports.createStockout = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { carId, userId, warehouseId, status, items } = req.body;
    
    // Validate required fields
    if (!carId || !userId || !warehouseId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: "carId, userId, warehouseId, and items array with at least one item are required" 
      });
    }

    // First, validate all items before making any changes
    for (const item of items) {
      const { itemId, amount } = item;
      
      if (!itemId || !amount) {
        return res.status(400).json({ 
          message: "Each item must have itemId and amount" 
        });
      }

      const store = await Store.findOne({
        where: { itemId, warehouseId },
        transaction: t,
      });

      if (!store) {
        return res.status(404).json({ 
          message: `Item with ID ${itemId} not found in warehouse store` 
        });
      }

      if (store.quantity < amount) {
        return res.status(400).json({ 
          message: `Insufficient stock for item ID ${itemId}. Available: ${store.quantity}, Requested: ${amount}` 
        });
      }
    }

    // If we get here, all validations passed - now create the records
    const stockout = await Stockout.create(
      {
        carId,
        userId,
        warehouseId,
        status: status || "pending",
      },
      { transaction: t }
    );

    // Process each item in the stockout
    for (const item of items) {
      const { itemId, amount, bonus = 0, sponsor } = item;
      
      // Create stockout item
      await StockoutItem.create(
        {
          stockoutId: stockout.id,
          itemId,
          amount,
          bonus: parseInt(bonus) || 0,
          sponsor: parseInt(sponsor) || 0,
        },
        { transaction: t }
      );

      // Update stock if status is approved
      if (status === "approved") {
        await Store.decrement('quantity', {
          by: amount,
          where: { itemId, warehouseId },
          transaction: t
        });
      }
    }

    await t.commit();
    
    // Fetch the created stockout with its items for the response
    const createdStockout = await Stockout.findByPk(stockout.id, {
        attributes: { 
        exclude: ['createdAt', 'updatedAt', 'itemId', 'Item'] 
      },
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: User, attributes: ["id", "fullName"] },
        { 
          model: StockoutItem, 
          include: [
            { model: Item, attributes: ["id", "name"] }
          ] 
        }
      ]
    });

    return res.status(201).json(createdStockout);
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error("Error creating stockout:", error);
    return res.status(500).json({ 
      message: "Failed to create stockout",
      error: error.message 
    });
  }
};

// Get all stockouts
// Get all stockouts
exports.getAllStockouts = async (req, res) => {
  try {
    const stockouts = await Stockout.findAll({
      attributes: { 
        exclude: ['createdAt', 'updatedAt', 'itemId'] 
      },
      include: [
        { 
          model: Warehouse, 
          attributes: ["id", "name"] 
        },
        { 
          model: Car, 
          attributes: ["id", "carPlate"] 
        },
        { 
          model: User, 
          attributes: ["id", "fullName"] 
        },
        { 
          model: StockoutItem, 
          attributes: { 
            exclude: ['createdAt', 'updatedAt', 'itemId'] 
          },
          include: [
            { 
              model: Item, 
              attributes: ["id", "name"] 
            }
          ] 
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    // Remove null values from the response
    const cleanStockouts = stockouts.map(stockout => {
      const cleanStockout = stockout.get({ plain: true });
      return JSON.parse(JSON.stringify(cleanStockout, (key, value) => 
        value === null ? undefined : value
      ));
    });

    res.status(200).json(cleanStockouts);
  } catch (error) {
    console.error("Error fetching stockouts:", error);
    res.status(500).json({ 
      message: "Failed to fetch stockouts",
      error: error.message 
    });
  }
};

// Get stockout by ID
exports.getStockoutById = async (req, res) => {
  try {
    const stockout = await Stockout.findByPk(req.params.id, {
      attributes: { 
        exclude: ['createdAt', 'updatedAt', 'itemId'] 
      },
      include: [
        { 
          model: Warehouse, 
          attributes: ["id", "name"] 
        },
        { 
          model: Car, 
          attributes: ["id", "carPlate"] 
        },
        { 
          model: User, 
          attributes: ["id", "fullName"] 
        },
        { 
          model: StockoutItem, 
          attributes: { 
            exclude: ['createdAt', 'updatedAt', 'itemId'] 
          },
          include: [
            { 
              model: Item, 
              attributes: ["id", "name"] 
            }
          ] 
        }
      ]
    });

    if (!stockout) {
      return res.status(404).json({ message: "Stockout not found" });
    }

    // Remove null values from the response
    const cleanStockout = JSON.parse(JSON.stringify(stockout, (key, value) => 
      value === null ? undefined : value
    ));

    res.status(200).json(cleanStockout);
  } catch (error) {
    console.error("Error fetching stockout:", error);
    res.status(500).json({ 
      message: "Failed to fetch stockout",
      error: error.message 
    });
  }
};


exports.getStockoutsByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const stockouts = await Stockout.findAll({
      where: { userId },
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!stockouts || stockouts.length === 0) {
      return res.status(404).json({ message: "No stockouts found for this user." });
    }

    // Remove redundant foreign keys
    const cleanedStockouts = stockouts.map((s) => {
      const { itemId, carId, userId, warehouseId, updatedAt, ...rest } = s.toJSON();
      return rest;
    });

    res.status(200).json(cleanedStockouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update stockout
exports.updateStockout = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { items, ...updateData } = req.body;

    // Find the existing stockout with its items
    const stockout = await Stockout.findByPk(id, {
      include: [StockoutItem],
      transaction: t
    });

    if (!stockout) {
      return res.status(404).json({ message: "Stockout not found" });
    }

    if (stockout.status !== "pending") {
      return res.status(400).json({ 
        message: "Cannot modify approved/rejected stockouts" 
      });
    }

    // Update the stockout record
    await stockout.update(updateData, { transaction: t });

    // If items are provided, update them
    if (items && Array.isArray(items)) {
      // Remove existing items
      await StockoutItem.destroy({
        where: { stockoutId: id },
        transaction: t
      });

      // Create new items
      for (const item of items) {
        const { itemId, amount, bonus = 0, sponsor = 0 } = item;
        
        if (!itemId || !amount) {
          await t.rollback();
          return res.status(400).json({ 
            message: "Each item must have itemId and amount" 
          });
        }

        await StockoutItem.create(
          {
            stockoutId: id,
            itemId,
            amount,
            bonus: parseInt(bonus) || 0,
            sponsor: parseInt(sponsor) || 0,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    // Fetch the updated stockout with its items for the response
    const updatedStockout = await Stockout.findByPk(id, {
      attributes: { 
        exclude: ['createdAt', 'updatedAt', 'itemId'] 
      },
      include: [
        { 
          model: Warehouse, 
          attributes: ["id", "name"] 
        },
        { 
          model: Car, 
          attributes: ["id", "carPlate"] 
        },
        { 
          model: User, 
          attributes: ["id", "fullName"] 
        },
        { 
          model: StockoutItem, 
          attributes: { 
            exclude: ['createdAt', 'updatedAt', 'itemId'] 
          },
          include: [
            { 
              model: Item, 
              attributes: ["id", "name"] 
            }
          ] 
        }
      ]
    });

    // Remove null values from the response
    const cleanStockout = JSON.parse(JSON.stringify(updatedStockout, (key, value) => 
      value === null ? undefined : value
    ));

    res.status(200).json(cleanStockout);
  } catch (error) {
    await t.rollback();
    console.error("Error updating stockout:", error);
    res.status(500).json({ 
      message: "Failed to update stockout",
      error: error.message 
    });
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
    const stockoutId = req.params.id;

    const stockout = await Stockout.findByPk(stockoutId, {
      include: [
        {
          model: StockoutItem,
          include: [{ model: Item }]
        }
      ],
      transaction: t
    });

    if (!stockout) {
      await t.rollback();
      return res.status(404).json({ message: "Stockout not found" });
    }

    // Only pending requests can be processed
    if (stockout.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ message: "Status already processed" });
    }

    // If approving, validate store quantities and deduct
    if (status === "approved") {
      for (const si of stockout.StockoutItems) {
        const totalOut = (si.amount || 0) + (si.bonus || 0) + (si.sponsor || 0);

        const store = await Store.findOne({
          where: {
            itemId: si.itemId,
            warehouseId: stockout.warehouseId
          },
          transaction: t
        });

        if (!store || store.quantity < totalOut) {
          await t.rollback();
          return res.status(400).json({
            message: `Insufficient stock for item: ${si.Item?.name || si.itemId}`
          });
        }

        // Deduct total movement from store
        store.quantity -= totalOut;
        await store.save({ transaction: t });
      }
    }

    // Update stockout status
    stockout.status = status;
    await stockout.save({ transaction: t });

    await t.commit();
    res.json({
      message: `Stockout ${status} successfully`,
      stockout
    });

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
    if (userId) whereClause.userId = userId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (carId) whereClause.carId = carId;
    if (status) whereClause.status = status;

    // --- Date filters ---
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

    // --- Query: filter by itemId inside StockoutItem ---
    let stockoutItemFilter = {};
    if (itemId) {
      stockoutItemFilter.itemId = itemId;
    }

    // --- Fetch stockouts with their items ---
    const stockouts = await Stockout.findAll({
      where: whereClause,
      attributes: ["id", "status", "createdAt"],
      include: [
        {
          model: StockoutItem,
          where: stockoutItemFilter,
          required: itemId ? true : false,
          include: [{ model: Item, attributes: ["id", "name"] }],
        },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    // --- Compute totals ---
    const totalStockouts = stockouts.length;

    const totalQuantity = stockouts.reduce((sum, s) => {
      return (
        sum +
        s.StockoutItems.reduce(
          (sub, i) => sub + (Number(i.amount) || 0),
          0
        )
      );
    }, 0);

    // --- Format report structure ---
    const report = stockouts.map((s) => ({
      id: s.id,
      warehouse: s.Warehouse?.name,
      car: s.Car?.carPlate,
      user: s.User?.fullName,
      status: s.status,
      createdAt: s.createdAt,
      items: s.StockoutItems.map((i) => ({
        itemId: i.itemId,
        itemName: i.Item?.name,
        amount: i.amount,
        bonus: i.bonus,
        sponsor: i.sponsor,
      })),
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


