const Return = require("../models/return");
const ReturnItem = require("../models/returnItem");
const Item = require("../models/item");
const User = require("../models/user");
const Warehouse = require("../models/wharehouse");
const Store = require("../models/store");
const { Op } = require("sequelize");


exports.createReturn = async (req, res) => {
  try {
    const { userId, warehouseId, reason, description, type, returnDate, items, returnTo } = req.body;

    if (!userId || !warehouseId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "userId, warehouseId, returnTo and items[] are required" });
    }

    // Validate user and warehouse
    const [user, warehouse] = await Promise.all([
      User.findByPk(userId),
      Warehouse.findByPk(warehouseId)
    ]);

    if (!user || !warehouse) {
      return res.status(404).json({ message: "User or Warehouse not found" });
    }

    // Validate all itemIds exist
    const itemIds = items.map(i => i.itemId);
    const foundItems = await Item.findAll({ where: { id: itemIds } });

    if (foundItems.length !== items.length) {
      return res.status(400).json({ message: "One or more items not found" });
    }

    // Create Return record
    const newReturn = await Return.create({
      userId,
      warehouseId,
      reason,
      description,
      type,
      status: "pending",
      returnTo,
      returnDate
    });

    // Create ReturnItem rows
    const returnItemsToCreate = items.map(i => ({
      ReturnId: newReturn.id,
      itemId: i.itemId,
      quantity: i.quantity
    }));

    await ReturnItem.bulkCreate(returnItemsToCreate);

    res.status(201).json({ message: "Return created successfully", data: newReturn });
  } catch (error) {
    console.error("Error creating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const where = {};

    const { userId, warehouseId, type, status } = req.query;
    if (userId) where.userId = userId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (status) where.status = status;

    const returns = await Return.findAll({
      where,
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: ReturnItem,
          include: [{ model: Item, attributes: ["id", "name"] }]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.status(200).json(returns);
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRecord = await Return.findByPk(id, {
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: ReturnItem,
          include: [{ model: Item, attributes: ["id", "name"] }]
        }
      ]
    });

    if (!returnRecord) return res.status(404).json({ message: "Return not found" });

    res.status(200).json(returnRecord);
  } catch (error) {
    console.error("Error fetching return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getReturnsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const returns = await Return.findAll({
      where: { userId },
      include: [
        {
          model: ReturnItem,
          include: [{ model: Item, attributes: ["id", "name"] }]
        },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    if (!returns.length)
      return res.status(404).json({ message: "No returns found for this user" });

    res.status(200).json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body;

    const returnRecord = await Return.findByPk(id, {
      include: [ReturnItem]
    });

    if (!returnRecord)
      return res.status(404).json({ message: "Return not found" });

    const oldStatus = returnRecord.status;

    // ❗ Only pending returns can be updated
    if (oldStatus !== "pending") {
      return res.status(400).json({
        message: "Only pending returns can be updated"
      });
    }

    // -----------------------------------------------------
    // ① Update ReturnItem quantities (if items passed)
    // -----------------------------------------------------
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const rItem = await ReturnItem.findOne({
          where: { ReturnId: id, itemId: item.itemId }
        });

        if (rItem) {
          rItem.quantity = item.quantity;
          await rItem.save();
        }
      }
    }

    // -----------------------------------------------------
    // ② Update Return record fields (including returnTo)
    // -----------------------------------------------------
    await returnRecord.update(req.body);

    // Reload to get updated ReturnItems for accurate response
    await returnRecord.reload({ include: [ReturnItem] });

    // -----------------------------------------------------
    // ③ If status approved, update store quantity ONLY IF returnTo = 'store'
    // -----------------------------------------------------
    if (status === "approved" && oldStatus !== "approved") {

      if (returnRecord.returnTo === "store") {

        for (const rItem of returnRecord.ReturnItems) {
          const store = await Store.findOne({
            where: {
              itemId: rItem.itemId,
              warehouseId: returnRecord.warehouseId
            }
          });

          if (store) {
            store.quantity += rItem.quantity;
            await store.save();
          } else {
            await Store.create({
              itemId: rItem.itemId,
              warehouseId: returnRecord.warehouseId,
              quantity: rItem.quantity
            });
          }
        }
      }
    }

    res.status(200).json({
      message: "Return updated successfully",
      data: returnRecord
    });

  } catch (error) {
    console.error("Error updating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRecord = await Return.findByPk(id);
    if (!returnRecord) return res.status(404).json({ message: "Return not found" });

    await returnRecord.destroy();
    res.status(200).json({ message: "Return deleted successfully" });
  } catch (error) {
    console.error("Error deleting return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getReturnReport = async (req, res) => {
  try {
    const { startDate, endDate, userId, warehouseId, type, returnTo, status } = req.body;

    const where = {};
    if (userId) where.userId = userId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (returnTo) where.returnTo = returnTo;
    if (status) where.status = status;

    if (startDate) where.returnDate = { [Op.gte]: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.returnDate = where.returnDate
        ? { ...where.returnDate, [Op.lt]: end }
        : { [Op.lt]: end };
    }

    const returns = await Return.findAll({
      where,
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: ReturnItem,
          include: [{ model: Item, attributes: ["id", "name"] }]
        }
      ],
      order: [["returnDate", "DESC"]]
    });

    // Summary quantity
    const totalReturnedQty = returns.reduce((sum, r) => {
      return (
        sum +
        r.ReturnItems.reduce((subtotal, i) => subtotal + i.quantity, 0)
      );
    }, 0);

    res.status(200).json({
      totalReturnedQty,
      count: returns.length,
      report: returns
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to generate report", error: error.message });
  }
};
