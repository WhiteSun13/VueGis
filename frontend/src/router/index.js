// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue'; // Импортируем компонент входа
import AdminPanelView from '@/views/AdminPanelView.vue'; // Импортируем компонент админ-панели
// Импортируем новый компонент для детальной страницы памятника
// Можно использовать ленивую загрузку для лучшей производительности
const SiteDetailView = () => import('@/views/SiteDetailView.vue');

// Функция для проверки наличия токена аутентификации
function isAuthenticated() {
  return !!localStorage.getItem('authToken');
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
    },
    {
      path: '/login', // Маршрут для страницы входа
      name: 'login',
      component: LoginView,
      beforeEnter: (to, from, next) => {
        // Если пользователь уже аутентифицирован, перенаправляем его в админ-панель
        if (isAuthenticated()) {
          next({ name: 'adminpanel' });
        } else {
          next(); // Иначе разрешаем доступ к странице входа
        }
      },
    },
    {
      path: '/adminpanel',
      name: 'adminpanel',
      component: AdminPanelView,
      meta: { requiresAuth: true }, // Помечаем маршрут как требующий аутентификации
    },
    {
      // Путь с динамическим параметром :id
      // (\\d+) - регулярное выражение, гарантирующее, что id будет состоять только из цифр
      path: '/site/:id(\\d+)',
      name: 'site-detail', // Имя маршрута для использования в <router-link> или router.push
      component: SiteDetailView, // Связываем путь с созданным компонентом
    },
    // {
    //   path: '/article/:id(\\d+)',
    //   name: 'article',
    //   component: () => import('../views/ArticleView.vue'),
    // },
  ],
});

// Глобальный навигационный хук (guard)
router.beforeEach((to, from, next) => {
  // Проверяем, требует ли маршрут аутентификации
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Если требует, но пользователь не аутентифицирован
    if (!isAuthenticated()) {
      // Перенаправляем на страницу входа
      next({
        name: 'login',
        query: { redirect: to.fullPath } // Сохраняем путь, куда пользователь хотел попасть
      });
    } else {
      next(); // Пользователь аутентифицирован, разрешаем переход
    }
  } else {
    next(); // Маршрут не требует аутентификации, разрешаем переход
  }
});

export default router;