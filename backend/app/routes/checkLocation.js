const express = require('express');
const router = express.Router();
const checkLocationController = require('@app/controllers/checkLocationController');

router.get('/', checkLocationController.checkLocation);

module.exports = router;
