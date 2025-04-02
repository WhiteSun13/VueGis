// backend/app/config/redis.js
const Redis = require('ioredis');

// Переменная окружения для определения режима работы
const isDevEnvironment = process.env.NODE_ENV === 'dev';

let redisClient;

// --- Реализация Dummy клиента ---
const dummyRedisClient = {
  // Статус, чтобы код, проверяющий status === 'ready', не ломался или пропускал операции
  status: 'disabled', // или 'ready', если хотите имитировать готовность

  // Имитация метода get - всегда возвращает null (кеш промах)
  get: async (key) => {
    console.log(`[Dummy Redis] GET ${key} -> null`);
    return null;
  },
  // Имитация метода setex - ничего не делает
  setex: async (key, seconds, value) => {
    console.log(`[Dummy Redis] SETEX ${key} ${seconds}s (data omitted) -> OK (no-op)`);
    return 'OK'; // ioredis.setex возвращает 'OK'
  },
  // Имитация метода del - ничего не делает
  del: async (...keys) => {
    const numKeys = keys.length;
    console.log(`[Dummy Redis] DEL ${keys.join(' ')} -> ${numKeys} (no-op)`);
    return numKeys; // ioredis.del возвращает количество удаленных ключей
  },
  // Имитация обработчиков событий (пустые функции)
  on: (event, handler) => {
    console.log(`[Dummy Redis] Ignoring listener for event: ${event}`);
  },
  // Добавим другие методы, если они используются в вашем коде, например:
  // incr: async (key) => { console.log(`[Dummy Redis] INCR ${key}`); return 1; },
  // decr: async (key) => { console.log(`[Dummy Redis] DECR ${key}`); return -1; },
  // Имитация ошибки, если нужно (хотя обычно dummy не должен вызывать ошибок)
  RedisError: class DummyRedisError extends Error {
      constructor(message) {
          super(message);
          this.name = 'DummyRedisError';
      }
  }
};

// --- Инициализация клиента ---
if (isDevEnvironment) {
  // Если NODE_ENV=test, используем dummy клиент
  console.log("NODE_ENV is 'dev'. Using Dummy Redis Client.");
  redisClient = dummyRedisClient;
} else {
  // В противном случае (development, production и т.д.), используем реальный клиент Redis
  console.log(`NODE_ENV is '${process.env.NODE_ENV || 'undefined'}'. Initializing Real Redis Client.`);

  // Получаем хост и порт из переменных окружения
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = process.env.REDIS_PORT || 6379;

  // Создаем реальный экземпляр клиента Redis
  const realRedisClient = new Redis({
    host: redisHost,
    port: redisPort,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      console.warn(`Redis: Попытка переподключения #${times}, задержка ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    // Добавим таймаут подключения, чтобы быстрее падать, если Redis недоступен
    connectTimeout: 5000 // 5 секунд
  });

  // Обработчики событий для реального клиента
  realRedisClient.on('connect', () => {
    console.log(`Redis: Успешно подключено к ${redisHost}:${redisPort}`);
  });

  realRedisClient.on('ready', () => {
    console.log('Redis: Клиент готов к работе.');
  });

  realRedisClient.on('error', (err) => {
    console.error('Redis: Ошибка подключения/клиента:', err.message || err);
    if (err.code === 'ECONNREFUSED') {
      console.error('Redis: Не удалось подключиться. Убедитесь, что Redis сервер запущен и доступен.');
      // В production можно завершить приложение или перейти в аварийный режим
      // process.exit(1); // Например
    }
    // Можно добавить обработку таймаута
    if (err.message.includes('ETIMEDOUT')) {
        console.error('Redis: Таймаут подключения.');
    }
  });

  realRedisClient.on('close', () => {
    console.log('Redis: Соединение закрыто.');
  });

  realRedisClient.on('reconnecting', (delay) => {
     console.log(`Redis: Переподключение через ${delay}ms...`);
  });

  realRedisClient.on('end', () => {
    console.log('Redis: Соединение окончательно закрыто.');
  });

  // Добавляем ссылку на класс ошибки для проверок instanceof
  // Это полезно, если ваш код проверяет `err instanceof redisClient.RedisError`
  realRedisClient.RedisError = Redis.ReplyError; // или просто Redis.RedisError

  redisClient = realRedisClient;
}

// Экспортируем выбранный клиент (реальный или dummy)
module.exports = redisClient;