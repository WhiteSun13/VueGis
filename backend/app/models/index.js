const sequelize = require('@app/config/database');
const Point = require('./Point');
const AdminArea = require('./AdminArea');
const Settlement = require('./Settlement');
const SiteType = require('./SiteType');
const SiteEpoch = require('./SiteEpoch');

// Настройка ассоциаций
Point.belongsTo(SiteType, {
  foreignKey: 'type_id',
  as: 'type'
});

Point.belongsTo(SiteEpoch, {
  foreignKey: 'epoch_id',
  as: 'epoch'
});

Point.belongsTo(AdminArea, {
  foreignKey: 'admin_division_id',
  as: 'admin_division'
});

SiteType.hasMany(Point, { foreignKey: 'type_id' });
SiteEpoch.hasMany(Point, { foreignKey: 'epoch_id' });
AdminArea.hasMany(Point, { foreignKey: 'admin_division_id' });

module.exports = {
  sequelize,
  Point,
  AdminArea,
  Settlement,
  SiteType,
  SiteEpoch
};
