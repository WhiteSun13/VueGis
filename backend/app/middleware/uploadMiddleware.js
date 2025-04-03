const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Импортируем библиотеку для транслитерации
const CyrillicToTranslit = require('cyrillic-to-translit-js');

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
    // 1. Получаем оригинальное имя и расширение
    const originalNameData = path.parse(file.originalname);
    const originalBasename = originalNameData.name;
    const originalExtension = originalNameData.ext; // Расширение с точкой (e.g., ".pdf")

    // 2. Инициализируем транслитератор
    // Важно: создаем новый экземпляр для каждого файла, т.к. он может иметь состояние
    const cyrillicToTranslit = new CyrillicToTranslit();

    // 3. Транслитерируем базовое имя файла (заменяем пробелы на '_')
    let transliteratedName = cyrillicToTranslit.transform(originalBasename, "_");

    // 4. Дополнительная очистка имени файла (опционально, но рекомендуется):
    //    - Приводим к нижнему регистру
    //    - Удаляем все символы, кроме букв (a-z), цифр, '_' и '-'
    transliteratedName = transliteratedName
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, ''); // Оставляем только разрешенные символы

    // 5. Предотвращаем пустое имя файла после очистки
    if (!transliteratedName) {
        transliteratedName = 'file'; // Имя по умолчанию, если оригинал состоял только из недопустимых символов
    }

    // 6. Генерируем уникальный префикс (как и раньше)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

    // 7. Собираем финальное имя файла: uniquePrefix_transliteratedName.originalExtension
    const finalFilename = uniqueSuffix + '_' + transliteratedName + originalExtension;

    cb(null, finalFilename);
  }
});

// Фильтр файлов: принимаем только PDF (без изменений)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true); // Принять файл
  } else {
    // Отклонить файл, установив ошибку
    cb(new Error('Разрешены только PDF файлы!'), false);
  }
};

// Создаем экземпляр multer с настройками (без изменений)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 20 // Лимит 20MB
  }
});

module.exports = upload;