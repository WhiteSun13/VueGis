const { Point, SiteType, SiteEpoch, AdminArea, sequelize } = require('@app/models');
const { Op } = require('sequelize');
const redisClient = require('@app/config/redis'); // Импортируем клиент Redis

// Константы для кеширования
const CACHE_TTL_ADMIN_LISTS = 3600; // 1 час для списков в админке
const CACHE_KEY_ADMIN_TYPES = 'cache:admin:types';
const CACHE_KEY_ADMIN_EPOCHS = 'cache:admin:epochs';
const CACHE_KEY_ADMIN_DIVISIONS = 'cache:admin:adminDivisions';
const CACHE_KEY_FILTERS = 'cache:filters'; // Ключ для публичных фильтров
const CACHE_PREFIX_POINT = 'cache:point:'; // Префикс для кеша отдельных точек

// --- Вспомогательные функции пагинации (без изменений) ---
const getPagination = (page, size) => { /* ... */ };
const getPagingData = (data, page, limit) => { /* ... */ };

// --- Вспомогательная функция для инвалидации кеша ---
const clearCacheKeys = async (keys) => {
    if (!keys || keys.length === 0) return;
    try {
        const result = await redisClient.del(keys);
        console.log(`Cache invalidated for keys: ${keys.join(', ')}. Result: ${result}`);
    } catch (err) {
        console.error(`Redis: Failed to invalidate cache keys ${keys.join(', ')}:`, err.message);
        // Не прерываем основной процесс из-за ошибки инвалидации, но логируем
    }
};


// --- Управление SiteType (Типы ОАН) ---

// Получить все типы для админки (с кешированием)
exports.getAllTypes = async (req, res) => {
    try {
        const cachedData = await redisClient.get(CACHE_KEY_ADMIN_TYPES);
        if (cachedData) {
            console.log('Admin Types: Cache hit');
            res.json(JSON.parse(cachedData));
            return;
        }

        console.log('Admin Types: Cache miss, fetching from DB');
        const types = await SiteType.findAll({ order: [['id', 'ASC']] });
        await redisClient.setex(CACHE_KEY_ADMIN_TYPES, CACHE_TTL_ADMIN_LISTS, JSON.stringify(types));
        console.log(`Admin Types: Saved to cache with TTL ${CACHE_TTL_ADMIN_LISTS}s`);
        res.json(types);
    } catch (err) {
        console.error('Ошибка получения типов (Admin):', err);
         if (err instanceof redisClient.RedisError) {
             res.status(500).json({ message: 'Ошибка сервера (Redis)' });
         } else {
            res.status(500).json({ message: 'Ошибка сервера при получении типов' });
         }
    }
};

// Создать новый тип (с инвалидацией кеша)
exports.createType = async (req, res) => {
    const { type_value, label } = req.body;
    if (!type_value || !label) {
        return res.status(400).json({ message: 'Поля type_value и label обязательны' });
    }
    try {
        const newType = await SiteType.create({ type_value, label });
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_TYPES, CACHE_KEY_FILTERS]);
        res.status(201).json(newType);
    } catch (err) {
        console.error('Ошибка создания типа:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ message: `Тип со значением '${type_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании типа' });
    }
};

// Обновить существующий тип (с инвалидацией кеша)
exports.updateType = async (req, res) => {
    const { id } = req.params;
    const { type_value, label } = req.body;
    // ... (валидация) ...
    try {
        const type = await SiteType.findByPk(id);
        // ... (проверка существования и уникальности) ...
        type.type_value = type_value;
        type.label = label;
        await type.save();
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_TYPES, CACHE_KEY_FILTERS]);
        res.json(type);
    } catch (err) {
        // ... (обработка ошибок) ...
        console.error('Ошибка обновления типа:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении типа' });
    }
};

// Удалить тип (с инвалидацией кеша)
exports.deleteType = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await SiteType.findByPk(id);
        // ... (проверка существования и использования) ...
        await type.destroy();
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_TYPES, CACHE_KEY_FILTERS]);
        res.json({ message: 'Тип успешно удален' });
    } catch (err) {
        // ... (обработка ошибок) ...
         console.error('Ошибка удаления типа:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении типа' });
    }
};


// --- Управление SiteEpoch (Эпохи) ---

