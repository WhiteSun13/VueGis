const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Получаем учетные данные и секрет из переменных окружения
const adminUsername = process.env.ADMIN_USERNAME;
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Обрабатывает вход администратора.
 * Проверяет имя пользователя и пароль, генерирует JWT при успехе.
 */
exports.login = async (req, res) => {
  const { username, password } = req.body;

  // Проверяем, были ли переданы имя пользователя и пароль
  if (!username || !password) {
    return res.status(400).json({ message: 'Требуется имя пользователя и пароль' });
  }

  // Проверяем имя пользователя
  if (username !== adminUsername) {
    return res.status(401).json({ message: 'Неверные учетные данные' });
  }

  try {
    // Сравниваем предоставленный пароль с хэшем из .env
    const isMatch = await bcrypt.compare(password, adminPasswordHash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Если учетные данные верны, создаем JWT
    const payload = {
      user: {
        // В payload можно добавить нужную информацию о пользователе
        username: adminUsername,
        role: 'admin'
      }
    };

    // Подписываем токен
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: jwtExpiresIn },
      (err, token) => {
        if (err) throw err;
        // Отправляем токен клиенту
        res.json({ token });
      }
    );

  } catch (err) {
    console.error("Ошибка входа:", err.message);
    res.status(500).send('Ошибка сервера');
  }
};