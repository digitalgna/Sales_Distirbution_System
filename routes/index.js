const express = require("express");
const router = express.Router();

const permissionRoutes = require("./permissionRoutes");
const roleRoutes = require("./roleRoutes");
const userRoutes = require("./userRoutes");


// Mount routes
router.use("/permission", permissionRoutes);
router.use("/role", roleRoutes);
router.use("/user", userRoutes);


module.exports = router;
