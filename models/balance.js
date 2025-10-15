const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Customer = require("./customer.js");
const Item = require("./item.js");

const Balance = sequelize.define("Balance", {
  id: {
    type: DataTypes.INTEGER, 
    autoIncrement: true,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  customerId: {
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
    allowNull: true,
    references: {
        model: Item,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: true
  }
});

module.exports = Balance;
