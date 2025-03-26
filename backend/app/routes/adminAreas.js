const express = require('express');
const router = express.Router();
const adminAreasController = require('@app/controllers/adminAreasController');

router.get('/', adminAreasController.getAdminAreas);

module.exports = router;
