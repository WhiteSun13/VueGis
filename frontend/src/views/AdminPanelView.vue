<template>
  <n-layout style="height: 100vh">
    <n-layout-header bordered style="padding: 15px 20px;">
      <n-flex justify="space-between">
        <n-h3>Панель Администратора</n-h3>
        <n-space>
          <span v-if="adminUsername">Привет, {{ adminUsername }}!</span>
          <n-button type="error" ghost @click="handleLogout" :loading="logoutLoading">
            Выход
          </n-button>
        </n-space>
      </n-flex>
    </n-layout-header>
    <n-layout-content content-style="padding: 20px;">
      <n-spin :show="loading">
        <div v-if="!loading && authError">
          <n-alert title="Ошибка аутентификации" type="error">
            Не удалось подтвердить вашу сессию. Пожалуйста, <router-link :to="{ name: 'login' }">войдите</router-link>
            снова.
            <br> {{ authError }}
          </n-alert>
        </div>
        <div v-else-if="!loading">
          <n-h4>Добро пожаловать в панель администратора!</n-h4>
          <n-grid x-gap="12" cols="1 400:2 600:4">
            <n-gi>
              <n-card :title="'Метки'">
                Добавить или редактировать метку
              </n-card>
            </n-gi>
            <n-gi>
              <n-card :title="'Типы ОАН'">
                Добавить или редактировать тип
              </n-card>
            </n-gi>
            <n-gi>
              <n-card :title="'Эпохи'">
                Добавить или редактировать эпоху
              </n-card>
            </n-gi>
          </n-grid>
        </div>
      </n-spin>
    </n-layout-content>
    <!-- <n-layout-footer bordered position="absolute"
      style="bottom: 0; width: 100%; padding: 10px 20px; text-align: center;">
      Admin Panel © {{ new Date().getFullYear() }}
    </n-layout-footer> -->
  </n-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/components/services/api.js'; // Импортируем настроенный Axios
import { NLayout, NLayoutHeader, NLayoutContent, NLayoutFooter, NFlex, NH3, NH4, NButton, NSpace, NSpin, NAlert, NCard, NGrid, NGi } from 'naive-ui';

const router = useRouter();
const loading = ref(true); // Показываем спиннер при проверке токена
const logoutLoading = ref(false);
const adminUsername = ref(null);
const authError = ref(null);

// Функция для проверки токена на сервере
const checkAuth = async () => {
  loading.value = true;
  authError.value = null;
  try {
    const response = await apiClient.get('/admin/check-auth');
    // Если проверка прошла успешно, сохраняем имя пользователя (если оно есть в ответе)
    adminUsername.value = response.data?.user?.username || 'Admin';
    console.log('Аутентификация подтверждена:', response.data);
    // Здесь можно загрузить дополнительные данные, необходимые для админ-панели
  } catch (err) {
    // Ошибка будет обработана интерцептором Axios (редирект на /login при 401)
    // Но мы можем также отобразить сообщение об ошибке здесь
    console.error('Ошибка проверки аутентификации:', err);
    authError.value = err.response?.data?.message || err.message || 'Неизвестная ошибка';
    // Интерцептор уже должен был инициировать редирект при 401,
    // но если ошибка другая, пользователь останется здесь с сообщением.
  } finally {
    loading.value = false;
  }
};

// Функция выхода
const handleLogout = () => {
  logoutLoading.value = true;
  // Удаляем токен из localStorage
  localStorage.removeItem('authToken');
  // Перенаправляем на страницу входа
  router.push({ name: 'login' }).finally(() => {
    logoutLoading.value = false;
  });
};

// Проверяем аутентификацию при монтировании компонента
onMounted(() => {
  checkAuth();
});
</script>

<style scoped>
.n-layout-header {
  height: 60px;
}

.n-layout-footer {
  height: 40px;
}

.n-layout-content {
  padding-bottom: 40px;
}
</style>