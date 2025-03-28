<template>
    <div class="login-container">
      <n-card title="Вход в панель администратора" class="login-card">
        <n-form @submit.prevent="handleLogin">
          <n-form-item-row label="Имя пользователя">
            <n-input v-model:value="username" placeholder="Введите имя пользователя" />
          </n-form-item-row>
          <n-form-item-row label="Пароль">
            <n-input
              type="password"
              show-password-on="click"
              v-model:value="password"
              placeholder="Введите пароль"
              @keydown.enter="handleLogin"
            />
          </n-form-item-row>
          <n-button type="primary" attr-type="submit" block :loading="loading" :disabled="loading">
            Войти
          </n-button>
          <n-alert v-if="error" title="Ошибка входа" type="error" closable @close="error = null" style="margin-top: 15px;">
            {{ error }}
          </n-alert>
        </n-form>
      </n-card>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useRouter, useRoute } from 'vue-router'; // Добавляем useRoute
  import axios from 'axios';
  import { NCard, NForm, NFormItemRow, NInput, NButton, NAlert } from 'naive-ui';
  
  const router = useRouter();
  const route = useRoute(); // Получаем текущий маршрут
  const username = ref('');
  const password = ref('');
  const loading = ref(false);
  const error = ref(null);
  
  // URL вашего бэкенда
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'; // Используем переменную окружения или дефолтное значение
  
  const handleLogin = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: username.value,
        password: password.value,
      });
  
      // Сохраняем токен в localStorage
      localStorage.setItem('authToken', response.data.token);
  
      // Получаем путь для редиректа из query параметра или переходим в админ-панель по умолчанию
      const redirectPath = route.query.redirect || { name: 'adminpanel' };
      router.push(redirectPath);
  
    } catch (err) {
      // Обработка ошибок
      if (err.response) {
        error.value = err.response.data.message || 'Неверные учетные данные или ошибка сервера.';
      } else if (err.request) {
        error.value = 'Не удалось подключиться к серверу. Проверьте соединение.';
      } else {
        error.value = 'Произошла ошибка при попытке входа.';
      }
      console.error('Ошибка входа:', err);
    } finally {
      loading.value = false;
    }
  };
  </script>
  
  <style scoped>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f0f2f5;
  }
  
  .login-card {
    width: 100%;
    max-width: 400px;
  }
  </style>