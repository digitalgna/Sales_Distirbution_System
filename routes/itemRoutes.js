const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");

router.post("/", itemController.createItem);
router.get("/", itemController.getItems);
router.get("/:id", itemController.getItemById);
router.put("/:id", itemController.updateItem);
router.delete("/:id", itemController.deleteItem);
// Item pricing routes
router.patch('/:itemId/update-total-price', itemController.updateItemTotalPrice);

// Item analytics and monitoring routes
router.get('/alerts/low-stock-expiration', itemController.checkLowStockAndExpiration);
router.get('/:itemId/transaction-report', itemController.generateItemTransactionReport);

// Item management routes
router.post('/reassign', itemController.reassignItem);
router.post('/validate-transaction', itemController.validateItemForTransaction);

module.exports = router;
