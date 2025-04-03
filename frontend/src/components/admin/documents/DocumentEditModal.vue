<template>
    <n-modal
        v-model:show="showModal"
        preset="card"
        :style="{ width: '500px' }"
        title="Редактировать описание документа"
        :bordered="true"
        :closable="!isSaving"
        :mask-closable="!isSaving"
        @update:show="handleClose"
    >
        <n-spin :show="isSaving" description="Сохранение...">
            <n-form ref="editFormRef" :model="formData" @submit.prevent="handleSave">
                <!-- Имя файла (только для информации) -->
                <n-form-item label="Файл:">
                     <n-text strong>{{ itemData?.filename || 'Неизвестный файл' }}</n-text>
                </n-form-item>

                <!-- Поле для редактирования описания -->
                <n-form-item path="description" label="Описание:">
                    <n-input
                        type="textarea"
                        v-model:value="formData.description"
                        placeholder="Введите краткое описание документа (или оставьте пустым)"
                        :autosize="{ minRows: 3, maxRows: 6 }"
                        :disabled="isSaving"
                        clearable
                    />
                </n-form-item>

                <!-- Отображение ошибки -->
                <n-alert v-if="editError" title="Ошибка сохранения" type="error" closable @close="editError = null" style="margin-bottom: 15px;">
                    {{ editError }}
                </n-alert>

                <!-- Кнопки управления -->
                <n-flex justify="end" style="margin-top: 20px;">
                    <n-button @click="handleClose" :disabled="isSaving">Отмена</n-button>
                    <n-button
                        type="primary"
                        attr-type="submit"
                        :loading="isSaving"
                        :disabled="isSaving"
                    >
                        Сохранить
                    </n-button>
                </n-flex>
            </n-form>
        </n-spin>
    </n-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { NModal, NSpin, NForm, NFormItem, NInput, NButton, NFlex, NAlert, NText, useMessage } from 'naive-ui';

const props = defineProps({
    show: { type: Boolean, required: true },
    // Данные редактируемого документа (id, filename, description)
    itemData: { type: Object, default: null },
    isSaving: { type: Boolean, default: false }, // Получаем состояние сохранения от родителя
});

const emit = defineEmits(['update:show', 'save', 'close']);

const message = useMessage();

// --- Локальное состояние ---
const showModal = ref(props.show);
const editFormRef = ref(null); // Ссылка на форму
const formData = ref({
    description: '', // Инициализируем пустым значением
});
const editError = ref(null);

// --- Функции ---

// Сброс/инициализация формы при открытии или изменении itemData
const initializeForm = () => {
    formData.value.description = props.itemData?.description || ''; // Устанавливаем текущее описание
    editError.value = null;
    editFormRef.value?.restoreValidation(); // Сбрасываем валидацию (если она есть)
};

// Обработка сохранения
const handleSave = async () => {
    editError.value = null;
    try {
        // Валидация (если нужна)
        // await editFormRef.value?.validate();

        // Эмитим событие save с ID и новым описанием
        emit('save', {
            id: props.itemData.id,
            description: formData.value.description.trim() === '' ? null : formData.value.description // Отправляем null, если строка пустая
        });
        // Состояние isSaving управляется родителем
    } catch (errors) {
        message.error("Ошибка валидации формы."); // Если есть правила валидации
        console.log('Form validation errors:', errors);
    }
};

// Обработка закрытия модального окна
const handleClose = () => {
    if (!props.isSaving) { // Не даем закрыть во время сохранения
        emit('update:show', false);
        emit('close');
    }
};

// --- Наблюдатели ---
// Синхронизация локального showModal с пропсом show
watch(() => props.show, (newValue) => {
    showModal.value = newValue;
    if (newValue) {
        initializeForm(); // Инициализируем форму при открытии
    }
});

// Обновление формы, если изменились входные данные itemData (пока модалка открыта)
watch(() => props.itemData, (newData) => {
    if (showModal.value && newData) {
        initializeForm();
    }
}, { deep: true });

</script>