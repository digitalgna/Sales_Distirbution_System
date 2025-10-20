const express = require("express");
const router = express.Router();
const stockoutController = require("../controllers/stockoutController");

router.post("/", stockoutController.createStockout);
router.get("/", stockoutController.getAllStockouts);
router.get("/:id", stockoutController.getStockoutById);
router.put("/:id", stockoutController.updateStockout);
router.patch("/:id/status", stockoutController.updateStockoutStatus);
router.delete("/:id", stockoutController.deleteStockout);

// router.post("/filter", stockoutController.filterStockouts);
router.post("/report", stockoutController.getStockoutReport);

module.exports = router;
