const express = require('express');
const router = express.Router();
const pointsController = require('@app/controllers/pointsController');

router.get('/', pointsController.getPoints);
router.get('/:id', pointsController.getPointInfo);

module.exports = router;