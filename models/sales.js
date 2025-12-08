const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./user.js")
const Customer = require("./customer.js");
const Item = require("./item.js");
const Warehouse = require("./wharehouse.js");

const Sales = sequelize.define("Sales", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model : User,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: Customer,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  totalPrice: {
    type:DataTypes.DECIMAL(12, 4),
    allowNull:false
  },
  vat: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull:false
  },
  totalTaxedPrice: {
    type: DataTypes.DECIMAL(12,4)
  },
  withholdingAmount: { type: DataTypes.DECIMAL(12,4), defaultValue: 0, allowNull: false },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false
  },
  bank: {
    type: DataTypes.STRING,
    allowNull: true
  },
  salesDate: {
    type: DataTypes.DATE,
    allowNull:false
  },
  tinNo:{
    type: DataTypes.STRING,
    allowNull: false
  },
  fsNo:{
    type:DataTypes.STRING,
    allowNull: false
  },
  machineNo:{
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
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
  credit: {type: DataTypes.BOOLEAN, defaultValue: false},
});

module.exports = Sales;
