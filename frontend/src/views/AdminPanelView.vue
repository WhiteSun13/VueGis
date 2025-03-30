<template>
  <n-layout style="min-height: 100vh"> <!-- Используем n-layout для структуры -->
    <n-layout-header bordered style="padding: 10px 20px; height: 60px; display: flex; align-items: center;">
      <n-flex justify="space-between" style="width: 100%;">
        <n-h3 style="margin: 0;">Панель администратора</n-h3>
        <n-space>
          <span v-if="adminUsername" style="font-size: 0.9em;">Привет, {{ adminUsername }}!</span>
          <n-button type="error" ghost @click="handleLogout" :loading="logoutLoading" size="small">
            Выход
          </n-button>
        </n-space>
      </n-flex>
    </n-layout-header>

    <n-layout-content content-style="padding: 20px;">
       <!-- Сообщение об ошибке аутентификации -->
       <div v-if="authError" style="margin-bottom: 20px;">
           <n-alert title="Ошибка аутентификации" type="error" closable @close="authError = null">
               Не удалось подтвердить вашу сессию. Пожалуйста,
               <router-link :to="{ name: 'login' }">войдите</router-link> снова.
               <br> {{ authError }}
           </n-alert>
       </div>

       <!-- Общая ошибка загрузки данных (не модальных) -->
       <div v-if="error && !authError" style="margin-bottom: 20px;">
            <n-alert title="Ошибка" type="error" closable @close="error = null">
                {{ error }}
            </n-alert>
       </div>

        <!-- Основной контент админки -->
        <n-spin :show="isLoading" description="Первоначальная загрузка...">
            <div v-if="!isLoading && !authError"> <!-- Показываем контент только если нет ошибок и загрузка завершена -->
                <!-- Используем вкладки для навигации -->
                <n-tabs type="line" animated v-model:value="currentSection" @update:value="handleTabChange">
                    <n-tab-pane name="points" tab="Точки">
                        <!-- Секция управления Точками -->
                        <section class="admin-section">
                          <div class="section-header">
                              <n-h4 style="margin:0;">Управление точками</n-h4>
                              <n-button type="success" @click="openPointModal()" :disabled="isSaving" size="small">
                                <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg></n-icon></template>
                                Добавить точку
                              </n-button>
                          </div>

                          <n-spin :show="isLoadingPoints" description="Обновление списка точек...">
                              <n-data-table
                                v-if="!isLoadingPoints && points.length > 0"
                                :columns="pointColumns"
                                :data="points"
                                :bordered="true"
                                :single-line="false"
                                size="small"
                                style="margin-top: 15px;"
                              />
                              <n-empty v-else-if="!isLoadingPoints && points.length === 0" description="Точки не найдены" style="padding: 20px;" />
                          </n-spin>

                          <!-- Пагинация для точек -->
                          <n-pagination
                            v-if="pointsTotalPages > 1"
                            v-model:page="pointsCurrentPage"
                            :page-count="pointsTotalPages"
                            :item-count="pointsTotalItems"
                            :page-size="pointsLimit"
                            show-quick-jumper
                            show-size-picker
                            :page-sizes="[10, 15, 20, 50]"
                            @update:page="handlePointsPageChange"
                            @update:page-size="handlePointsSizeChange"
                            :disabled="isLoadingPoints || isSaving"
                            style="margin-top: 20px; justify-content: center;"
                          >
                            <template #prefix="{ itemCount }">
                                Всего: {{ itemCount }}
                            </template>
                         </n-pagination>
                        </section>
                    </n-tab-pane>

                    <n-tab-pane name="types" tab="Типы ОАН">
                        <!-- Секция управления Типами ОАН -->
                        <section class="admin-section">
                           <div class="section-header">
                                <n-h4 style="margin:0;">Управление типами ОАН</n-h4>
                                <n-button type="success" @click="openTypeModal()" :disabled="isSaving" size="small">
                                    <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg></n-icon></template>
                                    Добавить тип
                                </n-button>
                           </div>
                            <n-spin :show="isLoadingTypes" description="Загрузка типов...">
                                <n-data-table
                                    v-if="!isLoadingTypes && types.length > 0"
                                    :columns="typeColumns"
                                    :data="types"
                                    :bordered="true"
                                    :single-line="false"
                                    size="small"
                                    style="margin-top: 15px;"
                                />
                                <n-empty v-else-if="!isLoadingTypes && types.length === 0" description="Типы не найдены" style="padding: 20px;" />
                            </n-spin>
                        </section>
                    </n-tab-pane>

                    <n-tab-pane name="epochs" tab="Эпохи">
                        <!-- Секция управления Эпохами -->
                        <section class="admin-section">
                           <div class="section-header">
                               <n-h4 style="margin:0;">Управление эпохами</n-h4>
                               <n-button type="success" @click="openEpochModal()" :disabled="isSaving" size="small">
                                   <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg></n-icon></template>
                                   Добавить эпоху
                                </n-button>
                           </div>
                            <n-spin :show="isLoadingEpochs" description="Загрузка эпох...">
                                <n-data-table
                                    v-if="!isLoadingEpochs && epochs.length > 0"
                                    :columns="epochColumns"
                                    :data="epochs"
                                    :bordered="true"
                                    :single-line="false"
                                    size="small"
                                    style="margin-top: 15px;"
                                />
                                <n-empty v-else-if="!isLoadingEpochs && epochs.length === 0" description="Эпохи не найдены" style="padding: 20px;" />
                           </n-spin>
                        </section>
                    </n-tab-pane>
                </n-tabs>
            </div>
             <!-- Сообщение если загрузка прошла, но есть ошибка аутентификации -->
             <div v-else-if="!isLoading && authError">
                <!-- Ошибка аутентификации уже показана выше -->
             </div>
        </n-spin>

    </n-layout-content>

    <!-- Модальное окно для Точек -->
    <n-modal
      v-model:show="showPointModal"
      preset="card"
      :style="{ width: '700px' }"
      :title="editingPointId ? 'Редактировать точку' : 'Добавить точку'"
      :bordered="true"
      :closable="!isSaving"
      :mask-closable="!isSaving"
      @after-leave="destroyModalMap"
    >
         <n-spin :show="isLoadingModalData || isSaving" :description="isLoadingModalData ? 'Загрузка данных...' : 'Сохранение...'">
            <n-form ref="pointFormRef" :model="currentPoint" @submit.prevent="savePoint">
                <n-grid :cols="2" :x-gap="15">
                     <n-form-item-gi :span="2" path="name" label="Название:" required>
                         <n-input v-model:value="currentPoint.name" placeholder="Введите название точки" />
                     </n-form-item-gi>

                     <!-- Координаты и кнопка карты -->
                     <n-form-item-gi path="latitude" label="Широта:" required>
                         <n-input-number v-model:value="currentPoint.latitude" step="any" placeholder="Например, 45.12345" style="width: 100%;" />
                     </n-form-item-gi>
                     <n-form-item-gi path="longitude" label="Долгота:" required>
                          <n-flex>
                            <n-input-number v-model:value="currentPoint.longitude" step="any" placeholder="Например, 34.56789" style="flex-grow: 1;"/>
                            <n-button @click="toggleMapInModal" type="default" ghost title="Показать/скрыть карту">
                                <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5"/></svg></n-icon></template>
                            </n-button>
                          </n-flex>
                     </n-form-item-gi>

                     <!-- Карта в модальном окне (скрыта по умолчанию) -->
                    <n-form-item-gi :span="2" v-if="showMapInModal">
                      <div ref="modalMapContainerRef" style="width: 100%; height: 300px; border: 1px solid #ccc; margin-top: 10px;">
                        <n-spin :show="isLoadingModalMap" description="Загрузка карты..." size="large" />
                      </div>
                    </n-form-item-gi>

                      <n-form-item-gi path="type_id" label="Тип:" required>
                          <n-select
                            v-model:value="currentPoint.type_id"
                            placeholder="Выберите тип ОАН"
                            :options="typeOptions"
                            filterable
                          />
                      </n-form-item-gi>
                      <n-form-item-gi path="epoch_id" label="Эпоха:" required>
                           <n-select
                              v-model:value="currentPoint.epoch_id"
                              placeholder="Выберите эпоху"
                              :options="epochOptions"
                              filterable
                            />
                      </n-form-item-gi>
                       <n-form-item-gi :span="2" path="short_description" label="Краткое описание:">
                          <n-input type="textarea" v-model:value="currentPoint.short_description" placeholder="Введите краткое описание" :autosize="{ minRows: 2, maxRows: 4 }"/>
                       </n-form-item-gi>
                       <n-form-item-gi :span="2" path="description" label="Полное описание:">
                            <n-input type="textarea" v-model:value="currentPoint.description" placeholder="Введите полное описание" :autosize="{ minRows: 4, maxRows: 10 }"/>
                       </n-form-item-gi>
                </n-grid>

                 <n-alert v-if="modalError" title="Ошибка" type="error" closable @close="modalError = null" style="margin-top: 15px; margin-bottom: 15px;">
                     {{ modalError }}
                 </n-alert>

                <n-flex justify="end" style="margin-top: 20px;">
                     <n-button @click="closePointModal" :disabled="isSaving">Отмена</n-button>
                     <n-button type="primary" attr-type="submit" :loading="isSaving" :disabled="isLoadingModalData">
                         Сохранить
                     </n-button>
                 </n-flex>
            </n-form>
        </n-spin>
    </n-modal>

    <!-- Модальное окно для Типов -->
     <n-modal
        v-model:show="showTypeModal"
        preset="card" :style="{ width: '450px' }"
        :title="editingTypeId ? 'Редактировать тип ОАН' : 'Добавить тип ОАН'"
        :bordered="true"
        :closable="!isSaving"
        :mask-closable="!isSaving"
      >
          <n-spin :show="isSaving" description="Сохранение...">
             <n-form ref="typeFormRef" :model="currentType" @submit.prevent="saveType">
                 <n-form-item path="type_value" label="Ключ (type_value):" required>
                     <n-input v-model:value="currentType.type_value" placeholder="например, settlement" />
                 </n-form-item>
                 <n-form-item path="label" label="Название (label):" required>
                     <n-input v-model:value="currentType.label" placeholder="например, Поселение" />
                 </n-form-item>

                  <n-alert v-if="modalError" title="Ошибка" type="error" closable @close="modalError = null" style="margin-top: 15px; margin-bottom: 15px;">
                      {{ modalError }}
                  </n-alert>

                 <n-flex justify="end" style="margin-top: 20px;">
                      <n-button @click="closeTypeModal" :disabled="isSaving">Отмена</n-button>
                      <n-button type="primary" attr-type="submit" :loading="isSaving">
                          Сохранить
                      </n-button>
                  </n-flex>
             </n-form>
         </n-spin>
     </n-modal>

     <!-- Модальное окно для Эпох -->
     <n-modal
        v-model:show="showEpochModal"
        preset="card" :style="{ width: '450px' }"
        :title="editingEpochId ? 'Редактировать эпоху' : 'Добавить эпоху'"
        :bordered="true"
        :closable="!isSaving"
        :mask-closable="!isSaving"
      >
           <n-spin :show="isSaving" description="Сохранение...">
              <n-form ref="epochFormRef" :model="currentEpoch" @submit.prevent="saveEpoch">
                  <n-form-item path="epoch_value" label="Ключ (epoch_value):" required>
                      <n-input v-model:value="currentEpoch.epoch_value" placeholder="например, bronze_age" />
                  </n-form-item>
                  <n-form-item path="label" label="Название (label):" required>
                      <n-input v-model:value="currentEpoch.label" placeholder="например, Бронзовый век" />
                  </n-form-item>

                   <n-alert v-if="modalError" title="Ошибка" type="error" closable @close="modalError = null" style="margin-top: 15px; margin-bottom: 15px;">
                       {{ modalError }}
                   </n-alert>

                  <n-flex justify="end" style="margin-top: 20px;">
                       <n-button @click="closeEpochModal" :disabled="isSaving">Отмена</n-button>
                       <n-button type="primary" attr-type="submit" :loading="isSaving">
                           Сохранить
                       </n-button>
                   </n-flex>
              </n-form>
          </n-spin>
      </n-modal>

      <!-- Компонент для уведомлений (нужен для useMessage) -->
      <n-message-provider>
          <content />
      </n-message-provider>
      <!-- Диалоги подтверждения (нужен для useDialog) -->
      <n-dialog-provider>
          <content />
      </n-dialog-provider>

  </n-layout>
