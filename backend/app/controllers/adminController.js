const { Point, SiteType, SiteEpoch, AdminArea, Document, sequelize } = require('@app/models'); // Добавили Document
const { Op } = require('sequelize');
const redisClient = require('@app/config/redis');
const fs = require('fs').promises; // Используем промисы fs
const path = require('path'); // Для работы с путями

// Константы для кеширования
const CACHE_TTL_ADMIN_LISTS = 3600; // 1 час для списков в админке
const CACHE_KEY_ADMIN_TYPES = 'cache:admin:types';
const CACHE_KEY_ADMIN_EPOCHS = 'cache:admin:epochs';
const CACHE_KEY_ADMIN_DIVISIONS = 'cache:admin:adminDivisions';
const CACHE_KEY_FILTERS = 'cache:filters'; // Ключ для публичных фильтров
const CACHE_KEY_ADMIN_DOCUMENTS = 'cache:admin:documents'; 
const CACHE_PREFIX_POINT = 'cache:point:'; // Префикс для кеша отдельных точек

// --- Вспомогательные функции пагинации ---
const getPagination = (page, size) => {
    const limit = size ? +size : 10; // Количество записей на странице (по умолчанию 10)
    const offset = page ? (page - 1) * limit : 0; // Смещение (начинаем с 0)
    return { limit, offset };
};

const getPagingData = (data, page, limit) => {
    const { count: totalItems, rows: items } = data;
    const currentPage = page ? +page : 1;
    const totalPages = Math.ceil(totalItems / limit);
    return { totalItems, items, totalPages, currentPage };
};

// --- Вспомогательная функция для инвалидации кеша ---
const clearCacheKeys = async (keys) => {
    if (!keys || keys.length === 0) return;
    try {
        // Проверяем статус клиента перед удалением
        if (redisClient.status !== 'ready') {
            console.warn(`Redis не готов (статус: ${redisClient.status}), пропуск инвалидации кеша для ключей: ${keys.join(', ')}`);
            return;
        }
        const result = await redisClient.del(keys);
        console.log(`Cache invalidated for keys: ${keys.join(', ')}. Result: ${result}`);
    } catch (err) {
        console.error(`Redis: Не удалось инвалидировать кеш для ключей ${keys.join(', ')}:`, err.message || err);
        // Не прерываем основной процесс из-за ошибки инвалидации, но логируем
        if (err instanceof redisClient.RedisError) {
            console.error('Redis: Специфическая ошибка Redis во время инвалидации.');
        }
    }
};


// --- Управление SiteType (Типы ОАН) ---

