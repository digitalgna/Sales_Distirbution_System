const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// CRUD routes
router.post("/", categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
// Category analytics and reporting routes
router.get('/analytics/distribution', categoryController.analyzeCategoryItemDistribution);
router.get('/analytics/inventory-report', categoryController.generateCategoryInventoryReport);

// Category management routes
router.get('/:categoryId/validate-usage', categoryController.validateCategoryUsage);
router.post('/merge', categoryController.mergeCategories);
router.post('/notify-changes', categoryController.notifyCategoryChanges);

module.exports = router;
