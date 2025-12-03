const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Car = require("./carInfo");
const User = require("./user");
const Warehouse = require("./wharehouse");

const Stockout = sequelize.define(
  "Stockout",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    carId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Car, key: "id" },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: User, key: "id" },
      onDelete: "CASCADE",
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Warehouse, key: "id" },
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  { timestamps: true }
);

module.exports = Stockout;
