const Sales = require("../models/sales");
const SalesItem = require("../models/salesItem");
const User = require("../models/user");
const Customer = require("../models/customer");
const Item = require("../models/item");
const Warehouse = require("../models/wharehouse");
const StockoutItem = require("../models/stockoutItem");
const Store = require("../models/store");
const Stockout = require("../models/stockout");
const Lending = require("../models/lending");
const Return = require("../models/return");
const ReturnItem = require("../models/returnItem");
const FSMachine = require("../models/FSMachine");


// Create new sale
exports.createSale = async (req, res) => {
  const t = await Sales.sequelize.transaction();
  try {
    const {
      userId,
      warehouseId,
      customerId,
      totalPrice,
      vat,
      totalTaxedPrice,
      withholdingAmount,
      paidAmount,
      bank,
      salesDate,
      description,
      tinNo,
      fsNo,
      machineNo,
      credit,
      items
    } = req.body;

    if (!userId || !warehouseId || !tinNo || !fsNo || !machineNo || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Validate user + warehouse
    const [user, warehouse] = await Promise.all([
      User.findByPk(userId),
      Warehouse.findByPk(warehouseId)
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    // ============================================================
    //     UPDATE FSMACHINE RECORD (INCREMENT fsNo BY 1)
    // ============================================================
    const fsMachine = await FSMachine.findOne({
      where: { userId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!fsMachine) {
      throw new Error("FS Machine record not found for this user");
    }

    // Increment fsNo only in FsMachine table
    let currentFs = fsMachine.fsNo;           
    let fsLength = currentFs.length;           
    let nextFs = String(Number(currentFs) + 1).padStart(fsLength, "0");

    await fsMachine.update({ fsNo: nextFs }, { transaction: t });
    //const itemIds = items.map(i => i.itemId);

    // Find all approved stockout records for THIS warehouse that contain these items
    // const stockoutItems = await StockoutItem.findAll({
    //   where: { itemId: itemIds },
    //   include: [
    //     {
    //       model: Stockout,
    //       where: {
    //         warehouseId,
    //         status: "approved"
    //       }
    //     }
    //   ],
    //   order: [["createdAt", "ASC"]],     
    //   transaction: t
    // });

    // GROUP stockouts by itemId so we can deduct FIFO
    // const groupedStock = {};
    // for (const s of stockoutItems) {
    //   if (!groupedStock[s.itemId]) groupedStock[s.itemId] = [];
    //   groupedStock[s.itemId].push(s);
    // }

    // for (const saleItem of items) {
    //   const stockList = groupedStock[saleItem.itemId];

    //   if (!stockList || stockList.length === 0) {
    //     return res.status(400).json({ message: `Item ${saleItem.itemId} has NO approved stockout in this warehouse.` });
    //   }

    //   // Calculate total available from all stockouts
    //   const totalAvailable = stockList.reduce((sum, s) => sum + s.amount, 0);

    //   if (totalAvailable < saleItem.quantity) {
    //     return res.status(400).json({
    //       message: `Insufficient stock for item ${saleItem.itemId}. Available: ${totalAvailable}, Required: ${saleItem.quantity}`
    //     });
    //   }
    // }

    // ------------------------------
    // STEP 2: Create the Sale record
    // ------------------------------
    const sale = await Sales.create({
      userId,
      customerId,
      warehouseId,
      totalPrice,
      vat,
      totalTaxedPrice,
      withholdingAmount,
      paidAmount,
      bank,
      salesDate: salesDate || new Date(),
      tinNo,
      fsNo,
      machineNo,
      credit,
      description
    }, { transaction: t });

    // ------------------------------
    // STEP 3: Deduct stock FIFO + create Sale items
    // ------------------------------
    for (const saleItem of items) {
      let remaining = saleItem.quantity;
      // const stockList = groupedStock[saleItem.itemId];

      // for (const stock of stockList) {
      //   if (remaining <= 0) break;

      //   const deduction = Math.min(stock.amount, remaining);
      //   stock.amount -= deduction;
      //   remaining -= deduction;

      //   await stock.save({ transaction: t });
      // }

      // Save sales item record
      await SalesItem.create({
        salesId: sale.id,
        itemId: saleItem.itemId,
        quantity: saleItem.quantity,
        unitPrice: saleItem.unitPrice,
        totalPrice: saleItem.quantity * saleItem.unitPrice,
        bonus: saleItem.bonus || 0,
        sponsor: saleItem.sponsor || 0
      }, { transaction: t });
    }

    await t.commit();

    const fullSale = await Sales.findByPk(sale.id, {
      include: [
        { model: SalesItem, include: [Item] },
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] }
      ]
    });

    res.status(201).json({
      message: "Sale created successfully",
      sale: fullSale
    });

  } catch (error) {
    await t.rollback();
    console.error("Create Sale Error:", error);
    res.status(500).json({ message: "Failed to create sale", error: error.message });
  }
};

// Get all sales
exports.getAllSales = async (req, res) => {
  try {
    const sales = await Sales.findAll({
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: SalesItem,
          include: [
            { model: Item, attributes: ["id", "name"] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({
      message: "Failed to fetch sales",
      error: error.message
    });
  }
};

// Get sale by ID
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sales.findByPk(req.params.id, {
      attributes: { 
        exclude: ['itemId', 'bonus', 'bonusAmount', 'sponsor', 'sponsorAmount', 'createdAt', 'updatedAt'] 
      },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: SalesItem,
          include: [
            { 
              model: Item, 
              attributes: ["id", "name", "unitPrice"] 
            }
          ]
        }
      ]
    });

    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.status(200).json(sale);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sale", error: error.message });
  }
};

// Update sale
exports.updateSale = async (req, res) => {
  const t = await Sales.sequelize.transaction();
  try {
    const { id } = req.params;
    const sale = await Sales.findByPk(id, { include: [SalesItem], transaction: t });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ message: "Sale not found" });
    }

    const oldItems = sale.SalesItems;
    const newItems = req.body.items || [];

    const itemIds = [
      ...new Set([...oldItems.map(i => i.itemId), ...newItems.map(i => i.itemId)])
    ];

    // Load stockout items for these items
    // const stockoutItems = await StockoutItem.findAll({
    //   where: { itemId: itemIds },
    //   transaction: t
    // });

    // const grouped = {};
    // for (const s of stockoutItems) {
    //   if (!grouped[s.itemId]) grouped[s.itemId] = [];
    //   grouped[s.itemId].push(s);
    // }

    // ----------------------------
    // Adjust stock based on diff
    // ----------------------------
    // for (const newItem of newItems) {
    //   const oldItem = oldItems.find(i => i.itemId === newItem.itemId);
    //   const oldQty = oldItem ? oldItem.quantity : 0;
    //   const diff = newItem.quantity - oldQty; // positive = deduct, negative = restore

    //   if (!grouped[newItem.itemId] || grouped[newItem.itemId].length === 0) {
    //     throw new Error(`No stock found for item ${newItem.itemId}`);
    //   }

    //   let remaining = Math.abs(diff);
    //   const stockList = grouped[newItem.itemId];

    //   if (diff > 0) {
    //     // Deduct diff from stock (FIFO)
    //     for (const stock of stockList) {
    //       if (remaining <= 0) break;
    //       const deduct = Math.min(stock.amount, remaining);
    //       stock.amount -= deduct;
    //       remaining -= deduct;
    //       await stock.save({ transaction: t });
    //     }
    //     if (remaining > 0) throw new Error(`Insufficient stock for item ${newItem.itemId}`);
    //   } else if (diff < 0) {
    //     // Restore diff to stock (add back)
    //     for (const stock of stockList) {
    //       if (remaining <= 0) break;
    //       stock.amount += remaining;
    //       remaining = 0;
    //       await stock.save({ transaction: t });
    //     }
    //   }
    // }

    // ----------------------------
    // Update sale record
    // ----------------------------
    const vat = parseFloat(req.body.vat);

    await sale.update({
      totalPrice: req.body.totalPrice ?? sale.totalPrice,
      vat: !isNaN(vat) ? vat : sale.vat,
      totalTaxedPrice: req.body.totalTaxedPrice ?? sale.totalTaxedPrice,
      withholdingAmount: req.body.withholdingAmount ?? sale.withholdingAmount,
      paidAmount: req.body.paidAmount ?? sale.paidAmount,
      fsNo: req.body.fsNo ?? sale.fsNo,
      machineNo: req.body.machineNo ?? sale.machineNo,
      tinNo: req.body.tinNo ?? sale.tinNo,
      credit: typeof req.body.credit === "boolean" ? req.body.credit : sale.credit,
      description: req.body.description ?? sale.description
    }, { transaction: t });

    // Delete old sales items
    await SalesItem.destroy({ where: { salesId: sale.id }, transaction: t });

    // Create new sales items
    for (const newItem of newItems) {
      await SalesItem.create({
        salesId: sale.id,
        itemId: newItem.itemId,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        totalPrice: newItem.quantity * newItem.unitPrice,
        bonus: newItem.bonus || 0,
        sponsor: newItem.sponsor || 0
      }, { transaction: t });
    }

    await t.commit();
    await sale.reload();

    const updatedSale = await Sales.findByPk(id, {
      include: [{ model: SalesItem, include: [Item] }],
    });

    return res.json({ message: "Sale updated successfully", sale: updatedSale });

  } catch (err) {
    await t.rollback();
    console.error("UPDATE SALE ERROR:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};


// Delete sale
exports.deleteSale = async (req, res) => {
  const t = await Sales.sequelize.transaction();
  try {
    const sale = await Sales.findByPk(req.params.id, {
      include: [SalesItem],
      transaction: t
    });
    
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ message: "Sale not found" });
    }

    // Get all items to restore stock
    const itemIds = sale.SalesItems.map(si => si.itemId);
    const stocks = await Stockout.findAll({
      where: { 
        itemId: itemIds,
        warehouseId: sale.warehouseId 
      },
      transaction: t
    });

    // Restore stock for each item
    for (const salesItem of sale.SalesItems) {
      const stock = stocks.find(s => s.itemId === salesItem.itemId);
      if (stock) {
        stock.quantity += salesItem.quantity;
        await stock.save({ transaction: t });
      }
    }

    // Delete sales items
    await SalesItem.destroy({
      where: { salesId: sale.id },
      transaction: t
    });

    // Delete the sale
    await sale.destroy({ transaction: t });
    
    await t.commit();
    res.status(200).json({ message: "Sale deleted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Delete Sale Error:", error);
    res.status(500).json({ message: "Failed to delete sale", error: error.message });
  }
};

exports.getSalesByCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const sales = await Sales.findAll({
      where: { customerId },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: SalesItem,
          include: [
            { 
              model: Item, 
              attributes: ["id", "name", "unitPrice", "code"] 
            }
          ]
        }
      ],
    });

    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by customer", error: error.message });
  }
};

