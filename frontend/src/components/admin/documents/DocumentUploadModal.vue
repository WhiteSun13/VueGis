<template>
    <n-modal
        v-model:show="showModal"
        preset="card"
        :style="{ width: '500px' }"
        title="Загрузить новый документ"
        :bordered="true"
        :closable="!isUploading"
        :mask-closable="!isUploading"
        @update:show="handleClose"
    >
        <n-spin :show="isUploading" :description="uploadProgress > 0 ? `Загрузка: ${uploadProgress}%` : 'Отправка файла...'">
            <n-form ref="uploadFormRef" :model="formData" @submit.prevent="handleUpload">
                <!-- Компонент для загрузки файла -->
                <n-form-item path="file" label="PDF Файл:" required :rule="fileRule">
                     <!-- Используем n-upload для удобного выбора файла и отображения -->
                     <n-upload
                        ref="uploadComponentRef"
                        v-model:file-list="fileList"
                        accept=".pdf"
                        :max="1"
                        list-type="text"
                        :custom-request="customUploadRequest"
                        @before-upload="handleBeforeUpload"
                        @change="handleFileChange"
                        :disabled="isUploading"
                     >
                        <n-button :disabled="isUploading">Выбрать PDF файл</n-button>
                     </n-upload>
                </n-form-item>

                <!-- Поле для описания -->
                <n-form-item path="description" label="Описание (необязательно):">
                    <n-input
                        type="textarea"
                        v-model:value="formData.description"
                        placeholder="Введите краткое описание документа"
                        :autosize="{ minRows: 2, maxRows: 5 }"
                        :disabled="isUploading"
                    />
                </n-form-item>

                <!-- Отображение ошибки -->
                <n-alert v-if="uploadError" title="Ошибка загрузки" type="error" closable @close="uploadError = null" style="margin-bottom: 15px;">
                    {{ uploadError }}
                </n-alert>

                <!-- Кнопки управления -->
                <n-flex justify="end" style="margin-top: 20px;">
                    <n-button @click="handleClose" :disabled="isUploading">Отмена</n-button>
                    <n-button
                        type="primary"
                        attr-type="submit"
                        :loading="isUploading"
                        :disabled="isUploading || !fileList.length"
                    >
                        Загрузить
                    </n-button>
                </n-flex>
            </n-form>
        </n-spin>
    </n-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { NModal, NSpin, NForm, NFormItem, NInput, NUpload, NButton, NFlex, NAlert, useMessage } from 'naive-ui';
import { uploadDocumentAdmin } from '@/components/services/api'; // Импортируем функцию API

const props = defineProps({
    show: { type: Boolean, required: true },
});

const emit = defineEmits(['update:show', 'upload-success', 'close']);

const message = useMessage();

// --- Локальное состояние ---
const showModal = ref(props.show);
const uploadFormRef = ref(null); // Ссылка на форму
const uploadComponentRef = ref(null); // Ссылка на компонент n-upload
const formData = ref({
    description: '',
    file: null, // Будем хранить файл здесь для FormData
});
const fileList = ref([]); // Для управления списком файлов в n-upload
const isUploading = ref(false);
const uploadError = ref(null);
const uploadProgress = ref(0); // Прогресс загрузки (0-100)

// --- Правила валидации ---
// Правило для проверки наличия файла
const fileRule = {
    required: true,
    trigger: ['change'], // Проверяем при изменении fileList
    validator(rule, value) {
        if (!fileList.value || fileList.value.length === 0) {
            return new Error('Необходимо выбрать PDF файл для загрузки');
        }
        return true;
    }
};


// --- Функции ---

// Сброс формы и состояния
const resetForm = () => {
    formData.value = { description: '', file: null };
    fileList.value = [];
    uploadError.value = null;
    isUploading.value = false;
    uploadProgress.value = 0;
    // Сбрасываем валидацию формы
    uploadFormRef.value?.restoreValidation();
};

