const express = require("express");
const router = express.Router();

const permissionRoutes = require("./permissionRoutes");
const itemRoutes = require("./itemRoutes");
const categoryRoutes = require("./categoryRoutes");
const warehouseRoutes = require("./warehouseRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const stockoutRoutes = require("./stockoutRoutes");
const returnRoutes = require("./returnRoutes");
const storeRoutes = require("./storeRoutes");



// Mount routes
router.use("/permission", permissionRoutes);
router.use("/item", itemRoutes);
router.use("/category", categoryRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/purchase", purchaseRoutes);
router.use("/stockout", stockoutRoutes);
router.use("/return", returnRoutes);
router.use("/store", storeRoutes);


module.exports = router;
