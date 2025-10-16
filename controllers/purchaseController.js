const { Op } = require("sequelize");
const sequelize = require("../config/db");
const Item = require("../models/item.js");
const Customer = require("../models/customer.js");
const Warehouse = require("../models/wharehouse.js");
const Store = require("../models/store.js");
const Balance = require("../models/balance.js");
const Purchase = require("../models/purchase.js");

// Create functionality


// Update functionality
exports.updatePurchase = async (id, data) => {
  const t = await sequelize.transaction();
  try {
    const purchase = await Purchase.findByPk(id, { transaction: t });
    if (!purchase) throw new Error('Purchase not found');

    const oldStatus = purchase.status;
    const oldItemAmount = purchase.itemAmount;
    const oldTotalPrice = purchase.totalPrice;
    const oldItemId = purchase.itemId;
    const oldWarehouseId = purchase.warehouseId;
    const oldCustomerId = purchase.customerId;

    // Apply updates
    await purchase.update(data, { transaction: t });

    const newStatus = purchase.status;

    // Handle status changes and adjustments
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      // Apply increases for new completion
      const item = await Item.findByPk(purchase.itemId, { transaction: t });
      if (!item) throw new Error('Item not found');
      item.quantity = (item.quantity || 0) + purchase.itemAmount;
      await item.save({ transaction: t });

      const [store, created] = await Store.findOrCreate({
        where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
        defaults: { quantity: 0 },
        transaction: t
      });
      store.quantity += purchase.itemAmount;
      await store.save({ transaction: t });

      const balance = await Balance.findOne({ 
        where: { customerId: purchase.customerId }, 
        transaction: t 
      });
      if (!balance) throw new Error('Balance not found for customer');
      balance.amount = (parseFloat(balance.amount) || 0) - parseFloat(purchase.totalPrice);
      await balance.save({ transaction: t });
    } else if (newStatus !== 'completed' && oldStatus === 'completed') {
      // Reverse changes for de-completion
      const item = await Item.findByPk(oldItemId, { transaction: t });
      if (item) {
        item.quantity = (item.quantity || 0) - oldItemAmount;
        await item.save({ transaction: t });
      }

      const store = await Store.findOne({
        where: { itemId: oldItemId, warehouseId: oldWarehouseId },
        transaction: t
      });
      if (store) {
        store.quantity = (store.quantity || 0) - oldItemAmount;
        await store.save({ transaction: t });
      }

      const balance = await Balance.findOne({ 
        where: { customerId: oldCustomerId }, 
        transaction: t 
      });
      if (balance) {
        balance.amount = (parseFloat(balance.amount) || 0) + parseFloat(oldTotalPrice);
        await balance.save({ transaction: t });
      }
    } else if (newStatus === 'completed' && oldStatus === 'completed') {
      // Adjust differences if already completed
      const itemDiff = purchase.itemAmount - oldItemAmount;
      const priceDiff = parseFloat(purchase.totalPrice) - parseFloat(oldTotalPrice);

      // If itemId, warehouseId, or customerId changed, reverse old and apply new
      if (purchase.itemId !== oldItemId || purchase.warehouseId !== oldWarehouseId || purchase.customerId !== oldCustomerId) {
        // Reverse old
        const oldItem = await Item.findByPk(oldItemId, { transaction: t });
        if (oldItem) {
          oldItem.quantity = (oldItem.quantity || 0) - oldItemAmount;
          await oldItem.save({ transaction: t });
        }

        const oldStore = await Store.findOne({
          where: { itemId: oldItemId, warehouseId: oldWarehouseId },
          transaction: t
        });
        if (oldStore) {
          oldStore.quantity = (oldStore.quantity || 0) - oldItemAmount;
          await oldStore.save({ transaction: t });
        }

        const oldBalance = await Balance.findOne({ 
          where: { customerId: oldCustomerId }, 
          transaction: t 
        });
        if (oldBalance) {
          oldBalance.amount = (parseFloat(oldBalance.amount) || 0) + parseFloat(oldTotalPrice);
          await oldBalance.save({ transaction: t });
        }

        // Apply new
        const newItem = await Item.findByPk(purchase.itemId, { transaction: t });
        if (!newItem) throw new Error('New item not found');
        newItem.quantity = (newItem.quantity || 0) + purchase.itemAmount;
        await newItem.save({ transaction: t });

        const [newStore, created] = await Store.findOrCreate({
          where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
          defaults: { quantity: 0 },
          transaction: t
        });
        newStore.quantity += purchase.itemAmount;
        await newStore.save({ transaction: t });

        const newBalance = await Balance.findOne({ 
          where: { customerId: purchase.customerId }, 
          transaction: t 
        });
        if (!newBalance) throw new Error('New balance not found for customer');
        newBalance.amount = (parseFloat(newBalance.amount) || 0) - parseFloat(purchase.totalPrice);
        await newBalance.save({ transaction: t });
      } else {
        // Simple diff adjustment
        if (itemDiff !== 0) {
          const item = await Item.findByPk(purchase.itemId, { transaction: t });
          if (item) {
            item.quantity = (item.quantity || 0) + itemDiff;
            await item.save({ transaction: t });
          }

          const store = await Store.findOne({
            where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
            transaction: t
          });
          if (store) {
            store.quantity = (store.quantity || 0) + itemDiff;
            await store.save({ transaction: t });
          }
        }

        if (priceDiff !== 0) {
          const balance = await Balance.findOne({ 
            where: { customerId: purchase.customerId }, 
            transaction: t 
          });
          if (balance) {
            balance.amount = (parseFloat(balance.amount) || 0) - priceDiff;
            await balance.save({ transaction: t });
          }
        }
      }
    }

    await t.commit();
    return purchase;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}


