const express = require("express");
const router = express.Router();
const returnController = require("../controllers/returnController");

// CRUD routes
router.post("/", returnController.createReturn);
router.get("/", returnController.getReturns);
router.get("/:id", returnController.getReturnById);
router.put("/:id", returnController.updateReturn);
router.delete("/:id", returnController.deleteReturn);

module.exports = router;
