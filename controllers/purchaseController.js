const { Op } = require("sequelize");
const { Purchase, Customer, Item, Warehouse, Store, Supplier, User } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

const { Op } = require("sequelize");

// ✅ CREATE PURCHASE
exports.createPurchase = async (req, res) => {
  try {
    const {
      supplierId,
      itemId,
      warehouseId,
      itemAmount,
      unitPrice,
      status,
      withholdingAmount,
      date,
      sponsor,
      bonus,
      carId,
      chargedCost,
      unitExciseTax,
      vat
    } = req.body;

    // Basic validations
    if (!supplierId || !itemId || !warehouseId || !itemAmount || !unitPrice) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if related models exist
    const supplier = await Customer.findByPk(supplierId);
    const item = await Item.findByPk(itemId);
    const warehouse = await Warehouse.findByPk(warehouseId);

    if (!supplier || !item || !warehouse) {
      return res.status(404).json({ message: "Supplier, Item, or Warehouse not found" });
    }

    const totalPrice = itemAmount * unitPrice;

    const newPurchase = await Purchase.create({
      supplierId,
      itemId,
      warehouseId,
      itemAmount,
      unitPrice,
      totalPrice,
      status,
      withholdingAmount,
      date,
      sponsor,
      bonus,
      carId,
      chargedCost,
      unitExciseTax,
      vat
    });

    res.status(201).json({ message: "Purchase created successfully", data: newPurchase });
  } catch (error) {
    console.error("Error creating purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL PURCHASES (optional filters)
exports.getPurchases = async (req, res) => {
  try {
    const { supplierId, itemId, warehouseId, status, search } = req.query;
    const where = {};

    if (supplierId) where.supplierId = supplierId;
    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;

    const purchases = await Purchase.findAll({
      where,
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE PURCHASE
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findByPk(id, {
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });

    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    res.status(200).json(purchase);
  } catch (error) {
    console.error("Error fetching purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE PURCHASE
exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const purchase = await Purchase.findByPk(id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    // Recalculate totalPrice if unitPrice or itemAmount changed
    if (updates.unitPrice || updates.itemAmount) {
      const newUnitPrice = updates.unitPrice ?? purchase.unitPrice;
      const newItemAmount = updates.itemAmount ?? purchase.itemAmount;
      updates.totalPrice = newUnitPrice * newItemAmount;
    }

    await purchase.update(updates);
    res.status(200).json({ message: "Purchase updated successfully", data: purchase });
  } catch (error) {
    console.error("Error updating purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE PURCHASE
exports.deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findByPk(id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    await purchase.destroy();
    res.status(200).json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// additional functionalities 

// Update stock after purchase
const updateStockAfterPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    // Validate purchase
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [{ model: Item }, { model: Warehouse }],
    });
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Find or create store record
    let store = await Store.findOne({
      where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
    });
    if (!store) {
      store = await Store.create({
        itemId: purchase.itemId,
        warehouseId: purchase.warehouseId,
        quantity: 0,
      });
    }

    // Update stock quantity
    store.quantity += purchase.itemAmount;
    await store.save();

    // Update Item's totalPrice
    const item = purchase.Item;
    item.totalPrice = (item.quantity + purchase.itemAmount) * item.unitPrice;
    await item.save();

    return res.status(200).json({
      message: `Stock updated for item '${item.name}' in warehouse '${purchase.Warehouse.name}'`,
      store: { itemId: store.itemId, warehouseId: store.warehouseId, quantity: store.quantity },
    });
  } catch (error) {
    console.error("Error updating stock after purchase:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Calculate and validate taxes (VAT, excise tax, withholding)
const calculatePurchaseTaxes = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    // Validate purchase
    const purchase = await Purchase.findByPk(purchaseId);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Validate required fields
    if (!purchase.unitPrice || !purchase.itemAmount) {
      return res.status(400).json({ error: "unitPrice and itemAmount are required for tax calculation" });
    }

    // Tax rates (configurable)
    const VAT_RATE = 0.16; // 16% VAT
    const EXCISE_TAX_RATE = 0.05; // 5% excise tax
    const WITHHOLDING_TAX_RATE = 0.02; // 2% withholding tax

    // Calculate taxes
    const subtotal = purchase.unitPrice * purchase.itemAmount;
    const vat = subtotal * VAT_RATE;
    const unitExciseTax = purchase.unitPrice * EXCISE_TAX_RATE;
    const withholdingAmount = subtotal * WITHHOLDING_TAX_RATE;
    const totalPrice = (subtotal + vat + (unitExciseTax * purchase.itemAmount)).toFixed(2);

    // Update purchase with calculated values
    await purchase.update({
      vat,
      unitExciseTax,
      withholdingAmount,
      totalPrice,
    });

    return res.status(200).json({
      message: "Taxes calculated and updated for purchase",
      purchase: {
        id: purchase.id,
        itemAmount: purchase.itemAmount,
        unitPrice: purchase.unitPrice,
        vat,
        unitExciseTax,
        withholdingAmount,
        totalPrice,
      },
    });
  } catch (error) {
    console.error("Error calculating purchase taxes:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Analyze supplier purchase history
const analyzeSupplierPurchases = async (req, res) => {
  try {
    const { supplierId, startDate, endDate } = req.query;

    // Build where clause
    const where = { supplierId };
    if (startDate && endDate) {
      where.date = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    // Fetch purchase history
    const purchases = await Purchase.findAll({
      where,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("itemAmount")), "totalItems"],
        [sequelize.fn("SUM", sequelize.col("totalPrice")), "totalSpent"],
        [sequelize.fn("COUNT", sequelize.col("id")), "purchaseCount"],
      ],
      include: [
        { model: Item, attributes: ["name"] },
        { model: Customer, as: "customer", attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
      ],
      group: ["Item.id", "Item.name", "customer.id", "customer.name", "Warehouse.id", "Warehouse.name"],
      raw: true,
    });

    return res.status(200).json({
      message: "Supplier purchase history analyzed",
      supplierId,
      purchases,
    });
  } catch (error) {
    console.error("Error analyzing supplier purchases:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Track purchase status and notify users
const trackPurchaseStatus = async (req, res) => {
  try {
    const { purchaseId, newStatus } = req.body;

    // Validate inputs
    if (!purchaseId || !newStatus) {
      return res.status(400).json({ error: "purchaseId and newStatus are required" });
    }

    // Validate purchase
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [{ model: Customer, as: "customer" }, { model: Warehouse }],
    });
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Update status
    await purchase.update({ status: newStatus });

    // Notify relevant users (e.g., warehouse managers)
    const users = await User.findAll({
      where: { warehouseId: purchase.warehouseId },
      attributes: ["email"],
    });

    for (const user of users) {
      await sendEmail({
        to: user.email,
        subject: `Purchase Status Update: ${purchase.id}`,
        text: `Purchase for item ${purchase.itemId} from supplier ${purchase.customer.name} in warehouse ${purchase.Warehouse.name} updated to status: ${newStatus}`,
      });
    }

    return res.status(200).json({
      message: `Purchase status updated to '${newStatus}' and users notified`,
      purchase: { id: purchase.id, status: purchase.status },
    });
  } catch (error) {
    console.error("Error tracking purchase status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate purchase before creation
const validatePurchase = async (req, res) => {
  try {
    const { supplierId, itemId, warehouseId, itemAmount, unitPrice } = req.body;

    // Validate required fields
    if (!supplierId || !itemId || !warehouseId || !itemAmount || itemAmount <= 0 || !unitPrice) {
      return res.status(400).json({ error: "supplierId, itemId, warehouseId, itemAmount, and unitPrice are required" });
    }

    // Validate supplier (Customer)
    const supplier = await Customer.findByPk(supplierId);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    // Validate item
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Validate unitPrice alignment with item
    if (unitPrice !== item.unitPrice) {
      return res.status(400).json({ error: `Provided unitPrice (${unitPrice}) does not match item's unitPrice (${item.unitPrice})` });
    }

    return res.status(200).json({
      message: "Purchase is valid and can be created",
      validated: { supplierId, itemId, warehouseId, itemAmount, unitPrice },
    });
  } catch (error) {
    console.error("Error validating purchase:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  updateStockAfterPurchase,
  calculatePurchaseTaxes,
  analyzeSupplierPurchases,
  trackPurchaseStatus,
  validatePurchase,
};