<template>
    <!-- Модальное окно для Точек -->
    <n-modal
        v-model:show="showModal"
        preset="card"
        :style="{ width: '800px' }"
        :title="modalTitle"
        :bordered="true"
        :closable="!isSaving && !isLoadingData"
        :mask-closable="!isSaving && !isLoadingData"
        @update:show="handleClose"
        @after-leave="handleAfterLeave"
    >
        <!-- Спиннер для загрузки данных точки или сохранения -->
        <n-spin :show="isLoadingData || isSaving" :description="spinDescription">
            <!-- Форма добавления/редактирования точки -->
            <n-form ref="pointFormRef" :model="formData" @submit.prevent="handleSubmit">
                <n-grid :cols="2" :x-gap="15">
                    <!-- Поле Название -->
                    <n-form-item-gi :span="2" path="name" label="Название:" required :rule="{ required: true, message: 'Название обязательно', trigger: ['input', 'blur'] }">
                        <n-input v-model:value="formData.name" placeholder="Введите название точки" :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Широта -->
                    <n-form-item-gi path="latitude" label="Широта:" required :rule="{ required: true, type: 'number', message: 'Широта обязательна', trigger: ['input', 'blur'] }">
                        <n-input-number v-model:value="formData.latitude" step="any" placeholder="Например, 45.12345" style="width: 100%;" :disabled="isSaving" @update:value="onCoordInputChange" />
                    </n-form-item-gi>

                    <!-- Поле Долгота и кнопка карты -->
                    <n-form-item-gi path="longitude" label="Долгота:" required :rule="{ required: true, type: 'number', message: 'Долгота обязательна', trigger: ['input', 'blur'] }">
                        <n-flex>
                            <n-input-number v-model:value="formData.longitude" step="any" placeholder="Например, 34.56789" style="flex-grow: 1;" :disabled="isSaving" @update:value="onCoordInputChange" />
                            <n-button @click="toggleMap" type="default" ghost title="Показать/скрыть карту" :disabled="isSaving">
                                <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5" /></svg></n-icon></template>
                            </n-button>
                        </n-flex>
                    </n-form-item-gi>

                    <!-- Карта в модальном окне -->
                    <n-form-item-gi :span="2" v-if="showMapInModalState">
                        <div ref="modalMapContainer" style="width: 100%; height: 300px; border: 1px solid #ccc; margin-top: 10px; position: relative;">
                            <n-spin :show="isLoadingModalMapState" description="Загрузка карты..." size="large" />
                        </div>
                    </n-form-item-gi>

                    <!-- Поле Тип -->
                    <n-form-item-gi path="type_id" label="Тип:" required :rule="{ required: true, type: 'number', message: 'Тип обязателен', trigger: ['change', 'blur'] }">
                        <n-select v-model:value="formData.type_id" placeholder="Выберите тип ОАН" :options="typeOptions" filterable :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Эпоха -->
                    <n-form-item-gi path="epoch_id" label="Эпоха:" required :rule="{ required: true, type: 'number', message: 'Эпоха обязательна', trigger: ['change', 'blur'] }">
                        <n-select v-model:value="formData.epoch_id" placeholder="Выберите эпоху" :options="epochOptions" filterable :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Краткое описание -->
                    <n-form-item-gi :span="2" path="short_description" label="Краткое описание:">
                        <n-input type="textarea" v-model:value="formData.short_description" placeholder="Введите краткое описание" :autosize="{ minRows: 2, maxRows: 4 }" :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Поле Полное описание -->
                    <n-form-item-gi :span="2" path="description" label="Полное описание:">
                        <n-input type="textarea" v-model:value="formData.description" placeholder="Введите полное описание" :autosize="{ minRows: 4, maxRows: 10 }" :disabled="isSaving" />
                    </n-form-item-gi>

                    <!-- Секция управления документами -->
                    <n-form-item-gi :span="2" label="Связанные документы:">
                            <!-- Выпадающий список для выбора существующих документов -->
                             <n-select
                                v-model:value="formData.document_ids"
                                multiple
                                filterable
                                placeholder="Выберите или начните вводить имя файла..."
                                :options="allDocumentOptions"
                                :loading="isLoadingDocuments"
                                :disabled="isSaving || isLoadingData"
                                clearable
                                style="min-width: 100%;"
                                #empty
                            >
                                Нет доступных документов.
                            </n-select>
                    </n-form-item-gi>

                     <!-- Список уже связанных документов -->
                     <n-form-item-gi :span="2" v-if="formData.id && associatedDocuments.length > 0" label="Уже привязаны:">
                        <n-list bordered hoverable clickable style="width: 100%;">
                            <n-list-item v-for="doc in associatedDocuments" :key="doc.id">
                                <template #prefix>
                                    <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8zm4 18H6V4h7v5h5zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z"/></svg></n-icon>
                                </template>
                                <n-thing>
                                    <template #header>
                                        <a :href="getDocumentDownloadUrl(doc.id)" target="_blank" rel="noopener noreferrer" class="document-link" :title="doc.description || 'Открыть документ'">
                                            {{ doc.filename }}
                                        </a>
                                    </template>
                                    <template #description v-if="doc.description">
                                        {{ doc.description }}
                                    </template>
                                </n-thing>
                                <!-- Кнопка отвязки НЕ НУЖНА, т.к. n-select перезаписывает все связи при сохранении -->
                            </n-list-item>
                        </n-list>
                    </n-form-item-gi>

                </n-grid>

                <!-- Отображение ошибки -->
                <n-alert v-if="modalError" title="Ошибка" type="error" closable @close="modalError = null" style="margin-top: 15px; margin-bottom: 15px;">
                    {{ modalError }}
                </n-alert>

                <!-- Кнопки управления -->
                <n-flex justify="end" style="margin-top: 20px;">
                    <n-button @click="handleClose" :disabled="isSaving || isLoadingData">Отмена</n-button>
                    <n-button type="primary" attr-type="submit" :loading="isSaving" :disabled="isLoadingData || isSaving">
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
    NAlert, NFlex, NButton, NIcon, useMessage, NList, NListItem, NThing
} from 'naive-ui';
// Импортируем утилиты для карты
import {
    showMapInModal, modalMapContainerRef, isLoadingModalMap,
    initModalMap, destroyModalMap, updatePlacemarkCoords
} from '@/components/admin/utils/mapUtils.js';
// Импортируем API функции для документов
import { getAllDocumentsAdmin, getDocumentDownloadUrl } from '@/components/services/api';

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
});

