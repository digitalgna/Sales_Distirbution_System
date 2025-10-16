const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Category = require("./category.js");
const Warehouse = require("./wharehouse.js")


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
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  unit:{ type: DataTypes.STRING, allowNull: false},
  unitPrice: {type: DataTypes.DECIMAL(10, 2), allowNull: false, },
  totalPrice: {type: DataTypes.DECIMAL(10, 2), allowNull: false},
  salePrice: {type: DataTypes.DECIMAL(10,2), allowNull: true},
  minQuantity: {type: DataTypes.INTEGER, allowNull: false},
  description: { type: DataTypes.STRING, allowNull: true},
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  expirationDate: {type: DataTypes.DATE, allowNull: true}
}, {
  timestamps: true,
});

module.exports = Item;
