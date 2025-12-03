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


// Create new sale
exports.createSale = async (req, res) => {
  const t = await Sales.sequelize.transaction();
  try {
    // Parse fields safely
    const userId = req.body.userId ? Number(req.body.userId) : null;
    const warehouseId = req.body.warehouseId ? Number(req.body.warehouseId) : null;
    const customerId = req.body.customerId ? Number(req.body.customerId) : null;
    const totalPrice = req.body.totalPrice ? Number(req.body.totalPrice) : null;
    const totalTaxedPrice = req.body.totalTaxedPrice ? Number(req.body.totalTaxedPrice) : null;
    const withholdingAmount = req.body.withholdingAmount ? Number(req.body.withholdingAmount) : null;
    const paidAmount = req.body.paidAmount !== undefined && req.body.paidAmount !== null
      ? Number(req.body.paidAmount)
      : null;
    const bank = req.body.bank || null;
    const salesDate = req.body.salesDate ? new Date(req.body.salesDate) : new Date();
    const description = req.body.description || null;
    const tinNo = req.body.tinNo ? Number(req.body.tinNo) : null;
    const fsNoRaw = req.body.fsNo;
    const machineNoRaw = req.body.machineNo;
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    // sanitize leading/trailing quotes if any
    const fsNo =
      typeof fsNoRaw === "string"
        ? fsNoRaw.replace(/^"+|"+$/g, "")
        : fsNoRaw || null;

    const machineNo =
      typeof machineNoRaw === "string"
        ? machineNoRaw.replace(/^"+|"+$/g, "")
        : machineNoRaw || null;


    // Validate required fields
    if (
      userId === null || warehouseId === null || totalPrice === null || 
      paidAmount === null || tinNo === null || !fsNo || !machineNo ||
      !Array.isArray(items) || items.length === 0
    ) {
      return res.status(400).json({
        message: "Missing required fields: userId, warehouseId, items, totalPrice, paidAmount, tinNo, fsNo, or machineNo.",
      });
    }

      // Validate items array
      for (const item of items) {
        if (!item.itemId || item.quantity === undefined || item.unitPrice === undefined) {
          return res.status(400).json({
            message: "Each item must include itemId, quantity, and unitPrice"
          });
        }
      }

    // Validate related entities
    const [user, warehouse] = await Promise.all([
      User.findByPk(userId),
      Warehouse.findByPk(warehouseId, { transaction: t })
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });

    // Validate all items and check stock
    const itemIds = items.map(item => item.itemId);
    const itemsData = await Item.findAll({
      where: { id: itemIds },
      transaction: t
    });

    if (itemsData.length !== items.length) {
      return res.status(404).json({ message: "One or more items not found" });
    }

    const stocks = await StockoutItem.findAll({
      where: { 
        itemId: itemIds,
      },
      include: [
        {
          model: Stockout,
          where: { warehouseId, status: 'approved' } // only consider approved stockouts
        }
      ],
      transaction: t
    });


    // Check stock for all items
    for (const item of items) {
      const stock = stocks.find(s => s.itemId === item.itemId);
      if (!stock) {
        return res.status(404).json({ 
          message: `No stock found for item ${item.itemId} in this warehouse` 
        });
      }
      if (stock.quantity < item.quantity) {
        const itemData = itemsData.find(i => i.id === item.itemId);
        return res.status(400).json({ 
          message: `Insufficient stock for item ${itemData?.name || item.itemId}. Available: ${stock.quantity}, Requested: ${item.quantity}`
        });
      }
    }

    // Create sale record
    const sale = await Sales.create({
      userId,
      customerId,
      warehouseId,
      totalPrice,
      totalTaxedPrice,
      withholdingAmount,
      paidAmount,
      bank,
      salesDate,
      tinNo,
      fsNo,
      machineNo,
      description
    }, { transaction: t });

    // Create sales items and update stock
    const salesItems = await Promise.all(items.map(async (item) => {
      // Deduct stock
      const stock = stocks.find(s => s.itemId === item.itemId);
      stock.quantity -= item.quantity;
      await stock.save({ transaction: t });

      // Calculate total price for the item
      const itemTotalPrice = item.quantity * item.unitPrice;

      // Create sales item with bonus/sponsor info
      return SalesItem.create({
        salesId: sale.id,
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotalPrice,
        bonus: item.bonus || false,
        bonusAmount: item.bonusAmount || 0,
        sponsor: item.sponsor || null,
        sponsorAmount: item.sponsorAmount || 0
      }, { transaction: t });
    }));

    await t.commit();

    // Fetch the complete sale with items
    const result = await Sales.findByPk(sale.id, {
      include: [
        { model: SalesItem, include: [Item] },
        { model: User, attributes: ['id', 'fullName'] },
        { model: Customer, attributes: ['id', 'name'] },
        { model: Warehouse, attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({ 
      message: "Sale created successfully", 
      sale: result.toJSON() 
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
    const sale = await Sales.findByPk(id, { 
      include: [SalesItem],
      transaction: t 
    });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ message: "Sale not found" });
    }

    // Get all items to update stock
    const itemIds = [...new Set([...sale.SalesItems.map(si => si.itemId), 
      ...(req.body.items || []).map(i => i.itemId)])];
    
    const stocks = await Stockout.findAll({
      where: { 
        itemId: itemIds,
        warehouseId: sale.warehouseId 
      },
      transaction: t
    });

    // Restore original stock
    for (const salesItem of sale.SalesItems) {
      const stock = stocks.find(s => s.itemId === salesItem.itemId);
      if (stock) {
        stock.quantity += salesItem.quantity;
        await stock.save({ transaction: t });
      }
    }

    // Clean and update sale data
    const clean = (val) => {
      if (typeof val !== "string") return val;
      return val.replace(/^"/g, "").replace(/"$/g, "").trim();
    };

    // Update sale record
    await sale.update({
      ...req.body,
      fsNo: clean(req.body.fsNo) || sale.fsNo,
      machineNo: clean(req.body.machineNo) || sale.machineNo,
      tinNo: Number(req.body.tinNo) || sale.tinNo,
      credit: req.body.credit === true || req.body.credit === "true",
      totalPrice: req.body.totalPrice || sale.totalPrice,
      totalTaxedPrice: req.body.totalTaxedPrice || sale.totalTaxedPrice,
      withholdingAmount: req.body.withholdingAmount || sale.withholdingAmount,
      paidAmount: req.body.paidAmount !== undefined ? Number(req.body.paidAmount) : sale.paidAmount
    }, { transaction: t });

    // Delete existing sales items
    await SalesItem.destroy({
      where: { salesId: id },
      transaction: t
    });

    // Create new sales items if provided
    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        // Deduct stock
        const stock = stocks.find(s => s.itemId === item.itemId);
        if (!stock) {
          throw new Error(`No stock found for item ${item.itemId}`);
        }
        stock.quantity -= item.quantity;
        if (stock.quantity < 0) {
          throw new Error(`Insufficient stock for item ${item.itemId}`);
        }
        await stock.save({ transaction: t });

        // Create sales item
        await SalesItem.create({
          salesId: sale.id,
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          bonus: item.bonus || false,
          bonusAmount: item.bonusAmount || 0,
          sponsor: item.sponsor || null,
          sponsorAmount: item.sponsorAmount || 0
        }, { transaction: t });
      }
    }

    await t.commit();

    // Fetch the updated sale with items
    const updatedSale = await Sales.findByPk(id, {
      include: [
        { model: SalesItem, include: [Item] },
        { model: User, attributes: ['id', 'fullName'] },
        { model: Customer, attributes: ['id', 'name'] },
        { model: Warehouse, attributes: ['id', 'name'] }
      ]
    });

    res.json({ message: "Sale updated!", sale: updatedSale });

  } catch (err) {
    await t.rollback();
    console.error("UPDATE ERROR:", err);
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
    const { startDate, endDate, userId, itemId, warehouseId } = req.body;

    // --- Filters ---
    const filterByDate = (field) =>
      startDate && endDate ? { [Op.between]: [new Date(startDate), new Date(endDate)] } : undefined;

    const salesFilter = {};
    if (filterByDate("salesDate")) salesFilter.salesDate = filterByDate("salesDate");
    if (userId) salesFilter.userId = userId;
    if (warehouseId) salesFilter.warehouseId = warehouseId;

    const movementsFilter = {};
    if (startDate && endDate) movementsFilter.createdAt = filterByDate("createdAt");
    if (userId) movementsFilter.userId = userId;
    if (itemId) movementsFilter.itemId = itemId;
    if (warehouseId) movementsFilter.warehouseId = warehouseId;

    // --- Fetch Data ---
    const [sales, allStockouts, allLendings, allReturns] = await Promise.all([
      Sales.findAll({
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
      }),
      Stockout.findAll({
        where: movementsFilter,
        include: [
          { model: User, attributes: ["fullName"] },
          { model: Item, attributes: ["name"] },
          { model: Warehouse, attributes: ["name"] },
        ],
      }),
      Lending.findAll({
        where: movementsFilter,
        include: [
          { model: User, attributes: ["fullName"] },
          { model: Item, attributes: ["name"] },
          { model: Warehouse, attributes: ["name"] },
        ],
      }),
      Return.findAll({
        where: movementsFilter,
        include: [
          { model: User, attributes: ["fullName"] },
          { model: Item, attributes: ["name"] },
          { model: Warehouse, attributes: ["name"] },
        ],
      }),
    ]);

    // --- Format sales ---
    const formattedSales = sales.map(sale => {
      const json = sale.toJSON();
      
      // Clean up the response
      delete json.userId;
      delete json.customerId;
      delete json.warehouseId;
      
      // Calculate totals from SalesItems
      const totals = sale.SalesItems.reduce((acc, item) => {
        const quantity = parseFloat(item.quantity || 0);
        const totalPrice = parseFloat(item.totalPrice || 0);
        return {
          totalQuantity: acc.totalQuantity + quantity,
          totalPrice: acc.totalPrice + totalPrice
        };
      }, { totalQuantity: 0, totalPrice: 0 });

      return {
        ...json,
        totalQuantity: totals.totalQuantity,
        totalPrice: totals.totalPrice.toFixed(4),
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

    // Calculate grand totals
    const totalSales = formattedSales.reduce((sum, s) => sum + parseFloat(s.totalPrice || 0), 0);
    const totalPaid = formattedSales.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0);
    const totalItemsSold = formattedSales.reduce((sum, s) => sum + (s.totalQuantity || 0), 0);

    // --- Format movements ---
    const formatMovements = (records, type) => records.map(r => ({
      type,
      date: r.createdAt || r.lendingDate || r.returnDate,
      item: r.Item?.name || null,
      warehouse: r.Warehouse?.name || null,
      user: r.User?.fullName || null,
      quantity: r.quantity || r.amount || r.returnQuantity || 0
    }));

    const stockouts = formatMovements(allStockouts, "stockout");
    const lendings = formatMovements(allLendings, "lending");
    const returns = formatMovements(allReturns, "return");

    // --- Totals for movements ---
    const totalStockout = stockouts.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalLending = lendings.reduce((sum, l) => sum + (l.quantity || 0), 0);
    const totalReturn = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);

    res.status(200).json({
      totalSales: totalSales.toFixed(4),
      totalPaid: totalPaid.toFixed(4),
      totalItemsSold,
      salesCount: formattedSales.length,
      totalStockout,
      totalLending,
      totalReturn,
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


