const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Item = require("./item");
const User = require("./user.js");
const Warehouse = require("./wharehouse");

const Return = sequelize.define("Return", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  returnTo: {
    type: DataTypes.ENUM('car', 'store'),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('sale', 'purchase'),
    allowNull: true
  },
  returnDate: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  timestamps: true,
});

module.exports = Return;
