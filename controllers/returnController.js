const { Op } = require("sequelize");
const { Return, Item, User, Warehouse, Store, Sales, Purchase } = require("../models/index");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service

// ✅ CREATE RETURN
exports.createReturn = async (req, res) => {
  try {
    const { itemId, returnQuantity, reason, userId, warehouseId, type, description } = req.body;

    // Basic validation
    if (!itemId || !returnQuantity || !userId || !warehouseId || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check related models
    const item = await Item.findByPk(itemId);
    const user = await User.findByPk(userId);
    const warehouse = await Warehouse.findByPk(warehouseId);

    if (!item || !user || !warehouse) {
      return res.status(404).json({ message: "Item, User, or Warehouse not found" });
    }

    const newReturn = await Return.create({
      itemId,
      returnQuantity,
      reason,
      userId,
      warehouseId,
      type,
      description,
      status: 'pending'
    });

    res.status(201).json({ message: "Return created successfully", data: newReturn });
  } catch (error) {
    console.error("Error creating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ ALL RETURNS
exports.getReturns = async (req, res) => {
  try {
    const { itemId, userId, warehouseId, type, status } = req.query;
    const where = {};

    if (itemId) where.itemId = itemId;
    if (userId) where.userId = userId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (status) where.status = status;

    const returns = await Return.findAll({
      where,
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(returns);
  } catch (error) {
    console.error("Error fetching returns:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE RETURN
exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = await Return.findByPk(id, {
      include: [
        { model: Item, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });

    if (!returnRecord) return res.status(404).json({ message: "Return not found" });

    res.status(200).json(returnRecord);
  } catch (error) {
    console.error("Error fetching return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE RETURN
exports.updateReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const returnRecord = await Return.findByPk(id);
    if (!returnRecord) return res.status(404).json({ message: "Return not found" });

    await returnRecord.update(updates);
    res.status(200).json({ message: "Return updated successfully", data: returnRecord });
  } catch (error) {
    console.error("Error updating return:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE RETURN
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


// ====================== ADDITIONAL FUNCTIONALITIES ======================



// Process return and update stock
const processReturn = async (req, res) => {
  try {
    const { returnId, status } = req.body;

    // Validate inputs
    if (!returnId || !status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "returnId and valid status (approved or rejected) are required" });
    }

    // Fetch return
    const returnRecord = await Return.findByPk(returnId, {
      include: [{ model: Item }, { model: Warehouse }, { model: User }],
    });
    if (!returnRecord) {
      return res.status(404).json({ error: "Return not found" });
    }

    // Prevent reprocessing
    if (returnRecord.status !== "pending") {
      return res.status(400).json({ error: `Return is already ${returnRecord.status}` });
    }

    // Update return status
    await returnRecord.update({ status });

    // If approved, update stock
    if (status === "approved") {
      let store = await Store.findOne({
        where: { itemId: returnRecord.itemId, warehouseId: returnRecord.warehouseId },
      });
      if (!store) {
        store = await Store.create({
          itemId: returnRecord.itemId,
          warehouseId: returnRecord.warehouseId,
          quantity: 0,
        });
      }

      // Update store quantity
      store.quantity += returnRecord.returnQuantity;
      await store.save();

      // Update Item quantity
      const item = returnRecord.Item;
      item.quantity += returnRecord.returnQuantity;
      item.totalPrice = (item.quantity * item.unitPrice).toFixed(2);
      await item.save();
    }

    // Notify user
    await sendEmail({
      to: returnRecord.User.email,
      subject: `Return Request ${status}: ${returnRecord.id}`,
      text: `Your return request for item '${returnRecord.Item.name}' (quantity: ${returnRecord.returnQuantity}) in warehouse '${returnRecord.Warehouse.name}' has been ${status}. Reason: ${returnRecord.reason || "N/A"}`,
    });

    return res.status(200).json({
      message: `Return ${status} and stock updated (if applicable)`,
      return: {
        id: returnRecord.id,
        itemId: returnRecord.itemId,
        status: returnRecord.status,
        quantity: returnRecord.returnQuantity,
      },
    });
  } catch (error) {
    console.error("Error processing return:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate return against sale or purchase
const validateReturn = async (req, res) => {
  try {
    const { itemId, returnQuantity, type, transactionId } = req.body;

    // Validate inputs
    if (!itemId || !returnQuantity || returnQuantity <= 0 || !type || !["sale", "purchase"].includes(type) || !transactionId) {
      return res.status(400).json({ error: "itemId, returnQuantity, type (sale or purchase), and transactionId are required" });
    }

    // Validate item
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Validate transaction based on type
    let transaction;
    if (type === "sale") {
      transaction = await Sales.findByPk(transactionId, { where: { itemId } });
      if (!transaction) {
        return res.status(404).json({ error: "Sale not found" });
      }
      if (transaction.quantity < returnQuantity) {
        return res.status(400).json({ error: `Return quantity (${returnQuantity}) exceeds sale quantity (${transaction.quantity})` });
      }
    } else {
      transaction = await Purchase.findByPk(transactionId, { where: { itemId } });
      if (!transaction) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      if (transaction.itemAmount < returnQuantity) {
        return res.status(400).json({ error: `Return quantity (${returnQuantity}) exceeds purchase quantity (${transaction.itemAmount})` });
      }
    }

    return res.status(200).json({
      message: `Return is valid for ${type} transaction`,
      validated: { itemId, returnQuantity, type, transactionId },
    });
  } catch (error) {
    console.error("Error validating return:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Generate return summary report
const generateReturnSummary = async (req, res) => {
  try {
    const { warehouseId, itemId, startDate, endDate } = req.query;

    // Build where clause
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    // Fetch return summary
    const returns = await Return.findAll({
      where,
      attributes: [
        [sequelize.fn("SUM", sequelize.col("returnQuantity")), "totalQuantity"],
        [sequelize.fn("COUNT", sequelize.col("id")), "returnCount"],
        "status",
      ],
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
        { model: User, attributes: ["name"] },
      ],
      group: ["status", "itemId", "warehouseId", "Item.name", "Warehouse.name", "User.name"],
      raw: true,
    });

    return res.status(200).json({
      message: "Return summary generated",
      summary: returns.map(r => ({
        status: r.status,
        item: r["Item.name"],
        warehouse: r["Warehouse.name"],
        user: r["User.name"],
        totalQuantity: parseInt(r.totalQuantity),
        returnCount: parseInt(r.returnCount),
      })),
    });
  } catch (error) {
    console.error("Error generating return summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Track return history for auditing
const getReturnHistory = async (req, res) => {
  try {
    const { itemId, warehouseId, userId, status } = req.query;

    // Build where clause
    const where = {};
    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    // Fetch return history
    const returns = await Return.findAll({
      where,
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
        { model: User, attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      message: "Return history retrieved",
      returns: returns.map(r => ({
        id: r.id,
        item: r.Item.name,
        warehouse: r.Warehouse.name,
        user: r.User.name,
        quantity: r.returnQuantity,
        status: r.status,
        reason: r.reason,
        type: r.type,
        date: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching return history:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Notify users of return status changes
const notifyReturnStatusChange = async (req, res) => {
  try {
    const { returnId, message } = req.body;

    // Validate inputs
    if (!returnId || !message) {
      return res.status(400).json({ error: "returnId and message are required" });
    }

    // Fetch return
    const returnRecord = await Return.findByPk(returnId, {
      include: [
        { model: Item, attributes: ["name"] },
        { model: User, attributes: ["email"] },
        { model: Warehouse, attributes: ["name"] },
      ],
    });
    if (!returnRecord) {
      return res.status(404).json({ error: "Return not found" });
    }

    // Notify the user who initiated the return
    await sendEmail({
      to: returnRecord.User.email,
      subject: `Return Status Update: ${returnRecord.id}`,
      text: `Update for return of item '${returnRecord.Item.name}' in warehouse '${returnRecord.Warehouse.name}': ${message}`,
    });

    // Notify warehouse-associated users
    const users = await User.findAll({
      where: { warehouseId: returnRecord.warehouseId },
      attributes: ["email"],
    });
    for (const user of users) {
      if (user.email !== returnRecord.User.email) {
        await sendEmail({
          to: user.email,
          subject: `Return Status Update: ${returnRecord.id}`,
          text: `Update for return of item '${returnRecord.Item.name}' in warehouse '${returnRecord.Warehouse.name}': ${message}`,
        });
      }
    }

    return res.status(200).json({
      message: `Notifications sent for return ${returnRecord.id}`,
      notifiedUsers: users.length + 1, // Including the initiating user
    });
  } catch (error) {
    console.error("Error notifying return status change:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  processReturn,
  validateReturn,
  generateReturnSummary,
  getReturnHistory,
  notifyReturnStatusChange,
};