// Получить все типы для админки (с кешированием)
exports.getAllTypes = async (req, res) => {
    try {
        let cachedData = null;
        // Проверяем статус Redis перед GET
        if (redisClient.status === 'ready') {
            cachedData = await redisClient.get(CACHE_KEY_ADMIN_TYPES);
        } else {
            console.warn('Redis не готов, получаем типы напрямую из БД.');
        }

        if (cachedData) {
            console.log('Admin Types: Cache hit');
            res.json(JSON.parse(cachedData));
            return;
        }

        console.log('Admin Types: Cache miss или Redis недоступен, получаем из БД');
        const types = await SiteType.findAll({ order: [['id', 'ASC']] });

        // Сохраняем в кеш, только если Redis готов
        if (redisClient.status === 'ready') {
            try {
                await redisClient.setex(CACHE_KEY_ADMIN_TYPES, CACHE_TTL_ADMIN_LISTS, JSON.stringify(types));
                console.log(`Admin Types: Saved to cache with TTL ${CACHE_TTL_ADMIN_LISTS}s`);
            } catch (cacheErr) {
                console.error('Redis: Не удалось сохранить Admin Types в кеш:', cacheErr.message);
            }
        }
        res.json(types);
    } catch (err) {
        console.error('Ошибка получения типов (Admin):', err);
        // Не отправляем детали ошибки Redis клиенту
        if (err instanceof redisClient.RedisError) {
            res.status(500).json({ message: 'Ошибка сервера (проблема с кешем)' });
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
    if (!type_value || !label) {
        return res.status(400).json({ message: 'Поля type_value и label обязательны' });
    }
    try {
        const type = await SiteType.findByPk(id);
        if (!type) {
            return res.status(404).json({ message: 'Тип не найден' });
        }
        // Проверка, не пытается ли пользователь установить уже существующий type_value (кроме текущего)
        const existingType = await SiteType.findOne({
            where: { type_value, id: { [Op.ne]: id } } // Op.ne означает "не равно"
        });
        if (existingType) {
            return res.status(400).json({ message: `Тип со значением '${type_value}' уже используется другим типом.` });
        }

        type.type_value = type_value;
        type.label = label;
        await type.save();
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_TYPES, CACHE_KEY_FILTERS]);
        res.json(type);
    } catch (err) {
        console.error('Ошибка обновления типа:', err);
        if (err.name === 'SequelizeUniqueConstraintError') { // На случай, если проверка выше не сработает
            return res.status(400).json({ message: `Тип со значением '${type_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении типа' });
    }
};

// Удалить тип (с инвалидацией кеша)
exports.deleteType = async (req, res) => {
    const { id } = req.params;
    try {
        const type = await SiteType.findByPk(id);
        if (!type) {
            return res.status(404).json({ message: 'Тип не найден' });
        }

        // Проверка, используется ли тип в каких-либо точках
        const pointsWithType = await Point.count({ where: { type_id: id } });
        if (pointsWithType > 0) {
            return res.status(400).json({ message: `Невозможно удалить тип, так как он используется в ${pointsWithType} точках.` });
        }

        await type.destroy();
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_TYPES, CACHE_KEY_FILTERS]);
        res.json({ message: 'Тип успешно удален' });
    } catch (err) {
        console.error('Ошибка удаления типа:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении типа' });
    }
};


// --- Управление SiteEpoch (Эпохи) ---

// Получить все эпохи (с кешированием)
exports.getAllEpochs = async (req, res) => {
    try {
        let cachedData = null;
        if (redisClient.status === 'ready') {
            cachedData = await redisClient.get(CACHE_KEY_ADMIN_EPOCHS);
        } else {
            console.warn('Redis не готов, получаем эпохи напрямую из БД.');
        }

        if (cachedData) {
            console.log('Admin Epochs: Cache hit');
            res.json(JSON.parse(cachedData));
            return;
        }

        console.log('Admin Epochs: Cache miss или Redis недоступен, получаем из БД');
        const epochs = await SiteEpoch.findAll({ order: [['id', 'ASC']] });

        if (redisClient.status === 'ready') {
            try {
                await redisClient.setex(CACHE_KEY_ADMIN_EPOCHS, CACHE_TTL_ADMIN_LISTS, JSON.stringify(epochs));
                console.log(`Admin Epochs: Saved to cache with TTL ${CACHE_TTL_ADMIN_LISTS}s`);
            } catch (cacheErr) {
                console.error('Redis: Не удалось сохранить Admin Epochs в кеш:', cacheErr.message);
            }
        }
        res.json(epochs);
    } catch (err) {
        console.error('Ошибка получения эпох (Admin):', err);
        if (err instanceof redisClient.RedisError) {
            res.status(500).json({ message: 'Ошибка сервера (проблема с кешем)' });
        } else {
            res.status(500).json({ message: 'Ошибка сервера при получении эпох' });
        }
    }
};

// Создать новую эпоху (с инвалидацией кеша)
exports.createEpoch = async (req, res) => {
    const { epoch_value, label } = req.body;
    if (!epoch_value || !label) {
        return res.status(400).json({ message: 'Поля epoch_value и label обязательны' });
    }
    try {
        const newEpoch = await SiteEpoch.create({ epoch_value, label });
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_EPOCHS, CACHE_KEY_FILTERS]);
        res.status(201).json(newEpoch);
    } catch (err) {
        console.error('Ошибка создания эпохи:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: `Эпоха со значением '${epoch_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании эпохи' });
    }
};

// Обновить существующую эпоху (с инвалидацией кеша)
exports.updateEpoch = async (req, res) => {
    const { id } = req.params;
    const { epoch_value, label } = req.body;
    if (!epoch_value || !label) {
        return res.status(400).json({ message: 'Поля epoch_value и label обязательны' });
    }
    try {
        const epoch = await SiteEpoch.findByPk(id);
        if (!epoch) {
            return res.status(404).json({ message: 'Эпоха не найдена' });
        }

        const existingEpoch = await SiteEpoch.findOne({
            where: { epoch_value, id: { [Op.ne]: id } }
        });
        if (existingEpoch) {
            return res.status(400).json({ message: `Эпоха со значением '${epoch_value}' уже используется другой эпохой.` });
        }

        epoch.epoch_value = epoch_value;
        epoch.label = label;
        await epoch.save();
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_EPOCHS, CACHE_KEY_FILTERS]);
        res.json(epoch);
    } catch (err) {
        console.error('Ошибка обновления эпохи:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: `Эпоха со значением '${epoch_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении эпохи' });
    }
};

// Удалить эпоху (с инвалидацией кеша)
exports.deleteEpoch = async (req, res) => {
    const { id } = req.params;
    try {
        const epoch = await SiteEpoch.findByPk(id);
        if (!epoch) {
            return res.status(404).json({ message: 'Эпоха не найдена' });
        }

        // Проверка, используется ли эпоха в каких-либо точках
        const pointsWithEpoch = await Point.count({ where: { epoch_id: id } });
        if (pointsWithEpoch > 0) {
            return res.status(400).json({ message: `Невозможно удалить эпоху, так как она используется в ${pointsWithEpoch} точках.` });
        }

        await epoch.destroy();
        // Инвалидация кеша
        await clearCacheKeys([CACHE_KEY_ADMIN_EPOCHS, CACHE_KEY_FILTERS]);
        res.json({ message: 'Эпоха успешно удалена' });
    } catch (err) {
        console.error('Ошибка удаления эпохи:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении эпохи' });
    }
};

