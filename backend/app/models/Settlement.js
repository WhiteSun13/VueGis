const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const Settlement = sequelize.define('Settlement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING},
  geom: DataTypes.GEOMETRY('POINT', 4326),
}, { tableName: 'settlements_crimea', timestamps: false });

module.exports = Settlement;
