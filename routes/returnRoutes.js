const express = require("express");
const router = express.Router();
const returnController = require("../controllers/returnController");

// CRUD routes
router.post("/", returnController.createReturn);
router.get("/", returnController.getReturns);
router.get("/:id", returnController.getReturnById);
router.put("/:id", returnController.updateReturn);
router.delete("/:id", returnController.deleteReturn);
// Return processing routes
router.post('/process', returnController.processReturn);
router.post('/validate', returnController.validateReturn);

// Return analytics and reporting routes
router.get('/analytics/summary', returnController.generateReturnSummary);
router.get('/history', returnController.getReturnHistory);

// Return notification routes
router.post('/notify-status', returnController.notifyReturnStatusChange);

module.exports = router;
