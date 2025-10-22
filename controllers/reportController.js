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
      whereClause.salesDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    // 1. Aggregate totals
    const totals = await Sales.findOne({
      where: whereClause,
      attributes: [
        [Sequelize.fn("SUM", Sequelize.col("totalPrice")), "totalSales"],
        [Sequelize.fn("SUM", Sequelize.col("paidAmount")), "totalPaid"],
        [Sequelize.literal("SUM(totalPrice - paidAmount)"), "remaining"]
      ],
      raw: true
    });

    // 2. Detailed records (useful info only)
    const records = await Sales.findAll({
      where: whereClause,
      attributes: ["quantity", "totalPrice", "paidAmount", "salesDate"],
      include: [
        { model: User, attributes: ["fullName"] },
        { model: Customer, attributes: ["name"] },
        { model: Item, attributes: ["name", "salePrice"] },
        { model: Warehouse, attributes: ["name"]}
      ],
      order: [["salesDate", "ASC"]],
      raw: true,
      nest: true
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

    // 1️⃣ Normalize dates
    let dateFilter;
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { [Op.between]: [start, end] };
    }

    // 2️⃣ Totals
    const totalSales = await Sales.sum(
      "totalPrice",
      dateFilter ? { where: { salesDate: dateFilter } } : {}
    );

    const totalPurchase = await Purchase.sum(
      "totalPrice",
      dateFilter
        ? { where: { purchaseDate: dateFilter, status: "approved" } }
        : { where: { status: "approved" } }
    );

    const totalExpense = await Expense.sum(
      "amount",
      dateFilter ? { where: { expenseDate: dateFilter } } : {}
    );

    const grossProfit = (totalSales || 0) - (totalPurchase || 0);
    const netProfit = grossProfit - (totalExpense || 0);

    // 3️⃣ Detailed records
    const salesRecords = await Sales.findAll({
      where: dateFilter ? { salesDate: dateFilter } : {},
      attributes: ["quantity", "totalPrice", "paidAmount", "salesDate"],
      include: [
        { model: User, attributes: ["fullName"] },
        { model: Customer, attributes: ["name"] },
        { model: Item, attributes: ["name", "salePrice"] }
      ],
      order: [["salesDate", "ASC"]],
      raw: true,
      nest: true
    });

    const purchaseRecords = await Purchase.findAll({
      where: dateFilter
        ? { purchaseDate: dateFilter, status: "approved" }
        : { status: "approved" },
      attributes: ["quantity", "totalPrice", "purchaseDate"],
      include: [
        { model: Item, attributes: ["name", "unitPrice"] },
        { model: Warehouse, attributes: ["name"] }
      ],
      order: [["purchaseDate", "ASC"]],
      raw: true,
      nest: true
    });

    const expenseRecords = await Expense.findAll({
      where: dateFilter ? { expenseDate: dateFilter } : {},
      attributes: ["amount", "description", "expenseDate"],
      order: [["expenseDate", "ASC"]],
      raw: true
    });

    // 4️⃣ Return report
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

