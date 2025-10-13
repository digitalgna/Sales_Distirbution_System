const Sales = require("../models/sales");
const User = require("../models/user");
const Customer = require("../models/customer");
const Item = require("../models/item");

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
  try {
    const {
      userId,
      customerId,
      itemId,
      quantity,
      totalPrice,
      paidAmount,
      bank,
      salesDate,
      bonus,
      sponsor,
      description
    } = req.body;

    // Validate required fields
    if (!userId || !itemId || !quantity || !totalPrice || !paidAmount || !salesDate) {
      return res.status(400).json({
        message: "userId, itemId, quantity, totalPrice, paidAmount, and salesDate are required.",
      });
    }

    // Validate related IDs
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const item = await Item.findByPk(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (customerId) {
      const customer = await Customer.findByPk(customerId);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
    }

    // Handle uploaded files
    let recieptFiles = [];
    if (req.files && req.files.length > 0) {
      recieptFiles = req.files.map(f => f.filename); // store only filenames
    }

    const sale = await Sales.create({
      userId,
      customerId,
      itemId,
      quantity,
      totalPrice,
      paidAmount,
      reciept: recieptFiles, // save as JSON array
      bank,
      salesDate,
      bonus,
      sponsor,
      description
    });

    const saleJson = sale.toJSON();
    saleJson.reciept = buildFileUrls(req, sale.reciept); // return full URLs

    res.status(201).json(saleJson);
  } catch (error) {
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
  try {
    const { id } = req.params;
    const sale = await Sales.findByPk(id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    let recieptFiles = sale.reciept || [];

    if (req.files && req.files.length > 0) {
      // Replace old files with new ones (optional: merge instead)
      recieptFiles = req.files.map(f => f.filename);
    }

    await sale.update({
      ...req.body,
      reciept: recieptFiles
    });

    const saleJson = sale.toJSON();
    saleJson.reciept = buildFileUrls(req, saleJson.reciept);

    res.status(200).json({ message: "Sale updated successfully", sale: saleJson });
  } catch (error) {
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
