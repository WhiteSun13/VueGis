const express = require('express');
const router = express.Router();
const dataController = require('@app/controllers/dataController');

router.get('/', dataController.getData);

module.exports = router;