// --- Управление Point (Точки) ---

/**
 * Получить все точки для админки с пагинацией. (НЕ кешируется)
 * Принимает query параметры `page` и `limit`.
 */
exports.getAllPoints = async (req, res) => {
    // Получаем параметры пагинации из запроса (query string)
    const { page, limit: queryLimit } = req.query;
    const { limit, offset } = getPagination(page, queryLimit); // Используем хелпер для limit и offset

    try {
        // Используем findAndCountAll для пагинации
        const data = await Point.findAndCountAll({
            attributes: [
                'id', 'name', 'short_description',
                // Используем функции PostGIS для извлечения координат, указывая таблицу для geom
                [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'],
                [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude'],
                'created_at', 'updated_at'
            ],
            include: [
                { model: SiteType, as: 'type', attributes: ['id', 'label'] },
                { model: SiteEpoch, as: 'epoch', attributes: ['id', 'label'] },
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] }
            ],
            order: [['id', 'ASC']], // Сортируем по ID
            limit: limit, // Устанавливаем лимит записей на странице
            offset: offset // Устанавливаем смещение
            // distinct: true // Добавьте, если include вызывает дублирование строк (маловероятно с belongsTo)
        });

        // Формируем ответ с данными пагинации
        const response = getPagingData(data, page, limit);
        res.json(response); // Отправляем объект { totalItems, items, totalPages, currentPage }

    } catch (err) {
        console.error('Ошибка получения точек для админки с пагинацией:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении точек' });
    }
};