// Получить все эпохи (с кешированием)
exports.getAllEpochs = async (req, res) => {
     try {
        const cachedData = await redisClient.get(CACHE_KEY_ADMIN_EPOCHS);
        if (cachedData) {
            console.log('Admin Epochs: Cache hit');
            res.json(JSON.parse(cachedData));
            return;
        }

        console.log('Admin Epochs: Cache miss, fetching from DB');
        const epochs = await SiteEpoch.findAll({ order: [['id', 'ASC']] });
        await redisClient.setex(CACHE_KEY_ADMIN_EPOCHS, CACHE_TTL_ADMIN_LISTS, JSON.stringify(epochs));
        console.log(`Admin Epochs: Saved to cache with TTL ${CACHE_TTL_ADMIN_LISTS}s`);
        res.json(epochs);
    } catch (err) {
        console.error('Ошибка получения эпох (Admin):', err);
         if (err instanceof redisClient.RedisError) {
             res.status(500).json({ message: 'Ошибка сервера (Redis)' });
         } else {
            res.status(500).json({ message: 'Ошибка сервера при получении эпох' });
         }
    }
};

// Создать новую эпоху (с инвалидацией кеша)
exports.createEpoch = async (req, res) => {
    // ... (валидация) ...
    try {
        const newEpoch = await SiteEpoch.create({ epoch_value: req.body.epoch_value, label: req.body.label });
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_EPOCHS, CACHE_KEY_FILTERS]);
        res.status(201).json(newEpoch);
    } catch (err) {
         // ... (обработка ошибок) ...
         console.error('Ошибка создания эпохи:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании эпохи' });
    }
};

// Обновить существующую эпоху (с инвалидацией кеша)
exports.updateEpoch = async (req, res) => {
     const { id } = req.params;
     // ... (валидация) ...
    try {
        const epoch = await SiteEpoch.findByPk(id);
         // ... (проверка существования и уникальности) ...
        epoch.epoch_value = req.body.epoch_value;
        epoch.label = req.body.label;
        await epoch.save();
         // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_EPOCHS, CACHE_KEY_FILTERS]);
        res.json(epoch);
    } catch (err) {
        // ... (обработка ошибок) ...
        console.error('Ошибка обновления эпохи:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении эпохи' });
    }
};

// Удалить эпоху (с инвалидацией кеша)
exports.deleteEpoch = async (req, res) => {
    const { id } = req.params;
    try {
        const epoch = await SiteEpoch.findByPk(id);
        // ... (проверка существования и использования) ...
        await epoch.destroy();
         // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_EPOCHS, CACHE_KEY_FILTERS]);
        res.json({ message: 'Эпоха успешно удалена' });
    } catch (err) {
        // ... (обработка ошибок) ...
        console.error('Ошибка удаления эпохи:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении эпохи' });
    }
};

// --- Управление Point (Точки) ---

// Получить все точки для админки с пагинацией (НЕ кешируем список)
exports.getAllPoints = async (req, res) => {
    const { page, limit: queryLimit } = req.query;
    const { limit, offset } = getPagination(page, queryLimit);

    try {
        const data = await Point.findAndCountAll({
            // ... (атрибуты и include без изменений) ...
             attributes: [
                'id', 'name', 'short_description',
                [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'],
                [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude'],
                'created_at', 'updated_at'
            ],
            include: [
                { model: SiteType, as: 'type', attributes: ['id', 'label'] },
                { model: SiteEpoch, as: 'epoch', attributes: ['id', 'label'] },
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] }
            ],
            order: [['id', 'ASC']],
            limit: limit,
            offset: offset
        });
        const response = getPagingData(data, page, limit);
        res.json(response);
    } catch (err) {
        console.error('Ошибка получения точек для админки:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении точек' });
    }
};

