const { Op } = require('sequelize');
const Zbalance = require('../models/zbalance');

// Create a new Zbalance record
exports.createZbalance = async (req, res) => {
  try {
    const { date, zamount, bankdeposit, totalsales } = req.body;
    
    // Check if record already exists for the date
    const existingRecord = await Zbalance.findOne({ where: { date } });
    if (existingRecord) {
      return res.status(400).json({ 
        error: 'A record already exists for this date. Use update instead.' 
      });
    }

    const zbalance = await Zbalance.create({
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
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const zbalances = await Zbalance.findAll({
      where: whereClause,
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
    const { date, zamount, bankdeposit, totalsales } = req.body;
    const zbalance = await Zbalance.findByPk(req.params.id);
    
    if (!zbalance) {
      return res.status(404).json({ error: 'Zbalance record not found' });
    }

    // Check if date is being updated and if it already exists
    if (date && date !== zbalance.date) {
      const existingRecord = await Zbalance.findOne({ where: { date } });
      if (existingRecord) {
        return res.status(400).json({ 
          error: 'A record already exists for the new date' 
        });
      }
    }

    await zbalance.update({
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

// Get Zbalance by date
exports.getZbalanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const zbalance = await Zbalance.findOne({ where: { date } });
    
    if (!zbalance) {
      return res.status(404).json({ error: 'No record found for the specified date' });
    }
    
    res.status(200).json(zbalance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
