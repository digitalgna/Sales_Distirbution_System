const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Return = sequelize.define("Return", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  returnQuantity: { type: DataTypes.INTEGER, allowNull: false },
  reason: DataTypes.STRING,
  salesmanId: DataTypes.INTEGER,
}, {
  timestamps: true,
});

module.exports = Return;
