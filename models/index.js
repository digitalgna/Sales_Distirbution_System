const sequelize = require("../config/db.js");
const User = require("./user.js");
const Role = require("./role.js");
const Permission = require("./permission.js");

// Define associations
Permission.hasMany(Role, {
  foreignKey: "permissionId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Role.belongsTo(Permission, { foreignKey: "permissionId" });

Role.hasMany(User, {
  foreignKey: "roleId",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

User.belongsTo(Role, { foreignKey: "roleId" });

module.exports = { sequelize, User, Role, Permission };
