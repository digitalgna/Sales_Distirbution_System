const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");

router.post("/", itemController.createItem);
router.get("/", itemController.getItems);
router.get("/:id", itemController.getItemById);
router.put("/:id", itemController.updateItem);
router.delete("/:id", itemController.deleteItem);
// filters by warehouse and category
router.get("/warehouse/:warehouseId", itemController.getItemsByWarehouse);
router.get("/category/:categoryId", itemController.getItemsByCategory);
//
router.get('/alerts/low-stock-expiration', itemController.checkLowStockAndExpiration);
// Reporting routes
router.get("/report", itemController.getItemReportByDate);


module.exports = router;


