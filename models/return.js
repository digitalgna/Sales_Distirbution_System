const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Item = require("./item");
const User = require("./user.js");
const Warehouse = require("./wharehouse");

const Return = sequelize.define("Return", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Item,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  returnQuantity: { type: DataTypes.INTEGER, allowNull: false },
  reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
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
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('sale', 'purchase', 'sponsor', 'bonus'),
    allowNull: false
  }
}, {
  timestamps: true,
});

module.exports = Return;
