const { Op } = require("sequelize");
const { Stockout, Store, Item, Warehouse, Sales, Car, User, Return } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

// ✅ CREATE STOCKOUT
const createStockout = async (req, res) => {
  try {
    const { name, amount, sponsor, bonus, salesId, carId } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const newStockout = await Stockout.create({
      name,
      amount,
      sponsor,
      bonus,
      salesId,
      carId
    });

    res.status(201).json({ message: "Stockout created successfully", data: newStockout });
  } catch (error) {
    console.error("Error creating stockout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL STOCKOUTS
const getStockouts = async (req, res) => {
  try {
    const stockouts = await Stockout.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json(stockouts);
  } catch (error) {
    console.error("Error fetching stockouts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE STOCKOUT
const getStockoutById = async (req, res) => {
  try {
    const { id } = req.params;
    const stockout = await Stockout.findByPk(id);

    if (!stockout) return res.status(404).json({ message: "Stockout not found" });

    res.status(200).json(stockout);
  } catch (error) {
    console.error("Error fetching stockout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE STOCKOUT
const updateStockout = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const stockout = await Stockout.findByPk(id);
    if (!stockout) return res.status(404).json({ message: "Stockout not found" });

    await stockout.update(updates);
    res.status(200).json({ message: "Stockout updated successfully", data: stockout });
  } catch (error) {
    console.error("Error updating stockout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE STOCKOUT
const deleteStockout = async (req, res) => {
  try {
    const { id } = req.params;
    const stockout = await Stockout.findByPk(id);
    if (!stockout) return res.status(404).json({ message: "Stockout not found" });

    await stockout.destroy();
    res.status(200).json({ message: "Stockout deleted successfully" });
  } catch (error) {
    console.error("Error deleting stockout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//Additional functionalities

// Validate stock availability before creating a stockout
const validateStockAvailability = async (req, res) => {
  try {
    const { itemId, warehouseId, amount } = req.body;

    // Validate required fields
    if (!itemId || !warehouseId || !amount || amount <= 0) {
      return res.status(400).json({ error: "itemId, warehouseId, and valid amount are required" });
    }

    // Check available stock in Store
    const store = await Store.findOne({ where: { itemId, warehouseId } });
    if (!store || store.quantity < amount) {
      return res.status(400).json({ error: "Insufficient stock in warehouse" });
    }

    // Update stock quantity
    store.quantity -= amount;
    await store.save();

    // Proceed with stockout creation (assuming CRUD handles this)
    return res.status(200).json({ message: "Stock available, proceed with stockout creation" });
  } catch (error) {
    console.error("Error validating stock availability:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate and link stockout to Sales or Car
const linkStockoutToSaleOrCar = async (req, res) => {
  try {
    const { itemId, warehouseId, amount, salesId, carId } = req.body;

    // Validate required fields
    if (!itemId || !warehouseId || !amount || amount <= 0) {
      return res.status(400).json({ error: "itemId, warehouseId, and valid amount are required" });
    }

    // Ensure at least one of salesId or carId is provided
    if (!salesId && !carId) {
      return res.status(400).json({ error: "Stockout must be linked to a sale or car" });
    }

    // Validate salesId if provided
    if (salesId) {
      const sale = await Sales.findByPk(salesId);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
    }

    // Validate carId if provided
    if (carId) {
      const car = await Car.findByPk(carId);
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }
    }

    // Proceed with stockout creation (assuming CRUD handles this)
    return res.status(200).json({ message: "Valid sale or car link, proceed with stockout creation" });
  } catch (error) {
    console.error("Error linking stockout to sale or car:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Calculate or validate bonus for stockout
const calculateStockoutBonus = async (req, res) => {
  try {
    const { itemId, amount, bonus } = req.body;
    const BONUS_PERCENTAGE = 0.05; // Configurable: 5% of item price * amount

    // Validate required fields
    if (!itemId || !amount || amount <= 0) {
      return res.status(400).json({ error: "itemId and valid amount are required" });
    }

    // Fetch item details
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Calculate expected bonus
    const expectedBonus = (item.price || 0) * amount * BONUS_PERCENTAGE;

    // If bonus is provided, validate it
    if (bonus && parseFloat(bonus) !== expectedBonus) {
      return res.status(400).json({ error: `Invalid bonus. Expected: ${expectedBonus}` });
    }

    // Return calculated bonus
    return res.status(200).json({ bonus: expectedBonus.toFixed(2) });
  } catch (error) {
    console.error("Error calculating stockout bonus:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Generate stockout summary report
const generateStockoutSummary = async (req, res) => {
  try {
    const { startDate, endDate, warehouseId, itemId } = req.query;

    // Build where clause
    const where = {};
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;

    // Fetch stockout summary
    const summary = await Stockout.findAll({
      where,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("amount")), "totalAmount"],
        [sequelize.fn("COUNT", sequelize.col("id")), "stockoutCount"],
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
    console.error("Error generating stockout summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Track stockout history for auditing
const getStockoutHistory = async (req, res) => {
  try {
    const { itemId, warehouseId, sponsor } = req.query;

    // Build where clause
    const where = {};
    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (sponsor) where.sponsor = sponsor;

    // Fetch stockout history
    const history = await Stockout.findAll({
      where,
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
        { model: Sales, attributes: ["id", "amount"] },
        { model: Car, attributes: ["id"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching stockout history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Send stockout alerts for low stock levels
const sendStockoutAlerts = async (req, res) => {
  try {
    const { itemId, warehouseId, amount } = req.body;
    const STOCK_THRESHOLD = 10; // Configurable threshold

    // Validate required fields
    if (!itemId || !warehouseId || !amount || amount <= 0) {
      return res.status(400).json({ error: "itemId, warehouseId, and valid amount are required" });
    }

    // Check stock level after stockout
    const store = await Store.findOne({ where: { itemId, warehouseId } });
    if (!store) {
      return res.status(404).json({ error: "Stock not found for item in warehouse" });
    }

    // Check if stock is below threshold
    if (store.quantity - amount < STOCK_THRESHOLD) {
      // Fetch users associated with the warehouse
      const users = await User.findAll({ where: { warehouseId }, attributes: ["email"] });

      // Send notifications to users
      for (const user of users) {
        await sendEmail({
          to: user.email,
          subject: "Low Stock Alert",
          text: `Stock for item ${itemId} in warehouse ${warehouseId} is below threshold: ${store.quantity - amount} units remaining.`,
        });
      }
    }

    return res.status(200).json({ message: "Stockout processed, alerts sent if needed" });
  } catch (error) {
    console.error("Error sending stockout alerts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Reconcile stockout with returns
const reconcileStockoutWithReturn = async (req, res) => {
  try {
    const { returnId, itemId, warehouseId, quantityReturned } = req.body;

    // Validate required fields
    if (!returnId || !itemId || !warehouseId || !quantityReturned || quantityReturned <= 0) {
      return res.status(400).json({ error: "returnId, itemId, warehouseId, and valid quantityReturned are required" });
    }

    // Verify return exists
    const returnRecord = await Return.findByPk(returnId);
    if (!returnRecord) {
      return res.status(404).json({ error: "Return not found" });
    }

    // Find related stockouts
    const stockouts = await Stockout.findAll({ where: { itemId, warehouseId } });
    if (!stockouts.length) {
      return res.status(404).json({ error: "No stockouts found for item in warehouse" });
    }

    // Update store quantity
    const store = await Store.findOne({ where: { itemId, warehouseId } });
    if (!store) {
      return res.status(404).json({ error: "Stock not found for item in warehouse" });
    }
    store.quantity += quantityReturned;
    await store.save();

    // Optionally link stockout to return (e.g., update stockout with returnId)
    // Assuming Stockout model has a returnId field added for this purpose
    // await Stockout.update({ returnId }, { where: { itemId, warehouseId } });

    return res.status(200).json({ message: "Stockout reconciled with return, stock updated" });
  } catch (error) {
    console.error("Error reconciling stockout with return:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createStockout,
  getStockouts,
  getStockoutById,
  updateStockout,
  deleteStockout,
  validateStockAvailability, // remove 
  linkStockoutToSaleOrCar, // remove
  calculateStockoutBonus, // remove
  generateStockoutSummary,
  getStockoutHistory,
  sendStockoutAlerts, // remove
  reconcileStockoutWithReturn,// remove
};