exports.getPurchases = async (req, res) => {
  try {
    // Fetch all purchases with associations
    const purchases = await Purchase.findAll({
      include: [
        { model: Customer, as: "customer", attributes: ["id", "name"] },
        { model: Item, as: "item", attributes: ["id", "name"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      total: purchases.length,
      data: purchases,
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ READ SINGLE PURCHASE
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await Purchase.findByPk(id, {
      include: [
        { model: Customer, as: "customer", attributes: ["id", "name"] },
        { model: Item, as: "item", attributes: ["id", "name"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name"] },
      ],
    });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    res.status(200).json(purchase);
  } catch (error) {
    console.error("Error fetching purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ UPDATE PURCHASE
exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const purchase = await Purchase.findByPk(id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    // Recalculate totalPrice if unitPrice or itemAmount changed
    if (updates.unitPrice || updates.itemAmount) {
      const newUnitPrice = updates.unitPrice ?? purchase.unitPrice;
      const newItemAmount = updates.itemAmount ?? purchase.itemAmount;
      updates.totalPrice = newUnitPrice * newItemAmount;
    }

    await purchase.update(updates);
    res.status(200).json({ message: "Purchase updated successfully", data: purchase });
  } catch (error) {
    console.error("Error updating purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ DELETE PURCHASE
exports.deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findByPk(id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    await purchase.destroy();
    res.status(200).json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// additional functionalities 

// Get purchases by customerId
exports.getPurchasesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const purchases = await Purchase.findAll({ where: { customerId } });

    if (!purchases.length) {
      return res.status(404).json({ message: "No purchases found for this customer" });
    }

    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get purchases by itemId
exports.getPurchasesByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const purchases = await Purchase.findAll({ where: { itemId } });

    if (!purchases.length) {
      return res.status(404).json({ message: "No purchases found for this item" });
    }

    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get purchases by warehouseId
exports.getPurchasesByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const purchases = await Purchase.findAll({ where: { warehouseId } });

    if (!purchases.length) {
      return res.status(404).json({ message: "No purchases found for this warehouse" });
    }

    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
//reporting by date range
exports.getPurchaseReportByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate input
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Please provide startDate and endDate" });
    }

    // Query purchases within date range
    const purchases = await Purchase.findAll({
      where: {
        date: {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        },
      },
      order: [["date", "DESC"]],
    });

    if (!purchases.length) {
      return res.status(404).json({ message: "No purchases found in this date range" });
    }

    res.status(200).json({
      message: "Purchase report generated successfully",
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
