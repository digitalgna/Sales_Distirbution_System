const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Item = require("./item.js");
const Purchase = require("./purchase.js");

const PurchaseItem = sequelize.define("PurchaseItem", {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  purchaseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Purchase,
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
  quantity: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  unitPrice: { 
    type: DataTypes.DECIMAL(12,2), 
    allowNull: false 
  },
  bonus: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0,
    allowNull: true 
  },
  sponsor: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
}, {
  timestamps: true,
});

module.exports = PurchaseItem;
