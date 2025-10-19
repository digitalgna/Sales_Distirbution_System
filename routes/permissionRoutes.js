const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permissionController");


router.post("/", permissionController.createPermission);
router.get("/", permissionController.getAllPermissions);
router.get("/:id", permissionController.getPermissionById);
router.put("/:id", permissionController.updatePermission);
router.delete("/:id", permissionController.deletePermission);
router.get("/role/:roleId", permissionController.getPermissionsByRole);
module.exports = router;
