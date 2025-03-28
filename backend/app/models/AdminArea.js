const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const AdminArea = sequelize.define('AdminArea', {
  // Первичный ключ, целое число, автоинкремент
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false // NOT NULL из схемы
  },
  // Геометрия, тип MultiPolygon с SRID 4326
  geom: {
    type: DataTypes.GEOMETRY('MULTIPOLYGON', 4326),
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
  // Название на крымскотатарском (кириллица)
  // Используем 'field' для сопоставления с именем столбца в БД
  name_crh_cyrl: {
    type: DataTypes.STRING,
    field: 'name:crh-Cyrl', // Точное имя столбца в БД
    allowNull: true
  },
  // Название на украинском
  name_uk: {
    type: DataTypes.STRING,
    field: 'name:uk', // Точное имя столбца в БД
    allowNull: true
  },
  // Название на крымскотатарском (арабица)
  name_crh_arab: {
    type: DataTypes.STRING,
    field: 'name:crh-Arab', // Точное имя столбца в БД
    allowNull: true
  },
  // Название на крымскотатарском (латиница, основное)
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
  // Альтернативное название на украинском
  alt_name_uk: {
    type: DataTypes.STRING,
    field: 'alt_name:uk', // Точное имя столбца в БД
    allowNull: true
  },
  // Альтернативное название на русском
  alt_name_ru: {
    type: DataTypes.STRING,
    field: 'alt_name:ru', // Точное имя столбца в БД
    allowNull: true
  },
  // Альтернативное название (общее)
  alt_name: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  // Имя таблицы в базе данных
  tableName: 'admin_div_crimea',
  // Отключаем автоматическое добавление полей createdAt и updatedAt, т.к. их нет в таблице
  timestamps: false
});

module.exports = AdminArea;