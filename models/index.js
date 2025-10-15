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
const Warehouse = require("./wharehouse");

// ====================== AUTH & USER MANAGEMENT ======================


// Permission and Role
Permission.hasMany(Role, {
  foreignKey: "permissionId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Role.belongsTo(Permission, { foreignKey: "permissionId" });

// Role and User
Role.hasMany(User, {
  foreignKey: "roleId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
User.belongsTo(Role, { foreignKey: "roleId" });

// Warehouse and User
Warehouse.hasMany(User, {
  foreignKey: "warehouseId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.belongsTo(Warehouse, {
  foreignKey: "warehouseId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});


// Purchase belongsTo Customer
Purchase.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });
Customer.hasMany(Purchase, { foreignKey: "customerId", as: "purchases" });
// ====================== CUSTOMER & BALANCE ======================

// Customer and Balance
Customer.hasMany(Balance, {
  foreignKey: "customerId",
  as: "balances",
  onDelete: "CASCADE",
});
Balance.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// Balance and Item
Balance.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });
Item.hasMany(Balance, { foreignKey: "itemId", onDelete: "CASCADE" });

// ====================== CAR MANAGEMENT ======================

// Car and CarOperation
Car.hasMany(CarOperation, {
  foreignKey: "carId",
  as: "operations",
  onDelete: "CASCADE",
});
CarOperation.belongsTo(Car, {
  foreignKey: "carId",
  as: "car",
});

// CarOperation and User
CarOperation.belongsTo(User, {
  foreignKey: "userId",
  onDelete: "CASCADE"
});
User.hasMany(CarOperation, {
  foreignKey: "userId",
  onDelete: "CASCADE"
});

// Car and Purchase
Car.hasMany(Purchase, {
  foreignKey: "carId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Purchase.belongsTo(Car, { foreignKey: "carId" });

// ====================== SALES & LENDING ======================

// User and Sales
User.hasMany(Sales, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});
Sales.belongsTo(User, {
  foreignKey: "userId",
});

// Customer and Sales
Customer.hasMany(Sales, {
  foreignKey: "customerId",
  onDelete: "SET NULL",
});
Sales.belongsTo(Customer, {
  foreignKey: "customerId",
});

// User and Lending
User.hasMany(Lending, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});
Lending.belongsTo(User, {
  foreignKey: "userId",
});

// Customer and Lending
Customer.hasMany(Lending, {
  foreignKey: "customerId",
  onDelete: "SET NULL",
});
Lending.belongsTo(Customer, {
  foreignKey: "customerId",
});

// Item and Sales
Item.hasMany(Sales, { foreignKey: "itemId", onDelete: "CASCADE" });
Sales.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });

// Item and Lending
Item.hasMany(Lending, { foreignKey: "itemId", onDelete: "CASCADE" });
Lending.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });

// Warehouse and Lending
Warehouse.hasMany(Lending, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Lending.belongsTo(Warehouse, { foreignKey: "warehouseId", onDelete: "CASCADE" });

// ====================== INVENTORY MANAGEMENT ======================

// Category and Item
Category.hasMany(Item, { foreignKey: "categoryId", onDelete: "CASCADE" });
Item.belongsTo(Category, { foreignKey: "categoryId", onDelete: "CASCADE" });

// Warehouse and Item
Warehouse.hasMany(Item, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Item.belongsTo(Warehouse, { foreignKey: "warehouseId", onDelete: "CASCADE" });

// Warehouse and Store
Warehouse.hasMany(Store, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Store.belongsTo(Warehouse, { foreignKey: "warehouseId", onDelete: "CASCADE" });

// Item and Store
Item.hasMany(Store, { foreignKey: "itemId", onDelete: "CASCADE" });
Store.belongsTo(Item, { foreignKey: "itemId", onDelete: "CASCADE" });

// Warehouse and Stockout
Warehouse.hasMany(Stockout, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Stockout.belongsTo(Warehouse, { foreignKey: "warehouseId", as: "warehouse" });

// Item and Stockout
Item.hasMany(Stockout, { foreignKey: "itemId", onDelete: "CASCADE" });
Stockout.belongsTo(Item, { foreignKey: "itemId", as: "item" });


User.hasMany(Return, { foreignKey: "userId", as: "returns", onDelete: "CASCADE" });
Return.belongsTo(User, { foreignKey: "userId", as: "user" });
// Warehouse and Return
Warehouse.hasMany(Return, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Return.belongsTo(Warehouse, { foreignKey: "warehouseId", as: "warehouse" });

// Item and Return
Item.hasMany(Return, { foreignKey: "itemId", onDelete: "CASCADE" }); 
Return.belongsTo(Item, { foreignKey: "itemId", as: "item" }); 

// ====================== PURCHASE MANAGEMENT ====================

// Item and Purchase
Item.hasMany(Purchase, { foreignKey: "itemId", onDelete: "CASCADE" });
Purchase.belongsTo(Item, { foreignKey: "itemId", as: "item", onDelete: "CASCADE" });

// Warehouse and Purchase
Warehouse.hasMany(Purchase, { foreignKey: "warehouseId", onDelete: "CASCADE" });
Purchase.belongsTo(Warehouse, { foreignKey: "warehouseId", as: "warehouse", onDelete: "CASCADE" });

// ====================== EXPORT ======================
module.exports = {
  Category,
  Item,
  Warehouse,
  Stockout,
  Store,
  Return,
  Purchase,
  sequelize, 
  User, 
  Role, 
  Permission, 
  Customer, 
  Balance, 
  Car, 
  CarOperation, 
  Sales, 
  Lending, 
  Expense
};