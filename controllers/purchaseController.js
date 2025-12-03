
const {  Purchase, Balance, Item, Store, Customer, Warehouse, PurchaseItem, Car } = require("../models/index");
const { Op } = require("sequelize");


exports.createPurchase = async (req, res) => {
  const t = await Purchase.sequelize.transaction();

  try {
    const {
      supplierId,
      warehouseId,
      items, // [{ itemId, quantity, unitPrice, bonus, sponsor }]
      subTotal,
      exciseTaxedPrice,
      priceAfterExice,
      priceDiscount,
      specialSalesDiscount,
      serviceCharge,
      totalBeforeVat,
      vat,
      totalWithVat,
      fixedPriceDiscount,
      totalVatedAfterDiscount,
      withholdingAmount,
      carId,
      purchaseDate,
      fsNo
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items list is required" });
    }
    const purchase = await Purchase.create(
      {
        supplierId,
        warehouseId,
        subTotal,
        exciseTaxedPrice,
        priceAfterExice,
        priceDiscount,
        specialSalesDiscount,
        serviceCharge,
        totalBeforeVat,
        vat,
        totalWithVat,
        fixedPriceDiscount,
        totalVatedAfterDiscount,
        withholdingAmount: withholdingAmount || 0,
        carId,
        purchaseDate: purchaseDate || new Date(),
        fsNo,
        status: "pending",
      },
      { transaction: t }
    );
    for (const row of items) {
      const { itemId, quantity, unitPrice, bonus, sponsor } = row;

      // Validate item exists
      const item = await Item.findByPk(itemId, { transaction: t });
      if (!item) {
        throw new Error(`Item with ID ${itemId} does not exist`);
      }

      // Create purchase detail entry
      await PurchaseItem.create(
        {
          purchaseId: purchase.id,
          itemId,
          quantity,
          unitPrice,
          bonus: bonus || 0,
          sponsor: sponsor || null
        },
        { transaction: t }
      );
      let balance = await Balance.findOne({
        where: { customerId: supplierId, itemId },
        transaction: t
      });

      if (balance && totalVatedAfterDiscount) {
        balance.amount -= totalVatedAfterDiscount; // Deduct purchase total
        await balance.save({ transaction: t });
      }
    }

    // Commit transaction
    await t.commit();

    res.status(201).json({
      message: "Purchase created successfully",
      purchaseId: purchase.id
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};


exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      attributes : {
        exclude: ["supplierId", "warehouseId", "carId",  "createdAt", "updatedAt", "itemId",]
      },
      include: [
        {
          model: PurchaseItem,
          attributes : {
            exclude: ["purchaseId", "itemId", "createdAt", "updatedAt"]
          },
          include: [
            {
              model: Item,
              attributes: ["id", "name"]
            }
          ],
          order: [["id", "ASC"]]
        },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate"] },
        { model: Customer, attributes: ["id", "name"] } // supplier
      ],
      order: [["purchaseDate", "DESC"]]
    });

    res.json({ success: true, count: purchases.length, data: purchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


exports.updatePurchaseStatus = async (req, res) => {
  const t = await Purchase.sequelize.transaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const purchase = await Purchase.findByPk(id, {
      include: [{ model: PurchaseItem }],
      transaction: t,
    });

    if (!purchase) {
      await t.rollback();
      return res.status(404).json({ message: "Purchase not found" });
    }

    if (purchase.status !== "pending") {
      await t.rollback();
      return res.status(400).json({
        message: `Status can only be changed from pending. Current status: ${purchase.status}`,
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid status" });
    }

    purchase.status = status;
    await purchase.save({ transaction: t });

    // ----------------------------------------------------------------------
    // APPROVE: Increase store stock for *each purchase item*
    // ----------------------------------------------------------------------
    if (status === "approved") {
      for (const pItem of purchase.PurchaseItems) {
        const { itemId, quantity } = pItem;

        let store = await Store.findOne({
          where: { itemId, warehouseId: purchase.warehouseId },
          transaction: t,
        });

        if (store) {
          store.quantity = Number(store.quantity) + Number(quantity);
          await store.save({ transaction: t });
        } else {
          await Store.create(
            {
              itemId,
              warehouseId: purchase.warehouseId,
              quantity: Number(quantity),
            },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();
    return res.status(200).json({ message: "Status updated", purchase });

  } catch (error) {
    // rollback ONLY if not finished
    if (!t.finished) {
      await t.rollback();
    }
    return res.status(500).json({ message: error.message });
  }
};

exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id, {
      include: [
        {
          model: PurchaseItem,
          include: [{ model: Item, attributes: ["id", "name", "ExciseTax"] }],
          order: [["id", "ASC"]],
        },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Car, attributes: ["id", "carPlate", "carName"] }
      ]
    });

    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    res.json({
      success: true,
      data: purchase
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


exports.updatePurchase = async (req, res) => {
  const t = await Purchase.sequelize.transaction();
  try {
    const purchaseId = req.params.id;

    const {
      supplierId,
      warehouseId,
      subTotal,
      exciseTaxedPrice,
      priceAfterExice,
      priceDiscount,
      specialSalesDiscount,
      serviceCharge,
      totalBeforeVat,
      vat,
      totalWithVat,
      fixedPriceDiscount,
      totalVatedAfterDiscount,
      withholdingAmount,
      carId,
      purchaseDate,
      fsNo,
      items // array of: [{ id?, itemId, quantity, unitPrice, bonus, sponsor }]
    } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Items array is required" });
    }

    // 1️⃣ Find purchase + old items
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [{ model: PurchaseItem }],
      transaction: t
    });

    if (!purchase) {
      await t.rollback();
      return res.status(404).json({ message: "Purchase not found" });
    }

    // 2️⃣ Update purchase header
    await purchase.update(
      {
        supplierId,
        warehouseId,
        subTotal,
        exciseTaxedPrice,
        priceAfterExice,
        priceDiscount,
        specialSalesDiscount,
        serviceCharge,
        totalBeforeVat,
        vat,
        totalWithVat,
        fixedPriceDiscount,
        totalVatedAfterDiscount,
        withholdingAmount,
        carId,
        fsNo,
        purchaseDate
      },
      { transaction: t }
    );

    const oldItems = purchase.PurchaseItems;
    const oldMap = new Map();
    oldItems.forEach(i => oldMap.set(i.id, i));

    const newItemIds = [];

    // 3️⃣ Update/Insert items
    for (const row of items) {
      if (row.id && oldMap.has(row.id)) {
        const old = oldMap.get(row.id);
        const qtyDiff = row.quantity - old.quantity;

        await old.update(
          {
            itemId: row.itemId,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            bonus: row.bonus || 0,
            sponsor: row.sponsor || null
          },
          { transaction: t }
        );

        if (purchase.status === "approved") {
          const store = await Store.findOne({
            where: { itemId: row.itemId, warehouseId: purchase.warehouseId },
            transaction: t
          });

          if (store) {
            store.quantity += qtyDiff;
            await store.save({ transaction: t });
          }
        }

        newItemIds.push(row.id);
      } else {
        const newItem = await PurchaseItem.create(
          {
            purchaseId: purchase.id,
            itemId: row.itemId,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            bonus: row.bonus || 0,
            sponsor: row.sponsor || null
          },
          { transaction: t }
        );

        if (purchase.status === "approved") {
          let store = await Store.findOne({
            where: { itemId: row.itemId, warehouseId: purchase.warehouseId },
            transaction: t
          });

          if (store) {
            store.quantity += row.quantity;
            await store.save({ transaction: t });
          } else {
            await Store.create(
              {
                itemId: row.itemId,
                warehouseId: purchase.warehouseId,
                quantity: row.quantity
              },
              { transaction: t }
            );
          }
        }

        newItemIds.push(newItem.id);
      }
    }

    // 4️⃣ Delete removed items
    for (const old of oldItems) {
      if (!newItemIds.includes(old.id)) {
        if (purchase.status === "approved") {
          let store = await Store.findOne({
            where: { itemId: old.itemId, warehouseId: purchase.warehouseId },
            transaction: t
          });

          if (store) {
            store.quantity -= old.quantity;
            await store.save({ transaction: t });
          }
        }

        await old.destroy({ transaction: t });
      }
    }

    // 5️⃣ Update balance for this supplier
    if (totalVatedAfterDiscount != null) {
      const balance = await Balance.findOne({
        where: { customerId: supplierId },
        transaction: t
      });

      if (balance) {
        balance.amount -= totalVatedAfterDiscount;
        await balance.save({ transaction: t });
      }
    }

    await t.commit();

    // 6️⃣ Retrieve updated purchase with relations
    const updatedPurchase = await Purchase.findByPk(purchase.id, {
      include: [
        {
          model: PurchaseItem,
          include: [
            { model: Item, attributes: ["id", "name", "unit", "unitPrice"] }
          ]
        },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: Customer, attributes: ["id", "name"] }
      ]
    });

    return res.status(200).json(updatedPurchase);

  } catch (error) {
    if (!t.finished) await t.rollback();
    return res.status(500).json({ message: error.message });
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
    const { supplierId, warehouseId, startDate, endDate } = req.body;

    let whereClause = {};
    if (supplierId) whereClause.supplierId = supplierId;
    if (warehouseId) whereClause.warehouseId = warehouseId;
    if (startDate || endDate) whereClause.purchaseDate = {};
    if (startDate) whereClause.purchaseDate[Op.gte] = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // include the end date
      whereClause.purchaseDate[Op.lt] = end;
    }

    const purchases = await Purchase.findAll({
      where: whereClause,
      include: [
        {
          model: PurchaseItem,
          include: [{ model: Item, attributes: ["name", "unit", "unitPrice"] }],
        },
        { model: Warehouse, attributes: ["name"] },
        { model: Customer, attributes: ["name"] },
      ],
      order: [["purchaseDate", "DESC"]],
    });

    const report = purchases.map((p) => ({
      purchaseId: p.id,
      supplier: p.Customer?.name,
      warehouse: p.Warehouse?.name,
      purchaseDate: p.purchaseDate,
      status: p.status,
      subTotal: Number(p.subTotal),
      vat: Number(p.vat),
      totalWithVat: Number(p.totalWithVat),
      items: p.PurchaseItems.map((pi) => ({
        itemId: pi.itemId,
        name: pi.Item?.name,
        unit: pi.Item?.unit,
        unitPrice: Number(pi.unitPrice),
        quantity: pi.quantity,
        bonus: pi.bonus || 0,
        sponsor: pi.sponsor || null,
        totalPrice: Number(pi.unitPrice) * pi.quantity,
      })),
    }));

    // Summary totals
    const purchaseCount = purchases.length;
    const totalQuantity = purchases.reduce(
      (acc, p) => acc + p.PurchaseItems.reduce((sum, pi) => sum + pi.quantity, 0),
      0
    );
    const totalPrice = purchases.reduce(
      (acc, p) => acc + Number(p.totalWithVat),
      0
    );

    res.json({
      report,
      summary: { purchaseCount, totalQuantity, totalPrice },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