// Создать новую точку (без изменений в этой функции, связи - отдельно)
exports.createPoint = async (req, res) => {
    const {
        name, short_description, description,
        latitude, longitude, // Принимаем координаты как числа
        type_id, epoch_id, admin_division_id,
        document_ids // Пока не принимаем здесь, будем управлять через updatePoint
    } = req.body;

    // Валидация
    if (name === undefined || latitude === undefined || longitude === undefined || type_id === undefined || epoch_id === undefined) {
        return res.status(400).json({ message: 'Поля name, latitude, longitude, type_id, epoch_id обязательны' });
    }
    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        return res.status(400).json({ message: 'Неверный формат координат' });
    }

    try {
        const newPoint = await Point.create({
            name,
            short_description,
            description,
            geom: sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', parseFloat(longitude), parseFloat(latitude)), 4326),
            type_id: parseInt(type_id, 10),
            epoch_id: parseInt(epoch_id, 10),
            admin_division_id: admin_division_id ? parseInt(admin_division_id, 10) : null
        });

        // // Если бы принимали document_ids при создании:
        if (document_ids && Array.isArray(document_ids) && document_ids.length > 0) {
             const validDocIds = document_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
             if(validDocIds.length > 0) {
                await newPoint.setDocuments(validDocIds); // Устанавливаем связи
             }
        }

        // После создания возвращаем данные с join'ами (включая пустой массив documents)
        const createdPointDetails = await Point.findByPk(newPoint.id, {
            attributes: [
                'id', 'name', 'short_description', 'description',
                [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'],
                [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude'],
                'created_at', 'updated_at'
            ],
            include: [
                { model: SiteType, as: 'type', attributes: ['id', 'label'] },
                { model: SiteEpoch, as: 'epoch', attributes: ['id', 'label'] },
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] },
                { // Добавляем документы
                    model: Document,
                    as: 'documents',
                    attributes: ['id', 'filename', 'description'],
                    through: { attributes: [] } // Не включаем данные из PointDocument
                }
            ]
        });

        res.status(201).json(createdPointDetails);
    } catch (err) {
        console.error('Ошибка создания точки:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании точки' });
    }
};