// Обработчик перед загрузкой (для n-upload)
const handleBeforeUpload = async ({ file }) => {
    if (file.file?.type !== 'application/pdf') {
        message.error('Можно загружать только PDF файлы.');
        return false; // Отклоняем загрузку
    }
    if (file.file?.size > 20 * 1024 * 1024) { // 20MB лимит (как в multer)
         message.error('Файл слишком большой. Максимальный размер: 20MB.');
         return false;
    }
    // Если все ок, сохраняем файл для FormData
    formData.value.file = file.file;
    uploadError.value = null; // Сбрасываем ошибку при выборе нового файла
    return true; // Разрешаем добавление в список (но не автозагрузку)
};

// Обработка изменения списка файлов (если пользователь удалил файл)
const handleFileChange = ({ fileList: newFileList }) => {
    fileList.value = newFileList;
    if (newFileList.length === 0) {
        formData.value.file = null; // Очищаем файл, если список пуст
    }
     // Принудительно проверяем валидность поля файла
    uploadFormRef.value?.validate(
        (errors) => {}, // callback при ошибках (не нужен здесь)
        (rule) => rule?.path === 'file' // Проверять только правило для 'file'
    );
};

// Кастомный запрос для n-upload (предотвращаем автозагрузку)
const customUploadRequest = ({ file, onFinish, onError, onProgress }) => {
    // Ничего не делаем здесь, т.к. загрузка будет по кнопке "Загрузить"
    // onFinish(); // Вызываем onFinish(), чтобы файл остался в списке
    console.log("customUploadRequest triggered, but upload happens on submit.");
     // Важно: нужно вызвать onFinish, чтобы n-upload не считал файл "загружающимся"
     // или "неудавшимся" по таймауту.
     setTimeout(onFinish, 0);
};

// Обработка отправки формы (загрузка файла)
const handleUpload = async () => {
    uploadError.value = null;
    // Валидация формы Naive UI
    try {
        await uploadFormRef.value?.validate();
    } catch (errors) {
        message.error("Пожалуйста, выберите PDF файл.");
        console.log('Form validation errors:', errors);
        return;
    }

    if (!formData.value.file) {
        uploadError.value = "Файл не выбран.";
        return;
    }

    isUploading.value = true;
    uploadProgress.value = 0;

    // Создаем FormData
    const data = new FormData();
    data.append('document', formData.value.file); // Ключ 'document' (как в upload.single('document'))
    if (formData.value.description) {
        data.append('description', formData.value.description);
    }

    try {
        // Вызываем API функцию для загрузки
        const response = await uploadDocumentAdmin(data, {
            // Добавляем обработчик прогресса в axios config
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                uploadProgress.value = percentCompleted;
            }
        });
        message.success(`Документ "${response.data.filename}" успешно загружен!`);
        emit('upload-success', response.data); // Передаем данные о загруженном документе
        handleClose(); // Закрываем модалку
    } catch (err) {
        console.error("Ошибка загрузки документа:", err);
        uploadError.value = err.response?.data?.message || err.message || "Неизвестная ошибка при загрузке файла.";
        uploadProgress.value = 0; // Сбрасываем прогресс при ошибке
    } finally {
        isUploading.value = false;
    }
};

// Обработка закрытия модального окна
const handleClose = () => {
    if (!isUploading.value) {
        resetForm(); // Сбрасываем форму при закрытии
        emit('update:show', false);
        emit('close');
    }
};

// Наблюдаем за пропсом show для синхронизации
watch(() => props.show, (newValue) => {
    showModal.value = newValue;
    if (!newValue) {
        // Сбрасываем форму, если модалка закрывается извне
        resetForm();
    }
});

</script>

<style scoped>
/* Дополнительные стили, если нужны */
.n-upload-file-info__name {
    word-break: break-all; /* Перенос длинных имен файлов */
}
</style>