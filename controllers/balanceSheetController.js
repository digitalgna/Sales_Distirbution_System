const BalanceSheet = require("../models/BalanceSheet");

// CREATE a new BalanceSheet entry
exports.createBalanceSheet = async (req, res) => {
  try {
    const { agentName, date, invoiceAmount, bankDeposit, withHold, adjustment, endingBalance } = req.body;
    const balanceSheet = await BalanceSheet.create({
      agentName,
      date,
      invoiceAmount,
      bankDeposit,
      withHold,
      adjustment,
      endingBalance,
    });

    res.status(201).json(balanceSheet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ all BalanceSheet entries
exports.getAllBalanceSheets = async (req, res) => {
  try {
    const sheets = await BalanceSheet.findAll();
    res.status(200).json(sheets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ a single BalanceSheet entry by id
exports.getBalanceSheetById = async (req, res) => {
  try {
    const sheet = await BalanceSheet.findByPk(req.params.id);
    if (!sheet) return res.status(404).json({ error: "BalanceSheet not found" });
    res.status(200).json(sheet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE a BalanceSheet entry by id
exports.updateBalanceSheet = async (req, res) => {
  try {
    const sheet = await BalanceSheet.findByPk(req.params.id);
    if (!sheet) return res.status(404).json({ error: "BalanceSheet not found" });

    const { agentName, date, invoiceAmount, bankDeposit, withHold, adjustment } = req.body;

    const endingBalance = (invoiceAmount ?? sheet.invoiceAmount) 
                         - (bankDeposit ?? sheet.bankDeposit)
                         - (withHold ?? sheet.withHold)
                         + (adjustment ?? sheet.adjustment ?? 0);

    await sheet.update({
      agentName: agentName ?? sheet.agentName,
      date: date ?? sheet.date,
      invoiceAmount: invoiceAmount ?? sheet.invoiceAmount,
      bankDeposit: bankDeposit ?? sheet.bankDeposit,
      withHold: withHold ?? sheet.withHold,
      adjustment: adjustment ?? sheet.adjustment,
      endingBalance,
    });

    res.status(200).json(sheet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE a BalanceSheet entry by id
exports.deleteBalanceSheet = async (req, res) => {
  try {
    const sheet = await BalanceSheet.findByPk(req.params.id);
    if (!sheet) return res.status(404).json({ error: "BalanceSheet not found" });

    await sheet.destroy();
    res.status(200).json({ message: "BalanceSheet deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
