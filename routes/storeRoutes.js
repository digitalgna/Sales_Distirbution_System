const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");

// CRUD routes
router.post("/", storeController.createStore);
router.get("/", storeController.getStores);
router.get("/:id", storeController.getStoreById);
router.put("/:id", storeController.updateStore);
router.delete("/:id", storeController.deleteStore);
// Stock management routes

module.exports = router;
