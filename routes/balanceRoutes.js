const express = require("express");
const router = express.Router();
const balanceController = require("../controllers/balanceController");

// CRUD routes
router.get("/", balanceController.getAllBalances);
router.get("/:id", balanceController.getBalanceById);
router.post("/", balanceController.createBalance);
router.put("/:id", balanceController.updateBalance);
router.delete("/:id", balanceController.deleteBalance);

module.exports = router;
