const express = require("express");
const router = express.Router();
const balanceSheetController = require("../controllers/balanceSheetController");

// CRUD routes
router.post("/", balanceSheetController.createBalanceSheet);
router.get("/", balanceSheetController.getAllBalanceSheets);
router.get("/:id", balanceSheetController.getBalanceSheetById);
router.put("/:id", balanceSheetController.updateBalanceSheet);
router.delete("/:id", balanceSheetController.deleteBalanceSheet);

module.exports = router;
