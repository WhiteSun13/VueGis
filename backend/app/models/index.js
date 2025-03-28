const sequelize = require('@app/config/database');
const Point = require('./Point');
const AdminArea = require('./AdminArea');
const Settlement = require('./Settlement');
const SiteType = require('./SiteType');
const SiteEpoch = require('./SiteEpoch');

// Настройка ассоциаций
Point.belongsTo(SiteType, {
  foreignKey: 'type_id', // Ключ в модели Point
  as: 'type'           // Псевдоним для доступа к связанной модели SiteType
});

Point.belongsTo(SiteEpoch, {
  foreignKey: 'epoch_id', // Ключ в модели Point
  as: 'epoch'          // Псевдоним для доступа к связанной модели SiteEpoch
});

Point.belongsTo(AdminArea, {
  foreignKey: 'admin_division_id', // Ключ в модели Point
  as: 'admin_division'           // Псевдоним для доступа к связанной модели AdminArea
});

// Обратные ассоциации (HasMany)
// Один SiteType может быть связан с многими Point
SiteType.hasMany(Point, { foreignKey: 'type_id' });
// Один SiteEpoch может быть связан с многими Point
SiteEpoch.hasMany(Point, { foreignKey: 'epoch_id' });
// Один AdminArea может быть связан с многими Point
AdminArea.hasMany(Point, { foreignKey: 'admin_division_id' });

// Экспорт sequelize instance и всех моделей
module.exports = {
  sequelize,
  Point,
  AdminArea,
  Settlement,
  SiteType,
  SiteEpoch
};