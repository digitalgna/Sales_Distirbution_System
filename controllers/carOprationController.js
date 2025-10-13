const CarOperation = require("../models/carOperation");
const Car = require("../models/carInfo");
const User = require("../models/user");

// CREATE a new car operation
exports.createCarOperation = async (req, res) => {
  try {
    const {
      currentMileage,
      previousMileage,
      previousFuel,
      currentFuel,
      actionType,
      serviceCost,
      serviceDate,
      carId,
      userId,
      assignDate
    } = req.body;

    // carId is always required
    if (!carId) return res.status(400).json({ message: "carId is required" });
    const car = await Car.findByPk(carId);
    if (!car) return res.status(404).json({ message: "Car not found" });

    // Action-specific validations
    if (actionType === "service") {
      if (!serviceDate) return res.status(400).json({ message: "serviceDate is required for service action" });
      if (!serviceCost) return res.status(400).json({ message: "serviceCost is required for service action" });
    }

    if (actionType === "assign") {
      if (!userId) return res.status(400).json({ message: "userId is required for assign action" });
      if (!assignDate) return res.status(400).json({ message: "assignDate is required for assign action" });

      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
    }

    // Create operation
    const operation = await CarOperation.create({
      currentMileage,
      previousMileage,
      previousFuel,
      currentFuel,
      actionType,
      serviceCost,
      serviceDate,
      carId,
      userId,
      assignDate
    });

    res.status(201).json(operation);
  } catch (error) {
    res.status(500).json({ message: "Failed to create operation", error: error.message });
  }
};


// GET all operations
exports.getAllCarOperations = async (req, res) => {
  try {
    const operations = await CarOperation.findAll({
      include: [
        {
          model: Car,
          as: "car", 
          attributes: ["carName", "carPlate"]
        },
        {
          model: User,
          attributes: ["id", "fullName"]
        }
      ]
    });

    res.status(200).json(operations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch operations", error: error.message });
  }
};

// GET operation by ID
exports.getCarOperationById = async (req, res) => {
  try {
    const { id } = req.params;
    const operation = await CarOperation.findByPk(id, {
      include: [
        { model: Car },
        { model: User }
      ]
    });
    if (!operation) return res.status(404).json({ message: "Operation not found" });
    res.status(200).json(operation);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch operation", error: error.message });
  }
};

// UPDATE operation by ID
exports.updateCarOperation = async (req, res) => {
  try {
    const { id } = req.params;
    const operation = await CarOperation.findByPk(id);
    if (!operation) return res.status(404).json({ message: "Operation not found" });

    await operation.update(req.body);
    res.status(200).json(operation);
  } catch (error) {
    res.status(500).json({ message: "Failed to update operation", error: error.message });
  }
};

// DELETE operation by ID
exports.deleteCarOperation = async (req, res) => {
  try {
    const { id } = req.params;
    const operation = await CarOperation.findByPk(id);
    if (!operation) return res.status(404).json({ message: "Operation not found" });

    await operation.destroy();
    res.status(200).json({ message: "Operation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete operation", error: error.message });
  }
};

/* ----------------- ADDITIONAL ENDPOINTS ----------------- */

// Get all operations for a specific car
exports.getOperationsByCar = async (req, res) => {
  try {
    const { carId } = req.params;
    const operations = await CarOperation.findAll({
      where: { carId },
      include: [ { model: User } ]
    });
    res.status(200).json(operations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch operations", error: error.message });
  }
};

// Get all operations for a specific user
exports.getOperationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const operations = await CarOperation.findAll({
      where: { userId },
      include: [ { model: Car } ]
    });
    res.status(200).json(operations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch operations", error: error.message });
  }
};

// Get operations filtered by actionType
exports.getOperationsByActionType = async (req, res) => {
  try {
    const { actionType } = req.params;
    const operations = await CarOperation.findAll({
      where: { actionType },
      include: [ { model: Car }, { model: User } ]
    });
    res.status(200).json(operations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch operations", error: error.message });
  }
};

// Get latest operation for a car
exports.getLatestOperationByCar = async (req, res) => {
  try {
    const { carId } = req.params;
    const operation = await CarOperation.findOne({
      where: { carId },
      order: [["createdAt", "DESC"]],
      include: [ { model: User } ]
    });
    if (!operation) return res.status(404).json({ message: "No operations found for this car" });
    res.status(200).json(operation);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch latest operation", error: error.message });
  }
};
