const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./user.js")
const Customer = require("./customer.js")

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
    }
  },
  quantity:{
    type: DataTypes.INTEGER,
    allowNull:false
  },
  totalPrice: {
    type:DataTypes.DECIMAL(10, 2),
    allowNull:false
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
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
  sponsor: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }

});

module.exports = Sales;