</template>

<script setup>
// Добавляем nextTick для работы с DOM после обновления
import { ref, onMounted, onUnmounted, watch, computed, h, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
    fetchPointInfo, // Используем публичный эндпоинт для деталей
    // Функции админки
    checkAuthStatus,
    getAllPointsAdmin,
    createPointAdmin,
    updatePointAdmin,
    deletePointAdmin,
    getAllTypesAdmin,
    createTypeAdmin,
    updateTypeAdmin,
    deleteTypeAdmin,
    getAllEpochsAdmin,
    createEpochAdmin,
    updateEpochAdmin,
    deleteEpochAdmin,
    getAdminDivisionsForSelect
} from '@/components/services/api';
import {
    NLayout, NLayoutHeader, NLayoutContent, NFlex, NH3, NH4, NButton, NSpace, NSpin, NAlert,
    NTabs, NTabPane, NDataTable, NPagination, NEmpty, NIcon, NModal, NCard, NForm, NFormItemGi,
    NInput, NSelect, NInputNumber, NGrid, useMessage, useDialog, NMessageProvider, NDialogProvider
} from 'naive-ui';

const router = useRouter();
const message = useMessage(); // Для уведомлений
const dialog = useDialog(); // Для подтверждений

// --- Состояния загрузки и ошибок ---
const isLoading = ref(true); // Общая первоначальная загрузка
const isLoadingPoints = ref(false); // Загрузка списка точек (для пагинации)
const isLoadingTypes = ref(false);
const isLoadingEpochs = ref(false);
const isLoadingAdminDivisions = ref(false);
const isLoadingModalData = ref(false); // Загрузка данных для модального окна точки
const isLoadingModalMap = ref(false); // Состояние загрузки карты в модальном окне
const isSaving = ref(false); // Флаг для блокировки кнопок во время сохранения/удаления
const logoutLoading = ref(false);
const error = ref(null); // Общая ошибка загрузки
const authError = ref(null); // Ошибка аутентификации
const modalError = ref(null); // Ошибка в модальном окне

