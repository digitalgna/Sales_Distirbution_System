
const {  Purchase, Balance, Item, Store, Customer, Warehouse } = require("../models/index");
const { Op } = require("sequelize");


exports.createPurchase = async (req, res) => {
  const t = await Purchase.sequelize.transaction();

  try {
    const {
      supplierId,
      itemId,
      warehouseId,
      quantity,
      unitPrice,
      subTotal,
      exciseTaxedPrice,
      priceAfterExice,
      priceDiscount,
      specialSalesDiscount,
      serviceCharge,
      totalBeforeVat,
      totalWithVat,
      fixedPriceDiscount,
      totalVatedAfterDiscount,
      withholdingAmount,
      carId,
      sponsor,
      bonus,
      purchaseDate
    } = req.body;

    // Check item existence
    const item = await Item.findByPk(itemId, { transaction: t });
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Create purchase using frontend-provided values
    const purchase = await Purchase.create(
      {
        supplierId,
        itemId,
        warehouseId,
        quantity,
        unitPrice,
        subTotal,
        exciseTaxedPrice,
        priceAfterExice,
        priceDiscount,
        specialSalesDiscount,
        serviceCharge,
        totalBeforeVat,
        totalWithVat,
        fixedPriceDiscount,
        totalVatedAfterDiscount,
        withholdingAmount: withholdingAmount || 0,
        carId,
        sponsor,
        bonus,
        purchaseDate: purchaseDate || new Date(),
        status: "pending",
      },
      { transaction: t }
    );

    // Update supplier balance (same logic as before)
    const balance = await Balance.findOne({
      where: { customerId: supplierId, itemId },
      transaction: t
    });
    if (balance && totalVatedAfterDiscount) {
      balance.amount -= totalVatedAfterDiscount;
      await balance.save({ transaction: t });
    }

    await t.commit();
    res.status(201).json(purchase);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      include: [
        { model: Item, attributes: ["name", "unit", "unitPrice"] },
        { model: Warehouse, attributes: ["name"] },
        { model: Customer, attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(purchases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePurchaseStatus = async (req, res) => {
  const t = await Purchase.sequelize.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body; // should be 'approved' or 'rejected'

    const purchase = await Purchase.findByPk(id, { transaction: t });
    if (!purchase) {
      await t.rollback();
      return res.status(404).json({ message: "Purchase not found" });
    }

    // Only allow status change from pending
    if (purchase.status !== "pending") {
      await t.rollback();
      return res.status(400).json({
        message: `Status can only be changed from pending. Current status: ${purchase.status}`,
      });
    }

    // Only accept 'approved' or 'rejected'
    if (!["approved", "rejected"].includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Update status
    purchase.status = status;
    await purchase.save({ transaction: t });

    // Increase store quantity only if approved
    if (status === "approved") {
      let store = await Store.findOne({
        where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
        transaction: t,
      });

      if (store) {
        store.quantity = Number(store.quantity) + Number(purchase.quantity);
        await store.save({ transaction: t });
      } else {
        await Store.create(
          {
            itemId: purchase.itemId,
            warehouseId: purchase.warehouseId,
            quantity: Number(purchase.quantity),
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    res.status(200).json({ message: "Status updated successfully", purchase });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};


exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id, {
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
        { model: Customer, attributes: ["name"] },
      ],
    });
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePurchase = async (req, res) => {
  const t = await Purchase.sequelize.transaction();

  try {
    const purchase = await Purchase.findByPk(req.params.id, { transaction: t });
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    const { quantity, unitPrice } = req.body;

    const oldQuantity = Number(purchase.quantity);
    const oldTotalPrice = Number(purchase.totalPrice);

    const newQuantity = quantity ?? oldQuantity;
    const newUnitPrice = unitPrice ?? Number(purchase.unitPrice);

    if (quantity !== undefined || unitPrice !== undefined) {
      const item = await Item.findByPk(purchase.itemId, { transaction: t });
      const base = newQuantity * newUnitPrice;
      const lowerName = item.name.toLowerCase();
      const isAlcoholic = lowerName.includes("alcohol") || lowerName.includes("beer");
      const exciseTax = isAlcoholic ? base * 0.25 : 0;
      const vat = base * 0.15;
      const withholdingAmount = base * 0.03;
      const newTotalPrice = base + vat + exciseTax;

      // Update purchase totals
      purchase.quantity = newQuantity;
      purchase.unitPrice = newUnitPrice;
      purchase.totalPrice = newTotalPrice;
      purchase.vat = vat;
      purchase.exciseTax = exciseTax;
      purchase.withholdingAmount = withholdingAmount;

      // Update Balance
      const balance = await Balance.findOne({ where: { customerId: purchase.supplierId, itemId: purchase.itemId, }, transaction: t });
      if (balance) {
        const difference = newTotalPrice - oldTotalPrice;
        balance.amount -= difference; // can go negative
        await balance.save({ transaction: t });
      }

      // Update Item quantity
      const diffQty = newQuantity - oldQuantity;
      if (diffQty !== 0) {
        // Update Store quantity
        let store = await Store.findOne({
          where: { itemId: purchase.itemId, warehouseId: purchase.warehouseId },
          transaction: t,
        });

        if (store) {
          store.quantity = Number(store.quantity) + Number(diffQty);
          await store.save({ transaction: t });
        } else {
          await Store.create(
            { itemId: purchase.itemId, warehouseId: purchase.warehouseId, quantity: Number(diffQty) },
            { transaction: t }
          );
        }
      }
    }

    await purchase.save({ transaction: t });
    await t.commit();
    res.json(purchase);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    await purchase.destroy();
    res.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPurchaseReport = async (req, res) => {
  try {
    const { supplierId, itemId, warehouseId, startDate, endDate } = req.body;

    let whereClause = {};

    if (supplierId) {
      whereClause.customerId = supplierId; 
    }
    if (itemId) {
      whereClause.itemId = itemId;
    }
    if (warehouseId) {
      whereClause.warehouseId = warehouseId;
    }

    // Date range filters
    if (startDate) {
      const start = new Date(startDate);
      whereClause.purchaseDate = { [Op.gte]: start };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      if (whereClause.purchaseDate) {
        whereClause.purchaseDate[Op.lt] = end;
      } else {
        whereClause.purchaseDate = { [Op.lt]: end };
      }
    }

    // Fetch purchases with filters applied
    const purchases = await Purchase.findAll({
      where: whereClause,
      include: [
        { model: Item, attributes: ["name"] },
        { model: Warehouse, attributes: ["name"] },
        { model: Customer, attributes: ["name"] },
      ],
      order: [["purchaseDate", "DESC"]],
    });

    // Format the report
    const report = purchases.map((p) => ({
      purchaseId: p.id,
      supplier: p.Customer?.name,
      item: p.Item?.name,
      warehouse: p.Warehouse?.name,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalPrice: p.totalPrice,
      vat: p.vat,
      exciseTax: p.exciseTax,
      withholdingAmount: p.withholdingAmount,
      purchaseDate: p.purchaseDate,
      status: p.status
    }));

    // Summary totals
    const purchaseCount = report.length;
    const totalQuantity = report.reduce((acc, cur) => acc + Number(cur.quantity), 0);
    const totalPrice = report.reduce((acc, cur) => acc + Number(cur.totalPrice), 0);
    const totalVAT = report.reduce((acc, cur) => acc + Number(cur.vat), 0);
    const totalExcise = report.reduce((acc, cur) => acc + Number(cur.exciseTax), 0);
    const totalWithholding = report.reduce((acc, cur) => acc + Number(cur.withholdingAmount), 0);

    res.json({
      report,
      summary: {
        purchaseCount,
        totalQuantity,
        totalPrice,
        totalVAT,
        totalExcise,
        totalWithholding,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

