const { Point, SiteType, SiteEpoch, AdminArea, sequelize } = require('@app/models');
const { Op } = require('sequelize'); // Импортируем операторы Sequelize

// Вспомогательная функция для получения параметров пагинации
const getPagination = (page, size) => {
  const limit = size ? +size : 10; // Количество записей на странице (по умолчанию 10)
  const offset = page ? (page - 1) * limit : 0; // Смещение (начинаем с 0)
  return { limit, offset };
};

// Вспомогательная функция для формирования ответа с пагинацией
const getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: items } = data;
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(totalItems / limit);
  return { totalItems, items, totalPages, currentPage };
};


// --- Управление SiteType (Типы ОАН) ---
// ... (код для типов остается без изменений) ...
// Получить все типы
exports.getAllTypes = async (req, res) => {
    try {
        const types = await SiteType.findAll({ order: [['id', 'ASC']] });
        res.json(types);
    } catch (err) {
        console.error('Ошибка получения типов:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении типов' });
    }
};

// Создать новый тип
exports.createType = async (req, res) => {
    const { type_value, label } = req.body;
    if (!type_value || !label) {
        return res.status(400).json({ message: 'Поля type_value и label обязательны' });
    }
    try {
        const newType = await SiteType.create({ type_value, label });
        res.status(201).json(newType);
    } catch (err) {
        console.error('Ошибка создания типа:', err);
         // Проверка на уникальность type_value
        if (err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ message: `Тип со значением '${type_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании типа' });
    }
};

// Обновить существующий тип
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
        res.json(type);
    } catch (err) {
        console.error('Ошибка обновления типа:', err);
        if (err.name === 'SequelizeUniqueConstraintError') { // На случай, если проверка выше не сработает (хотя должна)
             return res.status(400).json({ message: `Тип со значением '${type_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении типа' });
    }
};

// Удалить тип
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
        res.json({ message: 'Тип успешно удален' });
    } catch (err) {
        console.error('Ошибка удаления типа:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении типа' });
    }
};


// --- Управление SiteEpoch (Эпохи) ---
// ... (код для эпох остается без изменений) ...
// Получить все эпохи
exports.getAllEpochs = async (req, res) => {
    try {
        const epochs = await SiteEpoch.findAll({ order: [['id', 'ASC']] });
        res.json(epochs);
    } catch (err) {
        console.error('Ошибка получения эпох:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении эпох' });
    }
};

// Создать новую эпоху
exports.createEpoch = async (req, res) => {
    const { epoch_value, label } = req.body;
    if (!epoch_value || !label) {
        return res.status(400).json({ message: 'Поля epoch_value и label обязательны' });
    }
    try {
        const newEpoch = await SiteEpoch.create({ epoch_value, label });
        res.status(201).json(newEpoch);
    } catch (err) {
        console.error('Ошибка создания эпохи:', err);
        if (err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ message: `Эпоха со значением '${epoch_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при создании эпохи' });
    }
};

// Обновить существующую эпоху
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
        res.json(epoch);
    } catch (err) {
        console.error('Ошибка обновления эпохи:', err);
         if (err.name === 'SequelizeUniqueConstraintError') {
             return res.status(400).json({ message: `Эпоха со значением '${epoch_value}' уже существует.` });
        }
        res.status(500).json({ message: 'Ошибка сервера при обновлении эпохи' });
    }
};

// Удалить эпоху
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
        res.json({ message: 'Эпоха успешно удалена' });
    } catch (err) {
        console.error('Ошибка удаления эпохи:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении эпохи' });
    }
};

// --- Управление Point (Точки) ---

/**
 * Получить все точки для админки с пагинацией.
 * Принимает query параметры `page` (номер страницы, начиная с 1) и `limit` (размер страницы).
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

// --- (Остальные методы для Point: createPoint, updatePoint, deletePoint без изменений) ---
// Создать новую точку
exports.createPoint = async (req, res) => {
    const {
        name, short_description, description,
        latitude, longitude, // Принимаем координаты как числа
        type_id, epoch_id, admin_division_id
    } = req.body;

    // Валидация
    if (!name || !latitude || !longitude || !type_id || !epoch_id) {
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
            geom: sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', parseFloat(longitude), parseFloat(latitude)), 4326), // Создаем геометрию
            type_id: parseInt(type_id, 10),
            epoch_id: parseInt(epoch_id, 10),
            admin_division_id: admin_division_id ? parseInt(admin_division_id, 10) : null // Может быть null
        });
        // После создания возвращаем не просто newPoint, а данные с join'ами, как при обновлении
        // или можно просто вернуть ID и сообщение об успехе, а фронтенд перезагрузит список
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
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] }
            ]
        });
        res.status(201).json(createdPointDetails); // Возвращаем созданную точку с деталями
    } catch (err) {
        console.error('Ошибка создания точки:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании точки' });
    }
};

// Обновить существующую точку
exports.updatePoint = async (req, res) => {
    const { id } = req.params;
    const {
        name, short_description, description,
        latitude, longitude,
        type_id, epoch_id, admin_division_id
    } = req.body;

     // Валидация
    if (!name || !latitude || !longitude || !type_id || !epoch_id) {
        return res.status(400).json({ message: 'Поля name, latitude, longitude, type_id, epoch_id обязательны' });
    }
     if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
         return res.status(400).json({ message: 'Неверный формат координат' });
    }

    try {
        const point = await Point.findByPk(id);
        if (!point) {
            return res.status(404).json({ message: 'Точка не найдена' });
        }

        // Обновляем поля
        point.name = name;
        point.short_description = short_description;
        point.description = description;
        point.geom = sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', parseFloat(longitude), parseFloat(latitude)), 4326);
        point.type_id = parseInt(type_id, 10);
        point.epoch_id = parseInt(epoch_id, 10);
        point.admin_division_id = admin_division_id ? parseInt(admin_division_id, 10) : null;

        await point.save(); // Sequelize автоматически обновит updated_at

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
                { model: AdminArea, as: 'admin_division', attributes: ['id', 'name'] }
            ]
        });


        res.json(updatedPoint);
    } catch (err) {
        console.error('Ошибка обновления точки:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении точки' });
    }
};

// Удалить точку
exports.deletePoint = async (req, res) => {
    const { id } = req.params;
    try {
        const point = await Point.findByPk(id);
        if (!point) {
            return res.status(404).json({ message: 'Точка не найдена' });
        }

        await point.destroy();
        res.json({ message: 'Точка успешно удалена' });
    } catch (err) {
        console.error('Ошибка удаления точки:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении точки' });
    }
};


// --- Вспомогательные данные ---
// Получить список административных районов (для выпадающего списка)
exports.getAdminDivisions = async (req, res) => {
    try {
        // Получаем только id и name, сортируем по имени
        const divisions = await AdminArea.findAll({
            attributes: ['id', 'name'], // Используем поле 'name' (русское название)
            order: [['name', 'ASC']]
        });
        res.json(divisions);
    } catch (err) {
        console.error('Ошибка получения адм. районов:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении адм. районов' });
    }
};