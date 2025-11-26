const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Customer = require("./customer.js");
const Item = require("./item.js");

const BalanceSheet = sequelize.define("BalanceSheet", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  agentName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Seblu Deresse Mekonnen",
  },
   customerId: {
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
    allowNull: true,
    references: {
        model: Item,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  date: {
    type: DataTypes.DATEONLY, // more precise if you only need the date
    allowNull: false,
  },
  invoiceAmount: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: true,
  },
  bankDeposit: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
  },
  withHold: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
  },
  adjustment: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: true,
    defaultValue: 0.0,
  },
  endingBalance: {
    type: DataTypes.DECIMAL(14, 4),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: true
  }
}, {
  tableName: "balance_sheets",  // optional, for consistent naming
  timestamps: false,            // unless you want createdAt/updatedAt
});

module.exports = BalanceSheet;
