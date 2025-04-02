const sequelize = require('@app/config/database');
const Point = require('./Point');
const AdminArea = require('./AdminArea');
const Settlement = require('./Settlement');
const SiteType = require('./SiteType');
const SiteEpoch = require('./SiteEpoch');
// Импортируем новые модели
const Document = require('./Document');
const PointDocument = require('./PointDocument');

// --- Ассоциации для Point ---
Point.belongsTo(SiteType, { foreignKey: 'type_id', as: 'type' });
Point.belongsTo(SiteEpoch, { foreignKey: 'epoch_id', as: 'epoch' });
Point.belongsTo(AdminArea, { foreignKey: 'admin_division_id', as: 'admin_division' });

// --- Ассоциации для Document ---
// Многие-ко-многим: Point <-> Document через PointDocument
Point.belongsToMany(Document, {
  through: PointDocument,       // Связующая таблица/модель
  foreignKey: 'point_id',     // Внешний ключ в связующей таблице, указывающий на Point
  otherKey: 'document_id',    // Внешний ключ в связующей таблице, указывающий на Document
  as: 'documents',            // Псевдоним для доступа к связанным документам из Point
  // timestamps: false // Не нужно здесь, т.к. в PointDocument уже false
});

Document.belongsToMany(Point, {
  through: PointDocument,       // Связующая таблица/модель
  foreignKey: 'document_id',    // Внешний ключ в связующей таблице, указывающий на Document
  otherKey: 'point_id',       // Внешний ключ в связующей таблице, указывающий на Point
  as: 'points',               // Псевдоним для доступа к связанным точкам из Document (если понадобится)
  // timestamps: false
});

// --- Обратные ассоциации (HasMany) ---
SiteType.hasMany(Point, { foreignKey: 'type_id' });
SiteEpoch.hasMany(Point, { foreignKey: 'epoch_id' });
AdminArea.hasMany(Point, { foreignKey: 'admin_division_id' });

// Экспорт sequelize instance и всех моделей
module.exports = {
  sequelize,
  Point,
  AdminArea,
  Settlement,
  SiteType,
  SiteEpoch,
  Document,       // Экспортируем Document
  PointDocument,  // Экспортируем PointDocument (хотя обычно используется только для through)
};