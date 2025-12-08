const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("../models/user.js");

const Zbalance = sequelize.define("Zbalance", {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  zamount: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
  },
  bankdeposit: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
  },
  totalsales: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
  },
}, {
  tableName: "zbalances",
  timestamps: true, 
});

module.exports = Zbalance;