// backend/app/models/Document.js
const { DataTypes } = require('sequelize');
const sequelize = require('@app/config/database');

const Document = sequelize.define('Document', {
  // Первичный ключ
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  // Имя файла, которое было при загрузке
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Путь к файлу на сервере (относительно корня приложения или UPLOAD_DIR)
  filepath: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Путь должен быть уникальным
  },
  // MIME-тип файла (например, 'application/pdf')
  mimetype: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Размер файла в байтах
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Описание документа (опционально)
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Время загрузки (используем стандартные createdAt/updatedAt)
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW // Соответствует DEFAULT CURRENT_TIMESTAMP
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW // Соответствует DEFAULT CURRENT_TIMESTAMP
  }
}, {
  // Имя таблицы в БД
  tableName: 'documents',
  // Включаем автоматическое добавление createdAt и updatedAt
  timestamps: true,
  // Явно указываем имена столбцов для временных меток
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Document;