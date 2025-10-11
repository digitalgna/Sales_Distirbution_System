const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Category = sequelize.define("Category", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
}, {
  timestamps: true,
});

<<<<<<< HEAD
=======

>>>>>>> 0e3115bc0ad5ad2fb2ded3c4c6777282b3576d7a
module.exports = Category;
