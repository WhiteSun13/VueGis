const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const AdminArea = sequelize.define('AdminArea', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, field: 'name' },
  geom: DataTypes.GEOMETRY, // можно указать конкретный тип, например 'MULTIPOLYGON'
}, { tableName: 'admin_div_crimea', timestamps: false });

module.exports = AdminArea;
