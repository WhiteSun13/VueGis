const express = require('express');
const router = express.Router();

// Импорт существующих маршрутов
const pointsRoutes = require('./points');
const dataRoutes = require('./data');
const adminAreasRoutes = require('./adminAreas');
const checkLocationRoutes = require('./checkLocation');
const filtersRoutes = require('./filters');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
// Импорт нового маршрута для документов
const documentsRoutes = require('./documents'); // <--- Новый импорт

// Подключение существующих маршрутов
router.use('/points', pointsRoutes);
router.use('/data', dataRoutes);
router.use('/filters', filtersRoutes);
router.use('/adminAreas', adminAreasRoutes);
router.use('/check-location', checkLocationRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
// Подключение нового маршрута для публичного доступа к документам
router.use('/documents', documentsRoutes); // <--- Новый маршрут

module.exports = router;