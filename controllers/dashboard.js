const { Op, Sequelize, literal, fn, col } = require("sequelize");
const sequelize = require("../config/db.js");

// Models
const Sales = require("../models/sales");
const SalesItem = require("../models/salesItem");
const Customer = require("../models/customer");
const Warehouse = require("../models/wharehouse");
const Stockout = require("../models/stockout");
const StockoutItem = require("../models/stockoutItem");
const Lending = require("../models/lending");
const Return = require("../models/return");
const Item = require("../models/item");
const Purchase = require("../models/purchase");
const Expense = require("../models/expense");
const Car = require("../models/carInfo");
const Balance = require("../models/balance");
const User = require("../models/user");


exports.getDashboard = async (req, res) => {
  try {
    const filters = req.method === "POST" ? req.body : {};
    const { startDate, endDate, warehouseId } = filters;
    const dateFilter = startDate && endDate ? { [Op.between]: [startDate, endDate] } : {};

    const where = (base = {}) => {
      const w = { ...base };
      if (Object.keys(dateFilter).length) w.salesDate = dateFilter;
      if (warehouseId) w.warehouseId = warehouseId;
      return w;
    };

    // === SAFE SUM & COUNT ===
    const safeSum = async (model, field, where) => Number(await model.sum(field, { where })) || 0;
    const safeCount = async (model, where) => Number(await model.count({ where })) || 0;

    // SALES
    const salesWhere = where();
    const totalSales = await safeSum(Sales, "totalPrice", salesWhere);
    const totalPaid = await safeSum(Sales, "paidAmount", salesWhere);
    const totalSalesCount = await safeCount(Sales, salesWhere);

    // PURCHASES
    const purchaseWhere = where({ purchaseDate: dateFilter });
    const totalPurchase = await safeSum(Purchase, "totalVatedAfterDiscount", purchaseWhere);
    const totalPurchaseCount = await safeCount(Purchase, purchaseWhere);

    // EXPENSES
    const expenseWhere = where({ expenseDate: dateFilter });
    const totalExpense = await safeSum(Expense, "amount", expenseWhere);
    const totalExpenseCount = await safeCount(Expense, expenseWhere);

    // OTHERS
    const totalWarehouses = await safeCount(Warehouse);
    const totalCars = await safeCount(Car);
    const totalItems = await safeCount(Item);
    const totalLending = await safeSum(Lending, "quantity", where({ lendingDate: dateFilter }));
    const totalReturn = await safeCount(Return, where({ createdAt: dateFilter }));
    const totalStockout = await safeCount(Stockout, where({ createdAt: dateFilter }));

    // BALANCE — SAFE!
    const balanceRow = (await Balance.findAll({
      attributes: [
        [Sequelize.fn("SUM", Sequelize.literal("CASE WHEN type='credit' THEN amount ELSE 0 END")), "totalCredit"],
        [Sequelize.fn("SUM", Sequelize.literal("CASE WHEN type='debit' THEN amount ELSE 0 END")), "totalDebit"]
      ],
      raw: true
    }))[0] || { totalCredit: 0, totalDebit: 0 };

    // RECENT RECORDS
const recentSales = await Sales.findAll({
  where: salesWhere,
  order: [["salesDate", "DESC"]],
  limit: 10,
  attributes: ["id", "userId", "totalPrice", "salesDate", "fsNo"],
  include: [
    { model: User, attributes: ["fullName"] },
    {
      model: SalesItem,
      attributes: ["quantity", "unitPrice", "totalPrice"],
      include: [{ model: Item, attributes: ["name"] }]
    }
  ],
  raw: false
});


    const recentPurchases = await Purchase.findAll({
      where: purchaseWhere,
      order: [["purchaseDate", "DESC"]],
      limit: 5,
      attributes: ["id", "totalVatedAfterDiscount", "purchaseDate"],
      raw: true
    });

    const recentExpenses = await Expense.findAll({
      where: expenseWhere,
      order: [["expenseDate", "DESC"]],
      limit: 5,
      attributes: ["id", "name", "amount"],
      raw: true
    });

    res.status(200).json({
      success: true,
      summary: {
        sales: {
          totalSales,
          totalPaid,
          totalOutstanding: totalSales - totalPaid,
          count: totalSalesCount
        },
        purchases: { totalPurchase, count: totalPurchaseCount },
        expenses: { totalExpense, count: totalExpenseCount },
        warehouses: totalWarehouses,
        items: totalItems,
        cars: totalCars,
        lending: totalLending,
        balance: {
          credit: Number(balanceRow.totalCredit) || 0,
          debit: Number(balanceRow.totalDebit) || 0
        },
        returns: totalReturn,
        stockouts: totalStockout
      },
      recent: {
        sales: recentSales || [],
        purchases: recentPurchases || [],
        expenses: recentExpenses || []
      }
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard failed",
      error: err.message,
      summary: { sales: { totalSales: 0 }, purchases: {}, expenses: {} },
      recent: { sales: [], purchases: [], expenses: [] }
    });
  }
};


exports.getSalesDashboard = async (req, res) => {
  try {
    const { userId } = req.params;

    // ---- 1. Total Sales Summary ----
    const sales = await Sales.findAll({
      where: { userId },
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: SalesItem,
          include: [{ model: Item, attributes: ["id", "name"] }],
        },
      ],
      order: [["salesDate", "DESC"]],
    });

    // ---- 2. Total Stockouts ----
    const stockouts = await Stockout.findAll({
      where: { userId },
      include: [
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: StockoutItem,
          include: [{ model: Item, attributes: ["id", "name"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // ---- 3. Returns ----
    const returns = await Return.findAll({
      where: { userId },
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] }
      ],
      order: [["createdAt", "DESC"]],
    });

    // ---- 4. Lending ----
    const lendings = await Lending.findAll({
      where: { userId },
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] }
      ],
      order: [["lendingDate", "DESC"]],
    });

    // ---- 5. Dashboard Metrics ----
    const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.paidAmount), 0);
    const totalCreditSales = sales.filter(s => s.credit).length;
    const itemsSoldCount = sales.reduce((sum, s) => {
      return sum + s.SalesItems.reduce((x, item) => x + Number(item.quantity), 0);
    }, 0);

    const totalStockoutItems = stockouts.reduce((sum, item) => {
      return sum + item.StockoutItems.reduce((x, row) => x + Number(row.amount), 0);
    }, 0);

    const totalReturnCount = returns.length;

    const totalLendingCount = lendings.length;

    // ---- 6. Final Structured Response ----
    return res.json({
      status: true,
      message: "Sales dashboard data fetched",
      metrics: {
        totalSalesAmount,
        totalCreditSales,
        itemsSoldCount,
        totalStockoutItems,
        totalReturnCount,
        totalLendingCount,
      },
      recentSales: sales.slice(0, 10),
      recentStockouts: stockouts.slice(0, 10),
      recentReturns: returns.slice(0, 10),
      recentLendings: lendings.slice(0, 10),
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Server Error", error });
  }
};

