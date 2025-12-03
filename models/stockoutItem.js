const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Stockout = require("./stockout");
const Item = require("./item");

const StockoutItem = sequelize.define(
  "StockoutItem",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stockoutId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Stockout, key: "id" },
      onDelete: "CASCADE",
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Item, key: "id" },
      onDelete: "CASCADE",
    },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    bonus: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    sponsor: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  },
  { timestamps: true }
);

module.exports = StockoutItem;
