// backend/app/models/PointDocument.js
const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');
const Point = require('./Point'); // Импортируем Point
const Document = require('./Document'); // Импортируем Document

const PointDocument = sequelize.define('PointDocument', {
  // Внешний ключ к таблице points (sites_points)
  point_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Point, // Ссылка на модель Point
      key: 'id',
    },
    primaryKey: true, // Часть составного первичного ключа
    allowNull: false,
    onDelete: 'CASCADE', // При удалении точки удалять и связь
  },
  // Внешний ключ к таблице documents
  document_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Document, // Ссылка на модель Document
      key: 'id',
    },
    primaryKey: true, // Часть составного первичного ключа
    allowNull: false,
    onDelete: 'CASCADE', // При удалении документа удалять и связь
  },
}, {
  // Имя таблицы в базе данных
  tableName: 'point_documents',
  // Отключаем timestamps для связующей таблицы
  timestamps: false,
});

module.exports = PointDocument;