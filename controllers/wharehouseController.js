const { Warehouse } = require("../models/index");
const { Op } = require("sequelize");// is this needed? 


exports.createWarehouse = async (req, res) => {
  try {
    const { name, address, size } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Warehouse name is required" });
    }

    const newWarehouse = await Warehouse.create({ name, address, size });
    res.status(201).json({ message: "Warehouse created successfully", data: newWarehouse });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL WAREHOUSES
exports.getWarehouses = async (req, res) => {
    try {
      const warehouses = await Warehouse.findAll({ order: [["createdAt", "DESC"]] });
      res.status(200).json(warehouses);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
};

// ✅ READ SINGLE WAREHOUSE
exports.getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(id);

    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    res.status(200).json(warehouse);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE WAREHOUSE
exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    await warehouse.update(updates);
    res.status(200).json({ message: "Warehouse updated successfully", data: warehouse });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE WAREHOUSE
exports.deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    await warehouse.destroy();
    res.status(200).json({ message: "Warehouse deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//===================== ADDITIONAL FUNCTIONALITIES ======================

