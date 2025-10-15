const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");


router.post("/income", reportController.getIncomeReport);
router.post("/profit-loss", reportController.getProfitAnalysis);


module.exports = router;
