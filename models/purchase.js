const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Customer = require("./customer.js");
const Item = require("./item.js");
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
  itemId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: Item,
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
  quantity: { type: DataTypes.INTEGER, allowNull: false },   // renamed from itemAmount
  unitPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  totalPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false }, // ensure calculated as quantity * unitPrice
  status: { type: DataTypes.ENUM('pending','approved', 'rejected'), defaultValue: 'pending',  }, 
  withholdingAmount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0, allowNull: false },
  vat: { type: DataTypes.DECIMAL(12,2), defaultValue: 0, allowNull: false },
  exciseTax: { type: DataTypes.DECIMAL(12,2), defaultValue: 0, allowNull: false },// additional tax for items like alcohol
  carId: { type: DataTypes.INTEGER, allowNull: true },
  sponsor: { type: DataTypes.STRING, allowNull: true },
  bonus: { type: DataTypes.STRING, allowNull: true },
  purchaseDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  timestamps: true,
});

module.exports = Purchase; 
