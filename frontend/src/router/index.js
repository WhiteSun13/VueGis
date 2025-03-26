import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

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
      path: '/adminpanel',
      name: 'adminpanel',
      component: () => import('@/views/AdminPanelView.vue'),
    },
    // { 
    //   path: '/article/:id(\d+)',
    //   name: 'article',
    //   component: () => import('../views/ArticleView.vue'),
    // },
  ],
})

export default router
