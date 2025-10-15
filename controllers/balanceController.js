const Balance = require("../models/balance");
const Customer = require("../models/customer");
const Item = require("../models/item");


// Create balance
exports.createBalance = async (req, res) => {
  try {
    const { amount, customerId, itemId, date, description, type } = req.body;

    // Validate required fields
    if (!amount || !customerId || !itemId || !date) {
      return res.status(400).json({ message: "amount, customerId, itemId, and date are required" });
    }

    const balance = await Balance.create({ amount, customerId, itemId, date, description, type });
    res.status(201).json(balance);
  } catch (error) {
    res.status(500).json({ message: "Failed to create balance", error: error.message });
  }
};

// Get all balances
exports.getAllBalances = async (req, res) => {
  try {
    const balances = await Balance.findAll({
      include: [
        { model: Customer, as: "customer", attributes: ["id", "name"] },
        { model: Item,  attributes: ["id", "name"] }
      ]
    });
    res.status(200).json(balances);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch balances", error: error.message });
  }
};

// Get balance by ID
exports.getBalanceById = async (req, res) => {
  try {
    const balance = await Balance.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer", attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] }
      ]
    });
    if (!balance) return res.status(404).json({ message: "Balance not found" });
    res.status(200).json(balance);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch balance", error: error.message });
  }
};

// Update balance
exports.updateBalance = async (req, res) => {
  try {
    const balance = await Balance.findByPk(req.params.id);
    if (!balance) return res.status(404).json({ message: "Balance not found" });

    const { amount, customerId, itemId, date, description, type } = req.body;
    await balance.update({ amount, customerId, itemId, date, description, type });

    res.status(200).json(balance);
  } catch (error) {
    res.status(500).json({ message: "Failed to update balance", error: error.message });
  }
};

// Delete balance
exports.deleteBalance = async (req, res) => {
  try {
    const balance = await Balance.findByPk(req.params.id);
    if (!balance) return res.status(404).json({ message: "Balance not found" });

    await balance.destroy();
    res.status(200).json({ message: "Balance deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete balance", error: error.message });
  }
};

exports.getAllBalancesByCustomer = async (req, res) => {
  try {
    const balances = await Balance.findAll({
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] }
      ],
      order: [["date", "ASC"]]
    });

    res.status(200).json(balances);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch balances", error: err.message });
  }
};

exports.getAllBalancesByItem = async (req, res) => {
  try {
    const balances = await Balance.findAll({
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Customer, attributes: ["id", "name"] }
      ],
      order: [["date", "ASC"]]
    });

    res.status(200).json(balances);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch balances", error: err.message });
  }
};
