const express = require('express');
const router = express.Router();
const filtersController = require('@app/controllers/filtersController');

router.get('/', filtersController.getFilters);

module.exports = router;