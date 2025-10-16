const { Op } = require("sequelize");
const { Stockout} = require("../models/index");
const { Sequelize } = require("sequelize");
// ✅ CREATE STOCKOUT
exports.createStockout = async (req, res) => {
  try {
    const { name, amount, sponsor, bonus, salesId, carId, stockoutDate } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const newStockout = await Stockout.create({
      name,
      amount,
      sponsor,
      bonus,
      salesId,
      carId,
      stockoutDate: stockoutDate ? new Date(stockoutDate) : new Date() // set current date if not provided
    });

    res.status(201).json({ 
      message: "Stockout created successfully", 
      data: newStockout 
    });
  } catch (error) {
    console.error("Error creating stockout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ READ ALL STOCKOUTS
exports.getStockouts = async (req, res) => {
  try {
    const stockouts = await Stockout.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json(stockouts);
  } catch (error) {
    console.error("Error fetching stockouts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE STOCKOUT
exports.getStockoutById = async (req, res) => {
  try {
    const { id } = req.params;
    const stockout = await Stockout.findByPk(id);

    if (!stockout) return res.status(404).json({ message: "Stock out   not found" });

    res.status(200).json(stockout);
  } catch (error) {
    console.error("Error fetching stockout:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE STOCKOUT
exports.updateStockout = async (req, res) => {
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
exports.deleteStockout = async (req, res) => {
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

// Find stockouts by salesId
exports.getStockoutsBySales = async (req, res) => {
  try {
    const { salesId } = req.params;
    const stockouts = await Stockout.findAll({ where: { salesId } });

    if (!stockouts.length) {
      return res.status(404).json({ message: "No stockouts found for this sales ID" });
    }

    res.status(200).json(stockouts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Find stockouts by carId
exports.getStockoutsByCar = async (req, res) => {
  try {
    const { carId } = req.params;
    const stockouts = await Stockout.findAll({ where: { carId } });

    if (!stockouts.length) {
      return res.status(404).json({ message: "No stockouts found for this car ID" });
    }

    res.status(200).json(stockouts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Report: stockouts between startDate and endDate

exports.generateStockoutReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // include full end day

    // Fetch stockouts using stockoutDate OR createdAt if stockoutDate is null
 const stockouts = await Stockout.findAll({
  where: {
    [Op.or]: [
      { stockoutDate: { [Op.between]: [start, end] } },
      { stockoutDate: null, createdAt: { [Op.between]: [start, end] } }
    ]
  },
  order: [
    [
      Sequelize.literal("COALESCE(`stockoutDate`, `createdAt`)"),
      "ASC"
    ]
  ]
});

    if (stockouts.length === 0) {
      return res.json({
        success: true,
        message: "No stockout records found for the given date range",
        data: [],
        count: 0,
        dateRange: { startDate, endDate }
      });
    }

    res.json({
      success: true,
      data: stockouts,
      count: stockouts.length,
      dateRange: { startDate, endDate }
    });

  } catch (error) {
    console.error("Error generating stockout report:", error);
    res.status(500).json({ error: "Internal server error while generating report" });
  }
};
