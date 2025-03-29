// backend/app/controllers/pointsController.js

// Импорт необходимых моделей и Sequelize
const { Point, SiteType, SiteEpoch, AdminArea, sequelize } = require('@app/models');

/**
 * Получает все точки (только их геометрию)
 * В текущей реализации возвращает только геометрию в формате GeoJSON.
 */
exports.getPoints = async (req, res) => {
  try {
    // Запрос к базе данных для получения всех точек
    const points = await Point.findAll({
      attributes: [
        // Используем функцию PostGIS ST_AsGeoJSON для преобразования геометрии в GeoJSON строку
        // и алиас 'geom' для этого поля в результате
        // Здесь нет неоднозначности, т.к. нет JOIN'ов
        [sequelize.fn('ST_AsGeoJSON', sequelize.col('geom')), 'geom']
      ]
    });
    // Преобразование результата: парсинг GeoJSON из строки в объект для каждой точки
    const result = points.map(point => ({
      geom: JSON.parse(point.get('geom')) // point.get('geom') возвращает строку GeoJSON
    }));
    // Отправка результата клиенту в формате JSON
    res.json(result);
  } catch (err) {
    // Логирование ошибки и отправка статуса 500 в случае ошибки сервера
    console.error('Ошибка при получении всех точек:', err); // Добавлено логирование
    res.status(500).send('Server error');
  }
};

/**
 * Получает детальную информацию о конкретной точке по её ID, включая координаты.
 */
exports.getPointInfo = async (req, res) => {
  // Извлечение ID точки из параметров запроса
  const { id } = req.params;

  // Проверка, был ли предоставлен ID
  if (!id) {
    return res.status(400).json({ error: 'Отсутствует id точки' });
  }

  try {
    // Поиск точки по первичному ключу (ID)
    const point = await Point.findByPk(id, {
      // Явно указываем атрибуты, которые хотим получить из таблицы sites_points
      attributes: [
        'id',
        'name',
        'short_description',
        'description',
        // Используем функции PostGIS ST_X и ST_Y для извлечения координат
        // ЯВНО указываем таблицу 'Point' для столбца 'geom', чтобы избежать неоднозначности
        [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'], // Долгота
        [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude']   // Широта
      ],
      // Включаем связанные данные из других таблиц
      include: [
        {
          model: SiteType, // Модель для site_types
          attributes: ['label'], // Получаем только поле 'label'
          as: 'type' // Используем псевдоним 'type'
        },
        {
          model: SiteEpoch, // Модель для site_epochs
          attributes: ['label'], // Получаем только поле 'label'
          as: 'epoch' // Используем псевдоним 'epoch'
        },
        {
          model: AdminArea, // Модель для admin_div_crimea
          attributes: ['name'], // Получаем только поле 'name'
          as: 'admin_division' // Используем псевдоним 'admin_division'
          // Важно: Мы НЕ выбираем 'geom' из AdminArea здесь, чтобы не создавать путаницы
        }
      ]
    });

    // Если точка с таким ID не найдена, возвращаем ошибку 404
    if (!point) {
      return res.status(404).json({ error: 'Точка не найдена' });
    }

    // Форматируем и отправляем ответ в формате JSON
    res.json({
      id: point.id,
      name: point.name,
      // Используем опциональную цепочку (?.)
      type: point.type?.label || null,
      epoch: point.epoch?.label || null,
      admin_division_name: point.admin_division?.name || null,
      short_description: point.short_description,
      description: point.description,
      // Добавляем координаты, полученные с помощью ST_X и ST_Y
      // point.get() используется для доступа к вычисленным полям (longitude, latitude)
      lat: point.get('latitude'),
      lon: point.get('longitude')
    });
  } catch (err) {
    // Логирование ошибки и отправка статуса 500 в случае ошибки сервера
    console.error('Ошибка при получении информации о точке:', err); // Улучшено логирование
    // Выводим SQL и параметры, если они доступны в ошибке, для дебага
    if (err.sql) {
        console.error('SQL:', err.sql);
    }
    if (err.parameters) {
        console.error('Parameters:', err.parameters);
    }
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};