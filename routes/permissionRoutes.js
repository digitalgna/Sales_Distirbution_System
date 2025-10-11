const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permissionController");

// CREATE a new permission
router.post("/", permissionController.createPermission);

// GET all permissions
router.get("/", permissionController.getAllPermissions);

// GET a single permission by ID
router.get("/:id", permissionController.getPermissionById);

// UPDATE a permission by ID
router.put("/:id", permissionController.updatePermission);

// DELETE a permission by ID
router.delete("/:id", permissionController.deletePermission);

module.exports = router;
