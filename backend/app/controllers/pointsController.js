const { Point, SiteType, SiteEpoch, AdminArea, sequelize } = require('@app/models');

exports.getPoints = async (req, res) => {
  try {
    const points = await Point.findAll({
      attributes: [
        [sequelize.fn('ST_AsGeoJSON', sequelize.col('geom')), 'geom']
      ]
    });
    // Преобразование результата: парсинг GeoJSON из строки в объект
    const result = points.map(point => ({
      geom: JSON.parse(point.get('geom'))
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.getPointInfo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Отсутствует id точки' });
  }

  try {
    const point = await Point.findByPk(id, {
      attributes: ['id', 'name', 'description'],
      include: [
        {
          model: SiteType, // Модель для site_types
          attributes: ['label'], // Получаем название типа
          as: 'type' // Псевдоним связи (должен соответствовать ассоциации в модели)
        },
        {
          model: SiteEpoch,
          attributes: ['label'],
          as: 'epoch' 
        },
        {
          model: AdminArea,
          attributes: ['name'],
          as: 'admin_division'
        }
      ]
    });

    if (!point) {
      return res.status(404).json({ error: 'Точка не найдена' });
    }

    // Форматируем ответ
    res.json({
      id: point.id,
      name: point.name,
      type: point.type?.label || null, // Используем опциональную цепочку на случай отсутствия связи
      epoch: point.epoch?.label || null,
      admin_division_name: point.admin_division?.name || null,
      description: point.description
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};