// --- Данные ---
const adminUsername = ref(null);
const currentSection = ref('points'); // Секция по умолчанию
const points = ref([]);
const types = ref([]);
const epochs = ref([]);
const adminDivisions = ref([]); // Для выпадающего списка в форме точек

// --- Состояние пагинации для точек ---
const pointsCurrentPage = ref(1);
const pointsLimit = ref(15); // Количество точек на странице
const pointsTotalPages = ref(1);
const pointsTotalItems = ref(0);

// --- Состояние модальных окон ---
const showPointModal = ref(false);
const editingPointId = ref(null);
const pointFormRef = ref(null); // Ссылка на форму точки для валидации (если нужна)
const currentPoint = ref({}); // Сброс вынесен в resetCurrentPoint

const showTypeModal = ref(false);
const editingTypeId = ref(null);
const typeFormRef = ref(null);
const currentType = ref({}); // Сброс вынесен в resetCurrentType

const showEpochModal = ref(false);
const editingEpochId = ref(null);
const epochFormRef = ref(null);
const currentEpoch = ref({}); // Сброс вынесен в resetCurrentEpoch

// --- Состояние для карты в модальном окне точки ---
const showMapInModal = ref(false); // Показать/скрыть карту
const modalMapContainerRef = ref(null); // Ссылка на div карты
// НЕ ДЕЛАЕМ ЭТИ ПЕРЕМЕННЫЕ РЕАКТИВНЫМИ, храним просто ссылки
let mapInstance = null; // Экземпляр карты (не ref)
let mapPlacemark = null; // Метка на карте (не ref)
let mapClickEventHandler = null; // Ссылка на обработчик клика карты
let placemarkDragEndEventHandler = null; // Ссылка на обработчик перетаскивания
let searchResultSelectEventHandler = null; // Ссылка на обработчик поиска

