const express = require("express");
const router = express.Router();

const permissionRoutes = require("./permissionRoutes");


// Mount routes
router.use("/permission", permissionRoutes);

module.exports = router;
