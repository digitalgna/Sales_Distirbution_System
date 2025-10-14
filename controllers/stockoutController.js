const Stockout = require("../models/stockout");

// ✅ CREATE STOCKOUT
exports.createStockout = async (req, res) => {
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

    if (!stockout) return res.status(404).json({ message: "Stockout not found" });

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