const YM_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY; // Получаем ключ API
let ymapsApiLoaded = false; // Флаг, что API загружен
let ymapsApiLoading = false; // Флаг, что API грузится


// --- Вычисляемые свойства для опций селектов ---
const typeOptions = computed(() =>
    types.value.map(t => ({ label: t.label, value: t.id }))
);
const epochOptions = computed(() =>
    epochs.value.map(e => ({ label: e.label, value: e.id }))
);
const adminDivisionOptions = computed(() =>
    adminDivisions.value.map(d => ({ label: d.name, value: d.id }))
);


// --- Функции загрузки данных ---
const checkAuth = async () => {
    // loading.value = true; // Не устанавливаем здесь, управляется loadInitialData
  authError.value = null;
    try {
        const response = await checkAuthStatus();
        adminUsername.value = response.data?.user?.username || 'Admin';
        console.log('Аутентификация подтверждена');
        return true; // Успешно
    } catch (err) {
        console.error('Ошибка проверки аутентификации:', err);
        // Ошибка 401 обработается интерцептором и вызовет редирект
        if (err.response?.status !== 401) {
             authError.value = err.response?.data?.message || err.message || 'Неизвестная ошибка проверки сессии';
        }
        return false; // Ошибка
    }
    // finally { loading.value = false; } // Не выключаем здесь
};

const loadPoints = async (page = pointsCurrentPage.value, limit = pointsLimit.value) => {
    isLoadingPoints.value = true;
    // error.value = null; // Не сбрасываем общую ошибку здесь
    try {
        const response = await getAllPointsAdmin(page, limit);
        points.value = response.data.items;
        pointsTotalItems.value = response.data.totalItems;
        pointsTotalPages.value = response.data.totalPages;
        // Убедимся, что текущая страница не больше максимальной после изменения лимита
        pointsCurrentPage.value = Math.min(response.data.currentPage, pointsTotalPages.value || 1);
    } catch (err) {
        console.error("Ошибка загрузки точек:", err);
         handleApiError(err, "точек");
    } finally {
        isLoadingPoints.value = false;
    }
};

const loadTypes = async () => {
    isLoadingTypes.value = true;
    try {
        const response = await getAllTypesAdmin();
        types.value = response.data;
    } catch (err) {
        console.error("Ошибка загрузки типов:", err);
         handleApiError(err, "типов ОАН");
    } finally {
         isLoadingTypes.value = false;
    }
};

const loadEpochs = async () => {
    isLoadingEpochs.value = true;
     try {
        const response = await getAllEpochsAdmin();
        epochs.value = response.data;
     } catch (err) {
        console.error("Ошибка загрузки эпох:", err);
         handleApiError(err, "эпох");
    } finally {
         isLoadingEpochs.value = false;
    }
};

const loadAdminDivisions = async () => {
    isLoadingAdminDivisions.value = true;
    try {
        const response = await getAdminDivisionsForSelect();
        adminDivisions.value = response.data;
    } catch (err) {
         console.error("Ошибка загрузки адм. районов:", err);
         handleApiError(err, "административных районов");
    } finally {
        isLoadingAdminDivisions.value = false;
    }
};

const handleApiError = (err, context = "данных") => {
    // Ошибки 401 обрабатываются интерцептором
    if (err.response?.status !== 401) {
        error.value = `Не удалось загрузить данные ${context}: ${err.response?.data?.message || err.message}`;
        message.error(`Ошибка загрузки ${context}`); // Показываем уведомление
    }
};

