const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Return = require("./return");
const Item = require("./item");

const ReturnItem = sequelize.define(
  "ReturnItem",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ReturnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Return, key: "id" },
      onDelete: "CASCADE",
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Item, key: "id" },
      onDelete: "CASCADE",
    },
    quantity: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
  },
  { timestamps: true }
);

module.exports = ReturnItem;
