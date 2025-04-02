<template>
    <!-- Модальное окно для Эпох -->
    <n-modal v-model:show="showModal" preset="card" :style="{ width: '450px' }" :title="modalTitle" :bordered="true"
        :closable="!isSaving" :mask-closable="!isSaving" @update:show="handleClose">
        <!-- Спиннер во время сохранения -->
        <n-spin :show="isSaving" description="Сохранение...">
            <!-- Форма для редактирования/добавления эпохи -->
            <n-form ref="epochFormRef" :model="formData" @submit.prevent="handleSubmit">
                <!-- Поле для ключа (epoch_value) -->
                <n-form-item path="epoch_value" label="Ключ (epoch_value):" required
                    :rule="{ required: true, message: 'Ключ обязателен', trigger: ['input', 'blur'] }">
                    <n-input v-model:value="formData.epoch_value" placeholder="например, bronze_age"
                        :disabled="isSaving" />
                </n-form-item>
                <!-- Поле для названия (label) -->
                <n-form-item path="label" label="Название (label):" required
                    :rule="{ required: true, message: 'Название обязательно', trigger: ['input', 'blur'] }">
                    <n-input v-model:value="formData.label" placeholder="например, Бронзовый век"
                        :disabled="isSaving" />
                </n-form-item>

                <!-- Отображение ошибки, если она есть -->
                <n-alert v-if="modalError" title="Ошибка" type="error" closable @close="modalError = null"
                    style="margin-top: 15px; margin-bottom: 15px;">
                    {{ modalError }}
                </n-alert>

                <!-- Кнопки управления формой -->
                <n-flex justify="end" style="margin-top: 20px;">
                    <n-button @click="handleClose" :disabled="isSaving">Отмена</n-button>
                    <n-button type="primary" attr-type="submit" :loading="isSaving" :disabled="isSaving">
                        Сохранить
                    </n-button>
                </n-flex>
            </n-form>
        </n-spin>
    </n-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { NModal, NSpin, NForm, NFormItem, NInput, NAlert, NFlex, NButton, useMessage } from 'naive-ui';

const message = useMessage(); // Для уведомлений
const props = defineProps({
    // Флаг видимости модального окна
    show: {
        type: Boolean,
        required: true,
    },
    // Данные редактируемой эпохи (null для добавления новой)
    itemData: {
        type: Object,
        default: null,
    },
    // Флаг состояния сохранения
    isSaving: {
        type: Boolean,
        default: false,
    },
});

// Определяем события, которые компонент может генерировать
const emit = defineEmits(['update:show', 'save', 'close']);

// Локальное состояние для управления видимостью
const showModal = ref(props.show);
// Ссылка на форму для валидации
const epochFormRef = ref(null);
// Локальное состояние для данных формы
const formData = ref({});
// Локальное состояние для ошибки в модалке
const modalError = ref(null);

// Вычисляемый заголовок модального окна
const modalTitle = computed(() => (props.itemData?.id ? 'Редактировать эпоху' : 'Добавить эпоху'));

// Функция для сброса формы
const resetForm = () => {
    formData.value = {
        epoch_value: props.itemData?.epoch_value || '',
        label: props.itemData?.label || '',
        id: props.itemData?.id || null, // Сохраняем ID для редактирования
    };
    modalError.value = null;
};

// Наблюдаем за изменением входных данных (itemData) для сброса формы
watch(() => props.itemData, resetForm, { immediate: true });

// Наблюдаем за изменением пропа show для синхронизации локального состояния
watch(() => props.show, (newValue) => {
    showModal.value = newValue;
    if (newValue) {
        resetForm(); // Сбрасываем форму при открытии
    }
});

// Обработчик закрытия модального окна
const handleClose = () => {
    if (!props.isSaving) {
        emit('update:show', false);
        emit('close'); // Эмитим событие close
    }
};

// Обработчик отправки формы
const handleSubmit = async () => {
    modalError.value = null;
    try {
        // Запускаем валидацию формы Naive UI
        await epochFormRef.value?.validate();
        // Если валидация прошла, эмитим событие 'save' с данными формы
        emit('save', { ...formData.value });
    } catch (errors) {
        // Если валидация не прошла, выводим сообщение
        message.error("Пожалуйста, заполните все обязательные поля.");
        console.log('Form validation errors:', errors);
        // Можно установить modalError, если нужно показать ошибку в n-alert
        // modalError.value = "Заполните обязательные поля.";
    }
};
</script>