// Загрузка API Яндекс.Карт
const loadYmapsApi = () => {
    return new Promise((resolve, reject) => {
        if (ymapsApiLoaded) {
            resolve();
            return;
        }
        if (ymapsApiLoading) {
            // Если API уже грузится, ждем его загрузки
            const interval = setInterval(() => {
                if (ymapsApiLoaded) {
                    clearInterval(interval);
                    resolve();
                } else if (!ymapsApiLoading) { // Если загрузка прервалась
                    clearInterval(interval);
                    reject(new Error("Ошибка при ожидании загрузки API Яндекс.Карт"));
                }
            }, 100);
            return;
        }

        ymapsApiLoading = true;
        const script = document.createElement('script');
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YM_API_KEY}&lang=ru_RU&coordorder=longlat`;
        script.onload = () => {
            ymaps.ready(() => {
                console.log("API Яндекс.Карт загружен и готов.");
                ymapsApiLoaded = true;
                ymapsApiLoading = false;
                resolve();
            });
        };
        script.onerror = (err) => {
            console.error("Ошибка загрузки скрипта API Яндекс.Карт:", err);
            ymapsApiLoading = false;
            reject(err);
        };
        document.head.appendChild(script);
    });
};


const loadInitialData = async () => {
  isLoading.value = true;
  error.value = null; // Сброс общей ошибки
  try {
      await loadYmapsApi(); // Сначала грузим API карт
      const isAuthenticated = await checkAuth(); // Затем проверяем аутентификацию

      if (isAuthenticated) {
      try {
        // Загружаем все остальные данные параллельно
          await Promise.all([
              loadPoints(pointsCurrentPage.value, pointsLimit.value),
              loadTypes(),
              loadEpochs(),
              loadAdminDivisions()
          ]);
        } catch (err) {
          // Ошибки уже обработаны в индивидуальных функциях загрузки
          console.error("Ошибка при первоначальной загрузке зависимых данных:", err);
      }
      }
      // else { authError уже установлен в checkAuth }
  } catch(initErr) {
      console.error("Критическая ошибка при инициализации:", initErr);
      if (!authError.value) { // Показываем общую ошибку, если нет ошибки аутентификации
        error.value = "Не удалось загрузить необходимые ресурсы (API Карт или данные). Пожалуйста, обновите страницу.";
      }
  } finally {
    isLoading.value = false;
  }
};


// --- Функции управления Точками ---
const resetCurrentPoint = () => {
     currentPoint.value = {
        name: '', latitude: null, longitude: null, type_id: null, epoch_id: null,
        admin_division_id: null, short_description: '', description: ''
     };
     editingPointId.value = null;
     modalError.value = null;
      // Сбрасываем состояние карты модалки при сбросе точки
     showMapInModal.value = false;
     // destroyModalMap(); // Уничтожение происходит в @after-leave модалки
};

const openPointModal = async (pointId = null) => {
    resetCurrentPoint(); // Сбрасываем предыдущее состояние
    if (pointId) {
        editingPointId.value = pointId;
        isLoadingModalData.value = true;
        showPointModal.value = true; // Открываем модалку сразу
        try {
            const response = await fetchPointInfo(pointId);
            const data = response.data;
            // Ищем ID по label/name, т.к. fetchPointInfo возвращает label/name
            currentPoint.value = {
                name: data.name,
                latitude: data.lat,
                longitude: data.lon,
                type_id: types.value.find(t => t.label === data.type)?.id ?? null,
                epoch_id: epochs.value.find(e => e.label === data.epoch)?.id ?? null,
                admin_division_id: adminDivisions.value.find(d => d.name === data.admin_division_name)?.id ?? null,
                short_description: data.short_description || '',
                description: data.description || ''
            };
            // Важно: НЕ инициализируем карту здесь, ждем клика по кнопке
        } catch (err) {
            console.error("Ошибка загрузки точки для редактирования:", err);
            modalError.value = `Не удалось загрузить данные точки: ${err.response?.data?.message || err.message}`;
            message.error('Ошибка загрузки данных точки');
        } finally {
             isLoadingModalData.value = false;
        }
    } else {
         showPointModal.value = true; // Открываем пустую форму
    }
};

const closePointModal = () => {
    showPointModal.value = false;
};

const savePoint = async () => {
    // Валидация (простая)
    if (!currentPoint.value.name || currentPoint.value.latitude === null || currentPoint.value.longitude === null || !currentPoint.value.type_id || !currentPoint.value.epoch_id) {
        message.error("Пожалуйста, заполните все обязательные поля (Название, Координаты, Тип, Эпоха).");
        modalError.value = "Заполните обязательные поля.";
        return;
    }
    isSaving.value = true;
    modalError.value = null;
    try {
        let action = '';
        if (editingPointId.value) {
            await updatePointAdmin(editingPointId.value, currentPoint.value);
            action = 'обновлена';
        } else {
            await createPointAdmin(currentPoint.value);
            action = 'создана';
        }
        closePointModal(); // Закрываем модалку
        message.success(`Точка успешно ${action}!`);
        await loadPoints(pointsCurrentPage.value, pointsLimit.value); // Обновляем список точек
    } catch (err) {
        console.error("Ошибка сохранения точки:", err);
        modalError.value = `Ошибка: ${err.response?.data?.message || err.message}`;
        message.error('Ошибка сохранения точки');
    } finally {
        isSaving.value = false;
    }
};

// Обработчики пагинации точек
const handlePointsPageChange = (page) => {
    pointsCurrentPage.value = page;
    loadPoints(page, pointsLimit.value);
};
const handlePointsSizeChange = (size) => {
    pointsLimit.value = size;
    pointsCurrentPage.value = 1; // Сбрасываем на первую страницу
    loadPoints(1, size);
};

// --- Функции для карты в модальном окне точки ---

const toggleMapInModal = async () => {
    showMapInModal.value = !showMapInModal.value;
    // Если показываем карту
    if (showMapInModal.value) {
        // Ждем следующего тика Vue, чтобы контейнер карты появился в DOM
        await nextTick();
        mapInstance = null;
        initModalMap(); // Инициализируем, если нет
    }
    // Если скрываем карту (showMapInModal.value стало false), уничтожение произойдет в destroyModalMap
};

const initModalMap = async () => {
    // Убедимся, что API загружен
    if (!ymapsApiLoaded) {
        try {
            isLoadingModalMap.value = true;
            await loadYmapsApi(); // Пытаемся загрузить API, если его нет
        } catch (apiErr) {
            isLoadingModalMap.value = false;
            message.error("Не удалось загрузить API Карт для отображения.");
            showMapInModal.value = false; // Скрываем блок карты
            return;
        }
    }

    // Проверяем наличие контейнера
    if (!modalMapContainerRef.value) {
        console.error("Контейнер для карты в модалке не найден!");
        return;
    }

    isLoadingModalMap.value = true;

    // Используем ymaps.ready для гарантии готовности API
    try {
        await ymaps.ready(); // Ждем готовности API

        const defaultCoords = [34.36, 45.15]; // Центр Крыма
        const hasCurrentCoords = currentPoint.value.latitude != null && currentPoint.value.longitude != null;
        const initialCoords = hasCurrentCoords
            ? [currentPoint.value.longitude, currentPoint.value.latitude]
            : defaultCoords;
        const initialZoom = hasCurrentCoords ? 15 : 8;

        // Уничтожаем предыдущий экземпляр, если он остался (на всякий случай)
        destroyModalMap();

        // Создаем карту, сохраняем ссылку в НЕреактивную переменную
        mapInstance = new ymaps.Map(modalMapContainerRef.value, {
            center: initialCoords,
            zoom: initialZoom,
        });

        // Создаем метку, сохраняем ссылку в НЕреактивную переменную
        mapPlacemark = new ymaps.Placemark(initialCoords, {}, {
            preset: 'islands#redDotIcon',
            draggable: true
        });

        mapInstance.geoObjects.add(mapPlacemark);

        // Сохраняем ссылки на обработчики, чтобы можно было их удалить
        mapClickEventHandler = (e) => handleModalMapClick(e);
        placemarkDragEndEventHandler = (e) => {
             const coords = mapPlacemark.geometry.getCoordinates();
             handleModalMapClick({ get: (key) => (key === 'coords' ? coords : null) });
         };
        searchResultSelectEventHandler = (e) => {
            const index = e.get('index');
            mapInstance.controls.get('searchControl').getResult(index).then((geoObject) => {
                 const coords = geoObject.geometry.getCoordinates();
                 mapInstance?.panTo(coords, { flying: true });
                 handleModalMapClick({ get: (key) => (key === 'coords' ? coords : null) });
             });
         };

        // Добавляем обработчики
        mapInstance.events.add('click', mapClickEventHandler);
        mapPlacemark.events.add('dragend', placemarkDragEndEventHandler);
        mapInstance.controls.get('searchControl').events.add('resultselect', searchResultSelectEventHandler);

        console.log("Карта в модалке инициализирована.");

    } catch (mapError) {
        console.error("Ошибка инициализации карты в модалке:", mapError);
        message.error("Ошибка при создании карты в модальном окне.");
        showMapInModal.value = false;
        destroyModalMap(); // Попытка очистки в случае ошибки
    } finally {
      isLoadingModalMap.value = false;
    }
};


const handleModalMapClick = (e) => {
    const coords = e.get('coords');
    if (coords) {
        const [lon, lat] = coords;
        // Обновляем РЕАКТИВНЫЕ переменные Vue
        currentPoint.value.latitude = parseFloat(lat.toFixed(6));
        currentPoint.value.longitude = parseFloat(lon.toFixed(6));
        // Обновляем положение НЕреактивной метки через API
        if (mapPlacemark) {
            mapPlacemark.geometry.setCoordinates(coords);
        }
        // message.success(`Координаты установлены: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    }
};

