const Category = require("./category");
const Item = require("./item");
const Warehouse = require("./warehouse");
const Stockout = require("./stockout");
const Store = require("./store");
const Return = require("./return");

// ===== CATEGORY ↔ ITEM =====
Category.hasMany(Item, { foreignKey: "categoryId", onDelete: "CASCADE" });
Item.belongsTo(Category, { foreignKey: "categoryId" });

// ===== WAREHOUSE ↔ ITEM =====
Warehouse.hasMany(Item, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Item.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ===== WAREHOUSE ↔ STOCKOUT =====
Warehouse.hasMany(Stockout, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Stockout.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ===== ITEM ↔ STOCKOUT =====
Item.hasMany(Stockout, { foreignKey: "itemId", onDelete: "CASCADE" });
Stockout.belongsTo(Item, { foreignKey: "itemId" });

// ===== WAREHOUSE ↔ STORE =====
Warehouse.hasMany(Store, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Store.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ===== ITEM ↔ STORE =====
Item.hasMany(Store, { foreignKey: "itemId", onDelete: "CASCADE" });
Store.belongsTo(Item, { foreignKey: "itemId" });

// ===== WAREHOUSE ↔ RETURN =====
Warehouse.hasMany(Return, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Return.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ===== ITEM ↔ RETURN =====
Item.hasMany(Return, { foreignKey: "itemId", onDelete: "CASCADE" });
Return.belongsTo(Item, { foreignKey: "itemId" });

module.exports = { Category, Item, Warehouse, Stockout, Store, Return };
