const { Op  } = require("sequelize");
const { Category, Item, Store, Warehouse } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

// ✅ CREATE CATEGORY
exports.createCategory = async (req, res) => {
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

// ✅ READ ALL CATEGORIES 
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE CATEGORY
exports.getCategoryById = async (req, res) => {
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
exports.updateCategory = async (req, res) => {
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



//== Additional Features Implementations ==========


//  * 2️⃣ Get item count per category

exports.getCategoryItemCount = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: [
        "id",
        "name",
        [fn("COUNT", col("Items.id")), "itemCount"],
      ],
      include: [
        { model: Item, attributes: [] } // Only for counting
      ],
      group: ["Category.id"],
    });

    res.json({ message: "Item count per category fetched", data: categories });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch item count", error: error.message });
  }
};


// 3️⃣ Category reporting (items, sales, returns)
exports.getCategoryReport = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ["id", "name"],
      include: [
        {
          model: Item,
          attributes: ["id", "name"],
          include: [
            {
              model: Sales,
              attributes: [[fn("SUM", col("Sales.quantity")), "totalSales"]],
            },
            {
              model: Return,
              attributes: [[fn("SUM", col("Returns.returnQuantity")), "totalReturns"]],
            },
          ],
        },
      ],
      group: ["Category.id", "Items.id", "Items->Sales.id", "Items->Returns.id"],
    });

    res.json({ message: "Category report fetched", data: categories });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch category report", error: error.message });
  }
};


// ✅ DELETE CATEGORY
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const itemCount = await Item.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return res.status(400).json({
        message: "Cannot delete category. Items exist under this category.",
      });
    }

    const deleted = await Category.destroy({ where: { id } });
    if (deleted) {
      res.json({ message: "Category deleted successfully" });
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category", error: error.message });
  }
};


// Analyze item distribution across categories
exports.analyzeCategoryItemDistribution = async (req, res) => {
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

// Generate category inventory report
exports.generateCategoryInventoryReport = async (req, res) => {
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

