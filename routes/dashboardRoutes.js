const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard");
const { isAuthenticated } = require("../middleware/auth");

// Admin dashboard routes
router.get("/",  dashboardController.getDashboard);
router.post("/",  dashboardController.getDashboard);

//sales dashboard
router.get("/sales/:userId",  dashboardController.getSalesDashboard);
module.exports = router;
