const express = require("express");
const router = express.Router();
const stockoutController = require("../controllers/stockoutController");

// CRUD routes
router.post("/", stockoutController.createStockout);
router.get("/", stockoutController.getStockouts);
router.get("/:id", stockoutController.getStockoutById);
router.put("/:id", stockoutController.updateStockout);
router.delete("/:id", stockoutController.deleteStockout);

// Stockout filtering by sales and car
router.get("/sales/:salesId", stockoutController.getStockoutsBySales);
router.get("/car/:carId", stockoutController.getStockoutsByCar);

// Reporting by date range
router.get("/report/by-date", stockoutController.generateStockoutReport);

module.exports = router;
