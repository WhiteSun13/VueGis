const { AdminArea, sequelize } = require('@app/models');

exports.getAdminAreas = async (req, res) => {
  const { bbox, callback } = req.query;
  
  if (!bbox || !callback) {
      return res.status(400).send('Missing required parameters');
  }

  const [lonMin, latMin, lonMax, latMax] = bbox.split(',').map(parseFloat);

  try {
    const areas = await AdminArea.findAll({
      attributes: [
        'id',
        ['name:ru', 'name_ru'],
        [sequelize.fn('ST_AsGeoJSON', sequelize.col('geom')), 'geometry']
      ],
      where: sequelize.literal(`geom && ST_MakeEnvelope(${lonMin}, ${latMin}, ${lonMax}, ${latMax}, 4326)`)
    });

    const features = areas.map(area => {
      const row = area.get();
      let geometry = JSON.parse(row.geometry);

      // Функция для перестановки координат
      const swapCoordinates = (coords) => {
          return coords.map(coord => [coord[1], coord[0]]);
      };

      // Перестановка координат в зависимости от типа геометрии
      if (geometry.type === 'MultiPolygon') {
          geometry.type = 'Polygon';
          geometry.coordinates = geometry.coordinates.map(polygon => 
              polygon.map(ring => swapCoordinates(ring))
          );
      } else if (geometry.type === 'Polygon') {
          geometry.coordinates = geometry.coordinates.map(ring => swapCoordinates(ring));
      } else if (geometry.type === 'LineString' || geometry.type === 'Point') {
          geometry.coordinates = swapCoordinates(geometry.coordinates);
      }

      return {
          type: "Feature",
          id: row.id,
          geometry: geometry,
          properties: {
              hintContent: row.name_ru
          }
      };
    });

    const featureCollection = {
      type: "FeatureCollection",
      features: features
    };

    res.set('Content-Type', 'application/javascript');
    res.send(`${callback}(${JSON.stringify(featureCollection)})`);
    
  } catch (err) {
      console.error(err);
      res.status(500).send(`${callback}({ error: "Server error" })`);
  }
};
