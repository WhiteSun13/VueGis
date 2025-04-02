const express = require('express');
const router = express.Router();
const documentController = require('@app/controllers/documentController'); // Создадим этот контроллер

// @route   GET /api/documents/:id/download  (или просто /api/documents/:id)
// @desc    Скачать/посмотреть документ по ID
// @access  Public
router.get('/:id/download', documentController.downloadDocument);

module.exports = router;