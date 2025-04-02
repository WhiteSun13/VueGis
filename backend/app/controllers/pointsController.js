const { Point, SiteType, SiteEpoch, AdminArea, Document, sequelize } = require('@app/models'); // Добавили Document
const redisClient = require('@app/config/redis'); // Импортируем клиент Redis

const CACHE_TTL_POINT = 300; // Время жизни кеша для точки в секундах (5 минут)

// Функция getPoints остается без изменений (не кешируем)
exports.getPoints = async (req, res) => {
    try {
        const points = await Point.findAll({
            attributes: [
                [sequelize.fn('ST_AsGeoJSON', sequelize.col('geom')), 'geom']
            ]
        });
        const result = points.map(point => ({
            geom: JSON.parse(point.get('geom'))
        }));
        res.json(result);
    } catch (err) {
        console.error('Ошибка при получении всех точек:', err);
        res.status(500).send('Server error');
    }
};

// Кешируем getPointInfo (добавляем include для документов)
exports.getPointInfo = async (req, res) => {
    const { id } = req.params;
    const CACHE_KEY = `cache:point:${id}`;

    if (!id) {
        return res.status(400).json({ error: 'Отсутствует id точки' });
    }

    try {
        // 1. Пытаемся получить из кеша
        let cachedData = null;
        if (redisClient.status === 'ready') {
            cachedData = await redisClient.get(CACHE_KEY);
        }
        if (cachedData) {
            console.log(`Point ${id}: Cache hit`);
            res.json(JSON.parse(cachedData));
            return;
        }

        console.log(`Point ${id}: Cache miss, fetching from DB`);
        // 2. Если нет в кеше, ищем в БД
        const point = await Point.findByPk(id, {
            attributes: [
                'id', 'name', 'short_description', 'description',
                [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'],
                [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude']
            ],
            include: [
                { model: SiteType, attributes: ['label'], as: 'type' },
                { model: SiteEpoch, attributes: ['label'], as: 'epoch' },
                { model: AdminArea, attributes: ['name'], as: 'admin_division' },
                { // Добавляем связанные документы
                    model: Document,
                    as: 'documents', // Используем псевдоним, заданный в ассоциации
                    attributes: ['id', 'filename', 'description'], // Выбираем нужные поля документа
                    through: { attributes: [] } // Исключаем поля из связующей таблицы
                }
            ]
        });

        if (!point) {
            return res.status(404).json({ error: 'Точка не найдена' });
        }

        // Формируем данные для ответа и кеширования
        const pointData = {
            id: point.id,
            name: point.name,
            type: point.type?.label || null,
            epoch: point.epoch?.label || null,
            admin_division_name: point.admin_division?.name || null,
            short_description: point.short_description,
            description: point.description,
            lat: point.get('latitude'),
            lon: point.get('longitude'),
            documents: point.documents || [], // Добавляем массив документов
        };

        // 3. Сохраняем в кеш, если Redis готов
        if (redisClient.status === 'ready') {
            try {
                await redisClient.setex(CACHE_KEY, CACHE_TTL_POINT, JSON.stringify(pointData));
                console.log(`Point ${id}: Saved to cache with TTL ${CACHE_TTL_POINT}s`);
            } catch(cacheErr) {
                 console.error(`Redis: Не удалось сохранить Point ${id} в кеш:`, cacheErr.message);
            }
        }

        // 4. Отправляем ответ
        res.json(pointData);

    } catch (err) {
        console.error(`Ошибка при получении информации о точке ${id}:`, err);
        if (err.sql) console.error('SQL:', err.sql);
        if (err.parameters) console.error('Parameters:', err.parameters);

        // Обработка ошибок Redis
        if (err instanceof redisClient.RedisError) {
            console.error(`Redis: Ошибка при работе с кешем для точки ${id}:`, err.message);
            // Пытаемся отдать данные из БД, если они были получены до ошибки Redis
             const pointFromDb = await Point.findByPk(id, { /* ... include options ... */ }); // Повторный запрос или использование ранее полученных данных
             if (pointFromDb) {
                  // Формируем pointData без кеширования
                  const pointData = { /* ... */ };
                  res.json(pointData);
             } else {
                 res.status(500).json({ error: 'Ошибка сервера (проблема с кешем и БД)' });
             }
        } else {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
};