const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const Expense = sequelize.define("Expense", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
  },
  description: {
    type:DataTypes.STRING,
    allowNull:true
  },
  expenseDate: {
    type:DataTypes.DATE,
    allowNull:false}
});

module.exports = Expense;
