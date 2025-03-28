const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const SiteType = sequelize.define('SiteType', {
  // Первичный ключ, целое число, автоинкремент
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false // NOT NULL из схемы
  },
  // Ключевое значение типа (например, "settlement")
  type_value: {
    type: DataTypes.STRING(100), // Указана длина из схемы
    allowNull: false // NOT NULL из схемы
  },
  // Отображаемое название типа (например, "Поселение")
  label: {
    type: DataTypes.TEXT,
    allowNull: true // В схеме нет NOT NULL, но TEXT может быть NULL
  }
}, {
  // Имя таблицы в базе данных
  tableName: 'site_types',
  // Отключаем автоматическое добавление полей createdAt и updatedAt, т.к. их нет в таблице
  timestamps: false
});

module.exports = SiteType;