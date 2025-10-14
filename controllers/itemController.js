const { Op } = require("sequelize");
const { Item, Category, Warehouse, Store, Sales, Lending, Purchase, Stockout, Return, User } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

// ✅ CREATE ITEM
const createItem = async (req, res) => {
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
const getItems = async (req, res) => {
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
const getItemById = async (req, res) => {
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

const updateItem = async (req, res) => {
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
const deleteItem = async (req, res) => {
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

// Calculate and update total price based on quantity and unit price
const updateItemTotalPrice = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Validate item
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Calculate total price
    const totalPrice = (item.quantity * item.unitPrice).toFixed(2);

    // Update item
    item.totalPrice = totalPrice;
    await item.save();

    return res.status(200).json({
      message: `Total price updated for item '${item.name}'`,
      item: { id: item.id, name: item.name, totalPrice },
    });
  } catch (error) {
    console.error("Error updating item total price:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Check and alert for low stock or expiring items
const checkLowStockAndExpiration = async (req, res) => {
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

// Generate item transaction report (sales, lendings, purchases, stockouts, returns)
const generateItemTransactionReport = async (req, res) => {
  try {
    const { itemId, warehouseId, startDate, endDate } = req.query;

    // Validate item
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Build date filter
    const dateFilter = startDate && endDate ? { createdAt: { [Op.between]: [new Date(startDate), new Date(endDate)] } } : {};

    // Build where clause for warehouse
    const warehouseFilter = warehouseId ? { warehouseId } : {};

    // Fetch transactions
    const sales = await Sales.findAll({
      where: { itemId, ...dateFilter },
      attributes: ["id", "quantity", "createdAt"],
    });

    const lendings = await Lending.findAll({
      where: { itemId, ...warehouseFilter, ...dateFilter },
      attributes: ["id", "quantity", "createdAt"],
    });

    const purchases = await Purchase.findAll({
      where: { itemId, ...warehouseFilter, ...dateFilter },
      attributes: ["id", "quantity", "createdAt"],
    });

    const stockouts = await Stockout.findAll({
      where: { itemId, ...warehouseFilter, ...dateFilter },
      attributes: ["id", "amount", "sponsor", "createdAt"],
    });

    const returns = await Return.findAll({
      where: { itemId, ...warehouseFilter, ...dateFilter },
      attributes: ["id", "quantity", "createdAt"],
    });

    return res.status(200).json({
      item: { id: item.id, name: item.name },
      transactions: {
        sales: sales.map(s => ({ type: "Sale", id: s.id, quantity: s.quantity, date: s.createdAt })),
        lendings: lendings.map(l => ({ type: "Lending", id: l.id, quantity: l.quantity, date: l.createdAt })),
        purchases: purchases.map(p => ({ type: "Purchase", id: p.id, quantity: p.quantity, date: p.createdAt })),
        stockouts: stockouts.map(s => ({ type: "Stockout", id: s.id, amount: s.amount, sponsor: s.sponsor, date: s.createdAt })),
        returns: returns.map(r => ({ type: "Return", id: r.id, quantity: r.quantity, date: r.createdAt })),
      },
    });
  } catch (error) {
    console.error("Error generating item transaction report:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Reassign item to a new category or warehouse
const reassignItem = async (req, res) => {
  try {
    const { itemId, newCategoryId, newWarehouseId } = req.body;

    // Validate inputs
    if (!itemId || (!newCategoryId && !newWarehouseId)) {
      return res.status(400).json({ error: "itemId and at least one of newCategoryId or newWarehouseId are required" });
    }

    // Validate item
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Validate new category if provided
    if (newCategoryId) {
      const category = await Category.findByPk(newCategoryId);
      if (!category) {
        return res.status(404).json({ error: "New category not found" });
      }
    }

    // Validate new warehouse and update Store if provided
    if (newWarehouseId) {
      const warehouse = await Warehouse.findByPk(newWarehouseId);
      if (!warehouse) {
        return res.status(404).json({ error: "New warehouse not found" });
      }

      // Update Store records
      const store = await Store.findOne({ where: { itemId, warehouseId: item.warehouseId } });
      if (store) {
        await sequelize.transaction(async (t) => {
          await Store.update(
            { warehouseId: newWarehouseId },
            { where: { itemId, warehouseId: item.warehouseId }, transaction: t }
          );
        });
      }
    }

    // Update item
    await item.update({
      categoryId: newCategoryId || item.categoryId,
      warehouseId: newWarehouseId || item.warehouseId,
    });

    return res.status(200).json({
      message: `Item '${item.name}' reassigned successfully`,
      item: { id: item.id, name: item.name, categoryId: item.categoryId, warehouseId: item.warehouseId },
    });
  } catch (error) {
    console.error("Error reassigning item:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate item before transaction (e.g., sale, lending, stockout)
const validateItemForTransaction = async (req, res) => {
  try {
    const { itemId, quantity, transactionType } = req.body;

    // Validate inputs
    if (!itemId || !quantity || quantity <= 0 || !transactionType) {
      return res.status(400).json({ error: "itemId, quantity, and transactionType are required" });
    }

    // Validate item
    const item = await Item.findByPk(itemId, {
      include: [{ model: Store, attributes: ["quantity"] }],
    });
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check stock availability
    const store = item.Stores[0];
    if (!store || store.quantity < quantity) {
      return res.status(400).json({ error: `Insufficient stock for item '${item.name}' (available: ${store?.quantity || 0})` });
    }

    // Check expiration for sales or lendings
    if (["sale", "lending"].includes(transactionType.toLowerCase()) && item.expirationDate && new Date(item.expirationDate) < new Date()) {
      return res.status(400).json({ error: `Item '${item.name}' is expired (expiration date: ${item.expirationDate.toISOString().split('T')[0]})` });
    }

    return res.status(200).json({
      message: `Item '${item.name}' is valid for ${transactionType}`,
      item: { id: item.id, name: item.name, availableQuantity: store.quantity },
    });
  } catch (error) {
    console.error("Error validating item for transaction:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  updateItemTotalPrice,
  checkLowStockAndExpiration,
  generateItemTransactionReport,
  reassignItem,
  validateItemForTransaction,
};