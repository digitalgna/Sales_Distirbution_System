const express = require("express");
const router = express.Router();
const balanceSheetController = require("../controllers/balanceSheetController");

// Create a new balance sheet record
router.post("/", balanceSheetController.createBalanceSheet);

// Get balance sheet records with optional grouping and pagination
router.get("/", balanceSheetController.getBalanceSheets);

// Get a single balance sheet record by ID
router.get("/:id", balanceSheetController.getBalanceSheetById);

// Update a balance sheet record by ID
router.put("/:id", balanceSheetController.updateBalanceSheet);

// Delete a balance sheet record by ID
router.delete("/:id", balanceSheetController.deleteBalanceSheet);

module.exports = router;
