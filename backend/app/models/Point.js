const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const Point = sequelize.define('Point', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  type_id: { type: DataTypes.INTEGER },
  epoch_id: { type: DataTypes.INTEGER },
  admin_division_id:  { type: DataTypes.INTEGER},
  geom: DataTypes.GEOMETRY('POINT', 4326),
}, {
  tableName: 'sites_points',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Point;
