const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Customer = require("./customer.js");
const Warehouse = require("./wharehouse.js");

const Purchase = sequelize.define("Purchase", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  supplierId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Customer,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  warehouseId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  subTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  exciseTaxedPrice: { type: DataTypes.DECIMAL(14,4) },
  priceAfterExice: { type: DataTypes.DECIMAL(14,4) },
  priceDiscount: { type: DataTypes.DECIMAL(14,4), allowNull: true },
  specialSalesDiscount: { type: DataTypes.DECIMAL(14,4), allowNull: true },
  serviceCharge: { type: DataTypes.DECIMAL(14,4), allowNull: false },
  totalBeforeVat: { type: DataTypes.DECIMAL(14,4) },
  vat:{type:DataTypes.DECIMAL(14,4)},
  totalWithVat: { type: DataTypes.DECIMAL(14,4) },
  fixedPriceDiscount: { type: DataTypes.DECIMAL(14,4) },
  totalVatedAfterDiscount: { type: DataTypes.DECIMAL(14,4) },
  withholdingAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  carId: { type: DataTypes.INTEGER, allowNull: true },
  purchaseDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  fsNo:{
    type:DataTypes.STRING,
    allowNull: false
  },

}, {
  timestamps: true,
});

module.exports = Purchase; 
