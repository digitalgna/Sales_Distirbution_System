const { Op, Sequelize } = require("sequelize");
const Sales = require("../models/sales");
const Expense = require("../models/expense");
const Purchase = require("../models/purchase"); 
const Item = require("../models/item");
const User = require("../models/user");
const Customer = require("../models/customer");
const Warehouse = require("../models/wharehouse");


exports.getIncomeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.salesDate = { [Op.between]: [startDate, endDate] };
    }

    // 1. Aggregate totals
    const totals = await Sales.findOne({
      where: whereClause,
      attributes: [
        [Sequelize.fn("SUM", Sequelize.col("totalPrice")), "totalSales"],
        [Sequelize.fn("SUM", Sequelize.col("paidAmount")), "totalPaid"],
        [Sequelize.literal("SUM(totalPrice - paidAmount)"), "outstandingAmount"]
      ],
      raw: true
    });

    // 2. Detailed records
    const records = await Sales.findAll({
      where: whereClause,
      attributes: ["id", "userId", "customerId", "itemId", "quantity", "totalPrice", "paidAmount", "salesDate", "warehouseId"],
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] }
      ],
      order: [["salesDate", "ASC"]]
    });

    res.status(200).json({
      totals,
      records
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch income report", error: err.message });
  }
};


exports.getProfitAnalysis = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const dateFilter = startDate && endDate ? { [Op.between]: [startDate, endDate] } : undefined;

    // 1️⃣ Totals
    const totalSales = await Sales.sum("totalPrice", dateFilter ? { where: { salesDate: dateFilter } } : {});
    const totalPurchase = await Purchase.sum("totalPrice", dateFilter ? { where: { purchaseDate: dateFilter } } : {});
    const totalExpense = await Expense.sum("amount", dateFilter ? { where: { expenseDate: dateFilter } } : {});

    const grossProfit = (totalSales || 0) - (totalPurchase || 0);
    const netProfit = grossProfit - (totalExpense || 0);

    // 2️⃣ Detailed records
    const salesRecords = await Sales.findAll({
      where: dateFilter ? { salesDate: dateFilter } : {},
      attributes: ["id", "userId", "customerId", "itemId", "quantity", "totalPrice", "paidAmount", "salesDate", "warehouseId"],
      include: [
        { model: require("../models/user"), attributes: ["id", "fullName"] },
        { model: require("../models/customer"), attributes: ["id", "name"] },
        { model: require("../models/item"), attributes: ["id", "name", "unitPrice"] }
      ],
      order: [["salesDate", "ASC"]]
    });

    const purchaseRecords = await Purchase.findAll({
      where: dateFilter ? { purchaseDate: dateFilter } : {},
      include: [
        { model: require("../models/item") },
        { model: require("../models/wharehouse") }
      ],
      order: [["purchaseDate", "ASC"]]
    });

    const expenseRecords = await Expense.findAll({
      where: dateFilter ? { expenseDate: dateFilter } : {},
      order: [["expenseDate", "ASC"]]
    });

    res.status(200).json({
      totals: {
        totalSales: totalSales || 0,
        totalPurchase: totalPurchase || 0,
        totalExpense: totalExpense || 0,
        grossProfit,
        netProfit
      },
      records: {
        sales: salesRecords,
        purchases: purchaseRecords,
        expenses: expenseRecords
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profit/loss report", error: err.message });
  }
};

