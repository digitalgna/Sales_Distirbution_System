const express = require("express");
const router = express.Router();

const permissionRoutes = require("./permissionRoutes");
const roleRoutes = require("./roleRoutes");
const userRoutes = require("./userRoutes");

const itemRoutes = require("./itemRoutes");
const categoryRoutes = require("./categoryRoutes");
const warehouseRoutes = require("./warehouseRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const stockoutRoutes = require("./stockoutRoutes");
const returnRoutes = require("./returnRoutes");
const storeRoutes = require("./storeRoutes");

const expenseRoutes = require("./expenseRoutes");
const carRoutes = require("./carRoutes");
const carOperationRoutes = require("./carOperationRoutes");
const customerRoutes = require("./customerRoutes");
const balanceRoutes = require("./balanceRoutes");
const salesRoutes = require("./salesRoutes");
const lendingRoutes = require("./lendingRoutes");
const reportRoutes = require("./reportRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const fsRoutes = require("./fsRoutes");
const balanceSheetRoutes = require("./balanceSheetRoutes");


// Mount routes
router.use("/permission", permissionRoutes);
router.use("/role", roleRoutes);
router.use("/user", userRoutes);

router.use("/item", itemRoutes);
router.use("/category", categoryRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/purchase", purchaseRoutes);
router.use("/stockout", stockoutRoutes);
router.use("/return", returnRoutes);
router.use("/store", storeRoutes);

router.use("/expense", expenseRoutes);
router.use("/carInfo", carRoutes);
router.use("/car-operation", carOperationRoutes);
router.use("/customer", customerRoutes);
router.use("/balance", balanceRoutes);
router.use("/sales", salesRoutes);
router.use("/lending", lendingRoutes);
router.use("/report", reportRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/machinfs", fsRoutes);
router.use("/balance-sheet", balanceSheetRoutes);


module.exports = router;
