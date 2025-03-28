// backend/app/routes/index.js
const express = require('express');
const router = express.Router();

// Импорт существующих маршрутов
const pointsRoutes = require('./points');
const dataRoutes = require('./data');
const adminAreasRoutes = require('./adminAreas');
const checkLocationRoutes = require('./checkLocation');
const filtersRoutes = require('./filters');

// Импорт новых маршрутов
const authRoutes = require('./auth'); // Маршруты аутентификации
const adminRoutes = require('./admin'); // Защищенные маршруты админа

// Подключение существующих маршрутов
router.use('/points', pointsRoutes);
router.use('/data', dataRoutes);
router.use('/filters', filtersRoutes);
router.use('/adminAreas', adminAreasRoutes);
router.use('/check-location', checkLocationRoutes);

// Подключение новых маршрутов
router.use('/auth', authRoutes); // Маршруты для входа (/api/auth/login)
router.use('/admin', adminRoutes); // Защищенные маршруты админа (/api/admin/...)

module.exports = router;