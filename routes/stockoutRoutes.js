const express = require("express");
const router = express.Router();
const stockoutController = require("../controllers/stockoutController");

// CRUD routes
router.post("/", stockoutController.createStockout);
router.get("/", stockoutController.getStockouts);
router.get("/:id", stockoutController.getStockoutById);
router.put("/:id", stockoutController.updateStockout);
router.delete("/:id", stockoutController.deleteStockout);
// Stockout validation and processing routes
router.post('/validate-stock', stockoutController.validateStockAvailability);
router.post('/validate-link', stockoutController.linkStockoutToSaleOrCar);
router.post('/calculate-bonus', stockoutController.calculateStockoutBonus);

// Stockout analytics and reporting routes
router.get('/analytics/summary', stockoutController.generateStockoutSummary);
router.get('/history', stockoutController.getStockoutHistory);

// Stockout management routes
router.post('/send-alerts', stockoutController.sendStockoutAlerts);
router.post('/reconcile-return', stockoutController.reconcileStockoutWithReturn);

module.exports = router;
