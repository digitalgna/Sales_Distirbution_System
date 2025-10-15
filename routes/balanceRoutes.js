const express = require("express");
const router = express.Router();
const balanceController = require("../controllers/balanceController");

// CRUD routes
router.get("/", balanceController.getAllBalances);
router.get("/:id", balanceController.getBalanceById);
router.post("/", balanceController.createBalance);
router.put("/:id", balanceController.updateBalance);
router.delete("/:id", balanceController.deleteBalance);

router.get("/customer/:customerId", balanceController.getAllBalancesByCustomer);
router.get("/item/:itemId", balanceController.getAllBalancesByItem);

module.exports = router;
