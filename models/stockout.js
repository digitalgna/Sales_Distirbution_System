const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Car = require("./carInfo");
const User = require("./user");
const Warehouse = require("./wharehouse");
const Item = require("./item");

const Stockout = sequelize.define(
  "Stockout",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Item,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    carId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Car,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Warehouse, key: "id" },
    },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    sponsor: { type: DataTypes.INTEGER, allowNull: true },
    bonus: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Stockout;
