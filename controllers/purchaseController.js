const { Op } = require("sequelize");
const { sendEmail } = require("../utils/notificationService"); // Hypothetical notification service
const sequelize = require("../config/db");
const Item = require("./item.js");
const Customer = require("./customer.js");
const Warehouse = require("./wharehouse.js");
const Store = require("./store.js");
const Balance = require("./balance.js");
const Purchase = require("./purchase.js");

// Create functionality
exports.createPurchase = async (data) => {
  const t = await sequelize.transaction();
  try {
    // Set default status to 'pending' if not provided
    if (!data.status) data.status = 'pending';
    
    // Validate required fields
    if (!data.itemId || !data.warehouseId || !data.customerId || !data.itemAmount || !data.totalPrice) {
      throw new Error('Missing required fields: itemId, warehouseId, customerId, itemAmount, or totalPrice');
    }

    // Create the purchase
    const purchase = await Purchase.create(data, { transaction: t });

    // If status is 'completed', update related tables
    if (purchase.status === 'completed') {
      // Update Item quantity
      const item = await Item.findByPk(purchase.itemId, { transaction: t });
      if (!item) throw new Error('Item not found');
      item.quantity = (item.quantity || 0) + purchase.itemAmount;
      await item.save({ transaction: t });

      // Update Store quantity
      const [store, created] = await Store.findOrCreate({
        where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
        defaults: { quantity: 0 },
        transaction: t
      });
      store.quantity += purchase.itemAmount;
      await store.save({ transaction: t });

      // Update Balance (decrease)
      const balance = await Balance.findOne({ 
        where: { customerId: purchase.customerId }, 
        transaction: t 
      });
      if (!balance) throw new Error('Balance not found for customer');
      balance.amount = (parseFloat(balance.amount) || 0) - parseFloat(purchase.totalPrice);
      await balance.save({ transaction: t });
    }

    await t.commit();
    return purchase;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

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

module.exports = { Purchase, createPurchase, updatePurchase };


exports.getPurchases = async (req, res) => {
  try {
    const { customerId, itemId, warehouseId, status, search, page, limit } = req.query;
    const where = {};

    // Optional filters
    if (customerId) where.customerId = customerId;
    if (itemId) where.itemId = itemId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;


    // Pagination
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * pageSize;

    // Search by Customer or Item name
    if (search) {
      where[Op.or] = [
        { "$customer.name$": { [Op.like]: `%${search}%` } },
        { "$item.name$": { [Op.like]: `%${search}%` } },
      ];
    }

    // Fetch purchases with associations
    const { rows: purchases, count: total } = await Purchase.findAndCountAll({
      where,
      include: [
        { model: Customer, as: "customer", attributes: ["id", "name"] },
        { model: Item, as: "item", attributes: ["id", "name"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    });

    res.status(200).json({
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      total,
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

// Update stock after purchase
exports.updateStockAfterPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    // Validate purchase
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [{ model: Item }, { model: Warehouse }],
    });
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Find or create store record
    let store = await Store.findOne({
      where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
    });
    if (!store) {
      store = await Store.create({
        itemId: purchase.itemId,
        warehouseId: purchase.warehouseId,
        quantity: 0,
      });
    }

    // Update stock quantity
    store.quantity += purchase.itemAmount;
    await store.save();

    // Update Item's totalPrice
    const item = purchase.Item;
    item.totalPrice = (item.quantity + purchase.itemAmount) * item.unitPrice;
    await item.save();

    return res.status(200).json({
      message: `Stock updated for item '${item.name}' in warehouse '${purchase.Warehouse.name}'`,
      store: { itemId: store.itemId, warehouseId: store.warehouseId, quantity: store.quantity },
    });
  } catch (error) {
    console.error("Error updating stock after purchase:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Calculate and validate taxes (VAT, excise tax, withholding)
exports.calculatePurchaseTaxes = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    // Validate purchase
    const purchase = await Purchase.findByPk(purchaseId);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Validate required fields
    if (!purchase.unitPrice || !purchase.itemAmount) {
      return res.status(400).json({ error: "unitPrice and itemAmount are required for tax calculation" });
    }

    // Tax rates (configurable)
    const VAT_RATE = 0.16; // 16% VAT
    const EXCISE_TAX_RATE = 0.05; // 5% excise tax
    const WITHHOLDING_TAX_RATE = 0.02; // 2% withholding tax

    // Calculate taxes
    const subtotal = purchase.unitPrice * purchase.itemAmount;
    const vat = subtotal * VAT_RATE;
    const unitExciseTax = purchase.unitPrice * EXCISE_TAX_RATE;
    const withholdingAmount = subtotal * WITHHOLDING_TAX_RATE;
    const totalPrice = (subtotal + vat + (unitExciseTax * purchase.itemAmount)).toFixed(2);

    // Update purchase with calculated values
    await purchase.update({
      vat,
      unitExciseTax,
      withholdingAmount,
      totalPrice,
    });

    return res.status(200).json({
      message: "Taxes calculated and updated for purchase",
      purchase: {
        id: purchase.id,
        itemAmount: purchase.itemAmount,
        unitPrice: purchase.unitPrice,
        vat,
        unitExciseTax,
        withholdingAmount,
        totalPrice,
      },
    });
  } catch (error) {
    console.error("Error calculating purchase taxes:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// Track purchase status and notify users
exports.trackPurchaseStatus = async (req, res) => {
  try {
    const { purchaseId, newStatus } = req.body;

    // Validate inputs
    if (!purchaseId || !newStatus) {
      return res.status(400).json({ error: "purchaseId and newStatus are required" });
    }

    // Validate purchase
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [{ model: Customer, as: "customer" }, { model: Warehouse }],
    });
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Update status
    await purchase.update({ status: newStatus });

    // Notify relevant users (e.g., warehouse managers)
    const users = await User.findAll({
      where: { warehouseId: purchase.warehouseId },
      attributes: ["email"],
    });

    for (const user of users) {
      await sendEmail({
        to: user.email,
        subject: `Purchase Status Update: ${purchase.id}`,
        text: `Purchase for item ${purchase.itemId} from supplier ${purchase.customer.name} in warehouse ${purchase.Warehouse.name} updated to status: ${newStatus}`,
      });
    }

    return res.status(200).json({
      message: `Purchase status updated to '${newStatus}' and users notified`,
      purchase: { id: purchase.id, status: purchase.status },
    });
  } catch (error) {
    console.error("Error tracking purchase status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Validate purchase before creation
exports.validatePurchase = async (req, res) => {
  try {
    const { itemId, warehouseId, itemAmount, unitPrice } = req.body;

    // Validate required fields
    if (!itemId || !warehouseId || !itemAmount || itemAmount <= 0 || !unitPrice) {
      return res.status(400).json({ error: "itemId, warehouseId, itemAmount, and unitPrice are required" });
    }


    // Validate item
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Validate warehouse
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Validate unitPrice alignment with item
    if (unitPrice !== item.unitPrice) {
      return res.status(400).json({ error: `Provided unitPrice (${unitPrice}) does not match item's unitPrice (${item.unitPrice})` });
    }

    return res.status(200).json({
      message: "Purchase is valid and can be created",
      validated: { itemId, warehouseId, itemAmount, unitPrice },
    });
  } catch (error) {
    console.error("Error validating purchase:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

