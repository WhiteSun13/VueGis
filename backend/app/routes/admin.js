// backend/app/routes/admin.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('@app/middleware/authMiddleware');
const adminController = require('@app/controllers/adminController');
const pointsController = require('@app/controllers/pointsController');
const upload = require('@app/middleware/uploadMiddleware'); // Импортируем multer middleware

// Middleware для проверки аутентификации для всех маршрутов в этом файле
router.use(authMiddleware);

// @route   GET api/admin/check-auth
router.get('/check-auth', (req, res) => { res.json({ user: req.user }); });

// --- Маршруты для SiteType ---
router.get('/types', adminController.getAllTypes);
router.post('/types', adminController.createType);
router.put('/types/:id', adminController.updateType);
router.delete('/types/:id', adminController.deleteType);

// --- Маршруты для SiteEpoch ---
router.get('/epochs', adminController.getAllEpochs);
router.post('/epochs', adminController.createEpoch);
router.put('/epochs/:id', adminController.updateEpoch);
router.delete('/epochs/:id', adminController.deleteEpoch);

// --- Маршруты для Point ---
router.get('/points', adminController.getAllPoints); // Получить все точки для админки (с пагинацией)
router.get('/points/:id', pointsController.getPointInfo); // Получить детальную инфо точки (используем публичный)
router.post('/points', adminController.createPoint); // Создать точку
router.put('/points/:id', adminController.updatePoint); // Обновить точку (включая документы)
router.delete('/points/:id', adminController.deletePoint); // Удалить точку

// --- Маршруты для Document ---
// @route   POST api/admin/documents
// @desc    Загрузить новый PDF документ
// @access  Private
// --- Маршруты для Document ---
router.post(
    '/documents',
    upload.single('document'), // Сначала multer
    adminController.uploadDocument, // Затем контроллер
    // Обработчик ошибок именно для этого маршрута (после контроллера не сработает, нужно до)
    (error, req, res, next) => { // Добавляем обработчик ошибок multer
         if (error instanceof multer.MulterError) {
             // Ошибка Multer (например, лимит размера файла)
             console.error("Multer Error:", error);
             return res.status(400).json({ message: `Ошибка загрузки файла: ${error.message} (код: ${error.code})` });
         } else if (error) {
             // Другая ошибка (например, из fileFilter)
              console.error("File Upload Error:", error);
             return res.status(400).json({ message: error.message || 'Недопустимый тип файла или другая ошибка загрузки' });
         }
         // Если ошибок нет, передаем управление дальше (если есть следующий middleware)
         next();
    }
);

// @route   GET api/admin/documents
// @desc    Получить список всех загруженных документов
// @access  Private
router.get('/documents', adminController.getAllDocuments);

// @route   DELETE api/admin/documents/:id
// @desc    Удалить документ (файл и запись в БД)
// @access  Private
router.delete('/documents/:id', adminController.deleteDocument);

// @route   PUT api/admin/documents/:id
// @desc    Обновить описание документа
// @access  Private
router.put('/documents/:id', adminController.updateDocument); 

// --- Маршруты для связей Point <-> Document ---
// Связи теперь управляются через PUT /api/admin/points/:id (метод setDocuments)

// --- Маршрут для получения списка адм. районов ---
router.get('/admin-divisions', adminController.getAdminDivisions);

module.exports = router;