const DataTypes  = require("sequelize");
const  sequelize  = require ("../config/db.js");
const Role = require ("./role.js");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull:false,
    references: {
        model: Role,
        key: "id"
    },
    onDelete: 'CASCADE'
  }
});

module.exports = User;
