<template>
    <!-- Оборачиваем весь контент в провайдеры Naive UI один раз -->
    <n-message-provider>
        <n-dialog-provider>
            <n-layout style="min-height: 100vh">
                <!-- Используем компонент AdminHeader -->
                <AdminHeader :username="adminUsername" :logout-loading="logoutLoading" @logout="handleLogout" />

                <n-layout-content content-style="padding: 20px;">
                    <!-- Сообщение об ошибке аутентификации -->
                    <div v-if="authError" style="margin-bottom: 20px;">
                        <n-alert title="Ошибка аутентификации" type="error" closable @close="authError = null">
                            Не удалось подтвердить вашу сессию. Пожалуйста,
                            <router-link :to="{ name: 'login' }">войдите</router-link> снова.
                            <br> {{ authError }}
                        </n-alert>
                    </div>

                    <!-- Общая ошибка загрузки данных (не аутентификации) -->
                    <div v-if="initialError && !authError" style="margin-bottom: 20px;">
                        <n-alert title="Ошибка" type="error" closable @close="initialError = null">
                            {{ initialError }}
                        </n-alert>
                    </div>

                    <!-- Спиннер для первоначальной загрузки общих данных -->
                    <n-spin :show="isInitialLoading" description="Первоначальная загрузка...">
                        <div v-if="!isInitialLoading && !authError">
                            <!-- Используем вкладки для навигации -->
                            <n-tabs type="line" animated v-model:value="currentSection" @update:value="handleTabChange">
                                <!-- Вкладка Точки -->
                                <n-tab-pane name="points" tab="Точки">
                                    <!-- Компонент управления точками -->
                                    <PointManagement :types="types" :epochs="epochs" />
                                </n-tab-pane>

                                <!-- Вкладка Типы ОАН -->
                                <n-tab-pane name="types" tab="Типы ОАН">
                                    <!-- Компонент управления типами -->
                                    <TypeManagement :initial-types="types" @types-updated="updateTypes" />
                                </n-tab-pane>

                                <!-- Вкладка Эпохи -->
                                <n-tab-pane name="epochs" tab="Эпохи">
                                    <!-- Компонент управления эпохами -->
                                    <EpochManagement :initial-epochs="epochs" @epochs-updated="updateEpochs" />
                                </n-tab-pane>
                            </n-tabs>
                        </div>
                        <!-- Сообщение если загрузка прошла, но есть ошибка аутентификации -->
                        <div v-else-if="!isInitialLoading && authError" style="margin-top: 20px;">
                            <!-- Ошибка аутентификации уже показана выше -->
                            <n-text depth="3">Доступ к панели администратора запрещен.</n-text>
                        </div>
                    </n-spin>

                </n-layout-content>
            </n-layout>
        </n-dialog-provider>
    </n-message-provider>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
    NLayout, NLayoutContent, NSpin, NAlert, NTabs, NTabPane, NMessageProvider, NDialogProvider, useMessage, NText
} from 'naive-ui';
// Импортируем API функции
import {
    checkAuthStatus,
    getAllTypesAdmin,
    getAllEpochsAdmin,
    // getAdminDivisionsForSelect // Если нужно
} from '@/components/services/api';
// Импортируем новые компоненты
import AdminHeader from '@/components/admin/AdminHeader.vue';
import PointManagement from '@/components/admin/points/PointManagement.vue';
import TypeManagement from '@/components/admin/types/TypeManagement.vue';
import EpochManagement from '@/components/admin/epochs/EpochManagement.vue';
// Импортируем утилиту для загрузки API карт (если она нужна здесь)
import { loadYmapsApi } from '@/components/admin/utils/mapUtils.js';


const router = useRouter();
// useMessage и useDialog теперь должны использоваться ВНУТРИ дочерних компонентов,
// так как они требуют контекста провайдеров.

// --- Глобальные состояния админки ---
const isInitialLoading = ref(true); // Первоначальная загрузка общих данных (auth, types, epochs)
const initialError = ref(null); // Ошибка первоначальной загрузки
const authError = ref(null); // Ошибка аутентификации
const adminUsername = ref(null);
const logoutLoading = ref(false);
const currentSection = ref('points'); // Текущая активная вкладка

