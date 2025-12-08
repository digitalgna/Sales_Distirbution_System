const { Op } = require('sequelize');
const Zbalance = require('../models/zbalance');
const User = require("../models/user");

// Create a new Zbalance record
exports.createZbalance = async (req, res) => {
  try {
    const { userId, date, zamount, bankdeposit, totalsales } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if record already exists for the user on the date
    const existingRecord = await Zbalance.findOne({ 
      where: { userId, date } 
    });
    if (existingRecord) {
      return res.status(400).json({ 
        error: 'A record already exists for this user on this date. Use update instead.' 
      });
    }

    const zbalance = await Zbalance.create({
      userId,
      date,
      zamount: zamount || 0,
      bankdeposit: bankdeposit || 0,
      totalsales: totalsales || 0
    });

    res.status(201).json(zbalance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all Zbalance records
exports.getAllZbalances = async (req, res) => {
  try {
    const { date, startDate, endDate, userId } = req.query;

    const whereClause = {};

    // Filter by userId if provided
    if (userId) whereClause.userId = userId;

    // Filter by single date
    if (date) {
      whereClause.date = date;
    }

    // Filter by date range
    if (startDate && endDate) {
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const zbalances = await Zbalance.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ["id", "fullName"] },],
      order: [['date', 'DESC']]
    });

    res.status(200).json(zbalances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single Zbalance record by ID
exports.getZbalanceById = async (req, res) => {
  try {
    const zbalance = await Zbalance.findByPk(req.params.id);
    if (!zbalance) {
      return res.status(404).json({ error: 'Zbalance record not found' });
    }
    res.status(200).json(zbalance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a Zbalance record
exports.updateZbalance = async (req, res) => {
  try {
    const { userId, date, zamount, bankdeposit, totalsales } = req.body;
    const zbalance = await Zbalance.findByPk(req.params.id);

    if (!zbalance) {
      return res.status(404).json({ error: 'Zbalance record not found' });
    }

    // Check if date is being updated and if it already exists for this user
    if (date && date !== zbalance.date) {
      const existingRecord = await Zbalance.findOne({ 
        where: { userId: userId || zbalance.userId, date } 
      });
      if (existingRecord) {
        return res.status(400).json({ 
          error: 'A record already exists for this user on the new date' 
        });
      }
    }

    await zbalance.update({
      userId: userId || zbalance.userId,
      date: date || zbalance.date,
      zamount: zamount !== undefined ? zamount : zbalance.zamount,
      bankdeposit: bankdeposit !== undefined ? bankdeposit : zbalance.bankdeposit,
      totalsales: totalsales !== undefined ? totalsales : zbalance.totalsales
    });

    res.status(200).json(zbalance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a Zbalance record
exports.deleteZbalance = async (req, res) => {
  try {
    const zbalance = await Zbalance.findByPk(req.params.id);
    if (!zbalance) {
      return res.status(404).json({ error: 'Zbalance record not found' });
    }

    await zbalance.destroy();
    res.status(200).json({ message: 'Zbalance record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getZbalancesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const whereClause = { userId };

    // Filter by single date
    if (date) {
      whereClause.date = date;
    }

    // Filter by date range
    if (startDate && endDate) {
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const zbalances = await Zbalance.findAll({
      where: whereClause,
      include: [
        { model: User, attributes: ["id", "fullName"] },],
      order: [['date', 'DESC']]
    });

    res.status(200).json(zbalances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Zbalance by date (for a specific user if provided)
// exports.getZbalanceByDate = async (req, res) => {
//   try {
//     const { date } = req.params;
//     const { userId } = req.query;

//     const whereClause = { date };
//     if (userId) whereClause.userId = userId;

//     const zbalance = await Zbalance.findOne({ where: whereClause });
    
//     if (!zbalance) {
//       return res.status(404).json({ error: 'No record found for the specified date and user' });
//     }
    
//     res.status(200).json(zbalance);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
