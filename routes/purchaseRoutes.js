const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");

// CRUD routes
router.post("/", purchaseController.createPurchase);
router.get("/", purchaseController.getPurchases);
router.get("/:id", purchaseController.getPurchaseById);
router.put("/:id", purchaseController.updatePurchase);
router.delete("/:id", purchaseController.deletePurchase);
// Purchase stock management routes
router.patch('/:purchaseId/update-stock', purchaseController.updateStockAfterPurchase);

// Purchase tax and calculation routes
router.patch('/:purchaseId/calculate-taxes', purchaseController.calculatePurchaseTaxes);

// Purchase analytics and reporting routes
router.get('/analytics/supplier-purchases', purchaseController.analyzeSupplierPurchases);

// Purchase status and validation routes
router.post('/track-status', purchaseController.trackPurchaseStatus);
router.post('/validate', purchaseController.validatePurchase);

module.exports = router;
