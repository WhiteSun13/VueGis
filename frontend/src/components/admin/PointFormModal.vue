<template>
    <!-- Модальное окно для Точек -->
    <n-modal v-model:show="showModal" preset="card" :style="{ width: '700px' }" :title="modalTitle" :bordered="true"
        :closable="!isSaving && !isLoadingData" :mask-closable="!isSaving && !isLoadingData" @update:show="handleClose"
        @after-leave="handleAfterLeave">
        <!-- Спиннер для загрузки данных точки или сохранения -->
        <n-spin :show="isLoadingData || isSaving" :description="spinDescription">
            <!-- Форма добавления/редактирования точки -->
            <n-form ref="pointFormRef" :model="formData" @submit.prevent="handleSubmit">
                <n-grid :cols="2" :x-gap="15">
                    <!-- Поле Название -->
                    <n-form-item-gi :span="2" path="name" label="Название:" required
                        :rule="{ required: true, message: 'Название обязательно', trigger: ['input', 'blur'] }">
                        <n-input v-model:value="formData.name" placeholder="Введите название точки"
                            :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Широта -->
                    <n-form-item-gi path="latitude" label="Широта:" required
                        :rule="{ required: true, type: 'number', message: 'Широта обязательна', trigger: ['input', 'blur'] }">
                        <n-input-number v-model:value="formData.latitude" step="any" placeholder="Например, 45.12345"
                            style="width: 100%;" :disabled="isSaving" @update:value="onCoordInputChange" />
                    </n-form-item-gi>

                    <!-- Поле Долгота и кнопка карты -->
                    <n-form-item-gi path="longitude" label="Долгота:" required
                        :rule="{ required: true, type: 'number', message: 'Долгота обязательна', trigger: ['input', 'blur'] }">
                        <n-flex>
                            <n-input-number v-model:value="formData.longitude" step="any"
                                placeholder="Например, 34.56789" style="flex-grow: 1;" :disabled="isSaving"
                                @update:value="onCoordInputChange" />
                            <n-button @click="toggleMap" type="default" ghost title="Показать/скрыть карту"
                                :disabled="isSaving">
                                <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                            <path fill="currentColor"
                                                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5" />
                                        </svg></n-icon></template>
                            </n-button>
                        </n-flex>
                    </n-form-item-gi>

                    <!-- Карта в модальном окне (используем реф из mapUtils) -->
                    <n-form-item-gi :span="2" v-if="showMapInModalState">
                        <div ref="modalMapContainer"
                            style="width: 100%; height: 300px; border: 1px solid #ccc; margin-top: 10px; position: relative;">
                            <!-- Спиннер для загрузки карты -->
                            <n-spin :show="isLoadingModalMapState" description="Загрузка карты..." size="large"
                                style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,255,255,0.8); padding: 10px; border-radius: 4px; z-index: 1;" />
                        </div>
                    </n-form-item-gi>

                    <!-- Поле Тип -->
                    <n-form-item-gi path="type_id" label="Тип:" required
                        :rule="{ required: true, type: 'number', message: 'Тип обязателен', trigger: ['change', 'blur'] }">
                        <n-select v-model:value="formData.type_id" placeholder="Выберите тип ОАН" :options="typeOptions"
                            filterable :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Эпоха -->
                    <n-form-item-gi path="epoch_id" label="Эпоха:" required
                        :rule="{ required: true, type: 'number', message: 'Эпоха обязательна', trigger: ['change', 'blur'] }">
                        <n-select v-model:value="formData.epoch_id" placeholder="Выберите эпоху" :options="epochOptions"
                            filterable :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Краткое описание -->
                    <n-form-item-gi :span="2" path="short_description" label="Краткое описание:">
                        <n-input type="textarea" v-model:value="formData.short_description"
                            placeholder="Введите краткое описание" :autosize="{ minRows: 2, maxRows: 4 }"
                            :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Полное описание -->
                    <n-form-item-gi :span="2" path="description" label="Полное описание:">
                        <n-input type="textarea" v-model:value="formData.description"
                            placeholder="Введите полное описание" :autosize="{ minRows: 4, maxRows: 10 }"
                            :disabled="isSaving" />
                    </n-form-item-gi>
                </n-grid>

                <!-- Отображение ошибки -->
                <n-alert v-if="modalError" title="Ошибка" type="error" closable @close="modalError = null"
                    style="margin-top: 15px; margin-bottom: 15px;">
                    {{ modalError }}
                </n-alert>

                <!-- Кнопки управления -->
                <n-flex justify="end" style="margin-top: 20px;">
                    <n-button @click="handleClose" :disabled="isSaving || isLoadingData">Отмена</n-button>
                    <n-button type="primary" attr-type="submit" :loading="isSaving"
                        :disabled="isLoadingData || isSaving">
                        Сохранить
                    </n-button>
                </n-flex>
            </n-form>
        </n-spin>
    </n-modal>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue';
import {
    NModal, NSpin, NForm, NFormItemGi, NInput, NSelect, NInputNumber, NGrid,
    NAlert, NFlex, NButton, NIcon, useMessage
} from 'naive-ui';
// Импортируем утилиты для карты и состояния из mapUtils
import {
    showMapInModal, modalMapContainerRef, isLoadingModalMap,
    loadYmapsApi, initModalMap, destroyModalMap, updatePlacemarkCoords
} from './utils/mapUtils.js';

