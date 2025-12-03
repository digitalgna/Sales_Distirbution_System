const BalanceSheet = require("../models/BalanceSheet");
const Customer = require("../models/customer");
const Item = require("../models/item");
const { Op } = require("sequelize");


exports.createBalanceSheet = async (req, res) => {
  try {
    const {
      agentName,
      customerId,
      itemId,
      date,
      bankDeposit = 0,
      withHold = 0,
      invoiceAmount = 0,
      adjustment = 0,
      minusedFromDept = 0,
      minusedReason = "",
    } = req.body;

    // Get last ending balance for this customer
    const lastRecord = await BalanceSheet.findOne({
      where: { customerId },
      order: [["date", "DESC"], ["id", "DESC"]],
    });
    const previousEndingBalance = lastRecord ? parseFloat(lastRecord.endingBalance) : 0;

    const rawEndingBalance =
      previousEndingBalance +
      parseFloat(bankDeposit) +
      parseFloat(withHold) -
      parseFloat(invoiceAmount) +
      parseFloat(adjustment) -
      parseFloat(minusedFromDept);

    const newRecord = await BalanceSheet.create({
      agentName: agentName || "Seblu Deresse Mekonnen",
      customerId,
      itemId,
      date,
      bankDeposit,
      withHold,
      invoiceAmount,
      adjustment,
      minusedFromDept,
      minusedReason,
      endingBalance: rawEndingBalance,
    });

    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const calculateCustomerTotals = (rows) => {
  let endingBalance = 0;
  let totalBankDeposit = 0;
  let totalWithHold = 0;
  let totalInvoiceAmount = 0;

  const enrichedRows = rows.map((r) => {
    const bankDeposit = parseFloat(r.bankDeposit) || 0;
    const withHold = parseFloat(r.withHold) || 0;
    const invoiceAmount = parseFloat(r.invoiceAmount) || 0;
    const adjustment = parseFloat(r.adjustment) || 0;
    const minusedFromDept = parseFloat(r.minusedFromDept) || 0;

    endingBalance += bankDeposit + withHold - invoiceAmount + adjustment - minusedFromDept;

    totalBankDeposit += bankDeposit;
    totalWithHold += withHold;
    totalInvoiceAmount += invoiceAmount;

    return { ...r, endingBalance };
  });

  return {
    rows: enrichedRows,
    totals: { totalBankDeposit, totalWithHold, totalInvoiceAmount, endingBalance },
  };
};

// Main function to get balance sheets grouped by customer
exports.getBalanceSheets = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const whereClause = {};
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date[Op.gte] = startDate;
      if (endDate) whereClause.date[Op.lte] = endDate;
    }

    const offset = (page - 1) * limit;

    const records = await BalanceSheet.findAll({
      where: whereClause,
      include: [{ model: Customer, attributes: ["name"] }, { model: Item, attributes: ["name"] }],
      order: [["date", "ASC"], ["id", "ASC"]],
      offset: parseInt(offset),
      limit: parseInt(limit),
    });

    if (!records.length) return res.status(200).json({ totalCustomers: 0, data: [] });

    // Group records by customer
    const groupedByCustomer = {};
    records.forEach((r) => {
      const key = r.customerId;
      if (!groupedByCustomer[key]) groupedByCustomer[key] = [];
      groupedByCustomer[key].push(r.dataValues);
    });

    // Calculate totals per customer
    const customerResults = Object.keys(groupedByCustomer).map((customerId) => {
      const { rows, totals } = calculateCustomerTotals(groupedByCustomer[customerId]);
      return {
        customerId,
        customerName: groupedByCustomer[customerId][0].Customer?.name || "",
        rows,
        totals,
      };
    });

    res.status(200).json({ totalCustomers: customerResults.length, data: customerResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ===================== READ BY ID =====================
exports.getBalanceSheetById = async (req, res) => {
  try {
    const record = await BalanceSheet.findByPk(req.params.id, {
      include: [
        { model: Customer, attributes: ["name"] },
        { model: Item, attributes: ["name"] },
      ],
    });
    if (!record) return res.status(404).json({ error: "BalanceSheet not found" });
    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== UPDATE =====================
exports.updateBalanceSheet = async (req, res) => {
  try {
    const record = await BalanceSheet.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: "BalanceSheet not found" });

    const {
      agentName,
      customerId,
      itemId,
      date,
      bankDeposit,
      withHold,
      invoiceAmount,
      adjustment,
      minusedFromDept,
      minusedReason,
    } = req.body;

    // Recalculate rawEndingBalance if any numeric column changed
    const prevEndingBalanceRecord = await BalanceSheet.findOne({
      where: {
        customerId: customerId || record.customerId,
        date: { [Op.lt]: date || record.date },
      },
      order: [["date", "DESC"], ["id", "DESC"]],
    });
    const previousEndingBalance = prevEndingBalanceRecord
      ? parseFloat(prevEndingBalanceRecord.endingBalance)
      : 0;

    const newRawEndingBalance =
      previousEndingBalance +
      (bankDeposit ?? record.bankDeposit) +
      (withHold ?? record.withHold) -
      (invoiceAmount ?? record.invoiceAmount) +
      (adjustment ?? record.adjustment) -
      (minusedFromDept ?? record.minusedFromDept);

    await record.update({
      agentName: agentName ?? record.agentName,
      customerId: customerId ?? record.customerId,
      itemId: itemId ?? record.itemId,
      date: date ?? record.date,
      bankDeposit: bankDeposit ?? record.bankDeposit,
      withHold: withHold ?? record.withHold,
      invoiceAmount: invoiceAmount ?? record.invoiceAmount,
      adjustment: adjustment ?? record.adjustment,
      minusedFromDept: minusedFromDept ?? record.minusedFromDept,
      minusedReason: minusedReason ?? record.minusedReason,
      endingBalance: newRawEndingBalance,
    });

    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===================== DELETE =====================
exports.deleteBalanceSheet = async (req, res) => {
  try {
    const record = await BalanceSheet.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: "BalanceSheet not found" });

    await record.destroy();
    res.status(200).json({ message: "BalanceSheet deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
