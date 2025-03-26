const { Point, sequelize } = require('@app/models');

exports.getData = async (req, res) => {
  const { bbox, callback } = req.query;

  if (!bbox || !callback) {
    return res.status(400).send('Missing required parameters');
  }

  const [lonMin, latMin, lonMax, latMax] = bbox.split(',').map(parseFloat);

  try {
    const points = await Point.findAll({
      attributes: [
        'id', 'name', 'type_id', 'epoch_id',
        [sequelize.fn('ST_AsGeoJSON', sequelize.col('geom')), 'geometry']
      ],
      where: sequelize.literal(`geom && ST_MakeEnvelope(${lonMin}, ${latMin}, ${lonMax}, ${latMax}, 4326)`)
    });

    const features = points.map(point => {
      const row = point.get();
      const geometry = JSON.parse(row.geometry);
      return {
        type: "Feature",
        id: row.id,
        geometry: geometry,
        properties: {
          iconCaption: row.name,
          hintContent: row.name,
          type: row.type_id,
          epoch: row.epoch_id
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
