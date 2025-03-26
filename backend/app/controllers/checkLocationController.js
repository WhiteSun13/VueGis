const { AdminArea, Settlement, sequelize } = require('@app/models');

exports.checkLocation = async (req, res) => {
  const { lon, lat } = req.query;

  if (!lon || !lat) {
    return res.status(400).json({ error: 'Longitude and latitude are required' });
  }

  try {
    // Поиск административной области, содержащей точку
    const area = await AdminArea.findOne({
      attributes: ['name'],
      where: sequelize.literal(`ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))`)
    });

    if (area) {
      // Поиск ближайшего Settlement по расстоянию до переданных координат
      const settlement = await Settlement.findOne({
        attributes: ['name'],
        order: sequelize.literal(`ST_Distance(geom, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)) ASC`)
      });

      res.json({
        status: 'inside',
        name_ru: area.get('name'),
        name: settlement ? settlement.get('name') : null
      });
    } else {
      res.json({
        status: 'outside',
      });
    }
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
