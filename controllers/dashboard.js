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

    const dateFilter = startDate && endDate ? { [Op.between]: [startDate, endDate] } : undefined;

    // --- SALES ---
    const salesWhere = dateFilter ? { salesDate: dateFilter } : {};
    if (warehouseId) salesWhere.warehouseId = warehouseId;

    const totalSales = await Sales.sum("totalPrice", { where: salesWhere });
    const totalPaid = await Sales.sum("paidAmount", { where: salesWhere });
    const totalOutstanding = (totalSales || 0) - (totalPaid || 0);
    const totalSalesCount = await Sales.count({ where: salesWhere });

    // --- PURCHASES ---
    const purchaseWhere = dateFilter ? { purchaseDate: dateFilter } : {};
    if (warehouseId) purchaseWhere.warehouseId = warehouseId;

    const totalPurchase = await Purchase.sum("totalPrice", { where: purchaseWhere });
    const totalPurchaseCount = await Purchase.count({ where: purchaseWhere });

    // --- EXPENSES ---
    const expenseWhere = dateFilter ? { expenseDate: dateFilter } : {};
    const totalExpense = await Expense.sum("amount", { where: expenseWhere });
    const totalExpenseCount = await Expense.count({ where: expenseWhere });


    // --- ADDITIONAL METRICS ---
    const totalWarehouses = await Warehouse.count();
    const totalCars = await Car.count();
    const totalItems = await Item.count();

    const lendingWhere = dateFilter ? { lendingDate: dateFilter } : {};
    if (warehouseId) lendingWhere.warehouseId = warehouseId;

    const totalLendingAmount = await Lending.sum("quantity", { where: lendingWhere });

    const balanceSums = await Balance.findAll({
      attributes: [
        [Sequelize.fn("SUM", Sequelize.literal("CASE WHEN type='credit' THEN amount ELSE 0 END")), "totalCredit"],
        [Sequelize.fn("SUM", Sequelize.literal("CASE WHEN type='debit' THEN amount ELSE 0 END")), "totalDebit"]
      ],
      raw: true
    });

    const returnWhere = dateFilter ? { createdAt: dateFilter } : {};
    if (warehouseId) returnWhere.warehouseId = warehouseId;
    const totalReturn = await Return.count({ where: returnWhere });

    const stockoutWhere = dateFilter ? { createdAt: dateFilter } : {};
    if (warehouseId) stockoutWhere.warehouseId = warehouseId;
    const totalStockout = await Stockout.count({ where: stockoutWhere });

    // --- RECENT RECORDS ---
    const recentSales = await Sales.findAll({
      where: salesWhere,
      order: [["salesDate", "DESC"]],
      limit: 10,
      attributes: ["id", "userId", "itemId", "quantity", "totalPrice","salesDate"],
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] }
    ]
    });

    const recentPurchases = await Purchase.findAll({
      where: purchaseWhere,
      order: [["purchaseDate", "DESC"]],
      limit: 10,
      attributes: ["id", "supplierId", "itemId", "totalPrice", "purchaseDate"]
    });

    const recentExpenses = await Expense.findAll({
      where: expenseWhere,
      order: [["expenseDate", "DESC"]],
      limit: 10,
      attributes: ["id", "name", "amount", "expenseDate"]
    });

    res.status(200).json({
      summary: {
        sales: { totalSales: totalSales || 0, totalPaid: totalPaid || 0, totalOutstanding, count: totalSalesCount },
        purchases: { totalPurchase: totalPurchase || 0, count: totalPurchaseCount },
        expenses: { totalExpense: totalExpense || 0, count: totalExpenseCount },
        warehouses: totalWarehouses,
        items: totalItems,
        cars: totalCars,
        lendingAmount: totalLendingAmount || 0,
        balance: { totalCredit: balanceSums[0]?.totalCredit || 0, totalDebit: balanceSums[0]?.totalDebit || 0 },
        totalReturn: totalReturn || 0,
        totalStockout: totalStockout || 0
      },
      recent: {
        sales: recentSales,
        purchases: recentPurchases,
        expenses: recentExpenses
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard data", error: err.message });
  }
};
