const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Role = require("./role.js")

const Permission = sequelize.define("Permission", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  actions: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references:{
      model: Role,
      key: "id"
    },
    onDelete: 'CASCADE'
    }
  
});

module.exports = Permission;
