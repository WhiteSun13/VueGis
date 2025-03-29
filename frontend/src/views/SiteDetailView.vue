// frontend/src/views/SiteDetailView.vue
<template>
  <!-- Используем NLayout с отступами для всей страницы -->
  <n-layout>
    <n-layout-header bordered style="padding: 15px 20px;">
      <!-- Кнопка для возврата на главную страницу (карту) -->
      <!-- router-link используется для навигации без перезагрузки страницы -->
      <router-link :to="{ name: 'home' }" custom v-slot="{ navigate }">
        <n-button @click="navigate">◄ Вернуться к карте</n-button>
      </router-link>
    </n-layout-header>
    <n-layout-content style="padding: 20px;">
      <!-- Показываем спиннер во время загрузки данных -->
      <n-spin :show="loading">
        <!-- Отображаем сообщение об ошибке, если она произошла -->
        <n-alert v-if="error" title="Ошибка загрузки" type="error">
          {{ error }}
        </n-alert>

        <!-- Отображаем информацию о памятнике, если данные загружены успешно -->
        <n-card v-else-if="siteData" :title="siteData.name" bordered class="site-detail-card">
          <!-- Используем n-grid для возможного разделения на колонки в будущем -->
          <n-grid :x-gap="12" :y-gap="16" :cols="1">
            <!-- Секция основной информации -->
            <n-gi>
              <n-space vertical :size="12">
                <div>
                  <n-text depth="2">Координаты:</n-text>
                  <p class="info-text">{{ siteData.lon }}, {{ siteData.lat }}</p>
                </div>
                <div>
                  <n-text depth="2">Тип:</n-text>
                  <p class="info-text">{{ siteData.type || 'Не указан' }}</p>
                </div>
                <div>
                  <n-text depth="2">Эпоха:</n-text>
                  <p class="info-text">{{ siteData.epoch || 'Не указана' }}</p>
                </div>
                <div>
                  <n-text depth="2">Район:</n-text>
                  <p class="info-text">{{ siteData.admin_division_name || 'Не указан' }}</p>
                </div>
              </n-space>
            </n-gi>

            <!-- Секция краткого описания (если есть) -->
            <n-gi v-if="siteData.short_description">
              <n-divider class="section-divider" />
              <n-h4 class="section-title">Описание</n-h4>
              <p class="description-text">{{ siteData.short_description }}</p>
            </n-gi>

            <!-- Секция полного описания (если есть) -->
            <n-gi v-if="siteData.description">
              <n-divider class="section-divider" />
              <!-- Используем <pre> для сохранения форматирования текста описания -->
              <pre class="description-text">{{ siteData.description }}</pre>
            </n-gi>

            <!-- Секция со статичной картой -->
            <!-- Обернули n-image в n-tooltip и добавили обработчик клика -->
            <n-gi v-if="siteData.lat && siteData.lon">
              <n-divider class="section-divider" />
              <n-h4 class="section-title">Местоположение</n-h4>
              <!-- n-tooltip показывает подсказку при наведении -->
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-image :lazy="true" :preview-disabled="true"
                    :src="`https://static-maps.yandex.ru/v1?ll=${siteData.lon},${siteData.lat}&size=350,350&z=15&pt=${siteData.lon},${siteData.lat},pm2rdl&apikey=${YANDEX_MAPS_STATIC_API_KEY}`"
                    alt="Карта местоположения" @click="navigateToMap"
                    style="cursor: pointer; max-width: 450px; display: block;" />
                </template>
                Нажмите, чтобы перейти к карте
              </n-tooltip>
            </n-gi>

            <!-- Секция со ссылками на внешние ресурсы -->
            <n-gi>
              <n-divider class="section-divider" />
              <n-h4 class="section-title">Поиск дополнительной информации</n-h4>
              <n-space :wrap="true">
                <n-button tag="a" :href="getElibrarySearchLink(siteData.name)" target="_blank" rel="noopener noreferrer"
                  type="warning">
                  <template #icon>
                    <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path fill="currentColor"
                          d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 2h12v16H6zm2 2v2h8V6zm0 4v2h8v-2zm0 4v2h5v-2z">
                        </path>
                      </svg></n-icon>
                  </template>
                  Elibrary
                </n-button>
                <n-button tag="a" :href="getGoogleSearchLink(siteData.name)" target="_blank" rel="noopener noreferrer"
                  type="info">
                  <template #icon>
                    <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path fill="currentColor"
                          d="M21.35 11.1h-9.13v2.73h5.24c-.61 2.63-3.27 4.53-5.24 4.53c-3.14 0-5.7-2.56-5.7-5.7s2.56-5.7 5.7-5.7c1.41 0 2.7.52 3.76 1.41L19.6 5.56C17.81 3.98 15.27 3 12.22 3C7.1 3 3 7.1 3 12.22S7.1 21.44 12.22 21.44c4.97 0 8.84-3.8 8.84-8.84c0-.6-.06-1.18-.16-1.74Z">
                        </path>
                      </svg></n-icon>
                  </template>
                  Google
                </n-button>
                <n-button tag="a" :href="getYandexSearchLink(siteData.name)" target="_blank" rel="noopener noreferrer"
                  type="error">
                  <template #icon>
                    <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path fill="currentColor"
                          d="M2.04 12c0-5.523 4.476-10 10-10 5.522 0 10 4.477 10 10s-4.478 10-10 10c-5.524 0-10-4.477-10-10z" />
                        <path
                          d="M13.32 7.666h-.924c-1.694 0-2.585.858-2.585 2.123 0 1.43.616 2.1 1.881 2.959l1.045.704-3.003 4.487H7.49l2.695-4.014c-1.55-1.111-2.42-2.19-2.42-4.015 0-2.288 1.595-3.85 4.62-3.85h3.003v11.868H13.32V7.666z"
                          fill="#d03050" />
                      </svg></n-icon>
                  </template>
                  Яндекс
                </n-button>
              </n-space>
            </n-gi>
          </n-grid>
        </n-card>

        <!-- Шаблон для спиннера -->
        <template #description>
          Загрузка данных о памятнике...
        </template>
      </n-spin>
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
// Импортируем useRoute для доступа к параметрам и useRouter для навигации
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/components/services/api.js'; // Используем настроенный apiClient
import {
  NLayout, NLayoutHeader, NLayoutContent, NCard, NSpin, NAlert, NGrid, NGi,
  NH4, NText, NSpace, NDivider, NButton, NIcon, NImage, NTooltip
} from 'naive-ui';
import { getElibrarySearchLink, getGoogleSearchLink, getYandexSearchLink } from '@/components/services/utils.vue'; // Импортируем функции для ссылок

