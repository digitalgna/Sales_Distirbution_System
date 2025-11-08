const Sales = require("../models/sales");
const User = require("../models/user");
const Customer = require("../models/customer");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse");
const Store = require("../models/store");
const Stockout = require("../models/stockout");
const Lending = require("../models/lending");
const Return = require("../models/return");


// Helper: build full URLs for reciept files
const buildFileUrls = (req, files) => {
  if (!files) return [];
  if (typeof files === "string") {
    try {
      files = JSON.parse(files);
    } catch {
      files = [files];
    }
  }
  return files.map(file => `${req.protocol}://${req.get("host")}/uploads/receipts/${file}`);
};

// Create new sale
exports.createSale = async (req, res) => {
  const t = await Sales.sequelize.transaction();
  try {
    // Parse fields safely
    const userId = req.body.userId ? Number(req.body.userId) : null;
    const itemId = req.body.itemId ? Number(req.body.itemId) : null;
    const warehouseId = req.body.warehouseId ? Number(req.body.warehouseId) : null;
    const customerId = req.body.customerId ? Number(req.body.customerId) : null;
    const quantity = req.body.quantity ? Number(req.body.quantity) : null;
    const totalPrice = req.body.totalPrice ? Number(req.body.totalPrice) : null;
    const totalTaxedPrice = req.body.totalTaxedPrice ? Number(req.body.totalTaxedPrice) : null;
    const paidAmount = req.body.paidAmount ? Number(req.body.paidAmount) : null;
    const bank = req.body.bank || null;
    const salesDate = req.body.salesDate ? new Date(req.body.salesDate) : new Date();
    const bonus = req.body.bonus ? Number(req.body.bonus) : null;
    const bonusAmount = req.body.bonusAmount ? Number(req.body.bonusAmount) : null;
    const sponsor = req.body.sponsor ? Number(req.body.sponsor) : null;
    const sponsurAmount = req.body.sponsurAmount ? Number(req.body.sponsurAmount) : null;
    const description = req.body.description || null;
    const tinNo = req.body.tinNo ? Number(req.body.tinNo) : null;
    const fsNoRaw = req.body.fsNo;
    const machineNoRaw = req.body.machineNo;

    // sanitize leading/trailing quotes if any
    const fsNo =
      typeof fsNoRaw === "string"
        ? fsNoRaw.replace(/^"+|"+$/g, "")
        : fsNoRaw || null;

    const machineNo =
      typeof machineNoRaw === "string"
        ? machineNoRaw.replace(/^"+|"+$/g, "")
        : machineNoRaw || null;


    // Validate required fields
    if (!userId || !itemId || !warehouseId || !quantity || !totalPrice || !paidAmount || !tinNo || !fsNo || !machineNo) {
      return res.status(400).json({
        message: "Missing required fields: userId, itemId, warehouseId, quantity, totalPrice, paidAmount, tinNo, fsNo, or machineNo.",
      });
    }

    // Validate related entities
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const item = await Item.findByPk(itemId, { transaction: t });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    // Check stock
    const stock = await Stockout.findOne({ where: { itemId, warehouseId }, transaction: t });
    if (!stock) return res.status(404).json({ message: "No stock found for this item in this warehouse" });
    if (stock.quantity < quantity) return res.status(400).json({ message: "Insufficient stock" });

    // Deduct stock
    stock.quantity -= quantity;
    await stock.save({ transaction: t });

    // Handle uploaded receipts
    let recieptFiles = [];
    if (req.files && req.files.length > 0) {
      recieptFiles = req.files.map(f => f.filename);
    }

    // Create sale record
    const sale = await Sales.create({
      userId,
      customerId,
      itemId,
      warehouseId,
      quantity,
      totalPrice,
      totalTaxedPrice,
      paidAmount,
      reciept: recieptFiles,
      bank,
      salesDate,
      bonus,
      bonusAmount,
      sponsor,
      sponsurAmount,
      tinNo,
      fsNo,
      machineNo,
      description
    }, { transaction: t });

    await t.commit();

    const saleJson = sale.toJSON();
    saleJson.reciept = buildFileUrls(req, sale.reciept);

    res.status(201).json({ message: "Sale created successfully", sale: saleJson });

  } catch (error) {
    await t.rollback();
    console.error("Create Sale Error:", error);
    res.status(500).json({ message: "Failed to create sale", error: error.message });
  }
};

// Get all sales
exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sales.findAll({
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
      ],
    });

    const formattedSales = sales.map(sale => {
      const json = sale.toJSON();
      json.reciept = buildFileUrls(req, json.reciept);
      return json;
    });

    res.status(200).json(formattedSales);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales", error: error.message });
  }
};

