const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const Role = sequelize.define("Role", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  permissionId: {
    type: DataTypes.INTEGER,
    allowNull: true, // ✅ must allow NULL if onDelete: "SET NULL"
    references: {
      model: "Permissions",
      key: "id",
    },
    onDelete: 'CASCADE'
  },
});

module.exports = Role;
