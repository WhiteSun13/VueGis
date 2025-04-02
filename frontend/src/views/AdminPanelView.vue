<template>
    <!-- Оборачиваем весь контент в провайдеры Naive UI один раз -->
    <n-message-provider>
        <n-dialog-provider>
            <n-layout style="min-height: 100vh">
                <!-- Используем компонент AdminHeader -->
                <AdminHeader :username="adminUsername" :logout-loading="logoutLoading" @logout="handleLogout" />

                <n-layout-content content-style="padding: 20px;">
                    <!-- Сообщения об ошибках -->
                    <!-- Ошибка аутентификации -->
                    <div v-if="authError" style="margin-bottom: 20px;">
                        <n-alert title="Ошибка аутентификации" type="error" closable @close="authError = null">
                            Не удалось подтвердить вашу сессию. Пожалуйста,
                            <router-link :to="{ name: 'login' }">войдите</router-link> снова.
                            <br> {{ authError }}
                        </n-alert>
                    </div>
                    <!-- Общая ошибка загрузки данных -->
                    <div v-if="initialError && !authError" style="margin-bottom: 20px;">
                        <n-alert title="Ошибка" type="error" closable @close="initialError = null">
                            {{ initialError }}
                        </n-alert>
                    </div>

                    <!-- Спиннер для первоначальной загрузки -->
                    <n-spin :show="isInitialLoading" description="Первоначальная загрузка...">
                        <!-- Основной контент после загрузки и без ошибок аутентификации -->
                        <div v-if="!isInitialLoading && !authError">
                            <!-- Используем вкладки для навигации -->
                            <n-tabs type="line" animated v-model:value="currentSection" @update:value="handleTabChange">
                                <!-- Вкладка Точки -->
                                <n-tab-pane name="points" tab="Точки">
                                    <!-- Компонент управления точками -->
                                    <!-- Передаем типы и эпохи, загруженные в этом компоненте -->
                                    <PointManagement :types="types" :epochs="epochs" />
                                </n-tab-pane>

                                <!-- Вкладка Типы ОАН -->
                                <n-tab-pane name="types" tab="Типы ОАН">
                                    <!-- Компонент управления типами -->
                                    <!-- Передаем начальные типы и слушаем событие обновления -->
                                    <TypeManagement :initial-types="types" @types-updated="updateTypes" />
                                </n-tab-pane>

                                <!-- Вкладка Эпохи -->
                                <n-tab-pane name="epochs" tab="Эпохи">
                                    <!-- Компонент управления эпохами -->
                                    <!-- Передаем начальные эпохи и слушаем событие обновления -->
                                    <EpochManagement :initial-epochs="epochs" @epochs-updated="updateEpochs" />
                                </n-tab-pane>

                                <!-- === ВКЛАДКА: Документы === -->
                                <n-tab-pane name="documents" tab="Документы">
                                    <!-- Компонент управления документами -->
                                    <!-- Этому компоненту не нужны типы/эпохи -->
                                    <DocumentManagement />
                                </n-tab-pane>
                                <!-- ======================== -->
                            </n-tabs>
                        </div>
                        <!-- Сообщение, если загрузка прошла, но есть ошибка аутентификации -->
                        <div v-else-if="!isInitialLoading && authError" style="margin-top: 20px;">
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
    NLayout, NLayoutContent, NSpin, NAlert, NTabs, NTabPane, NMessageProvider, NDialogProvider, NText
} from 'naive-ui';
// Импортируем API функции
import {
    checkAuthStatus,
    getAllTypesAdmin,
    getAllEpochsAdmin,
    // getAdminDivisionsForSelect // Раскомментировать, если нужно
} from '@/components/services/api';
// Импортируем компоненты управления
import AdminHeader from '@/components/admin/AdminHeader.vue';
import PointManagement from '@/components/admin/points/PointManagement.vue';
import TypeManagement from '@/components/admin/types/TypeManagement.vue';
import EpochManagement from '@/components/admin/epochs/EpochManagement.vue';
import DocumentManagement from '@/components/admin/documents/DocumentManagement.vue'; // Импортируем компонент документов
// Импортируем утилиту для загрузки API карт (если она нужна глобально)
import { loadYmapsApi } from '@/components/admin/utils/mapUtils.js';

const router = useRouter();
// useMessage и useDialog теперь должны использоваться ВНУТРИ дочерних компонентов,
// так как они требуют контекста провайдеров.

// --- Глобальные состояния админки ---
const isInitialLoading = ref(true); // Первоначальная загрузка общих данных
const initialError = ref(null); // Ошибка первоначальной загрузки (не аутентификации)
const authError = ref(null); // Ошибка аутентификации
const adminUsername = ref(null); // Имя пользователя
const logoutLoading = ref(false); // Состояние загрузки кнопки выхода
const currentSection = ref('points'); // Текущая активная вкладка, начинаем с 'points'

// --- Общие данные для дочерних компонентов ---
// Эти данные загружаются один раз и передаются в дочерние компоненты
const types = ref([]); // Список типов ОАН
const epochs = ref([]); // Список эпох
// const adminDivisions = ref([]); // Список админ. делений (если нужен)

// --- Функции ---