// Получаем доступ к текущему маршруту и роутеру
const route = useRoute();
const router = useRouter(); // Добавили роутер

// Реактивные переменные для хранения данных памятника, состояния загрузки и ошибки
const siteData = ref(null);
const loading = ref(true);
const error = ref(null);

// Получаем ID памятника из параметров маршрута
const siteId = route.params.id;

const YANDEX_MAPS_STATIC_API_KEY = import.meta.env.VITE_YANDEX_MAPS_STATIC_API_KEY;

// Функция для загрузки данных о памятнике с бэкенда
const fetchSiteData = async () => {
  loading.value = true; // Начинаем загрузку
  error.value = null; // Сбрасываем предыдущие ошибки
  try {
    // Выполняем GET-запрос к эндпоинту /api/points/:id
    const response = await apiClient.get(`/points/${siteId}`);
    // Сохраняем полученные данные
    siteData.value = response.data;
  } catch (err) {
    console.error('Ошибка при загрузке данных памятника:', err);
    // Обрабатываем ошибку
    if (err.response && err.response.status === 404) {
      // Если бэкенд вернул 404, устанавливаем данные в null (чтобы показать сообщение "Памятник не найден")
      siteData.value = null;
      error.value = `Памятник с ID ${siteId} не найден.`;
    } else {
      // Другие типы ошибок
      error.value = err.response?.data?.error || err.message || 'Не удалось загрузить данные.';
    }
  } finally {
    loading.value = false; // Завершаем загрузку
  }
};

// Функция для перехода на главную страницу (карту) с нужными параметрами
const navigateToMap = () => {
  // Проверяем, есть ли данные о координатах
  if (siteData.value && siteData.value.lat && siteData.value.lon) {
    // Используем router.push для навигации
    router.push({
      name: 'home',
      query: {
        lat: siteData.value.lat,
        lon: siteData.value.lon,
        z: 16
      }
    });
  } else {
    // Выводим сообщение в консоль, если координат нет (на всякий случай)
    console.warn('Невозможно перейти к карте: отсутствуют координаты памятника.');
  }
};

// Вызываем функцию загрузки данных при монтировании компонента
onMounted(() => {
  fetchSiteData();
});
</script>

<style scoped>
.site-detail-card {
  max-width: 900px;
  /* Увеличим максимальную ширину */
  margin: 20px auto;
  /* Центрируем карточку и добавляем отступ сверху/снизу */
}

.section-title {
  margin-bottom: 12px;
  /* Отступ под заголовком секции */
  color: var(--n-title-text-color);
  /* Цвет заголовка из темы Naive UI */
  font-weight: 500;
}

.info-text {
  margin: 0;
  /* Убираем стандартные отступы параграфа */
  font-size: 1em;
  /* Стандартный размер текста */
  line-height: 1.6;
}

.description-text {
  white-space: pre-wrap;
  /* Сохраняем переносы строк */
  word-wrap: break-word;
  /* Переносим длинные слова */
  font-family: inherit;
  /* Используем шрифт по умолчанию */
  margin: 0;
  /* Убираем отступы по умолчанию */
  font-size: 1em;
  line-height: 1.7;
  /* Немного увеличим межстрочный интервал для лучшей читаемости */
  color: var(--n-text-color);
  /* Цвет текста из темы */
}

.section-divider {
  margin-top: 20px;
  margin-bottom: 20px;
}

/* Стили для кнопок поиска */
.n-button {
  margin-right: 8px;
  /* Небольшой отступ между кнопками */
}

/* Добавляем стиль для кнопки возврата, если она не является тегом <a> по умолчанию */
.n-layout-header .n-button {
  margin-right: 0;
  /* Убираем отступ для кнопки в хедере */
}
</style>