const emit = defineEmits(['update:show', 'save', 'close']);

// --- Локальное состояние ---
const showModal = ref(props.show);
const pointFormRef = ref(null); // Ссылка на форму
const formData = ref({}); // Данные формы
const modalError = ref(null); // Ошибка в модальном окне
const allDocuments = ref([]); // Полный список документов для выбора
const isLoadingDocuments = ref(false); // Флаг загрузки списка документов

// Состояния карты из mapUtils
const showMapInModalState = showMapInModal;
const isLoadingModalMapState = isLoadingModalMap;
const modalMapContainer = modalMapContainerRef; // Привязываем реф шаблона

// --- Вычисляемые свойства ---
const modalTitle = computed(() => (props.itemData?.id ? 'Редактировать точку' : 'Добавить точку'));
const spinDescription = computed(() => (props.isLoadingData ? 'Загрузка данных...' : props.isSaving ? 'Сохранение...' : ''));

// Опции для селектов типов и эпох
const typeOptions = computed(() =>
    props.types.map(t => ({ label: t.label, value: t.id }))
);
const epochOptions = computed(() =>
    props.epochs.map(e => ({ label: e.label, value: e.id }))
);

// Опции для n-select документов
const allDocumentOptions = computed(() =>
    allDocuments.value.map(doc => ({
        label: doc.filename, // Отображаемое имя
        value: doc.id,      // Значение (ID)
        title: doc.description || doc.filename // Подсказка при наведении (опционально)
    }))
);

// Список уже связанных документов (для отображения в режиме редактирования)
const associatedDocuments = computed(() => {
    // props.itemData содержит данные, загруженные через fetchPointInfo,
    // включая массив `documents`
    if (formData.value?.id && props.itemData?.documents) {
        return props.itemData.documents;
    }
    return [];
});


// --- Функции ---

// Загрузка списка всех документов для выпадающего списка
const loadAllDocuments = async () => {
    if (isLoadingDocuments.value) return; // Предотвращаем повторный запуск
    isLoadingDocuments.value = true;
    modalError.value = null; // Сбрасываем ошибку перед загрузкой
    try {
        const response = await getAllDocumentsAdmin();
        allDocuments.value = response.data || []; // Убедимся, что это массив
    } catch (err) {
        console.error("Ошибка загрузки списка документов:", err);
        modalError.value = "Не удалось загрузить список доступных документов.";
        allDocuments.value = []; // Очищаем в случае ошибки
    } finally {
        isLoadingDocuments.value = false;
    }
};

