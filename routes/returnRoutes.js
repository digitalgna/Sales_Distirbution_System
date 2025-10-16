const express = require("express");
const router = express.Router();
const returnController = require("../controllers/returnController");

// CRUD Routes
router.post("/", returnController.createReturn); // Create a new return
router.get("/", returnController.getAllReturns); // Get all returns
router.get("/:id", returnController.getReturnById); // Get single return
router.put("/:id", returnController.updateReturn); // Update a return
router.delete("/:id", returnController.deleteReturn); // Delete a return

// Additional functionalities
// Filter by item, user, warehouse
router.get("/item/:itemId", returnController.getReturnsByItem);
router.get("/user/:userId", returnController.getReturnsByUser);
router.get("/warehouse/:warehouseId", returnController.getReturnsByWarehouse);

// Report by date range
router.get("/report/by-date", returnController.getReturnReportByDate);

module.exports = router;