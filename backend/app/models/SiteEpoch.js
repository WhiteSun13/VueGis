const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const SiteEpoch = sequelize.define('SiteEpoch', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    epoch_value: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    label: {
        type: DataTypes.TEXT,
    },
}, {
    tableName: 'site_epochs',
    timestamps: false,
});

module.exports = SiteEpoch;