const Sales = require("../models/sales");
const User = require("../models/user");
const Customer = require("../models/customer");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse");
const Store = require("../models/store");


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
    // Parse numeric fields safely from FormData
    const userId = req.body.userId ? Number(req.body.userId) : null;
    const itemId = req.body.itemId ? Number(req.body.itemId) : null;
    const warehouseId = req.body.warehouseId ? Number(req.body.warehouseId) : null;
    const customerId = req.body.customerId ? Number(req.body.customerId) : null;
    const quantity = req.body.quantity ? Number(req.body.quantity) : null;
    const totalPrice = req.body.totalPrice ? Number(req.body.totalPrice) : null;
    const paidAmount = req.body.paidAmount ? Number(req.body.paidAmount) : null;
    const salesDate = req.body.salesDate ? new Date(req.body.salesDate) : null;
    const bank = req.body.bank || null;
    const bonus = req.body.bonus ? Number(req.body.bonus) : null;
    const sponsor = req.body.sponsor ? Number(req.body.sponsor) : null;
    const description = req.body.description || null;

    // Validate required fields
    if (!userId || !itemId || !warehouseId || !quantity || !totalPrice || !paidAmount || !salesDate) {
      return res.status(400).json({
        message: "userId, itemId, warehouseId, quantity, totalPrice, paidAmount, and salesDate are required."
      });
    }

    // Validate related entities
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const item = await Item.findByPk(itemId, { transaction: t });
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.quantity < quantity)
      return res.status(400).json({ message: "Insufficient stock" });

    const store = await Store.findOne({ 
      where: { itemId, warehouseId }, 
      transaction: t 
    });

    // Handle uploaded receipt files
    let recieptFiles = [];
    if (req.files && req.files.length > 0) {
      recieptFiles = req.files.map(f => f.filename); // store filenames
    }

    // Create sale
    const sale = await Sales.create({
      userId,
      customerId,
      itemId,
      warehouseId,
      quantity,
      totalPrice,
      paidAmount,
      reciept: recieptFiles,
      bank,
      salesDate,
      bonus,
      sponsor,
      description
    }, { transaction: t });

    // Deduct item quantity
    item.quantity -= quantity;
    await item.save({ transaction: t });

    store.quantity -= quantity;
    await store.save({ transaction: t });

    await t.commit();

    const saleJson = sale.toJSON();
    saleJson.reciept = buildFileUrls(req, sale.reciept);

    res.status(201).json(saleJson);

  } catch (error) {
    await t.rollback();
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
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const item = await Item.findByPk(sale.itemId, { transaction: t });
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Find store entry for this item and warehouse
    const store = await Store.findOne({
      where: { itemId: sale.itemId, warehouseId: sale.warehouseId },
      transaction: t,
    });
    if (!store) return res.status(404).json({ message: "Item not found in store for this warehouse" });

    // Convert numeric fields
    const newQuantity = req.body.quantity ? Number(req.body.quantity) : sale.quantity;

    // Calculate difference
    const diff = newQuantity - sale.quantity; // +ve = increased sale, -ve = reduced sale

    // --- Validation checks ---
    if (diff > 0) {
      // Increasing sale → reduce stock
      if (item.quantity < diff) {
        return res.status(400).json({ message: "Not enough stock in Item table to increase sale quantity" });
      }
      if (store.quantity < diff) {
        return res.status(400).json({ message: "Not enough stock in Store table to increase sale quantity" });
      }
      item.quantity -= diff;
      store.quantity -= diff;
    } else if (diff < 0) {
      // Reducing sale → return stock
      item.quantity += Math.abs(diff);
      store.quantity += Math.abs(diff);
    }

    await item.save({ transaction: t });
    await store.save({ transaction: t });

    // Handle receipt files
    let recieptFiles = sale.reciept || [];
    if (req.files && req.files.length > 0) {
      recieptFiles = req.files.map(f => f.filename);
    }

    // Update sale
    await sale.update({ ...req.body, reciept: recieptFiles }, { transaction: t });

    await t.commit();

    const saleJson = sale.toJSON();
    saleJson.reciept = buildFileUrls(req, sale.reciept);

    res.status(200).json({ message: "Sale updated successfully", sale: saleJson });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: "Failed to update sale", error: error.message });
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
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Please provide both startDate and endDate in request body." });
    }

    const sales = await Sales.findAll({
      where: {
        salesDate: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] }
      ],
      order: [["salesDate", "ASC"]],
    });

    // Totals
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.totalPrice || 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + parseFloat(sale.paidAmount || 0), 0);
    const totalItemsSold = sales.reduce((sum, sale) => sum + parseInt(sale.quantity || 0), 0);

    res.status(200).json({
      startDate,
      endDate,
      totalRevenue,
      totalPaid,
      totalItemsSold,
      count: sales.length,
      sales,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate sales report", error: error.message });
  }
};