// Уничтожение карты в модальном окне
const destroyModalMap = () => {
    // Удаляем обработчики событий перед уничтожением карты
    try {
        if (mapInstance) {
             if(mapClickEventHandler) mapInstance.events.remove('click', mapClickEventHandler);
             const searchControl = mapInstance.controls.get('searchControl');
             if(searchControl && searchResultSelectEventHandler) searchControl.events.remove('resultselect', searchResultSelectEventHandler);
             mapInstance.destroy(); // Уничтожаем карту
        }
         if (mapPlacemark && placemarkDragEndEventHandler) {
            // Placemark удаляется вместе с картой, но можно очистить обработчик
            mapPlacemark.events.remove('dragend', placemarkDragEndEventHandler);
         }
    } catch (e) {
        console.error("Ошибка при удалении обработчиков или уничтожении карты:", e);
    } finally {
        // Сбрасываем ссылки
        mapInstance = null;
        mapPlacemark = null;
        mapClickEventHandler = null;
        placemarkDragEndEventHandler = null;
        searchResultSelectEventHandler = null;
        // Не меняем showMapInModal здесь, это управляется извне
        console.log("Ресурсы карты в модалке очищены.");
    }
};


// --- Функции управления Типами ---
const resetCurrentType = () => {
     currentType.value = { type_value: '', label: '' };
     editingTypeId.value = null;
     modalError.value = null;
};

const openTypeModal = (type = null) => {
    resetCurrentType();
    if (type) {
        editingTypeId.value = type.id;
        // Важно: создаем копию объекта, чтобы изменения не затрагивали таблицу сразу
        currentType.value = { id: type.id, type_value: type.type_value, label: type.label };
    }
     showTypeModal.value = true;
};

