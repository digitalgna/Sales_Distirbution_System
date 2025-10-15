const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// CRUD routes
router.post("/", categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);


// Additional functionalities

// Item count per category
router.get("/item-count", categoryController.getCategoryItemCount);

// Category report (items, sales, returns)
router.get("/report", categoryController.getCategoryReport);

// Category analytics and reporting routes
router.get('/analytics/inventory-report', categoryController.generateCategoryInventoryReport);


module.exports = router;
