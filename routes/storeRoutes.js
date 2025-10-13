const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");

// CRUD routes
router.post("/", storeController.createStore);
router.get("/", storeController.getStores);
router.get("/:id", storeController.getStoreById);
router.put("/:id", storeController.updateStore);
router.delete("/:id", storeController.deleteStore);
// Stock management routes
router.post('/adjust-quantity', storeController.adjustStockQuantity);
router.post('/transfer', storeController.transferStock);

// Stock monitoring and alert routes
router.get('/alerts/low-stock', storeController.checkLowStock);

// Stock analytics and reporting routes
router.get('/analytics/summary', storeController.generateStockSummary);
router.get('/history', storeController.getStockHistory);

module.exports = router;
