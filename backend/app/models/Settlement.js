const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const Settlement = sequelize.define('Settlement', {
  // Первичный ключ, целое число, автоинкремент
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false // NOT NULL из схемы
  },
  // Геометрия, тип Point с SRID 4326
  geom: {
    type: DataTypes.GEOMETRY('POINT', 4326),
    allowNull: true // В схеме нет NOT NULL
  },
  // Идентификатор из OSM или другого источника
  full_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Идентификатор OSM
  osm_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Название на крымскотатарском (латиница)
  name_crh: {
    type: DataTypes.STRING,
    field: 'name:crh', // Точное имя столбца в БД
    allowNull: true
  },
  // Основное название (вероятно, на русском)
  name: {
    type: DataTypes.STRING,
    allowNull: true // В схеме нет NOT NULL
  },
  // Почтовый индекс
  postcode: {
    type: DataTypes.STRING,
    field: 'addr:postcode', // Точное имя столбца в БД
    allowNull: true
  }
}, {
  // Имя таблицы в базе данных
  tableName: 'settlements_crimea',
  // Отключаем автоматическое добавление полей createdAt и updatedAt, т.к. их нет в таблице
  timestamps: false
});

module.exports = Settlement;