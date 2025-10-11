const sequelize = require("../config/db.js");
const User = require("./user.js");
const Role = require("./role.js");
const Permission = require("./permission.js");
const  Category  = require("./category.js");
const  Item = require("./item.js");
const Warehouse  = require("./wharehouse.js");
const  Stockout  = require("./stockout.js");
const  Store  = require("./store.js");
const  Return  = require("./return.js");
const  Supplier  = require("./supplier.js");
const  Purchase  = require("./purchase.js");


// Define associations
Permission.hasMany(Role, {
  foreignKey: "permissionId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Role.belongsTo(Permission, { foreignKey: "permissionId" });

Role.hasMany(User, {
  foreignKey: "roleId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

User.belongsTo(Role, { foreignKey: "roleId" });



// ====================== INVENTORY RELATIONSHIPS ======================

// CATEGORY ↔ ITEM
Category.hasMany(Item, { foreignKey: "categoryId", onDelete: "CASCADE" });
Item.belongsTo(Category, { foreignKey: "categoryId" });

// WAREHOUSE ↔ ITEM
Warehouse.hasMany(Item, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Item.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// WAREHOUSE ↔ STOCKOUT
Warehouse.hasMany(Stockout, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Stockout.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ITEM ↔ STOCKOUT
Item.hasMany(Stockout, { foreignKey: "itemId", onDelete: "CASCADE" });
Stockout.belongsTo(Item, { foreignKey: "itemId" });

// WAREHOUSE ↔ STORE
Warehouse.hasMany(Store, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Store.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ITEM ↔ STORE
Item.hasMany(Store, { foreignKey: "itemId", onDelete: "CASCADE" });
Store.belongsTo(Item, { foreignKey: "itemId" });

// WAREHOUSE ↔ RETURN
Warehouse.hasMany(Return, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Return.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ITEM ↔ RETURN
Item.hasMany(Return, { foreignKey: "itemId", onDelete: "CASCADE" });
Return.belongsTo(Item, { foreignKey: "itemId" });

// ====================== PURCHASE RELATIONSHIPS ======================

// SUPPLIER ↔ PURCHASE
Supplier.hasMany(Purchase, { foreignKey: "supplierId", onDelete: "CASCADE" });
Purchase.belongsTo(Supplier, { foreignKey: "supplierId" });

// ITEM ↔ PURCHASE
Item.hasMany(Purchase, { foreignKey: "itemId", onDelete: "CASCADE" });
Purchase.belongsTo(Item, { foreignKey: "itemId" });

// WAREHOUSE ↔ PURCHASE
Warehouse.hasMany(Purchase, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Purchase.belongsTo(Warehouse, { foreignKey: "warehouseId" });

// ====================== EXPORT ======================
module.exports = {
  Category,
  Item,
  Warehouse,
  Stockout,
  Store,
  Return,
  Supplier,
  Purchase,
  sequelize, User, Role, Permission
};


