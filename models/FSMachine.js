const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./user.js")

const FsTable = sequelize.define("FsTable", {
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
  machineNo:{
    type: DataTypes.STRING,
    allowNull: false
  },
  fsNo:{
    type:DataTypes.STRING,
    allowNull: false
  },

});
module.exports = FsTable;