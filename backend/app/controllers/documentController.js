const { Document } = require('@app/models');
const path = require('path');
const fs = require('fs');

// Абсолютный путь к директории загрузок (лучше брать из env или config)
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads', 'pdfs');

/**
 * Отдает файл документа для скачивания или просмотра.
 */
exports.downloadDocument = async (req, res) => {
    const { id } = req.params;

    try {
        const document = await Document.findByPk(id, {
            attributes: ['filepath', 'filename', 'mimetype'] // Получаем нужные поля
        });

        if (!document) {
            return res.status(404).json({ message: 'Документ не найден' });
        }

        // Формируем полный путь к файлу
        // ВАЖНО: document.filepath должен хранить путь ОТНОСИТЕЛЬНО uploadDir или абсолютный путь.
        // Если filepath хранится как 'timestamp-random.pdf', то:
        const filePath = path.join(uploadDir, path.basename(document.filepath)); // Используем basename для безопасности

        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
             console.error(`File not found at path: ${filePath} (DB filepath: ${document.filepath})`);
             return res.status(404).json({ message: 'Файл документа не найден на сервере' });
        }

        // Устанавливаем заголовки для скачивания/отображения
        // res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.filename)}"`); // Для скачивания
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.filename)}"`); // Для просмотра в браузере
        res.setHeader('Content-Type', document.mimetype || 'application/pdf'); // Устанавливаем MIME тип

        // Отправляем файл
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error(`Ошибка при отправке файла ${filePath}:`, err);
                // Не отправляем еще один ответ, если заголовки уже были отправлены
                if (!res.headersSent) {
                     res.status(500).json({ message: 'Ошибка сервера при отправке файла' });
                }
            } else {
                console.log(`Файл ${filePath} успешно отправлен.`);
            }
        });

    } catch (err) {
        console.error(`Ошибка при поиске документа ${id} для скачивания:`, err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
};