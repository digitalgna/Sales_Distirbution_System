const { Op } = require("sequelize");
const { Category, Item, Store, Warehouse } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

// ✅ CREATE CATEGORY
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const newCategory = await Category.create({ name, description });
    res.status(201).json({ message: "Category created successfully", data: newCategory });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE CATEGORY
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE CATEGORY
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    await category.update(updates);
    res.status(200).json({ message: "Category updated successfully", data: category });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE CATEGORY
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    await category.destroy();
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//== Additional Features Implementations ==========

// Analyze item distribution across categories
const analyzeCategoryItemDistribution = async (req, res) => {
  try {
    // Fetch all categories with associated items count
    const categories = await Category.findAll({
      attributes: [
        "id",
        "name",
        [sequelize.fn("COUNT", sequelize.col("Items.id")), "itemCount"],
      ],
      include: [
        {
          model: Item,
          attributes: [],
          required: false, // Left join to include categories with no items
        },
      ],
      group: ["Category.id", "Category.name"],
      raw: true,
    });

    // Calculate total items across all categories
    const totalItems = categories.reduce((sum, category) => sum + parseInt(category.itemCount), 0);

    // Calculate percentage distribution
    const distribution = categories.map(category => ({
      id: category.id,
      name: category.name,
      itemCount: parseInt(category.itemCount),
      percentage: totalItems > 0 ? ((category.itemCount / totalItems) * 100).toFixed(2) + "%" : "0%",
    }));

    return res.status(200).json({
      message: "Category item distribution analyzed",
      totalItems,
      distribution,
    });
  } catch (error) {
    console.error("Error analyzing category item distribution:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate category usage before deletion
const validateCategoryUsage = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate category
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category is associated with any items
    const itemCount = await Item.count({ where: { categoryId } });
    if (itemCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category '${category.name}' as it is associated with ${itemCount} item(s)`,
      });
    }

    return res.status(200).json({
      message: `Category '${category.name}' is safe to delete (no associated items)`,
    });
  } catch (error) {
    console.error("Error validating category usage:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Generate category inventory report
const generateCategoryInventoryReport = async (req, res) => {
  try {
    const { categoryId, warehouseId } = req.query;

    // Build where clause for items
    const itemWhere = categoryId ? { categoryId } : {};

    // Fetch categories with associated items and stock
    const categories = await Category.findAll({
      attributes: ["id", "name"],
      include: [
        {
          model: Item,
          attributes: ["id", "name"],
          where: itemWhere,
          include: [
            {
              model: Store,
              attributes: [[sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"]],
              where: warehouseId ? { warehouseId } : {},
              required: false,
              include: [{ model: Warehouse, attributes: ["name"] }],
            },
          ],
        },
      ],
      group: ["Category.id", "Category.name", "Items.id", "Items.name", "Items->Stores.id", "Items->Stores->Warehouse.name"],
      raw: true,
    });

    // Format the report
    const report = categories.reduce((acc, row) => {
      const category = acc.find(c => c.id === row["id"]);
      if (!category) {
        acc.push({
          id: row["id"],
          name: row["name"],
          items: row["Items.id"] ? [{
            id: row["Items.id"],
            name: row["Items.name"],
            totalQuantity: parseInt(row["Items.Stores.totalQuantity"] || 0),
            warehouse: row["Items.Stores.Warehouse.name"] || null,
          }] : [],
        });
      } else if (row["Items.id"]) {
        category.items.push({
          id: row["Items.id"],
          name: row["Items.name"],
          totalQuantity: parseInt(row["Items.Stores.totalQuantity"] || 0),
          warehouse: row["Items.Stores.Warehouse.name"] || null,
        });
      }
      return acc;
    }, []);

    return res.status(200).json({
      message: "Category inventory report generated",
      report,
    });
  } catch (error) {
    console.error("Error generating category inventory report:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Merge categories (move items to a target category)
const mergeCategories = async (req, res) => {
  try {
    const { sourceCategoryId, targetCategoryId } = req.body;

    // Validate inputs
    if (!sourceCategoryId || !targetCategoryId) {
      return res.status(400).json({ error: "sourceCategoryId and targetCategoryId are required" });
    }
    if (sourceCategoryId === targetCategoryId) {
      return res.status(400).json({ error: "Source and target categories must be different" });
    }

    // Verify categories exist
    const sourceCategory = await Category.findByPk(sourceCategoryId);
    const targetCategory = await Category.findByPk(targetCategoryId);
    if (!sourceCategory || !targetCategory) {
      return res.status(404).json({ error: "Source or target category not found" });
    }

    // Move items to target category
    await Item.update(
      { categoryId: targetCategoryId },
      { where: { categoryId: sourceCategoryId } }
    );

    // Optionally delete source category (if empty)
    const itemCount = await Item.count({ where: { categoryId: sourceCategoryId } });
    if (itemCount === 0) {
      await sourceCategory.destroy();
    }

    return res.status(200).json({
      message: `Items moved from category '${sourceCategory.name}' to '${targetCategory.name}'`,
      deletedSource: itemCount === 0,
    });
  } catch (error) {
    console.error("Error merging categories:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Notify users of category changes
const notifyCategoryChanges = async (req, res) => {
  try {
    const { categoryId, message } = req.body;

    // Validate inputs
    if (!categoryId || !message) {
      return res.status(400).json({ error: "categoryId and message are required" });
    }

    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Find users associated with warehouses containing items in this category
    const items = await Item.findAll({
      where: { categoryId },
      include: [{ model: Store, attributes: ["warehouseId"] }],
    });

    const warehouseIds = [...new Set(items.flatMap(item => item.Stores.map(store => store.warehouseId)))];
    const users = await User.findAll({
      where: { warehouseId: { [Op.in]: warehouseIds } },
      attributes: ["email"],
    });

    // Send notifications
    for (const user of users) {
      await sendEmail({
        to: user.email,
        subject: `Update for Category: ${category.name}`,
        text: `Category '${category.name}' update: ${message}`,
      });
    }

    return res.status(200).json({
      message: `Notifications sent for category '${category.name}'`,
      notifiedUsers: users.length,
    });
  } catch (error) {
    console.error("Error notifying category changes:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  analyzeCategoryItemDistribution,
  validateCategoryUsage,
  generateCategoryInventoryReport,
  mergeCategories,
  notifyCategoryChanges,
};