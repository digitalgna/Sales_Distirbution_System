const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");

// CRUD routes
// router.post("/", purchaseController.createPurchase);
router.get("/", purchaseController.getPurchases);
router.get("/:id", purchaseController.getPurchaseById);
router.put("/:id", purchaseController.updatePurchase);
router.delete("/:id", purchaseController.deletePurchase);


// find purchase by different parameters
router.get("/customer/:customerId", purchaseController.getPurchasesByCustomer);
router.get("/item/:itemId", purchaseController.getPurchasesByItem);
router.get("/warehouse/:warehouseId", purchaseController.getPurchasesByWarehouse);

// Reporting routes by date range
router.get("/report/by-date", purchaseController.getPurchaseReportByDate);


module.exports = router;