// Создать новую точку (инвалидация кеша этой точки не нужна, т.к. ее еще нет)
exports.createPoint = async (req, res) => {
    // ... (валидация) ...
    try {
        const newPoint = await Point.create({
             // ... (данные точки) ...
             name: req.body.name,
             short_description: req.body.short_description,
             description: req.body.description,
             geom: sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', parseFloat(req.body.longitude), parseFloat(req.body.latitude)), 4326),
             type_id: parseInt(req.body.type_id, 10),
             epoch_id: parseInt(req.body.epoch_id, 10),
             admin_division_id: req.body.admin_division_id ? parseInt(req.body.admin_division_id, 10) : null
        });
        // Получаем созданную точку с деталями для ответа
        const createdPointDetails = await Point.findByPk(newPoint.id, {
             // ... (атрибуты и include) ...
              attributes: [
                'id', 'name', 'short_description', 'description',
                [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'],
                [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude'],
                'created_at', 'updated_at'
            ],
            include: [
                { model: SiteType, as: 'type', attributes: ['id', 'label'] },
                { model: SiteEpoch, as: 'epoch', attributes: ['id', 'label'] },
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] }
            ]
        });
        // Примечание: Инвалидировать кеш для списка /admin/points не требуется, т.к. мы его не кешируем.
        // Если бы кешировали, здесь была бы инвалидация.
        res.status(201).json(createdPointDetails);
    } catch (err) {
        console.error('Ошибка создания точки:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании точки' });
    }
};

// Обновить существующую точку (с инвалидацией кеша этой точки)
exports.updatePoint = async (req, res) => {
    const { id } = req.params;
    // ... (валидация) ...
    try {
        const point = await Point.findByPk(id);
        if (!point) {
            return res.status(404).json({ message: 'Точка не найдена' });
        }
        // Обновляем поля
        // ...
        point.name = req.body.name;
        point.short_description = req.body.short_description;
        point.description = req.body.description;
        point.geom = sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', parseFloat(req.body.longitude), parseFloat(req.body.latitude)), 4326);
        point.type_id = parseInt(req.body.type_id, 10);
        point.epoch_id = parseInt(req.body.epoch_id, 10);
        point.admin_division_id = req.body.admin_division_id ? parseInt(req.body.admin_division_id, 10) : null;

        await point.save();

        // Инвалидация кеша для этой конкретной точки
        await clearCacheKeys([`${CACHE_PREFIX_POINT}${id}`]);

        // Получаем обновленную точку с деталями для ответа
        const updatedPoint = await Point.findByPk(id, {
             // ... (атрибуты и include) ...
              attributes: [
                'id', 'name', 'short_description', 'description',
                [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'],
                [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude'],
                'created_at', 'updated_at'
            ],
            include: [
                { model: SiteType, as: 'type', attributes: ['id', 'label'] },
                { model: SiteEpoch, as: 'epoch', attributes: ['id', 'label'] },
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] }
            ]
        });
        res.json(updatedPoint);
    } catch (err) {
        console.error('Ошибка обновления точки:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении точки' });
    }
};

// Удалить точку (с инвалидацией кеша этой точки)
exports.deletePoint = async (req, res) => {
    const { id } = req.params;
    try {
        const point = await Point.findByPk(id);
        if (!point) {
            return res.status(404).json({ message: 'Точка не найдена' });
        }
        await point.destroy();
        // Инвалидация кеша для этой конкретной точки
        await clearCacheKeys([`${CACHE_PREFIX_POINT}${id}`]);
        res.json({ message: 'Точка успешно удалена' });
    } catch (err) {
        console.error('Ошибка удаления точки:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении точки' });
    }
};


// --- Вспомогательные данные ---
// Получить список административных районов (с кешированием)
exports.getAdminDivisions = async (req, res) => {
    try {
         const cachedData = await redisClient.get(CACHE_KEY_ADMIN_DIVISIONS);
        if (cachedData) {
            console.log('Admin Divisions: Cache hit');
            res.json(JSON.parse(cachedData));
            return;
        }
         console.log('Admin Divisions: Cache miss, fetching from DB');
        const divisions = await AdminArea.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });
         await redisClient.setex(CACHE_KEY_ADMIN_DIVISIONS, CACHE_TTL_ADMIN_LISTS, JSON.stringify(divisions));
         console.log(`Admin Divisions: Saved to cache with TTL ${CACHE_TTL_ADMIN_LISTS}s`);
        res.json(divisions);
    } catch (err) {
        console.error('Ошибка получения адм. районов (Admin):', err);
         if (err instanceof redisClient.RedisError) {
             res.status(500).json({ message: 'Ошибка сервера (Redis)' });
         } else {
             res.status(500).json({ message: 'Ошибка сервера при получении адм. районов' });
         }
    }
};