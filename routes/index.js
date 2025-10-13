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
router.use("/items", itemRoutes);
router.use("/categories", categoryRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/stockouts", stockoutRoutes);
router.use("/returns", returnRoutes);
router.use("/stores", storeRoutes);


module.exports = router;