exports.getSalesByItem = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const sales = await Sales.findAll({
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: SalesItem,
          where: { itemId },
          include: [
            { 
              model: Item, 
              attributes: ["id", "name", "unitPrice", "code"] 
            }
          ]
        }
      ],
    });

    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by item", error: error.message });
  }
};

exports.getSalesBySalesMan = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const sales = await Sales.findAll({
      where: { userId },
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] },
        {
          model: SalesItem,
          include: [
            { 
              model: Item, 
              attributes: ["id", "name", "unitPrice", "code"] 
            }
          ]
        }
      ],
    });

    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by user", error: error.message });
  }
};

exports.getSalesByWarehouse = async (req, res) => {
  try {
    const warehouseId = Number(req.params.warehouseId);
    const sales = await Sales.findAll({
      where: { warehouseId },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: SalesItem,
          include: [
            { 
              model: Item, 
              attributes: ["id", "name", "unitPrice", "code"] 
            }
          ]
        }
      ],
    });

    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales by warehouse", error: error.message });
  }
};

const { Op } = require("sequelize");

exports.getSalesReportByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, userId, itemId, warehouseId, credit } = req.body;

    const filterByDate = (field) =>
      startDate && endDate
        ? { [Op.between]: [new Date(startDate), new Date(endDate)] }
        : undefined;

    // --- Build filters for sales ---
    const salesFilter = {};
    if (filterByDate("salesDate")) salesFilter.salesDate = filterByDate("salesDate");
    if (userId) salesFilter.userId = userId;
    if (warehouseId) salesFilter.warehouseId = warehouseId;

    // Apply credit filter only if provided
    let isCreditFilter = false;
    if (credit === true || credit === "true") {
      salesFilter.credit = true;
      isCreditFilter = true;
    } else if (credit === false || credit === "false") {
      salesFilter.credit = false;
    }

    // --- Fetch sales first ---
    const sales = await Sales.findAll({
      where: salesFilter,
      attributes: {
        exclude: ['itemId', 'bonus', 'bonusAmount', 'sponsor', 'sponsorAmount', 'createdAt', 'updatedAt']
      },
      include: [
        { model: User, attributes: ["id", "fullName"] },
        { model: Customer, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
        {
          model: SalesItem,
          include: [
            { 
              model: Item, 
              attributes: ["id", "name", "unitPrice"],
              where: itemId ? { id: itemId } : undefined
            }
          ]
        }
      ],
      order: [["salesDate", "ASC"]],
    });

    // --- Format sales ---
    const formattedSales = sales.map(sale => {
      const json = sale.toJSON();

      delete json.userId;
      delete json.customerId;
      delete json.warehouseId;

      const totals = sale.SalesItems.reduce((acc, item) => {
        const quantity = parseFloat(item.quantity || 0);
        const totalPrice = parseFloat(item.totalPrice || 0);
        return {
          totalQuantity: acc.totalQuantity + quantity,
          totalPrice: acc.totalPrice + totalPrice
        };
      }, { totalQuantity: 0, totalPrice: 0 });

      const creditAmount = sale.credit
        ? parseFloat(sale.totalTaxedPrice || 0) - parseFloat(sale.paidAmount || 0)
        : 0;

      return {
        ...json,
        totalQuantity: totals.totalQuantity,
        totalPrice: totals.totalPrice.toFixed(4),
        creditAmount: creditAmount.toFixed(4),
        SalesItems: sale.SalesItems.map(item => {
          const itemJson = item.toJSON();
          delete itemJson.salesId;
          delete itemJson.itemId;
          return {
            ...itemJson,
            totalPrice: parseFloat(itemJson.totalPrice).toFixed(4),
            unitPrice: parseFloat(itemJson.unitPrice).toFixed(4)
          };
        })
      };
    });

    // --- Grand totals ---
    const totalSales = formattedSales.reduce((sum, s) => sum + parseFloat(s.totalTaxedPrice || 0), 0);
    const totalPaid = formattedSales.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0);
    const totalItemsSold = formattedSales.reduce((sum, s) => sum + (s.totalQuantity || 0), 0);
    const totalCredit = formattedSales.reduce((sum, s) => sum + parseFloat(s.creditAmount || 0), 0);

    // --- Fetch stock movements only if credit filter is NOT applied ---
    let stockouts = [], returns = [], lendings = [];
    if (!isCreditFilter) {
      const movementsFilter = {};
      if (filterByDate("createdAt")) movementsFilter.createdAt = filterByDate("createdAt");
      if (userId) movementsFilter.userId = userId;
      if (warehouseId) movementsFilter.warehouseId = warehouseId;

      const [allStockouts, allLendings, allReturns] = await Promise.all([
        Stockout.findAll({
          where: movementsFilter,
          include: [
            { model: User, attributes: ["fullName"] },
            { model: Warehouse, attributes: ["name"] },
            { model: StockoutItem, include: [{ model: Item, attributes: ["name"], where: itemId ? { id: itemId } : undefined }] }
          ]
        }),
        Lending.findAll({
          where: movementsFilter,
          include: [
            { model: User, attributes: ["fullName"] },
            { model: Item, attributes: ["name"], where: itemId ? { id: itemId } : undefined },
            { model: Warehouse, attributes: ["name"] }
          ]
        }),
        Return.findAll({
          where: movementsFilter,
          include: [
            { model: User, attributes: ["fullName"] },
            { model: Warehouse, attributes: ["name"] },
            { model: ReturnItem, include: [{ model: Item, attributes: ["name"], where: itemId ? { id: itemId } : undefined }] }
          ]
        }),
      ]);

      const formatStockouts = (records) =>
        records.flatMap(stockout =>
          stockout.StockoutItems.map(item => ({
            type: "stockout",
            date: stockout.createdAt,
            item: item.Item?.name || null,
            warehouse: stockout.Warehouse?.name || null,
            user: stockout.User?.fullName || null,
            quantity: item.amount || 0
          }))
        );

      const formatReturns = (records) =>
        records.flatMap(ret =>
          ret.ReturnItems.map(item => ({
            type: "return",
            date: ret.createdAt,
            item: item.Item?.name || null,
            warehouse: ret.Warehouse?.name || null,
            user: ret.User?.fullName || null,
            quantity: item.quantity || 0
          }))
        );

      const formatLendings = (records) =>
        records.map(l => ({
          type: "lending",
          date: l.createdAt,
          item: l.Item?.name || null,
          warehouse: l.Warehouse?.name || null,
          user: l.User?.fullName || null,
          quantity: l.quantity || 0
        }));

      stockouts = formatStockouts(allStockouts);
      returns = formatReturns(allReturns);
      lendings = formatLendings(allLendings);
    }

    const totalStockout = stockouts.reduce((sum, s) => sum + s.quantity, 0);
    const totalReturn = returns.reduce((sum, r) => sum + r.quantity, 0);
    const totalLending = lendings.reduce((sum, l) => sum + l.quantity, 0);

    // --- Send response ---
    res.status(200).json({
      totalSales: totalSales.toFixed(4),
      totalPaid: totalPaid.toFixed(4),
      totalItemsSold,
      salesCount: formattedSales.length,
      totalStockout,
      totalLending,
      totalReturn,
      totalCredit: totalCredit.toFixed(4),
      sales: formattedSales,
      stockouts,
      lendings,
      returns,
    });

  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({
      message: "Failed to generate sales report",
      error: error.message
    });
  }
};

