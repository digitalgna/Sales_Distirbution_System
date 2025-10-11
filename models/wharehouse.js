const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Warehouse = sequelize.define("Warehouse", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  address: DataTypes.STRING,
  size: DataTypes.STRING,
}, {
  timestamps: true,
});

module.exports = Warehouse;
