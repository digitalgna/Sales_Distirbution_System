const express = require('express');
const router = express.Router();
const zbalanceController = require('../controllers/zbalanceController');

// Create a new Zbalance record
router.post('/', zbalanceController.createZbalance);

router.get('/', zbalanceController.getAllZbalances);
router.get('/:id', zbalanceController.getZbalanceById);
router.get('/user/:userId', zbalanceController.getZbalancesByUser);
// router.get('/date/:date', zbalanceController.getZbalanceByDate);

router.put('/:id', zbalanceController.updateZbalance);

router.delete('/:id', zbalanceController.deleteZbalance);

module.exports = router;
