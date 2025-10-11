const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Item = sequelize.define("Item", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  unit: DataTypes.STRING,
  expirationDate: DataTypes.DATE,
}, {
  timestamps: true,
});

module.exports = Item;
