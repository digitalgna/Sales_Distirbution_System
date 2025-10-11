const sequelize = require("../config/db.js");
const User = require("./user.js");
const Role = require("./role.js");
const Permission = require("./permission.js");
const Customer = require("./customer");
const Balance = require("./balance");
const Car = require("./carInfo");
const CarOperation = require("./carOperation");
const Sales = require("./sales");
const Lending = require("./lending.js")


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

module.exports = { sequelize, User, Role, Permission };
