const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const SiteEpoch = sequelize.define('SiteEpoch', {
  // Первичный ключ, целое число, автоинкремент
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false // NOT NULL из схемы
  },
  // Ключевое значение эпохи (например, "bronze_age")
  epoch_value: {
    type: DataTypes.STRING(100), // Указана длина из схемы
    allowNull: false // NOT NULL из схемы
  },
  // Отображаемое название эпохи (например, "Бронзовый век")
  label: {
    type: DataTypes.TEXT,
    allowNull: true // В схеме нет NOT NULL, но TEXT может быть NULL
  }
}, {
  // Имя таблицы в базе данных
  tableName: 'site_epochs',
  // Отключаем автоматическое добавление полей createdAt и updatedAt, т.к. их нет в таблице
  timestamps: false
});

module.exports = SiteEpoch;