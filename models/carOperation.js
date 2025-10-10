const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Car = require("./carInfo.js");

const CarOperation = sequelize.define("CarOperation", {
  id: {
    type: DataTypes.INTEGER, 
    autoIncrement: true,
    primaryKey: true,
  },
  currentMileage: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
  },
  previousMileage: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true,
  },
  previousFuel: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
  },
  currentFuel: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
  },
  actionType: {
    type: DataTypes.ENUM('fuel', 'service', 'assign'),
    allowNull:false
  },
  serviceCost: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
  },
  serviceDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  carId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: Car,
        key: 'id'
    },
    onDelete: 'CASCADE'
  },
  assignDate: {
    type: DataTypes.DATE,
    allowNull: True
  }
});

module.exports = CarOperation;
