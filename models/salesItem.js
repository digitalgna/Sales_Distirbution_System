const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Sales = require("./sales.js");
const Item = require("./item.js");

const SalesItem = sequelize.define("SalesItem", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  salesId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Sales,
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
    onDelete: 'RESTRICT'
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
  },
  bonus: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
  },
  bonusAmount: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
  },
  sponsor: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    defaultValue: 0,
  },
  sponsorAmount: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
  }
}, {
  timestamps: false
});



module.exports = SalesItem;
