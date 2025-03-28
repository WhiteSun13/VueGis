const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const Point = sequelize.define('Point', {
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
  // Название объекта
  name: {
    type: DataTypes.STRING(155), // Указана длина из схемы
    allowNull: false // NOT NULL из схемы
  },
  // Описание объекта
  description: {
    type: DataTypes.TEXT,
    allowNull: true // В схеме нет NOT NULL
  },
  // Внешний ключ к таблице site_types
  type_id: {
    type: DataTypes.INTEGER,
    allowNull: false, // NOT NULL из схемы
    references: { // Определение внешнего ключа (опционально, но полезно для ясности)
      model: 'site_types', // Имя таблицы, на которую ссылается ключ
      key: 'id'
    }
  },
  // Внешний ключ к таблице site_epochs
  epoch_id: {
    type: DataTypes.INTEGER,
    allowNull: false, // NOT NULL из схемы
    references: {
      model: 'site_epochs',
      key: 'id'
    }
  },
  // Внешний ключ к таблице admin_div_crimea
  admin_division_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // В схеме нет NOT NULL (может быть NULL)
    references: {
      model: 'admin_div_crimea',
      key: 'id'
    }
  },
  // Поля created_at и updated_at управляются Sequelize и триггерами БД
  // Sequelize будет использовать эти имена столбцов
  created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW // Соответствует DEFAULT CURRENT_TIMESTAMP
  },
  updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW // Соответствует DEFAULT CURRENT_TIMESTAMP
  }
}, {
  // Имя таблицы в базе данных
  tableName: 'sites_points',
  // Включаем автоматическое управление createdAt и updatedAt
  timestamps: true,
  // Явно указываем имена столбцов для временных меток
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Point;