// Get sale by ID
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sales.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
      ],
    });

    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const saleJson = sale.toJSON();
    saleJson.reciept = buildFileUrls(req, saleJson.reciept);

    res.status(200).json(saleJson);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sale", error: error.message });
  }
};

// Update sale
exports.updateSale = async (req, res) => {
  const t = await Sales.sequelize.transaction();
  try {
    const { id } = req.params;
    const sale = await Sales.findByPk(id, { transaction: t });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ message: "Sale not found" });
    }

    // === FIX: Clean fsNo, machineNo from double quotes ===
    const clean = (val) => {
      if (typeof val !== "string") return val;
      // Remove leading/trailing quotes: "000987" → 000987
      return val.replace(/^"|"$/g, "").trim();
    };

    // Merge old + new receipts
    let recieptFiles = Array.isArray(sale.reciept) ? [...sale.reciept] : [];
    if (req.files?.length > 0) {
      recieptFiles.push(...req.files.map(f => f.filename));
    }

    // === UPDATE WITH CLEANED VALUES ===
    await sale.update(
      {
        ...req.body,
        fsNo: clean(req.body.fsNo) || sale.fsNo,
        machineNo: clean(req.body.machineNo) || sale.machineNo,
        tinNo: Number(req.body.tinNo) || sale.tinNo,
        reciept: recieptFiles,
        credit: req.body.credit === true || req.body.credit === "true",
      },
      { transaction: t }
    );

    await t.commit();

    const updated = sale.toJSON();
    updated.reciept = buildFileUrls(req, updated.reciept);

    res.json({ message: "Sale updated!", sale: updated });
  } catch (err) {
    await t.rollback();
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

// Delete sale
exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sales.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    await sale.destroy();
    res.status(200).json({ message: "Sale deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete sale", error: error.message });
  }
};

exports.getSalesByCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const sales = await Sales.findAll({
      where: { customerId },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"]},
      ],
    });

    const formatted = sales.map(s => {
      const json = s.toJSON();
      json.reciept = buildFileUrls(req, json.reciept);
      return json;
    });

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by customer", error: error.message });
  }
};

exports.getSalesByItem = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const sales = await Sales.findAll({
      where: { itemId },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Warehouse, attributes: ["id", "name"]},
      ],
    });

    const formatted = sales.map(s => {
      const json = s.toJSON();
      json.reciept = buildFileUrls(req, json.reciept);
      return json;
    });

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by item", error: error.message });
  }
};

exports.getSalesBySalesMan = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const sales = await Sales.findAll({
      where: { userId },
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Warehouse, attributes: ["id", "name"]},
        { model: User, attributes: ["id", "fullName"] },
      ],
    });

    const formatted = sales.map(s => {
      const json = s.toJSON();
      json.reciept = buildFileUrls(req, json.reciept);
      return json;
    });

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by user", error: error.message });
  }
};

exports.getSalesByWarehouse = async (req, res) => {
  try {
    const warehouseId = Number(req.params.warehouseId);
    const sales = await Sales.findAll({
      where: { warehouseId },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Warehouse, attributes: ["id", "name"]},
      ],
    });

    const formatted = sales.map(s => {
      const json = s.toJSON();
      json.reciept = buildFileUrls(req, json.reciept);
      return json;
    });

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by warehouse", error: error.message });
  }
};

const { Op } = require("sequelize");


