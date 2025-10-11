const Supplier = require("./supplier");
const Purchase = require("./purchase");
const { Item, Warehouse } = require("../Inventory"); // Import inventory models

// ===== SUPPLIER ↔ PURCHASE =====
Supplier.hasMany(Purchase, { foreignKey: "supplierId", onDelete: "CASCADE" });
Purchase.belongsTo(Supplier, { foreignKey: "supplierId" });

// ===== ITEM ↔ PURCHASE =====
Item.hasMany(Purchase, { foreignKey: "itemId", onDelete: "CASCADE" });
Purchase.belongsTo(Item, { foreignKey: "itemId" });

// ===== WAREHOUSE ↔ PURCHASE =====
Warehouse.hasMany(Purchase, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Purchase.belongsTo(Warehouse, { foreignKey: "warehouseId" });

module.exports = { Supplier, Purchase };
