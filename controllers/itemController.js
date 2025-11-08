const Item = require("../models/item");
const Store = require("../models/store");
const sequelize  = require("../config/db");

exports.createItem = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      unit,
      unitPrice,
      salePrice,
      minQuantity,
      description,
      expirationDate,
      ExciseTax, // updated field
    } = req.body;

    const item = await Item.create({
      categoryId,
      name,
      unit,
      unitPrice,
      salePrice,
      minQuantity,
      description,
      expirationDate: expirationDate || null,
      ExciseTax: ExciseTax || null, // ensure null if not provided
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.findAll();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      name,
      unit,
      unitPrice,
      salePrice,
      minQuantity,
      description,
      expirationDate,
      ExciseTax, // updated field
    } = req.body;

    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    await item.update({
      categoryId,
      name,
      unit,
      unitPrice,
      salePrice,
      minQuantity,
      description,
      expirationDate: expirationDate || null,
      ExciseTax: ExciseTax || null, // update integer field
    });

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    await item.destroy();
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
