const sequelize = require("../config/db.js");
const User = require("./user.js");
const Role = require("./role.js");
const Permission = require("./permission.js");
const Customer = require("./customer");
const Balance = require("./balance");
const Car = require("./carInfo");
const CarOperation = require("./carOperation");
const Sales = require("./sales");
const Lending = require("./lending.js");
const Expense = require("./expense.js");

const Category = require("./category.js");
const Item = require("./item.js");
const Purchase = require("./purchase.js");
const Return = require("./return.js");
const Stockout = require("./stockout.js");
const Store = require("./store.js");
const Supplier = require("./supplier");
const Warehouse = require("./wharehouse");

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

//customer and balance
Customer.hasMany(Balance, {
  foreignKey: "customerId",
  as: "balances",  // optional alias
  onDelete: "CASCADE",
});
Balance.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});


// A car can have many operations
Car.hasMany(CarOperation, {
  foreignKey: "carId",
  as: "operations",
  onDelete: "CASCADE",
});

// Each operation belongs to a car
CarOperation.belongsTo(Car, {
  foreignKey: "carId",
  as: "car",
});

// Each CarOperation belongs to a User
CarOperation.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });

// One User can have many CarOperations
User.hasMany(CarOperation, { foreignKey: "userId", onDelete: "CASCADE" });

// 🧩 1. User ↔ Sales
User.hasMany(Sales, {
  foreignKey: "userId",
  as: "sales",
  onDelete: "CASCADE",
});

Sales.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// 🧩 2. Customer ↔ Sales
Customer.hasMany(Sales, {
  foreignKey: "customerId",
  as: "sales",
  onDelete: "SET NULL",
});

Sales.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});


// 🧩 1. User ↔ Lending
User.hasMany(Lending, {
  foreignKey: "userId",
  as: "lendings",
  onDelete: "CASCADE",
});

Lending.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// 🧩 2. Customer ↔ Lending
Customer.hasMany(Lending, {
  foreignKey: "customerId",
  as: "lendings",
  onDelete: "SET NULL",
});

Lending.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// One warehouse can have many users
Warehouse.hasMany(User, {
  foreignKey: "warehouseId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Each user belongs to one warehouse
User.belongsTo(Warehouse, {
  foreignKey: "warehouseId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Each sale belongs to one item
Sales.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });

// One item can appear in many sales
Item.hasMany(Sales, { foreignKey: "itemId", onDelete: "CASCADE" });


// Each lending record belongs to one item
Lending.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });

// One item can appear in many lendings
Item.hasMany(Lending, { foreignKey: "itemId", onDelete: "CASCADE" });

Lending.belongsTo(Warehouse, { foreignKey: "warehouseId", onDelete: "CASCADE" });

// One warehouse can have many lendings
Warehouse.hasMany(Lending, { foreignKey: "warehouseId", onDelete: "CASCADE" });

// Each balance belongs to an item
Balance.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });
Item.hasMany(Balance, { foreignKey: "itemId", onDelete: "CASCADE" });

// Each balance belongs to a customer
Balance.belongsTo(Customer, { foreignKey: "customerId", onDelete: "CASCADE" });
Customer.hasMany(Balance, { foreignKey: "customerId", onDelete: "CASCADE" });

// Each purchase belongs to a supplier (customer)
Purchase.belongsTo(Customer, { foreignKey: "supplierId", onDelete: "CASCADE" });
Customer.hasMany(Purchase, { foreignKey: "supplierId", onDelete: "CASCADE" });

// Each purchase belongs to an item
Purchase.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });
Item.hasMany(Purchase, { foreignKey: "itemId", onDelete: "CASCADE" });

// Each purchase belongs to a warehouse
Purchase.belongsTo(Warehouse, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Warehouse.hasMany(Purchase, { foreignKey: "warehouseId", onDelete: "CASCADE" });


// Item belongs to a Category
Item.belongsTo(Category, { foreignKey: "categoryId", onDelete: "CASCADE" });
Category.hasMany(Item, { foreignKey: "categoryId", onDelete: "CASCADE" });

// Item belongs to a Warehouse
Item.belongsTo(Warehouse, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Warehouse.hasMany(Item, { foreignKey: "warehouseId", onDelete: "CASCADE" });

// Store belongs to an Item
Store.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });
Item.hasMany(Store, { foreignKey: "itemId", onDelete: "CASCADE" });

// Store belongs to a Warehouse
Store.belongsTo(Warehouse, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Warehouse.hasMany(Store, { foreignKey: "warehouseId", onDelete: "CASCADE" });


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
  sequelize, User, Role, Permission, Customer, Balance, Car, CarOperation, Sales, Lending, Expense
};