const closeTypeModal = () => {
    showTypeModal.value = false;
};

 const saveType = async () => {
     if (!currentType.value.type_value || !currentType.value.label) {
         message.error("Поля 'Ключ' и 'Название' обязательны.");
         modalError.value = "Заполните обязательные поля.";
         return;
     }
    isSaving.value = true;
    modalError.value = null;
    try {
        let action = '';
        if (editingTypeId.value) {
            await updateTypeAdmin(editingTypeId.value, { type_value: currentType.value.type_value, label: currentType.value.label });
             action = 'обновлен';
        } else {
            await createTypeAdmin({ type_value: currentType.value.type_value, label: currentType.value.label });
            action = 'создан';
        }
        closeTypeModal();
        message.success(`Тип ОАН успешно ${action}!`);
        await loadTypes();
        // Типы используются в селекте точек, перезагрузим админ районы тоже (на всякий случай)
        // await loadAdminDivisions();
        // И перезагрузим точки, чтобы обновить отображение типа в таблице
        await loadPoints(pointsCurrentPage.value, pointsLimit.value);

    } catch (err) {
        console.error("Ошибка сохранения типа:", err);
         modalError.value = `Ошибка: ${err.response?.data?.message || err.message}`;
         message.error('Ошибка сохранения типа ОАН');
    } finally {
        isSaving.value = false;
    }
};

// --- Функции управления Эпохами ---
  const resetCurrentEpoch = () => {
     currentEpoch.value = { epoch_value: '', label: '' };
     editingEpochId.value = null;
     modalError.value = null;
};

const openEpochModal = (epoch = null) => {
    resetCurrentEpoch();
    if (epoch) {
        editingEpochId.value = epoch.id;
        // Копия объекта
        currentEpoch.value = { id: epoch.id, epoch_value: epoch.epoch_value, label: epoch.label };
    }
     showEpochModal.value = true;
};

 const closeEpochModal = () => {
    showEpochModal.value = false;
};

 const saveEpoch = async () => {
      if (!currentEpoch.value.epoch_value || !currentEpoch.value.label) {
         message.error("Поля 'Ключ' и 'Название' обязательны.");
         modalError.value = "Заполните обязательные поля.";
         return;
     }
    isSaving.value = true;
     modalError.value = null;
    try {
         let action = '';
        if (editingEpochId.value) {
            await updateEpochAdmin(editingEpochId.value, { epoch_value: currentEpoch.value.epoch_value, label: currentEpoch.value.label });
            action = 'обновлена';
        } else {
            await createEpochAdmin({ epoch_value: currentEpoch.value.epoch_value, label: currentEpoch.value.label });
            action = 'создана';
        }
        closeEpochModal();
         message.success(`Эпоха успешно ${action}!`);
        await loadEpochs();
        await loadPoints(pointsCurrentPage.value, pointsLimit.value);
    } catch (err) {
        console.error("Ошибка сохранения эпохи:", err);
        modalError.value = `Ошибка: ${err.response?.data?.message || err.message}`;
        message.error('Ошибка сохранения эпохи');
    } finally {
        isSaving.value = false;
    }
};

// --- Функция удаления (общая с подтверждением) ---
const confirmDelete = (itemType, itemId) => {
     let itemName = '';
     let deleteFunction = null;
     let itemTypeName = '';

     if (itemType === 'point') {
         const point = points.value.find(p => p.id === itemId);
         itemName = point ? `точку "${point.name}" (ID: ${itemId})` : `элемент с ID ${itemId}`;
         deleteFunction = deletePointAdmin;
         itemTypeName = 'точки';
     } else if (itemType === 'type') {
          const type = types.value.find(t => t.id === itemId);
          itemName = type ? `тип "${type.label}" (ID: ${itemId})` : `элемент с ID ${itemId}`;
          deleteFunction = deleteTypeAdmin;
          itemTypeName = 'типа ОАН';
     } else if (itemType === 'epoch') {
         const epoch = epochs.value.find(e => e.id === itemId);
         itemName = epoch ? `эпоху "${epoch.label}" (ID: ${itemId})` : `элемент с ID ${itemId}`;
         deleteFunction = deleteEpochAdmin;
          itemTypeName = 'эпохи';
     } else {
         return;
     }

    dialog.warning({
        title: 'Подтверждение удаления',
        content: `Вы уверены, что хотите удалить ${itemName}? Это действие необратимо.`,
        positiveText: 'Удалить',
        negativeText: 'Отмена',
        onPositiveClick: async () => {
            isSaving.value = true; // Блокируем кнопки
            // error.value = null; // Сбрасываем общую ошибку
            try {
                await deleteFunction(itemId);
                message.success(`${itemName.charAt(0).toUpperCase() + itemName.slice(1)} успешно удален(а).`);

                // После удаления перезагружаем соответствующий список
                if (itemType === 'point') {
                    // Проверяем, нужно ли сдвинуть страницу назад
                    const newTotalItems = pointsTotalItems.value - 1;
                     const newTotalPages = Math.ceil(newTotalItems / pointsLimit.value);
                     let pageToLoad = pointsCurrentPage.value;
                     if (points.value.length === 1 && pointsCurrentPage.value > 1 && pointsCurrentPage.value > newTotalPages) {
                        pageToLoad = pointsCurrentPage.value - 1;
                     }
                    await loadPoints(pageToLoad, pointsLimit.value);
                } else if (itemType === 'type') {
                    await loadTypes();
                    await loadPoints(pointsCurrentPage.value, pointsLimit.value);
                } else if (itemType === 'epoch') {
                    await loadEpochs();
                    await loadPoints(pointsCurrentPage.value, pointsLimit.value);
                }
            } catch (err) {
                console.error(`Ошибка удаления ${itemTypeName}:`, err);
                // error.value = `Не удалось удалить ${itemName}: ${err.response?.data?.message || err.message}`;
                message.error(`Ошибка удаления ${itemTypeName}: ${err.response?.data?.message || err.message}`);
            } finally {
                 isSaving.value = false;
            }
        },
        onNegativeClick: () => {
             message.info('Удаление отменено');
        }
    });
};

