const Item = require("../models/item");
const Category = require("../models/category");
const Warehouse = require("../models/wharehouse"); 
const { Op } = require("sequelize");

// ✅ CREATE ITEM
exports.createItem = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      quantity,
      unit,
      unitPrice,
      salePrice,
      minQuantity,
      description,
      warehouseId,
      expirationDate,
    } = req.body;

    // Basic validation
    if (!categoryId || !name || !unit || !unitPrice || !minQuantity || !warehouseId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if category and warehouse exist
    const category = await Category.findByPk(categoryId);
    const warehouse = await Warehouse.findByPk(warehouseId);

    if (!category || !warehouse) {
      return res.status(404).json({ message: "Category or Warehouse not found" });
    }

    // Calculate total price
    const totalPrice = quantity * unitPrice;

    const newItem = await Item.create({
      categoryId,
      name,
      quantity,
      unit,
      unitPrice,
      totalPrice,
      salePrice,
      minQuantity,
      description,
      warehouseId,
      expirationDate,
    });

    res.status(201).json({ message: "Item created successfully", data: newItem });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL ITEMS (with optional filters)
exports.getItems = async (req, res) => {
  try {
    const { search, categoryId, warehouseId } = req.query;

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const items = await Item.findAll({
      where,
      include: [
        { model: Category, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE ITEM
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findByPk(id, {
      include: [
        { model: Category, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });

    if (!item) return res.status(404).json({ message: "Item not found" });

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE ITEM
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Recalculate total price if unitPrice or quantity changed
    if (updates.unitPrice || updates.quantity) {
      const newQuantity = updates.quantity ?? item.quantity;
      const newUnitPrice = updates.unitPrice ?? item.unitPrice;
      updates.totalPrice = newQuantity * newUnitPrice;
    }

    await item.update(updates);
    res.status(200).json({ message: "Item updated successfully", data: item });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE ITEM
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    await item.destroy();
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
