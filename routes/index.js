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


// Mount routes
router.use("/permission", permissionRoutes);
router.use("/item", itemRoutes);
router.use("/category", categoryRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/purchase", purchaseRoutes);
router.use("/stockout", stockoutRoutes);
router.use("/return", returnRoutes);
router.use("/store", storeRoutes);
router.use("/user", userRoutes);
router.use("/role", roleRoutes);
router.use("/expense", expenseRoutes);
router.use("/car", carRoutes);
router.use("/car-operation", carOperationRoutes);
router.use("/customer", customerRoutes);
router.use("/balance", balanceRoutes);
router.use("/sales", salesRoutes);
router.use("/lending", lendingRoutes);

module.exports = router;
