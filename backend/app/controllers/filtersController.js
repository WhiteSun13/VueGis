// backend/app/controllers/filtersController.js
const { SiteType, SiteEpoch } = require('@app/models');
const redisClient = require('@app/config/redis'); // Импортируем клиент Redis

const CACHE_KEY = 'cache:filters'; // Ключ для кеша
const CACHE_TTL = 3600; // Время жизни кеша в секундах (1 час)

exports.getFilters = async (req, res) => {
    try {
        // 1. Попытка получить данные из кеша
        const cachedData = await redisClient.get(CACHE_KEY);

        if (cachedData) {
            console.log('Filters: Cache hit');
            // Если данные есть в кеше, парсим их и отправляем
            res.json(JSON.parse(cachedData));
            return; // Завершаем выполнение
        }

        console.log('Filters: Cache miss, fetching from DB');
        // 2. Если в кеше нет, получаем данные из БД
        const types = await SiteType.findAll({
            attributes: ['id', 'type_value', 'label'],
            order: [['id', 'ASC']] // Добавим сортировку для консистентности
        });
        const epochs = await SiteEpoch.findAll({
            attributes: ['id', 'epoch_value', 'label'],
            order: [['id', 'ASC']] // Добавим сортировку
        });

        const filtersData = { types, epochs };

        // 3. Сохраняем данные в кеш с TTL
        // Используем setex для установки ключа со временем жизни
        // JSON.stringify для преобразования объекта в строку
        await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(filtersData));
        console.log(`Filters: Saved to cache with TTL ${CACHE_TTL}s`);

        // 4. Отправляем данные клиенту
        res.json(filtersData);

    } catch (error) {
        console.error('Ошибка получения фильтров:', error);
        // Проверяем, не связана ли ошибка с Redis
        if (error instanceof redisClient.RedisError) {
            console.error('Ошибка Redis при получении фильтров:', error.message);
            // Если Redis недоступен, можно попытаться отдать данные напрямую из БД
            // (это потребует рефакторинга, чтобы избежать дублирования запроса к БД)
            // В данном случае просто вернем ошибку сервера
            res.status(500).json({ error: 'Ошибка сервера (проблема с кешем)' });
        } else {
            // Ошибка базы данных или другая
            res.status(500).json({ error: 'Ошибка сервера при получении фильтров' });
        }
    }
};