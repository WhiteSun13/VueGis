// frontend/src/components/services/api.js
import axios from 'axios';
import router from '@/router'; // Импортируем роутер для редиректа

// Получаем базовый URL API из переменных окружения или используем значение по умолчанию
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Создаем экземпляр Axios с базовой конфигурацией
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {},
});

// Добавляем интерцептор запросов
apiClient.interceptors.request.use(
  (config) => {
    // Получаем токен из localStorage
    const token = localStorage.getItem('authToken');
    // Если токен есть, добавляем его в заголовок Authorization
    // Добавляем заголовок Authorization только для маршрутов, начинающихся с /admin,
    // чтобы не отправлять его на публичные эндпоинты без необходимости
    if (token && config.url && config.url.startsWith('/admin')) {
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

// --- Публичные функции (не требуют токена) ---

// Получить данные геообъектов для карты (bbox) - использует JSONP
export const fetchData = (bbox) => {
  const callbackName = 'myCallback';
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Используем API_URL, но без /api суффикса, если он там есть по умолчанию
    const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    script.src = `${baseUrl}/api/data?bbox=${bbox}&callback=${callbackName}`; // Убедимся, что путь правильный
    window[callbackName] = (data) => {
      resolve(data);
      document.body.removeChild(script);
      delete window[callbackName];
    };
    script.onerror = (err) => {
      reject(err);
      document.body.removeChild(script);
      delete window[callbackName];
    };
    document.body.appendChild(script);
  });
};

// Получить данные для фильтров (типы, эпохи)
export const fetchFilters = () => {
  return apiClient.get('/filters'); // Используем apiClient, т.к. это обычный GET
};

// Получить детальную информацию о точке по ID
export const fetchPointInfo = (id) => {
  return apiClient.get(`/points/${id}`);
};

// Скачивание файла
export const getDocumentDownloadUrl = (documentId) => {
  // Возвращаем URL, а не делаем запрос через axios, т.к. это для <a> тега или window.open
  return `${API_URL}/documents/${documentId}/download`;
};

// Проверить местоположение по координатам
export const checkLocation = (lat, lon) => {
  return apiClient.get('/check-location', { params: { lat, lon } }); // Используем apiClient
};

// Получить данные об админ. районах для карты (bbox) - использует JSONP
export const fetchAdminAreas = (bbox) => {
  const callbackName = 'adminAreasCallback';
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
    script.src = `${baseUrl}/api/adminAreas?bbox=${bbox}&callback=${callbackName}`; // Убедимся, что путь правильный
    window[callbackName] = (data) => {
      resolve(data);
      document.body.removeChild(script);
      delete window[callbackName];
    };
    script.onerror = (err) => {
      reject(err);
      document.body.removeChild(script);
      delete window[callbackName];
    };
    document.body.appendChild(script);
  });
};

// --- Функции для аутентификации ---

// Вход администратора
export const loginAdmin = (credentials) => apiClient.post('/auth/login', credentials, { headers: { 'Content-Type': 'application/json' } });

// --- Функции админки (требуют токен, обрабатываются интерцептором) ---

// Проверка статуса аутентификации
export const checkAuthStatus = () => apiClient.get('/admin/check-auth');

// --- CRUD для SiteType (Типы ОАН) ---
export const getAllTypesAdmin = () => apiClient.get('/admin/types');
export const createTypeAdmin = (typeData) => apiClient.post('/admin/types', typeData, { headers: { 'Content-Type': 'application/json' } });
export const updateTypeAdmin = (id, typeData) => apiClient.put(`/admin/types/${id}`, typeData, { headers: { 'Content-Type': 'application/json' } });
export const deleteTypeAdmin = (id) => apiClient.delete(`/admin/types/${id}`);

// --- CRUD для SiteEpoch (Эпохи) ---
export const getAllEpochsAdmin = () => apiClient.get('/admin/epochs');
export const createEpochAdmin = (epochData) => apiClient.post('/admin/epochs', epochData, { headers: { 'Content-Type': 'application/json' } });
export const updateEpochAdmin = (id, epochData) => apiClient.put(`/admin/epochs/${id}`, epochData, { headers: { 'Content-Type': 'application/json' } });
export const deleteEpochAdmin = (id) => apiClient.delete(`/admin/epochs/${id}`);

// --- CRUD для Point ---
export const getAllPointsAdmin = (page = 1, limit = 10) => apiClient.get('/admin/points', { params: { page, limit } });
export const createPointAdmin = (pointData) => apiClient.post('/admin/points', pointData, { headers: { 'Content-Type': 'application/json' } });
// Обновляем updatePointAdmin, чтобы он тоже отправлял JSON
export const updatePointAdmin = (id, pointData) => apiClient.put(`/admin/points/${id}`, pointData, { headers: { 'Content-Type': 'application/json' } });
export const deletePointAdmin = (id) => apiClient.delete(`/admin/points/${id}`);

// --- CRUD для Document ---
/**
 * Загружает PDF документ.
 * @param {FormData} formData - Объект FormData, содержащий файл ('document') и опциональное описание ('description').
 * @returns {Promise} Promise с ответом API.
 */
export const uploadDocumentAdmin = (formData) => {
  // Для FormData Axios сам установит правильный Content-Type (multipart/form-data)
  return apiClient.post('/admin/documents', formData);
};

/**
 * Получает список всех документов для админки.
 * @returns {Promise} Promise с массивом документов.
 */
export const getAllDocumentsAdmin = () => {
  return apiClient.get('/admin/documents');
};

/**
 * Удаляет документ по ID.
 * @param {number} id ID документа.
 * @returns {Promise} Promise с ответом API.
 */
export const deleteDocumentAdmin = (id) => {
  return apiClient.delete(`/admin/documents/${id}`);
};

/**
 * Обновляет описание документа.
 * @param {number} id ID документа.
 * @param {{ description: string | null }} data Объект с новым описанием.
 * @returns {Promise} Promise с ответом API (обновленный документ).
 */
export const updateDocumentAdmin = (id, data) => {
  return apiClient.put(`/admin/documents/${id}`, data, { headers: { 'Content-Type': 'application/json' } });
};

// --- Получение адм. районов для форм (без изменений) ---
export const getAdminDivisionsForSelect = () => apiClient.get('/admin/admin-divisions');

// Экспортируем сам клиент (без изменений)
export default apiClient;