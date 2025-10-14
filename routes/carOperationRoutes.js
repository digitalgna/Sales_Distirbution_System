const express = require("express");
const router = express.Router();
const carOperationController = require("../controllers/carOprationController");

// CRUD
router.post("/", carOperationController.createCarOperation);
router.get("/", carOperationController.getAllCarOperations);
router.get("/:id", carOperationController.getCarOperationById);
router.put("/:id", carOperationController.updateCarOperation);
router.delete("/:id", carOperationController.deleteCarOperation);

// Additional endpoints
router.get("/car/:carId", carOperationController.getOperationsByCar);
router.get("/user/:userId", carOperationController.getOperationsByUser);
router.get("/action/:actionType", carOperationController.getOperationsByActionType);
router.get("/latest/car/:carId", carOperationController.getLatestOperationByCar);

module.exports = router;
