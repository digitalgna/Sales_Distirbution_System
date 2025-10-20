const express = require("express");
const router = express.Router();
const warehouseController = require("../controllers/wharehouseController");

// CRUD routes
router.post("/", warehouseController.createWarehouse);
router.get("/", warehouseController.getWarehouses);
router.get("/:id", warehouseController.getWarehouseById);
router.put("/:id", warehouseController.updateWarehouse);
router.delete("/:id", warehouseController.deleteWarehouse);
// Warehouse capacity and health routes
router.get('/:warehouseId/capacity', warehouseController.checkWarehouseCapacity);
router.get('/:warehouseId/health', warehouseController.monitorWarehouseHealth);

// Warehouse inventory and activity routes
router.get('/:warehouseId/inventory-overview', warehouseController.getWarehouseInventoryOverview);
router.get('/:warehouseId/activity-log', warehouseController.getWarehouseActivityLog);

// Warehouse management routes
router.post('/assign-users', warehouseController.assignUsersToWarehouse);



module.exports = router;