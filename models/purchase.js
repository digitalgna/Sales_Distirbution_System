const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Customer = require("./customer.js");
const Item = require("./item.js");
const Warehouse = require("./wharehouse.js");

const Purchase = sequelize.define("Purchase", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  supplierId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Customer,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  itemId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Item,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  warehouseId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  itemAmount: { type: DataTypes.INTEGER, allowNull: false },
  totalPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(12,2) },
  status: DataTypes.STRING,
  withholdingAmount: DataTypes.DECIMAL(12,2),
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  sponsor: DataTypes.STRING,
  bonus: DataTypes.STRING,
  carId: DataTypes.INTEGER,
  chargedCost: DataTypes.DECIMAL(12,2),
  unitExciseTax: DataTypes.DECIMAL(12,2),
  vat: DataTypes.DECIMAL(12,2),
}, {
  timestamps: true,
});

module.exports = Purchase;
