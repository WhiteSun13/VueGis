// backend/app/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Получаем директорию для загрузок из переменной окружения или используем дефолтную
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads', 'pdfs');

// Убедимся, что директория существует
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Upload directory created: ${uploadDir}`);
  } catch (err) {
     console.error(`Error creating upload directory ${uploadDir}:`, err);
     // Можно выбросить ошибку или использовать временную директорию
  }
} else {
   console.log(`Upload directory exists: ${uploadDir}`);
}


// Настройка хранилища для multer
const storage = multer.diskStorage({
  // Куда сохранять файлы
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  // Как называть файлы
  filename: function (req, file, cb) {
    // Генерируем уникальное имя: timestamp + случайное число + оригинальное расширение
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Фильтр файлов: принимаем только PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true); // Принять файл
  } else {
    // Отклонить файл, установив ошибку
    cb(new Error('Разрешены только PDF файлы!'), false);
  }
};

// Создаем экземпляр multer с настройками
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 20 // Лимит 20MB
  }
});

module.exports = upload;