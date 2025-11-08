const { Op, Sequelize } = require("sequelize");
const Sales = require("../models/sales");
const Purchase = require("../models/purchase");
const Expense = require("../models/expense");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse");
const Car = require("../models/carInfo");
const Lending = require("../models/lending");
const Balance = require("../models/balance");
const Return = require("../models/return");
const Stockout = require("../models/stockout");
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
      attributes: ["id", "userId", "itemId", "quantity", "totalPrice", "salesDate", "fsNo"],
      include: [
        { model: Item, attributes: ["name"] },
        { model: User, attributes: ["fullName"] }
      ],
      raw: true
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