const message = useMessage();
const props = defineProps({
    // Флаг видимости модального окна
    show: { type: Boolean, required: true },
    // Данные точки для редактирования (или null для новой)
    itemData: { type: Object, default: null },
    // Флаг состояния сохранения
    isSaving: { type: Boolean, default: false },
    // Флаг загрузки данных для редактирования
    isLoadingData: { type: Boolean, default: false },
    // Опции для селекта типов
    types: { type: Array, default: () => [] },
    // Опции для селекта эпох
    epochs: { type: Array, default: () => [] },
    // Опции для селекта админ. делений (пока не используется в форме, но может понадобиться)
    // adminDivisions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:show', 'save', 'close']);

// --- Локальное состояние ---
const showModal = ref(props.show);
const pointFormRef = ref(null);
const formData = ref({});
const modalError = ref(null);

// Используем состояния карты из mapUtils
const showMapInModalState = showMapInModal;
const isLoadingModalMapState = isLoadingModalMap;
const modalMapContainer = modalMapContainerRef; // Привязываем реф шаблона

// --- Вычисляемые свойства ---
const modalTitle = computed(() => (props.itemData?.id ? 'Редактировать точку' : 'Добавить точку'));
const spinDescription = computed(() => (props.isLoadingData ? 'Загрузка данных...' : props.isSaving ? 'Сохранение...' : ''));

// Генерируем опции для селектов из пропсов
const typeOptions = computed(() =>
    props.types.map(t => ({ label: t.label, value: t.id }))
);
const epochOptions = computed(() =>
    props.epochs.map(e => ({ label: e.label, value: e.id }))
);
// const adminDivisionOptions = computed(() =>
//     props.adminDivisions.map(d => ({ label: d.name, value: d.id }))
// );

// --- Функции ---
const resetForm = () => {
    formData.value = {
        id: props.itemData?.id || null,
        name: props.itemData?.name || '',
        latitude: props.itemData?.latitude ?? null, // Используем ?? для null/undefined
        longitude: props.itemData?.longitude ?? null,
        type_id: props.itemData?.type_id || null,
        epoch_id: props.itemData?.epoch_id || null,
        // admin_division_id: props.itemData?.admin_division_id || null,
        short_description: props.itemData?.short_description || '',
        description: props.itemData?.description || ''
    };
    modalError.value = null;
    // Не сбрасываем карту здесь, она инициализируется по кнопке
};

// Функция обратного вызова для обновления координат из карты
const handleCoordsUpdateFromMap = (lat, lon) => {
    formData.value.latitude = lat;
    formData.value.longitude = lon;
    // message.info(`Координаты обновлены: ${lat}, ${lon}`);
};

// Обработчик изменения координат в инпутах для обновления карты
const onCoordInputChange = () => {
    // Обновляем метку на карте, если карта видима
    if (showMapInModalState.value && formData.value.latitude != null && formData.value.longitude != null) {
        updatePlacemarkCoords(formData.value.latitude, formData.value.longitude);
    }
}

// Переключение видимости карты
const toggleMap = async () => {
    showMapInModalState.value = !showMapInModalState.value;
    if (showMapInModalState.value) {
        // Ждем рендеринга контейнера
        await nextTick();
        // Инициализируем карту, передавая текущие координаты и коллбэк
        initModalMap(formData.value, handleCoordsUpdateFromMap, message);
    } else {
        // Уничтожаем карту при скрытии (уже делается в handleAfterLeave, но можно и здесь для надежности)
        // destroyModalMap();
    }
};

const handleClose = () => {
    if (!props.isSaving && !props.isLoadingData) {
        emit('update:show', false);
        emit('close');
    }
};

// Уничтожаем карту после закрытия модального окна
const handleAfterLeave = () => {
    destroyModalMap();
    showMapInModalState.value = false; // Сбрасываем видимость карты
};

const handleSubmit = async () => {
    modalError.value = null;
    try {
        await pointFormRef.value?.validate();
        emit('save', { ...formData.value });
    } catch (errors) {
        message.error("Пожалуйста, заполните все обязательные поля.");
        console.log('Form validation errors:', errors);
    }
};

// --- Наблюдатели ---
watch(() => props.show, (newValue) => {
    showModal.value = newValue;
    if (newValue) {
        resetForm(); // Сбрасываем форму при открытии
        // Карта инициализируется по кнопке, не здесь
    } else {
        // Можно вызвать destroyModalMap и здесь, если нужно немедленное уничтожение
        // handleAfterLeave(); // или так
    }
});

// Наблюдаем за itemData для сброса/заполнения формы при изменении редактируемого элемента
// (полезно, если родитель меняет itemData без закрытия/открытия модалки)
watch(() => props.itemData, resetForm, { deep: true }); // Используем deep, т.к. itemData - объект

</script>

<style scoped>
.n-form-item-gi {
    padding-bottom: 5px;
}

.n-layout-content {
    background-color: #f8f9fa;
}

.n-form-item-gi .n-flex {
    width: 100%;
}

/* Стили для контейнера карты в модалке, чтобы спиннер был по центру */
[ref="modalMapContainer"] {
    position: relative;
    /* Нужно для позиционирования спиннера */
    background-color: #eee;
    /* Фон на время загрузки */
}
</style>