const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./user.js");
const Customer = require("./customer.js");

const Lending = sequelize.define("Lending", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model : User,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
        model: Customer,
        key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lendingDate: {
    type:DataTypes.DATE,
    allowNull:false}
});

module.exports = Lending;
