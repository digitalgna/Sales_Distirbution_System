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
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: Item,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  quantity:{
    type: DataTypes.INTEGER,
    allowNull:false
  },
  totalPrice: {
    type:DataTypes.DECIMAL(10, 4),
    allowNull:false
  },
  totalTaxedPrice: {
    type: DataTypes.DECIMAL(10,4)
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false
  },
  reciept: {
    type: DataTypes.JSON,
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
  bonus: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bonusAmount:{
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
  },
  sponsor: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sponsurAmount:{
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
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
