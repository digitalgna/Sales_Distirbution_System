const Expense = require("../models/expense");

// CREATE a new expense
exports.createExpense = async (req, res) => {
  try {
    const { name, amount, description, expenseDate } = req.body;
    const expense = await Expense.create({ name, amount, description, expenseDate });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Failed to create expense", error: error.message });
  }
};

// READ all expenses
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.findAll();
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
  }
};

// READ single expense by ID
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expense", error: error.message });
  }
};

// UPDATE expense by ID
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, description, expenseDate } = req.body;

    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    await expense.update({ name, amount, description, expenseDate });
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: "Failed to update expense", error: error.message });
  }
};

// DELETE expense by ID
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    await expense.destroy();
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete expense", error: error.message });
  }
};