// --- Общие данные для дочерних компонентов ---
const types = ref([]);
const epochs = ref([]);
// const adminDivisions = ref([]); // Если нужны

// --- Функции ---

// Проверка аутентификации
const checkAuth = async () => {
    authError.value = null;
    try {
        const response = await checkAuthStatus();
        adminUsername.value = response.data?.user?.username || 'Admin';
        console.log('Аутентификация подтверждена');
        return true; // Успешно
    } catch (err) {
        console.error('Ошибка проверки аутентификации:', err);
        if (err.response?.status !== 401) { // 401 обрабатывается интерцептором
            authError.value = err.response?.data?.message || err.message || 'Неизвестная ошибка проверки сессии';
        } else {
            // Сообщение об ошибке 401 не показываем здесь, т.к. будет редирект
            authError.value = 'Сессия недействительна или истекла.'; // Можно добавить для ясности
        }
        return false; // Ошибка
    }
};

// Загрузка общих данных (типы, эпохи и т.д.)
const loadCommonData = async () => {
    try {
        // Загружаем параллельно
        const [typesResponse, epochsResponse, /* adminDivResponse */] = await Promise.all([
            getAllTypesAdmin(),
            getAllEpochsAdmin(),
            // getAdminDivisionsForSelect()
            // Загрузка API карт, если она нужна глобально
            loadYmapsApi().catch(err => { console.error("Ошибка загрузки API Карт при инициализации:", err); return null; }), // Обрабатываем ошибку загрузки API
        ]);
        types.value = typesResponse.data;
        epochs.value = epochsResponse.data;
        // adminDivisions.value = adminDivResponse.data;
        console.log('Общие данные (типы, эпохи) загружены.');
    } catch (err) {
        console.error("Ошибка при загрузке общих данных:", err);
        // Отображаем ошибку, если это не ошибка аутентификации
        if (!authError.value) {
            initialError.value = `Не удалось загрузить общие данные: ${err.response?.data?.message || err.message}`;
        }
        // Пробрасываем ошибку дальше, чтобы остановить initial loading
        throw err;
    }
};


// Первоначальная загрузка всего необходимого
const initializeAdminPanel = async () => {
    isInitialLoading.value = true;
    initialError.value = null;
    authError.value = null; // Сбрасываем ошибки перед загрузкой

    const isAuthenticated = await checkAuth();

    if (isAuthenticated) {
        try {
            // Загружаем общие данные ПОСЛЕ успешной аутентификации
            await loadCommonData();
            // Загрузка данных для конкретных секций (точек) теперь будет происходить
            // внутри компонента PointManagement при его монтировании.
        } catch (commonDataErr) {
            // Ошибка уже обработана в loadCommonData и установлена в initialError
        }
    }
    // else: authError уже установлен в checkAuth, загрузка данных не начнется

    isInitialLoading.value = false;
};

// Обработчик выхода
const handleLogout = () => {
    logoutLoading.value = true;
    localStorage.removeItem('authToken');
    router.push({ name: 'login' }).finally(() => {
        logoutLoading.value = false;
    });
};

// Обработчик смены вкладки (пока не используется, но может пригодиться)
const handleTabChange = (tabName) => {
    console.log('Переключено на вкладку:', tabName);
    // Можно добавить логику, если нужно что-то делать при смене вкладки
};

// Функции для обновления данных от дочерних компонентов
const updateTypes = (updatedTypes) => {
    types.value = updatedTypes;
    console.log('Типы обновлены в родителе');
};
const updateEpochs = (updatedEpochs) => {
    epochs.value = updatedEpochs;
    console.log('Эпохи обновлены в родителе');
};


// --- Жизненный цикл ---
onMounted(() => {
    initializeAdminPanel();
});

</script>

<style scoped>
.n-layout-content {
    background-color: #f8f9fa;
    /* Легкий фон для контента */
    min-height: calc(100vh - 60px);
    /* Вычитаем высоту хедера */
}
</style>