const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const Permission = sequelize.define("Permission", {
  id: {
    type: DataTypes.INTEGER, // ✅ matches Role.permissionId
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
});

module.exports = Permission;