// Проверка статуса аутентификации пользователя
const checkAuth = async () => {
    authError.value = null; // Сбрасываем ошибку перед проверкой
    try {
        const response = await checkAuthStatus();
        // Сохраняем имя пользователя из ответа API
        adminUsername.value = response.data?.user?.username || 'Admin';
        console.log('Аутентификация подтверждена');
        return true; // Успех
    } catch (err) {
        console.error('Ошибка проверки аутентификации:', err);
        // 401 обрабатывается интерцептором, который редиректит на логин
        if (err.response?.status !== 401) {
            // Отображаем другие ошибки (например, сервер недоступен)
            authError.value = err.response?.data?.message || err.message || 'Неизвестная ошибка проверки сессии';
        } else {
            authError.value = 'Сессия недействительна или истекла.'; // Дополнительное сообщение
        }
        return false; // Ошибка
    }
};

// Загрузка общих данных, необходимых для разных разделов (типы, эпохи)
const loadCommonData = async () => {
    try {
        // Загружаем параллельно типы, эпохи и API карт
        const [typesResponse, epochsResponse, /* adminDivResponse */] = await Promise.all([
            getAllTypesAdmin(),
            getAllEpochsAdmin(),
            // getAdminDivisionsForSelect(), // Раскомментировать, если нужно
            // Загружаем API карт, обрабатываем возможную ошибку
            loadYmapsApi().catch(err => {
                console.error("Ошибка загрузки API Карт при инициализации:", err);
                // Не прерываем загрузку из-за ошибки карт, но можно показать уведомление
                // initialError.value = "Не удалось загрузить API Карт. Функционал карты может быть недоступен.";
                return null; // Возвращаем null, чтобы Promise.all не упал
            }),
        ]);
        // Сохраняем полученные данные в реактивные переменные
        // Добавляем проверку || [], чтобы избежать ошибок, если API вернет не массив
        types.value = typesResponse.data || [];
        epochs.value = epochsResponse.data || [];
        // adminDivisions.value = adminDivResponse.data || [];
        console.log('Общие данные (типы, эпохи) загружены.');
    } catch (err) {
        console.error("Ошибка при загрузке общих данных:", err);
        // Устанавливаем ошибку initialError, если это не ошибка аутентификации
        if (!authError.value) {
            initialError.value = `Не удалось загрузить общие данные: ${err.response?.data?.message || err.message}`;
        }
        // Пробрасываем ошибку дальше, чтобы прервать выполнение initializeAdminPanel
        throw err;
    }
};

// Инициализация панели администратора: проверка аутентификации и загрузка данных
const initializeAdminPanel = async () => {
    isInitialLoading.value = true; // Начинаем загрузку
    initialError.value = null; // Сбрасываем ошибки
    authError.value = null;

    // Сначала проверяем аутентификацию
    const isAuthenticated = await checkAuth();

    // Если пользователь аутентифицирован, загружаем общие данные
    if (isAuthenticated) {
        try {
            // Загружаем общие данные ПОСЛЕ успешной аутентификации
            await loadCommonData();
            // Данные для конкретных вкладок (например, точки, документы) загружаются
            // внутри соответствующих компонентов при их активации/монтировании.
        } catch (commonDataErr) {
            // Ошибка загрузки общих данных уже обработана в loadCommonData
            // и установлена в initialError.
            console.error("Загрузка общих данных не удалась.");
        }
    }
    // Если не аутентифицирован, authError уже установлен, загрузка данных не начнется.

    isInitialLoading.value = false; // Завершаем индикатор загрузки
};

// Обработчик выхода пользователя
const handleLogout = () => {
    logoutLoading.value = true; // Показываем загрузку на кнопке
    localStorage.removeItem('authToken'); // Удаляем токен
    // Перенаправляем на страницу входа
    router.push({ name: 'login' }).finally(() => {
        logoutLoading.value = false; // Снимаем загрузку
    });
};

// Обработчик смены вкладки (можно добавить логику по необходимости)
const handleTabChange = (tabName) => {
    console.log('Переключено на вкладку:', tabName);
    // Например, можно было бы здесь загружать данные для выбранной вкладки,
    // но сейчас загрузка происходит внутри компонентов вкладок.
};

// Функции для обновления списков типов/эпох от дочерних компонентов
// Это позволяет родительскому компоненту иметь актуальные данные,
// если они понадобятся для других дочерних компонентов (например, PointManagement).
const updateTypes = (updatedTypes) => {
    types.value = updatedTypes;
    console.log('Список типов обновлен в AdminPanelView');
};
const updateEpochs = (updatedEpochs) => {
    epochs.value = updatedEpochs;
    console.log('Список эпох обновлен в AdminPanelView');
};


// --- Жизненный цикл ---
// Выполняем инициализацию при монтировании компонента
onMounted(() => {
    initializeAdminPanel();
});

</script>

<style scoped>
.n-layout-content {
    background-color: #f8f9fa;
    /* Легкий фон для контента */
    min-height: calc(100vh - 60px);
    /* Вычитаем примерную высоту хедера */
}

/* Дополнительные стили, если нужны */
.n-tabs .n-tab-pane {
    padding-top: 10px;
    /* Небольшой отступ сверху для контента вкладок */
}
</style>