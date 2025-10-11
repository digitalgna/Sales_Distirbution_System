const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Purchase = sequelize.define("Purchase", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  supplierId: { type: DataTypes.INTEGER, allowNull: false },
  itemId: { type: DataTypes.INTEGER, allowNull: false },
  warehouseId: { type: DataTypes.INTEGER, allowNull: false },
  itemAmount: { type: DataTypes.INTEGER, allowNull: false },
  totalPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(12,2) },
  status: DataTypes.STRING,
  withholdingAmount: DataTypes.DECIMAL(12,2),
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  sponsor: DataTypes.STRING,
  bonus: DataTypes.STRING,
  carId: DataTypes.INTEGER,
  chargedCost: DataTypes.DECIMAL(12,2),
  unitExciseTax: DataTypes.DECIMAL(12,2),
  vat: DataTypes.DECIMAL(12,2),
}, {
  timestamps: true,
});

module.exports = Purchase;