exports.getSalesReportByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, userId, customerId, itemId, warehouseId } = req.body;

    // --- Filters ---
    const filterByDate = (field) =>
      startDate && endDate ? { [Op.between]: [new Date(startDate), new Date(endDate)] } : undefined;

    const salesFilter = {};
    if (filterByDate("salesDate")) salesFilter.salesDate = filterByDate("salesDate");
    if (userId) salesFilter.userId = userId;
    if (customerId) salesFilter.customerId = customerId;
    if (itemId) salesFilter.itemId = itemId;
    if (warehouseId) salesFilter.warehouseId = warehouseId;

    const movementsFilter = {};
    if (startDate && endDate) movementsFilter.createdAt = filterByDate("createdAt");
    if (userId) movementsFilter.userId = userId;
    if (itemId) movementsFilter.itemId = itemId;
    if (warehouseId) movementsFilter.warehouseId = warehouseId;

    // --- Fetch Data ---
    const [sales, allStockouts, allLendings, allReturns] = await Promise.all([
      Sales.findAll({
        where: salesFilter,
        include: [
          { model: User, attributes: ["id", "fullName"] },
          { model: Customer, attributes: ["id", "name"] },
          { model: Item, attributes: ["id", "name", "unitPrice"] },
          { model: Warehouse, attributes: ["name"] },
        ],
        order: [["salesDate", "ASC"]],
      }),
      Stockout.findAll({
        where: movementsFilter,
        include: [
          { model: User, attributes: ["fullName"] },
          { model: Item, attributes: ["name"] },
          { model: Warehouse, attributes: ["name"] },
        ],
      }),
      Lending.findAll({
        where: movementsFilter,
        include: [
          { model: User, attributes: ["fullName"] },
          { model: Item, attributes: ["name"] },
          { model: Warehouse, attributes: ["name"] },
        ],
      }),
      Return.findAll({
        where: movementsFilter,
        include: [
          { model: User, attributes: ["fullName"] },
          { model: Item, attributes: ["name"] },
          { model: Warehouse, attributes: ["name"] },
        ],
      }),
    ]);

    // --- Format sales ---
    const formattedSales = sales.map(s => {
      const json = s.toJSON();
      json.reciept = buildFileUrls(req, json.reciept);
      delete json.userId;
      delete json.customerId;
      delete json.itemId;
      delete json.warehouseId;
      delete json.createdAt;
      delete json.updatedAt;
      return json;
    });

    // --- Format stockouts / lending / returns ---
    const formatMovements = (records, type) => records.map(r => ({
      type,
      date: r.createdAt || r.lendingDate || r.returnDate,
      item: r.Item?.name || null,
      warehouse: r.Warehouse?.name || null,
      user: r.User?.fullName || null,
      quantity: r.quantity || r.amount || r.returnQuantity || 0
    }));

    const stockouts = formatMovements(allStockouts, "stockout");
    const lendings = formatMovements(allLendings, "lending");
    const returns = formatMovements(allReturns, "return");

    // --- Totals for sales ---
    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.totalPrice || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0);
    const totalItemsSold = sales.reduce((sum, s) => sum + parseInt(s.quantity || 0), 0);

    // --- Totals for movements ---
    const totalStockout = stockouts.reduce((sum, s) => sum + s.quantity, 0);
    const totalLending = lendings.reduce((sum, l) => sum + l.quantity, 0);
    const totalReturn = returns.reduce((sum, r) => sum + r.quantity, 0);

    res.status(200).json({
      totalSales,
      totalPaid,
      totalItemsSold,
      salesCount: formattedSales.length,
      totalStockout,
      totalLending,
      totalReturn,
      sales: formattedSales,
      stockouts,
      lendings,
      returns,
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to generate sales report", error: error.message });
  }
};


//filters for only salesman
exports.getSalesBySalesmanFiltered = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const {
      customerId,
      tinNo,
      itemId,
      warehouseId,
      date,           // "2025-11-07"
  startDate,     // "2025-11-01"
  endDate         // "2025-11-07"
    } = req.body;

    // BASE: Only this salesman
    const where = { userId };

    // 1. Customer
    if (customerId) where.customerId = Number(customerId);

    // 2. TIN No (partial search)
    if (tinNo) {
      where.tinNo = { [Op.like]: `%${tinNo.trim()}%` };
    }

    // 3. Item
    if (itemId) where.itemId = Number(itemId);

    // 4. Warehouse
    if (warehouseId) where.warehouseId = Number(warehouseId);

    // 5. DATE LOGIC — SUPER SMART
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      where.salesDate = { [Op.between]: [start, end] };
    } else if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date("1970-01-01");
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      where.salesDate = { [Op.between]: [start, end] };
    }

    const sales = await Sales.findAll({
      where,
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["salesDate", "DESC"]],
    });

    const formatted = sales.map(s => {
      const json = s.toJSON();
      json.reciept = buildFileUrls(req, json.reciept);
      return json;
    });

    const totalSales = sales.reduce((s, x) => s + Number(x.totalPrice || 0), 0);
    const totalPaid = sales.reduce((s, x) => s + Number(x.paidAmount || 0), 0);

    res.status(200).json({
      salesmanId: userId,
      filters: req.body,
      count: formatted.length,
      totalSales: Number(totalSales.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      outstanding: Number((totalSales - totalPaid).toFixed(2)),
      sales: formatted
    });

  } catch (error) {
    console.error("FILTER ERROR:", error);
    res.status(500).json({
      message: "Failed to filter sales",
      error: error.message
    });
  }
};



