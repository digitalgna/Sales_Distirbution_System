const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Supplier = sequelize.define("Supplier", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  address: DataTypes.STRING,
  email: DataTypes.STRING,
}, {
  timestamps: true,
});

module.exports = Supplier;
