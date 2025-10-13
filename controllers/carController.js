const Car = require("../models/carInfo");

// Helper function to build full file URLs
const buildFileUrls = (req, files) => {
  if (!files) return [];
  // If files is a string, parse it
  const arr = typeof files === "string" ? JSON.parse(files) : files;
  return arr.map(file => `${req.protocol}://${req.get("host")}/uploads/${file}`);
};

// CREATE a new car
exports.createCar = async (req, res) => {
  try {
    const { carName, carPlate, carModel, driverName, driverPhone } = req.body;

    let filesArray = [];
    if (req.files && req.files.length > 0) {
      filesArray = req.files.map(file => file.filename);
    }

    const car = await Car.create({
      carName,
      carPlate,
      carModel,
      driverName,
      driverPhone,
      carFiles: filesArray
    });

    // Return car with full file URLs
    const response = car.toJSON();
    response.carFiles = buildFileUrls(req, car.carFiles);

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: "Failed to create car", error: error.message });
  }
};

// GET all cars
exports.getAllCars = async (req, res) => {
  try {
    const cars = await Car.findAll();

    const response = cars.map(car => {
      const obj = car.toJSON();
      obj.carFiles = buildFileUrls(req, car.carFiles);
      return obj;
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cars", error: error.message });
  }
};

// GET single car by ID
exports.getCarById = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await Car.findByPk(id);
    if (!car) return res.status(404).json({ message: "Car not found" });

    const response = car.toJSON();
    response.carFiles = buildFileUrls(req, car.carFiles);

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch car", error: error.message });
  }
};

// UPDATE car by ID
exports.updateCar = async (req, res) => {
  try {
    const { id } = req.params;
    const { carName, carPlate, carModel, driverName, driverPhone } = req.body;

    const car = await Car.findByPk(id);
    if (!car) return res.status(404).json({ message: "Car not found" });

    let filesArray = typeof car.carFiles === "string" ? JSON.parse(car.carFiles) : car.carFiles || [];

    if (req.files && req.files.length > 0) {
      // Replace files with new uploaded files
      filesArray = req.files.map(file => file.filename);
    }

    await car.update({
      carName,
      carPlate,
      carModel,
      driverName,
      driverPhone,
      carFiles: filesArray
    });

    const response = car.toJSON();
    response.carFiles = buildFileUrls(req, car.carFiles);

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: "Failed to update car", error: error.message });
  }
};

// DELETE car by ID
exports.deleteCar = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await Car.findByPk(id);
    if (!car) return res.status(404).json({ message: "Car not found" });

    await car.destroy();
    res.status(200).json({ message: "Car deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete car", error: error.message });
  }
};
