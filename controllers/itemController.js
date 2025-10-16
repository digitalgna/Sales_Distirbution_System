const { Op } = require("sequelize");
const { Item, Category, Warehouse, User } = require("../models/index");

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

//== Additional Features Implementations ==========


// Find items by warehouseId
exports.getItemsByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const items = await Item.findAll({ where: { warehouseId } });

    if (!items.length) {
      return res.status(404).json({ message: "No items found for this warehouse" });
    }

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Find items by categoryId
exports.getItemsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const items = await Item.findAll({ where: { categoryId } });

    if (!items.length) {
      return res.status(404).json({ message: "No items found for this category" });
    }

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Check and alert for low stock or expiring items
exports.checkLowStockAndExpiration = async (req, res) => {
  try {
    const { warehouseId, minQuantityThreshold, daysToExpiration = 30 } = req.query;

    // Build where clause
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (minQuantityThreshold) where.quantity = { [Op.lt]: minQuantityThreshold };
    if (daysToExpiration) {
      const expirationThreshold = new Date();
      expirationThreshold.setDate(expirationThreshold.getDate() + parseInt(daysToExpiration));
      where.expirationDate = { [Op.and]: { [Op.ne]: null, [Op.lte]: expirationThreshold } };
    }

    // Fetch items with low stock or nearing expiration
    const items = await Item.findAll({
      where,
      include: [
        { model: Category, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
      ],
    });

    // Send notifications to users in relevant warehouses
    if (items.length > 0) {
      const warehouseIds = [...new Set(items.map(item => item.warehouseId))];
      const users = await User.findAll({
        where: { warehouseId: { [Op.in]: warehouseIds } },
        attributes: ["email"],
      });

      for (const item of items) {
        const issues = [];
        if (item.quantity < item.minQuantity) {
          issues.push(`Low stock: ${item.quantity} ${item.unit} (below minimum ${item.minQuantity})`);
        }
        if (item.expirationDate && new Date(item.expirationDate) <= new Date(Date.now() + daysToExpiration * 24 * 60 * 60 * 1000)) {
          issues.push(`Nearing expiration: ${item.expirationDate.toISOString().split('T')[0]}`);
        }

        if (issues.length > 0) {
          for (const user of users) {
            await sendEmail({
              to: user.email,
              subject: `Item Alert: ${item.name}`,
              text: `Issues for item '${item.name}' in warehouse '${item.Warehouse.name}':\n${issues.join("\n")}`,
            });
          }
        }
      }
    }

    return res.status(200).json({
      message: "Low stock and expiration check completed",
      items,
    });
  } catch (error) {
    console.error("Error checking low stock and expiration:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// Report: find items created between two dates
exports.getItemReportByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate input
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Please provide startDate and endDate" });
    }

  
    // Query items based on date range
    const items = await Item.findAll({
      where: {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
      },
      order: [["createdAt", "DESC"]],
    });

    if (!items.length) {
      return res.status(404).json({ message: "No items found in this date range" });
    }

    res.status(200).json({
      message: "Item report generated successfully",
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};