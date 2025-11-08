const FsTable = require("../models/FSMachine");
const User = require("../models/user");
const Sales = require("../models/sales");
const { Op } = require("sequelize");

// ✅ CREATE FsTable
exports.createFsTable = async (req, res) => {
  try {
    const { userId, machineNo, fsNo } = req.body;

    // Check for existing record with the same machineNo or fsNo
    const existingRecord = await FsTable.findOne({
      where: {
        [Op.or]: [{ machineNo }, { fsNo }]
      },
    });

    if (existingRecord) {
      return res.status(400).json({ message: "Record with this TIN or FS number already exists." });
    }

    const newRecord = await FsTable.create({ userId, machineNo, fsNo });
    return res.status(201).json({ message: "FsTable record created successfully", data: newRecord });
  } catch (error) {
    console.error("Error creating FsTable:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE FsTable
exports.updateFsTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { machineNo, fsNo } = req.body;

    // Find the record to update
    const record = await FsTable.findByPk(id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    // Check if another record already uses the same machineNo or fsNo
    const duplicate = await FsTable.findOne({
      where: {
        [Op.or]: [{ machineNo }, { fsNo }],
        id: { [Op.ne]: id }, // exclude current record
      },
    });

    if (duplicate) {
      return res.status(400).json({ message: "Another record with this TIN or FS number already exists." });
    }

    // Update the record
    await record.update({ machineNo, fsNo });
    return res.status(200).json({ message: "FsTable record updated successfully", data: record });
  } catch (error) {
    console.error("Error updating FsTable:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getFsTable = async (req, res) => {
  try {
    const { id, userId } = req.query;

    let whereClause = {};
    if (id) whereClause.id = id;
    if (userId) whereClause.userId = userId;

    // Fetch FsTable records (with optional filters)
    const fsRecords = await FsTable.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ["id", "fullName", "userName"], 
        },
      ],
      order: [["id", "ASC"]],
    });

    if (!fsRecords || fsRecords.length === 0) {
      return res.status(404).json({ message: "No FS record(s) found." });
    }

    res.status(200).json({
      message: "FS record(s) retrieved successfully.",
      data: fsRecords,
    });
  } catch (error) {
    console.error("Error fetching FS records:", error);
    res.status(500).json({
      message: "Failed to fetch FS records.",
      error: error.message,
    });
  }
};

exports.deleteFsTable = async (req, res) => {
  const t = await FsTable.sequelize.transaction();
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "FS record ID is required." });
    }

    // Find the record
    const fsRecord = await FsTable.findByPk(id, { transaction: t });
    if (!fsRecord) {
      return res.status(404).json({ message: "FS record not found." });
    }

    // Delete the record
    await fsRecord.destroy({ transaction: t });
    await t.commit();

    res.status(200).json({ message: "FS record deleted successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Delete FS Error:", error);
    res.status(500).json({ message: "Failed to delete FS record.", error: error.message });
  }
};
