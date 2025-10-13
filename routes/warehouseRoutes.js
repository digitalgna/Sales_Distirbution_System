const express = require("express");
const router = express.Router();
const warehouseController = require("../controllers/wharehouseController");

// CRUD routes
router.post("/", warehouseController.createWarehouse);
router.get("/", warehouseController.getWarehouses);
router.get("/:id", warehouseController.getWarehouseById);
router.put("/:id", warehouseController.updateWarehouse);
router.delete("/:id", warehouseController.deleteWarehouse);

module.exports = router;
