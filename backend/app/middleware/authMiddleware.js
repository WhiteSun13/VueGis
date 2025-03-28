const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

/**
 * Middleware для проверки JWT токена.
 * Извлекает токен из заголовка Authorization, верифицирует его.
 * При успехе добавляет payload токена в req.user.
 */
module.exports = function(req, res, next) {
  // Получаем токен из заголовка
  const authHeader = req.header('Authorization');

  // Проверяем наличие токена
  if (!authHeader) {
    return res.status(401).json({ message: 'Нет токена, авторизация отклонена' });
  }

  // Ожидаем формат "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
     return res.status(401).json({ message: 'Неверный формат токена' });
  }

  const token = parts[1];

  try {
    // Верифицируем токен
    const decoded = jwt.verify(token, jwtSecret);

    // Добавляем пользователя из payload токена в объект запроса
    req.user = decoded.user;
    next(); // Передаем управление следующему middleware или обработчику маршрута
  } catch (err) {
    console.error('Ошибка верификации токена:', err.message);
    res.status(401).json({ message: 'Токен недействителен' });
  }
};