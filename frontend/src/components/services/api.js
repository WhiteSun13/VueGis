// frontend/src/components/services/api.js
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
    return apiClient.get(`/points/${id}`); // Используем apiClient
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
export const loginAdmin = (credentials) => {
    return apiClient.post('/auth/login', credentials);
};

// --- Функции админки (требуют токен, обрабатываются интерцептором) ---

// Проверка статуса аутентификации
export const checkAuthStatus = () => {
    return apiClient.get('/admin/check-auth');
};

// --- CRUD для SiteType (Типы ОАН) ---
export const getAllTypesAdmin = () => {
    return apiClient.get('/admin/types');
};
export const createTypeAdmin = (typeData) => {
    return apiClient.post('/admin/types', typeData);
};
export const updateTypeAdmin = (id, typeData) => {
    return apiClient.put(`/admin/types/${id}`, typeData);
};
export const deleteTypeAdmin = (id) => {
    return apiClient.delete(`/admin/types/${id}`);
};

// --- CRUD для SiteEpoch (Эпохи) ---
export const getAllEpochsAdmin = () => {
    return apiClient.get('/admin/epochs');
};
export const createEpochAdmin = (epochData) => {
    return apiClient.post('/admin/epochs', epochData);
};
export const updateEpochAdmin = (id, epochData) => {
    return apiClient.put(`/admin/epochs/${id}`, epochData);
};
export const deleteEpochAdmin = (id) => {
    return apiClient.delete(`/admin/epochs/${id}`);
};

// --- CRUD для Point (Точки) ---
/**
 * Получает список точек для админки с параметрами пагинации.
 * @param {number} page Номер страницы (начиная с 1)
 * @param {number} limit Количество элементов на странице
 * @returns {Promise} Promise с ответом API, содержащим { totalItems, items, totalPages, currentPage }
 */
export const getAllPointsAdmin = (page = 1, limit = 10) => {
    // Передаем параметры пагинации как query params
    return apiClient.get('/admin/points', {
        params: {
            page: page,
            limit: limit
        }
    });
};

// Для получения точки для редактирования используем публичный fetchPointInfo,
// т.к. он возвращает все нужные данные и не требует доп. маршрута
// export const getPointAdmin = (id) => apiClient.get(`/admin/points/${id}`); // Не используется

export const createPointAdmin = (pointData) => {
    return apiClient.post('/admin/points', pointData);
};
export const updatePointAdmin = (id, pointData) => {
    return apiClient.put(`/admin/points/${id}`, pointData);
};
export const deletePointAdmin = (id) => {
    return apiClient.delete(`/admin/points/${id}`);
};

// --- Получение адм. районов для форм ---
export const getAdminDivisionsForSelect = () => {
    return apiClient.get('/admin/admin-divisions');
};

// Экспортируем сам клиент, если он нужен где-то еще (хотя обычно используют функции)
export default apiClient;