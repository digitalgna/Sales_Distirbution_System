const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Category = require("./category.js");


const Item = sequelize.define("Item", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Category,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: { type: DataTypes.STRING, allowNull: false },
  unit:{ type: DataTypes.STRING, allowNull: false},
  unitPrice: {type: DataTypes.DECIMAL(14, 4), allowNull: false, },
  salePrice: {type: DataTypes.DECIMAL(14,4), allowNull: true},
  minQuantity: {type: DataTypes.INTEGER, allowNull: false},
  description: { type: DataTypes.STRING, allowNull: true},
  expirationDate: {type: DataTypes.DATE, allowNull: true},
  // applyExciseTax: {type: DataTypes.BOOLEAN, defaultValue: false},
  ExciseTax: {type: DataTypes.INTEGER, allowNull: true}
}, {
  timestamps: true,
});

module.exports = Item;
