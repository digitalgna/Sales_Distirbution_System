const express = require("express");
const router = express.Router();
const stockoutController = require("../controllers/stockoutController");

// CRUD routes
router.post("/", stockoutController.createStockout);
router.get("/", stockoutController.getStockouts);
router.get("/:id", stockoutController.getStockoutById);
router.put("/:id", stockoutController.updateStockout);
router.delete("/:id", stockoutController.deleteStockout);

module.exports = router;
