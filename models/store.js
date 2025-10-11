const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Warehouse = require("./wharehouse");
const Item= require("./item.js");

const Store = sequelize.define("Store", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
  }

}, 

{
  timestamps: true,
});

module.exports = Store;
