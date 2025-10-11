const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./user.js");
const Customer = require("./customer.js");
const Item = require("./item.js");
const Warehouse = require("./wharehouse.js");

const Lending = sequelize.define("Lending", {
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
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: Item,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: Warehouse,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  lendingDate: {
    type:DataTypes.DATE,
    allowNull:false
  }
});

module.exports = Lending;
