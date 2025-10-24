const express = require("express");
const router = express.Router();
const returnController = require("../controllers/returnController");

// CRUD routes
router.post("/", returnController.createReturn);
router.get("/", returnController.getReturns);
router.get("/:id", returnController.getReturnById);
router.get("/user/:userId", returnController.getReturnsByUserId);
router.put("/:id", returnController.updateReturn);
router.delete("/:id", returnController.deleteReturn);

router.post("/report", returnController.getReturnReport);

module.exports = router;
