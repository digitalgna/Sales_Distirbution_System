const express = require("express");
const router = express.Router();
const carController = require("../controllers/carController");
const upload = require("../middleware/carUpload"); 

// CRUD routes
router.post("/", upload.array("carFiles", 5), carController.createCar); // max 10 files
router.get("/", carController.getAllCars);
router.get("/:id", carController.getCarById);
router.put("/:id", upload.array("carFiles", 5), carController.updateCar);
router.delete("/:id", carController.deleteCar);

module.exports = router;