//filters for only salesman
exports.getSalesBySalesmanFiltered = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const {
      customerId,
      tinNo,
      itemId,
      warehouseId,
      date,           // "2025-11-07"
  startDate,     // "2025-11-01"
  endDate         // "2025-11-07"
    } = req.body;

    // BASE: Only this salesman
    const where = { userId };

    // 1. Customer
    if (customerId) where.customerId = Number(customerId);

    // 2. TIN No (partial search)
    if (tinNo) {
      where.tinNo = { [Op.like]: `%${tinNo.trim()}%` };
    }

    // 3. Item
    if (itemId) where.itemId = Number(itemId);

    // 4. Warehouse
    if (warehouseId) where.warehouseId = Number(warehouseId);

    // 5. DATE LOGIC — SUPER SMART
    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      where.salesDate = { [Op.between]: [start, end] };
    } else if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date("1970-01-01");
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      where.salesDate = { [Op.between]: [start, end] };
    }

    const sales = await Sales.findAll({
      where,
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: Item, attributes: ["id", "name", "unitPrice"] },
        { model: Warehouse, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "fullName"] },
      ],
      order: [["salesDate", "DESC"]],
    });

    const totalSales = sales.reduce((s, x) => s + Number(x.totalPrice || 0), 0);
    const totalPaid = sales.reduce((s, x) => s + Number(x.paidAmount || 0), 0);

    res.status(200).json({
      salesmanId: userId,
      filters: req.body,
      count: sales.length,
      totalSales: Number(totalSales.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      outstanding: Number((totalSales - totalPaid).toFixed(2)),
      sales: sales
    });

  } catch (error) {
    console.error("FILTER ERROR:", error);
    res.status(500).json({
      message: "Failed to filter sales",
      error: error.message
    });
  }
};

