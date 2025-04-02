const Redis = require('ioredis');

// Получаем хост и порт из переменных окружения
const redisHost = process.env.REDIS_HOST || '127.0.0.1'; // Фоллбэк для локального запуска без Docker
const redisPort = process.env.REDIS_PORT || 6379;

// Создаем экземпляр клиента Redis
// Добавляем опции для обработки ошибок и переподключения
const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  retryStrategy(times) {
    // Попытка переподключения с экспоненциальной задержкой
    const delay = Math.min(times * 50, 2000); // Максимум 2 секунды
    console.warn(`Redis: Попытка переподключения #${times}, задержка ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3 // Ограничение попыток для одного запроса
});

// Обработчики событий для логирования состояния подключения
redisClient.on('connect', () => {
  console.log(`Redis: Успешно подключено к ${redisHost}:${redisPort}`);
});

redisClient.on('ready', () => {
  console.log('Redis: Клиент готов к работе.');
});

redisClient.on('error', (err) => {
  console.error('Redis: Ошибка подключения/клиента:', err.message || err);
  // В зависимости от типа ошибки, можно предпринять дополнительные действия
  // Например, если ошибка связана с аутентификацией или конфигурацией, приложение может завершиться
  if (err.code === 'ECONNREFUSED') {
      console.error('Redis: Не удалось подключиться. Убедитесь, что Redis сервер запущен и доступен.');
      // Можно остановить приложение или перейти в режим без кеширования
  }
});

redisClient.on('close', () => {
  console.log('Redis: Соединение закрыто.');
});

redisClient.on('reconnecting', () => {
  console.log('Redis: Переподключение...');
});

redisClient.on('end', () => {
  console.log('Redis: Соединение окончательно закрыто (достигнут лимит попыток или вызван quit).');
});

// Экспортируем настроенный клиент
module.exports = redisClient;