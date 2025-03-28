import axios from 'axios';
import router from '@/router'; // Импортируем роутер для редиректа

// Получаем базовый URL API из переменных окружения или используем значение по умолчанию
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Создаем экземпляр Axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем интерцептор запросов
apiClient.interceptors.request.use(
  (config) => {
    // Получаем токен из localStorage
    const token = localStorage.getItem('authToken');
    // Если токен есть, добавляем его в заголовок Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Обработка ошибок при отправке запроса
    return Promise.reject(error);
  }
);

// Добавляем интерцептор ответов
apiClient.interceptors.response.use(
  (response) => {
    // Если ответ успешный, просто возвращаем его
    return response;
  },
  (error) => {
    // Если сервер вернул ошибку 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      // Удаляем недействительный токен из localStorage
      localStorage.removeItem('authToken');
      // Перенаправляем пользователя на страницу входа
      // Проверяем, что мы не находимся уже на странице логина, чтобы избежать цикла редиректов
      if (router.currentRoute.value.name !== 'login') {
         router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
      }
    }
    // Возвращаем ошибку для дальнейшей обработки (например, в компоненте)
    return Promise.reject(error);
  }
);

export default apiClient; // Экспортируем настроенный экземпляр