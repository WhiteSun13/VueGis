const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const SiteType = sequelize.define('SiteType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type_value: { type: DataTypes.STRING, allowNull: false },
    label: { type: DataTypes.TEXT },
}, {
    tableName: 'site_types',
    timestamps: false,
});

module.exports = SiteType;