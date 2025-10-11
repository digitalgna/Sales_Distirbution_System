const express = require("express");
const router = express.Router();

const permissionRoutes = require("./permissionRoutes");
const itemRoutes = require("./itemRoutes");
const categoryRoutes = require("./categoryRoutes");
const warehouseRoutes = require("./warehouseRoutes");


// Mount routes
router.use("/permission", permissionRoutes);
router.use("/item", itemRoutes);
router.use("/category", categoryRoutes);
router.use("/warehouse", warehouseRoutes);


module.exports = router;