// Обновить существующую точку (добавлена обработка документов)
exports.updatePoint = async (req, res) => {
    const { id } = req.params;
    const {
        name, short_description, description,
        latitude, longitude,
        type_id, epoch_id, admin_division_id,
        document_ids // Ожидаем массив ID связанных документов
    } = req.body;

    // Валидация основных полей
    if (name === undefined || latitude === undefined || longitude === undefined || type_id === undefined || epoch_id === undefined) {
        return res.status(400).json({ message: 'Поля name, latitude, longitude, type_id, epoch_id обязательны' });
    }
    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        return res.status(400).json({ message: 'Неверный формат координат' });
    }

    // Валидация document_ids (должен быть массивом чисел или null/undefined)
    let validDocIds = null;
    if (document_ids !== undefined && document_ids !== null) {
        if (!Array.isArray(document_ids)) {
            return res.status(400).json({ message: 'document_ids должен быть массивом' });
        }
        // Преобразуем в числа и отфильтровываем невалидные
        validDocIds = document_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    }


    try {
        const point = await Point.findByPk(id);
        if (!point) {
            return res.status(404).json({ message: 'Точка не найдена' });
        }

        // Обновляем основные поля
        point.name = name;
        point.short_description = short_description;
        point.description = description;
        point.geom = sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', parseFloat(longitude), parseFloat(latitude)), 4326);
        point.type_id = parseInt(type_id, 10);
        point.epoch_id = parseInt(epoch_id, 10);
        point.admin_division_id = admin_division_id ? parseInt(admin_division_id, 10) : null;

        // Используем транзакцию для обновления точки и ее связей
        await sequelize.transaction(async (t) => {
            // Сохраняем изменения точки
            await point.save({ transaction: t });

            // Обновляем связанные документы, если validDocIds был передан
            // Если document_ids не было в запросе, связи не трогаем
            if (validDocIds !== null) {
                // setDocuments перезапишет все существующие связи
                await point.setDocuments(validDocIds, { transaction: t });
                console.log(`Документы для точки ${id} установлены в:`, validDocIds);
            }
        });


        // Инвалидация кеша для этой конкретной точки
        await clearCacheKeys([`${CACHE_PREFIX_POINT}${id}`]);

        // Получаем обновленную точку с присоединенными данными для ответа
        const updatedPoint = await Point.findByPk(id, {
            attributes: [
                'id', 'name', 'short_description', 'description',
                [sequelize.fn('ST_X', sequelize.col('Point.geom')), 'longitude'],
                [sequelize.fn('ST_Y', sequelize.col('Point.geom')), 'latitude'],
                'created_at', 'updated_at'
            ],
            include: [
                { model: SiteType, as: 'type', attributes: ['id', 'label'] },
                { model: SiteEpoch, as: 'epoch', attributes: ['id', 'label'] },
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] },
                { // Включаем обновленные документы
                    model: Document,
                    as: 'documents',
                    attributes: ['id', 'filename', 'description'],
                    through: { attributes: [] }
                }
            ]
        });

        res.json(updatedPoint);
    } catch (err) {
        console.error(`Ошибка обновления точки ${id}:`, err);
        if (err.name === 'SequelizeForeignKeyConstraintError') {
            res.status(400).json({ message: 'Ошибка связи: один из указанных ID (тип, эпоха, район или документ) не существует.' });
        } else {
            res.status(500).json({ message: 'Ошибка сервера при обновлении точки' });
        }
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

// --- Управление Document ---

/**
 * Загрузка документа PDF.
 */
exports.uploadDocument = async (req, res) => {
    // Файл уже обработан multer'ом и доступен в req.file
    if (!req.file) {
        // Эта ошибка может быть перехвачена обработчиком ошибок multer, но добавим проверку
        return res.status(400).json({ message: 'Файл не был загружен.' });
    }

    // Получаем описание из тела запроса (если оно передается)
    const { description } = req.body;

    try {
        // Создаем запись в БД
        const newDocument = await Document.create({
            filename: req.file.originalname, // Оригинальное имя файла
            // Сохраняем путь ОТНОСИТЕЛЬНО uploadDir или просто имя файла,
            // сгенерированное multer'ом, чтобы не зависеть от абсолютных путей
            // filepath: req.file.filename, // Имя файла, сгенерированное multer
            // ИЛИ, если нужно хранить полный путь (менее гибко):
            filepath: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            description: description || null,
        });

        // Инвалидируем кеш списка документов
        if (redisClient.status === 'ready') {
            await clearCacheKeys([CACHE_KEY_ADMIN_DOCUMENTS]);
        }
            
        res.status(201).json(newDocument);
    } catch (err) {
        console.error('Ошибка сохранения информации о документе в БД:', err);
        // Если запись в БД не удалась, нужно удалить загруженный файл
        try {
            await fs.unlink(req.file.path);
            console.log(`Загруженный файл ${req.file.path} удален из-за ошибки БД.`);
        } catch (unlinkErr) {
            console.error(`Не удалось удалить файл ${req.file.path} после ошибки БД:`, unlinkErr);
        }
        res.status(500).json({ message: 'Ошибка сервера при сохранении документа' });
    }
};

// Обработчик ошибок multer (добавляется после маршрута upload)
// router.post('/documents', upload.single('document'), adminController.uploadDocument, (error, req, res, next) => {
//      if (error instanceof multer.MulterError) {
//          // Ошибка Multer (например, лимит размера файла)
//          return res.status(400).json({ message: `Multer error: ${error.message}` });
//      } else if (error) {
//          // Другая ошибка (например, из fileFilter)
//          return res.status(400).json({ message: error.message || 'Ошибка загрузки файла' });
//      }
//      // Если ошибок нет, передаем дальше (хотя здесь это не нужно)
//      next();
// });


/**
 * Получить список всех документов (с кешированием).
 */
exports.getAllDocuments = async (req, res) => {
    try {
        let cachedData = null;
        if (redisClient.status === 'ready') {
            cachedData = await redisClient.get(CACHE_KEY_ADMIN_DOCUMENTS);
        } else {
             console.warn('Redis не готов, получаем документы напрямую из БД.');
        }

        if (cachedData) {
            console.log('Admin Documents: Cache hit');
            res.json(JSON.parse(cachedData));
            return;
        }

        console.log('Admin Documents: Cache miss или Redis недоступен, получаем из БД');
        const documents = await Document.findAll({
            order: [['created_at', 'DESC']], // Сортируем по дате загрузки
            attributes: ['id', 'filename', 'description', 'size', 'mimetype', 'created_at'] // Выбираем поля
        });

        if (redisClient.status === 'ready') {
            try {
                await redisClient.setex(CACHE_KEY_ADMIN_DOCUMENTS, CACHE_TTL_ADMIN_LISTS, JSON.stringify(documents));
                console.log(`Admin Documents: Saved to cache with TTL ${CACHE_TTL_ADMIN_LISTS}s`);
            } catch (cacheErr) {
                 console.error('Redis: Не удалось сохранить Admin Documents в кеш:', cacheErr.message);
            }
        }
        res.json(documents);
    } catch (err) {
        console.error('Ошибка получения списка документов (Admin):', err);
        res.status(500).json({ message: 'Ошибка сервера при получении списка документов' });
    }
};

/**
 * Удалить документ (файл и запись в БД).
 */
exports.deleteDocument = async (req, res) => {
    const { id } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads', 'pdfs');

    try {
        const document = await Document.findByPk(id);
        if (!document) {
            return res.status(404).json({ message: 'Документ не найден' });
        }

        // 1. Определяем путь к файлу
        // Если filepath хранится как 'timestamp-random.pdf':
        const filePath = path.join(uploadDir, path.basename(document.filepath));
        // Если filepath хранится как полный путь:
        // const filePath = document.filepath;

        // 2. Удаляем запись из БД (связи в PointDocuments удалятся каскадно)
        await document.destroy(); // Используем destroy() для удаления экземпляра

        // 3. Пытаемся удалить файл с диска
        try {
            await fs.unlink(filePath);
            console.log(`Файл ${filePath} успешно удален.`);
        } catch (unlinkErr) {
            // Если файл не найден, это не критично, но логируем
            if (unlinkErr.code === 'ENOENT') {
                console.warn(`Файл ${filePath} для удаленного документа ${id} не найден.`);
            } else {
                console.error(`Ошибка при удалении файла ${filePath} для документа ${id}:`, unlinkErr);
                // Можно вернуть частичный успех или ошибку, если удаление файла критично
                 // return res.status(500).json({ message: 'Запись удалена, но произошла ошибка при удалении файла' });
            }
        }

        // Инвалидируем кеш списка документов и кеши связанных точек (сложно отследить, проще инвалидировать все точки или не кешировать список админки)
        if (redisClient.status === 'ready') {
            await clearCacheKeys([CACHE_KEY_ADMIN_DOCUMENTS]);
        }
        // Инвалидация кеша точек (менее эффективно):
        // const associatedPoints = await document.getPoints({ attributes: ['id'] }); // Получаем связанные точки (если метод getPoints доступен)
        // const pointCacheKeys = associatedPoints.map(p => `${CACHE_PREFIX_POINT}${p.id}`);
        // await clearCacheKeys(pointCacheKeys);

        res.json({ message: 'Документ успешно удален' });
    } catch (err) {
        console.error(`Ошибка удаления документа ${id}:`, err);
        res.status(500).json({ message: 'Ошибка сервера при удалении документа' });
    }
};

// --- Вспомогательные данные ---
// Получить список административных районов (с кешированием)
exports.getAdminDivisions = async (req, res) => {
    try {
        let cachedData = null;
        if (redisClient.status === 'ready') {
            cachedData = await redisClient.get(CACHE_KEY_ADMIN_DIVISIONS);
        } else {
            console.warn('Redis не готов, получаем адм. районы напрямую из БД.');
        }

        if (cachedData) {
            console.log('Admin Divisions: Cache hit');
            res.json(JSON.parse(cachedData));
            return;
        }
        console.log('Admin Divisions: Cache miss или Redis недоступен, получаем из БД');
        // Получаем только id и name, сортируем по имени
        const divisions = await AdminArea.findAll({
            attributes: ['id', 'name'], // Используем поле 'name' (русское название)
            order: [['name', 'ASC']]
        });

        if (redisClient.status === 'ready') {
            try {
                await redisClient.setex(CACHE_KEY_ADMIN_DIVISIONS, CACHE_TTL_ADMIN_LISTS, JSON.stringify(divisions));
                console.log(`Admin Divisions: Saved to cache with TTL ${CACHE_TTL_ADMIN_LISTS}s`);
            } catch (cacheErr) {
                console.error('Redis: Не удалось сохранить Admin Divisions в кеш:', cacheErr.message);
            }
        }
        res.json(divisions);
    } catch (err) {
        console.error('Ошибка получения адм. районов (Admin):', err);
        if (err instanceof redisClient.RedisError) {
            res.status(500).json({ message: 'Ошибка сервера (проблема с кешем)' });
        } else {
            res.status(500).json({ message: 'Ошибка сервера при получении адм. районов' });
        }
    }
};