// --- Таблицы ---
// Генерация кнопок действий для таблиц
const renderActions = (row, itemType) => {
      return h(NSpace, { size: 'small', justify: 'center' }, () => [
        h( NButton, { size: 'tiny', type: 'warning', ghost: true, disabled: isSaving.value, onClick: () => { if (itemType === 'point') openPointModal(row.id); else if (itemType === 'type') openTypeModal(row); else if (itemType === 'epoch') openEpochModal(row); }, }, { default: () => 'Ред.' } ),
        h( NButton, { size: 'tiny', type: 'error', ghost: true, disabled: isSaving.value, onClick: () => confirmDelete(itemType, row.id), }, { default: () => 'Удал.' } ),
      ]);
    };
// Колонки для таблицы точек
const pointColumns = [
    { title: 'ID', key: 'id', width: 60, sorter: 'default' },
    { title: 'Название', key: 'name', resizable: true, ellipsis: { tooltip: true }, sorter: 'default' },
    { title: 'Тип', key: 'type.label', width: 150, ellipsis: { tooltip: true }, sorter: (a, b) => (a.type?.label ?? '').localeCompare(b.type?.label ?? '') },
    { title: 'Эпоха', key: 'epoch.label', width: 150, ellipsis: { tooltip: true }, sorter: (a, b) => (a.epoch?.label ?? '').localeCompare(b.epoch?.label ?? '') },
    { title: 'Район', key: 'admin_division.name', width: 180, ellipsis: { tooltip: true }, sorter: (a, b) => (a.admin_division?.name ?? '').localeCompare(b.admin_division?.name ?? '') },
    { title: 'Координаты', key: 'coords', width: 150, render: (row) => `${row.latitude?.toFixed(5)}, ${row.longitude?.toFixed(5)}` },
    { title: 'Действия', key: 'actions', width: 100, align: 'center', render: (row) => renderActions(row, 'point') }, ];
// Колонки для таблицы типов
const typeColumns = [
    { title: 'ID', key: 'id', width: 60, sorter: 'default' },
    { title: 'Ключ (type_value)', key: 'type_value', resizable: true, sorter: 'default' },
    { title: 'Название (label)', key: 'label', resizable: true, ellipsis: { tooltip: true }, sorter: 'default' },
    { title: 'Действия', key: 'actions', width: 100, align: 'center', render: (row) => renderActions(row, 'type') }, ];
// Колонки для таблицы эпох
const epochColumns = [
    { title: 'ID', key: 'id', width: 60, sorter: 'default' },
    { title: 'Ключ (epoch_value)', key: 'epoch_value', resizable: true, sorter: 'default' },
    { title: 'Название (label)', key: 'label', resizable: true, ellipsis: { tooltip: true }, sorter: 'default' },
    { title: 'Действия', key: 'actions', width: 100, align: 'center', render: (row) => renderActions(row, 'epoch') }, ];


// --- Жизненный цикл и навигация ---
const handleLogout = () => {
    logoutLoading.value = true;
    localStorage.removeItem('authToken');
    router.push({ name: 'login' }).finally(() => {
        logoutLoading.value = false;
    });
};

// Обработка смены вкладки (на будущее, если понадобится загружать что-то по требованию)
const handleTabChange = (tabName) => {
  console.log('Переключено на вкладку:', tabName);
};

onMounted(() => {
    loadInitialData(); // Загружаем API карт и основные данные
});

onUnmounted(() => {
    // Гарантированная очистка карты при уничтожении компонента (на всякий случай)
    destroyModalMap();
});

</script>

<style scoped>
/* Добавляем немного стилей для улучшения вида */
.admin-section {
  margin-top: 10px; /* Уменьшаем отступ сверху, т.к. есть отступ у табов */
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.n-data-table {
    margin-bottom: 20px;
}

.n-form-item-gi {
    padding-bottom: 5px; /* Немного места между полями формы */
}

.n-layout-content {
    background-color: #f8f9fa; /* Легкий фон для контента */
    min-height: calc(100vh - 60px); /* Вычитаем высоту хедера */
}

/* Убираем лишний отступ у n-flex внутри form-item */
.n-form-item-gi .n-flex {
    width: 100%;
}

/* Стили для контейнера карты в модалке, чтобы спиннер был по центру */
[ref="modalMapContainerRef"] {
    position: relative;
}

</style>