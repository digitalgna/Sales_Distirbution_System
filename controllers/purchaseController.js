const Purchase = require("../models/purchase");
const Customer = require("../models/customer");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse"); // double-check spelling

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
