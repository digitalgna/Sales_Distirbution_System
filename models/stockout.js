const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Stockout = sequelize.define("Stockout", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: DataTypes.STRING,
  amount: { type: DataTypes.INTEGER, allowNull: false },
  sponsor: DataTypes.STRING,
  bonus: DataTypes.STRING,
  salesId: DataTypes.INTEGER,
  carId: DataTypes.INTEGER,
}, {
  timestamps: true,
});

module.exports = Stockout;
