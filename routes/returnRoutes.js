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
router.patch("/:id/status", returnController.changeReturnStatus); // Approve or reject a return

// Reporting
router.get("/report/summary", returnController.getReturnReport); // Generate return report

module.exports = router;