const express = require("express");
const router = express.Router();
const returnController = require("../controllers/returnController");

// CRUD routes
router.post("/", returnController.createReturn);
router.get("/", returnController.getReturns);

// Important: specific route must be BEFORE dynamic :id
router.get("/user/:userId", returnController.getReturnsByUserId);

router.get("/:id", returnController.getReturnById);
router.put("/:id", returnController.updateReturn);
router.delete("/:id", returnController.deleteReturn);

router.post("/report", returnController.getReturnReport);

module.exports = router;