exports.getFilteredSales = async (req, res) => {
  try {
    const { 
      customerId, 
      credit, // true/false for credit sales
      startDate, 
      endDate,
      page = 1,
      pageSize = 10
    } = req.body;

    // Build the where clause
    const whereClause = {};
    
    // Add customer filter if provided
    if (customerId) {
      whereClause.customerId = customerId;
    }

    // Add credit filter if provided
    if (credit !== undefined) {
      whereClause.credit = credit === 'true' || credit === true;
    }

    // Add date range filter
    if (startDate || endDate) {
      whereClause.salesDate = {};
      if (startDate) whereClause.salesDate[Op.gte] = new Date(startDate);
      if (endDate) {
        // Include the entire end day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        whereClause.salesDate[Op.lte] = endOfDay;
      }
    }

    // Calculate pagination
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const totalCount = await Sales.count({ where: whereClause });

    // Get paginated sales with related data
    const sales = await Sales.findAll({
      where: whereClause,
      include: [
        { 
          model: Customer, 
          attributes: ['id', 'name', 'phoneNumber', 'tinNumber', 'type'],
          required: true
        },
        { 
          model: Item, 
          attributes: ['id', 'name', 'unit', 'unitPrice', 'salePrice'] 
        },
        { 
          model: User, 
          attributes: ['id', 'username', 'fullName'] 
        },
        { 
          model: Warehouse, 
          attributes: ['id', 'name'] 
        }
      ],
      order: [['salesDate', 'DESC']],
      limit: parseInt(pageSize),
      offset: offset
    });

    // Calculate summary
    const summary = await Sales.findOne({
      where: whereClause,
      attributes: [
        [Sales.sequelize.fn('SUM', Sales.sequelize.col('totalPrice')), 'totalSales'],
        [Sales.sequelize.fn('SUM', Sales.sequelize.col('paidAmount')), 'totalPaid'],
        [Sales.sequelize.fn('COUNT', Sales.sequelize.col('id')), 'totalTransactions']
      ],
      raw: true
    });

    res.status(200).json({
      success: true,
      count: sales.length,
      total: totalCount,
      page: parseInt(page),
      pages: Math.ceil(totalCount / pageSize),
      summary: {
        totalSales: parseFloat(summary.totalSales) || 0,
        totalPaid: parseFloat(summary.totalPaid) || 0,
        totalCredit: (parseFloat(summary.totalSales) || 0) - (parseFloat(summary.totalPaid) || 0),
        totalTransactions: parseInt(summary.totalTransactions) || 0
      },
      data: sales
    });

  } catch (error) {
    console.error('Error fetching filtered sales:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching sales data',
      error: error.message 
    });
  }
};


