const express = require('express');
const router = express.Router();
const lendingController = require('../controllers/lendingController');

router.post('/', lendingController.createLending);
router.get('/', lendingController.getAllLendings);
router.get('/:id', lendingController.getLendingById);
router.put('/:id', lendingController.updateLending);
router.delete('/:id', lendingController.deleteLending);

// Additional filters
router.get('/user/:userId', lendingController.getLendingsByUser);
router.get('/customer/:customerId', lendingController.getLendingsByCustomer);
router.get('/warehouse/:warehouseId', lendingController.getLendingsByWarehouse);
router.get('/item/:itemId', lendingController.getLendingsByItem);
router.post("/report", lendingController.getLendingReportByDateRange);


module.exports = router;
