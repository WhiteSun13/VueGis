const express = require('express');
const router = express.Router();

const pointsRoutes = require('./points');
const dataRoutes = require('./data');
const adminAreasRoutes = require('./adminAreas');
const checkLocationRoutes = require('./checkLocation');
const filtersRoutes = require('./filters');

router.use('/points', pointsRoutes);
router.use('/data', dataRoutes);
router.use('/filters', filtersRoutes);
router.use('/adminAreas', adminAreasRoutes);
router.use('/check-location', checkLocationRoutes);

module.exports = router;