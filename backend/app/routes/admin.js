// backend/app/routes/admin.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('@app/middleware/authMiddleware');
const adminController = require('@app/controllers/adminController');
const pointsController = require('@app/controllers/pointsController'); // Для получения одной точки

// Middleware для проверки аутентификации для всех маршрутов в этом файле
router.use(authMiddleware);

// @route   GET api/admin/check-auth
// @desc    Проверка, действителен ли токен пользователя
// @access  Private
router.get('/check-auth', (req, res) => {
    res.json({ user: req.user });
});

// --- Маршруты для SiteType ---
// @route   GET api/admin/types
// @desc    Получить все типы
// @access  Private
router.get('/types', adminController.getAllTypes);

// @route   POST api/admin/types
// @desc    Создать новый тип
// @access  Private
router.post('/types', adminController.createType);

// @route   PUT api/admin/types/:id
// @desc    Обновить тип
// @access  Private
router.put('/types/:id', adminController.updateType);

// @route   DELETE api/admin/types/:id
// @desc    Удалить тип
// @access  Private
router.delete('/types/:id', adminController.deleteType);

// --- Маршруты для SiteEpoch ---
// @route   GET api/admin/epochs
// @desc    Получить все эпохи
// @access  Private
router.get('/epochs', adminController.getAllEpochs);

// @route   POST api/admin/epochs
// @desc    Создать новую эпоху
// @access  Private
router.post('/epochs', adminController.createEpoch);

// @route   PUT api/admin/epochs/:id
// @desc    Обновить эпоху
// @access  Private
router.put('/epochs/:id', adminController.updateEpoch);

// @route   DELETE api/admin/epochs/:id
// @desc    Удалить эпоху
// @access  Private
router.delete('/epochs/:id', adminController.deleteEpoch);

// --- Маршруты для Point ---
// @route   GET api/admin/points
// @desc    Получить все точки для админки
// @access  Private
router.get('/points', adminController.getAllPoints);

// @route   GET api/admin/points/:id
// @desc    Получить детальную информацию о точке (для редактирования)
// @access  Private
// Используем существующий публичный эндпоинт, но доступ защищен authMiddleware
router.get('/points/:id', pointsController.getPointInfo);

// @route   POST api/admin/points
// @desc    Создать новую точку
// @access  Private
router.post('/points', adminController.createPoint);

// @route   PUT api/admin/points/:id
// @desc    Обновить точку
// @access  Private
router.put('/points/:id', adminController.updatePoint);

// @route   DELETE api/admin/points/:id
// @desc    Удалить точку
// @access  Private
router.delete('/points/:id', adminController.deletePoint);

// --- Маршрут для получения списка адм. районов ---
// @route   GET api/admin/admin-divisions
// @desc    Получить список адм. районов для форм
// @access  Private
router.get('/admin-divisions', adminController.getAdminDivisions);

module.exports = router;