// Сброс/инициализация формы
const resetForm = () => {
    // Получаем ID связанных документов из itemData (данных, переданных при открытии модалки)
    const currentDocIds = props.itemData?.documents?.map(doc => doc.id) || [];
    formData.value = {
        id: props.itemData?.id || null,
        name: props.itemData?.name || '',
        latitude: props.itemData?.latitude ?? null,
        longitude: props.itemData?.longitude ?? null,
        type_id: props.itemData?.type_id || null,
        epoch_id: props.itemData?.epoch_id || null,
        short_description: props.itemData?.short_description || '',
        description: props.itemData?.description || '',
        // Инициализируем document_ids текущими связанными ID
        // Этот массив будет обновляться через v-model у n-select
        document_ids: [...currentDocIds], // Создаем копию массива
    };
    modalError.value = null;
};

// Обновление координат из карты
const handleCoordsUpdateFromMap = (lat, lon) => {
    formData.value.latitude = parseFloat(lat.toFixed(6)); // Округляем для консистентности
    formData.value.longitude = parseFloat(lon.toFixed(6));
};

// Обновление карты при изменении инпутов координат
const onCoordInputChange = () => {
    if (showMapInModalState.value && formData.value.latitude != null && formData.value.longitude != null) {
        updatePlacemarkCoords(formData.value.latitude, formData.value.longitude);
    }
}

// Переключение видимости карты
const toggleMap = async () => {
    showMapInModalState.value = !showMapInModalState.value;
    if (showMapInModalState.value) {
        await nextTick(); // Ждем рендеринга контейнера
        // Передаем текущие координаты из formData
        const initialPointData = {
             latitude: formData.value.latitude,
             longitude: formData.value.longitude
        };
        initModalMap(initialPointData, handleCoordsUpdateFromMap, message);
    }
};

// Закрытие модального окна
const handleClose = () => {
    if (!props.isSaving && !props.isLoadingData) {
        emit('update:show', false);
        emit('close');
    }
};

// Действия после закрытия модального окна (очистка)
const handleAfterLeave = () => {
    destroyModalMap();
    showMapInModalState.value = false; // Сбрасываем видимость карты
    allDocuments.value = []; // Очищаем список документов
    formData.value = {}; // Очищаем данные формы
};

// Обработка отправки формы
const handleSubmit = async () => {
    modalError.value = null;
    try {
        await pointFormRef.value?.validate();
        // Эмитим событие 'save' с полными данными формы, включая document_ids
        emit('save', { ...formData.value });
    } catch (errors) {
        message.error("Пожалуйста, заполните все обязательные поля.");
        console.log('Form validation errors:', errors);
        // Можно найти первое невалидное поле и сфокусироваться на нем
    }
};

// --- Наблюдатели ---
watch(() => props.show, (newValue) => {
    showModal.value = newValue;
    if (newValue) {
        resetForm(); // Сбрасываем форму при каждом открытии
        loadAllDocuments(); // Загружаем актуальный список документов
    }
    // Очистка происходит в handleAfterLeave
});

// Наблюдаем за itemData для сброса/заполнения формы при изменении редактируемого элемента
// Это важно, если родительский компонент может изменить itemData без закрытия/открытия модалки
watch(() => props.itemData, resetForm, { deep: true });

</script>

<style scoped>
.n-form-item-gi {
    padding-bottom: 5px; /* Небольшой отступ для полей формы */
}
.n-layout-content {
    background-color: #f8f9fa; /* Фон для основного контента, если нужно */
}
.n-form-item-gi .n-flex {
    width: 100%; /* Растягиваем flex контейнер в FormItem */
}
/* Стили для контейнера карты */
[ref="modalMapContainer"] {
    position: relative; /* Для позиционирования спиннера */
    background-color: #eee; /* Фон на время загрузки карты */
    border: 1px solid #ccc;
    margin-top: 10px;
}

/* Стили для списка связанных документов */
.n-list-item a.document-link {
    color: var(--n-item-text-color, inherit); /* Цвет текста из темы Naive UI или наследуемый */
    text-decoration: none;
    transition: color 0.3s ease;
}
.n-list-item a.document-link:hover {
     color: var(--n-color-target, #18a058); /* Основной цвет темы Naive UI при наведении */
     text-decoration: underline;
}
.n-list-item .n-thing-header {
    margin-bottom: 2px; /* Уменьшаем отступ под ссылкой, если есть описание */
}
.n-list-item .n-thing-description {
    font-size: 0.85em; /* Чуть меньше шрифт для описания */
    color: var(--n-description-text-color, grey); /* Цвет описания из темы */
    line-height: 1.3;
}
</style>