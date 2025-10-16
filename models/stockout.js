const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Stockout = sequelize.define("Stockout", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: DataTypes.STRING,
  amount: { type: DataTypes.INTEGER, allowNull: false },
  sponsor: DataTypes.INTEGER,
  bonus: DataTypes.INTEGER,
  stockoutDate: DataTypes.DATE,
  salesId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Sales',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  carId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Cars',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
}, {
  timestamps: true,
});

module.exports = Stockout;
