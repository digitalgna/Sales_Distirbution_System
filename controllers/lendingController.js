const Lending = require('../models/lending');
const User = require('../models/user');
const Customer = require('../models/customer');
const Item = require('../models/item');

exports.getAllLendings = async (req, res) => {
  try {
    const lendings = await Lending.findAll({ 
        include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name"] },
        ],
    });
    res.json(lendings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingById = async (req, res) => {
  try {
    const lending = await Lending.findByPk(req.params.id);
    if (!lending) return res.status(404).json({ error: 'Lending not found' });
    res.json(lending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createLending = async (req, res) => {
  try {
    const lending = await Lending.create(req.body);
    res.status(201).json(lending);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateLending = async (req, res) => {
  try {
    const lending = await Lending.findByPk(req.params.id);
    if (!lending) return res.status(404).json({ error: 'Lending not found' });

    await lending.update(req.body);
    res.json(lending);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteLending = async (req, res) => {
  try {
    const lending = await Lending.findByPk(req.params.id);
    if (!lending) return res.status(404).json({ error: 'Lending not found' });

    await lending.destroy();
    res.json({ message: 'Lending deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingsByUser = async (req, res) => {
  try {
    const lendings = await Lending.findAll({ where: { userId: req.params.userId } });
    res.json(lendings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingsByCustomer = async (req, res) => {
  try {
    const lendings = await Lending.findAll({ where: { customerId: req.params.customerId } });
    res.json(lendings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLendingsByWarehouse = async (req, res) => {
  try {
    const lendings = await Lending.findAll({ where: { warehouseId: req.params.warehouseId } });
    res.json(lendings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
