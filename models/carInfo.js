const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const Car = sequelize.define("Car", {
  id: {
    type: DataTypes.INTEGER, 
    autoIncrement: true,
    primaryKey: true,
  },
  carName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  carPlate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  carModel: {
    type: DataTypes.STRING,
    allowNull:true
  },
  carFiles: {
    type: DataTypes.JSON,
    allowNull:true
  },
  driverName: {
    type: DataTypes.STRING,
    allowNull:true
  },
  driverPhone: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Car;
