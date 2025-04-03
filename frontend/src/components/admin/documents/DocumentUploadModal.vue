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
import { ref, watch } from 'vue';
import { NModal, NSpin, NForm, NFormItem, NInput, NUpload, NButton, NFlex, NAlert, useMessage } from 'naive-ui';
// Импортируем библиотеку транслитерации
import CyrillicToTranslit from 'cyrillic-to-translit-js';
import { uploadDocumentAdmin } from '@/components/services/api';

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
    file: null, // Здесь будет храниться объект File (возможно, с измененным именем)
});
const fileList = ref([]); // Для управления списком файлов в n-upload
const isUploading = ref(false);
const uploadError = ref(null);
const uploadProgress = ref(0); // Прогресс загрузки (0-100)

// --- Правила валидации ---
// Правило для проверки наличия файла
const fileRule = {
    required: true,
    trigger: ['change'],
    validator(rule, value) {
        if (!fileList.value || fileList.value.length === 0) {
            return new Error('Необходимо выбрать PDF файл для загрузки');
        }
        return true;
    }
};

// --- Вспомогательная функция для разделения имени и расширения ---
const getFilenameParts = (filename) => {
    const lastDotIndex = filename.lastIndexOf('.');
    // Если точки нет, или она первая (скрытый файл), считаем, что расширения нет
    if (lastDotIndex === -1 || lastDotIndex === 0) {
        return { name: filename, ext: '' };
    }
    return {
        name: filename.substring(0, lastDotIndex),
        ext: filename.substring(lastDotIndex) // Включает точку, например, ".pdf"
    };
};


// --- Функции ---

// Сброс формы и состояния
const resetForm = () => {
    formData.value = { description: '', file: null };
    fileList.value = [];
    uploadError.value = null;
    isUploading.value = false;
    uploadProgress.value = 0;
    uploadFormRef.value?.restoreValidation();
};

// Обработчик перед добавлением файла в список n-upload
const handleBeforeUpload = ({ file }) => {
    // file здесь - это объект n-upload со свойством .file (оригинальный File)
    const originalFile = file.file;

    // 1. Валидация типа и размера
    if (originalFile?.type !== 'application/pdf') {
        message.error('Можно загружать только PDF файлы.');
        return false; // Отклоняем
    }
    if (originalFile?.size > 20 * 1024 * 1024) { // 20MB
         message.error('Файл слишком большой. Максимальный размер: 20MB.');
         return false;
    }

    // 2. Транслитерация имени файла
    const { name: originalBasename, ext: originalExtension } = getFilenameParts(originalFile.name);

    const cyrillicToTranslit = new CyrillicToTranslit();
    let transliteratedName = cyrillicToTranslit.transform(originalBasename, "_"); // Заменяем пробелы на '_'
    transliteratedName = transliteratedName
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, ''); // Оставляем только латиницу, цифры, _ и -

    if (!transliteratedName) { // Если имя стало пустым
        transliteratedName = 'document'; // Имя по умолчанию
    }

    const newFilename = transliteratedName + originalExtension;

    // 3. Создание нового объекта File с транслитерированным именем
    let fileToProcess = originalFile;
    if (newFilename !== originalFile.name) {
        try {
            // Создаем новый File с тем же содержимым, но новым именем
            fileToProcess = new File([originalFile], newFilename, {
                type: originalFile.type,
                lastModified: originalFile.lastModified,
            });
            console.log(`Имя файла транслитерировано: "${originalFile.name}" -> "${newFilename}"`);
             // ВАЖНО: Заменяем оригинальный файл в объекте события n-upload!
             file.file = fileToProcess;
             // Также нужно обновить имя в самом объекте `file`, который пойдет в `fileList`
             file.name = newFilename;

        } catch (e) {
            console.error("Ошибка создания нового объекта File:", e);
            message.error("Не удалось обработать имя файла.");
            return false; // Отклоняем, если не удалось создать новый файл
        }
    }

    // 4. Сохраняем (возможно, новый) файл в formData для последующей отправки
    formData.value.file = fileToProcess;
    uploadError.value = null; // Сбрасываем ошибку при успешном выборе

    // 5. Разрешаем добавление файла в список n-upload (но не автозагрузку)
    return true;
};


// Обработка изменения списка файлов (например, удаление файла из списка)
const handleFileChange = ({ fileList: newFileList }) => {
    fileList.value = newFileList; // Обновляем fileList для n-upload
    if (newFileList.length === 0) {
        formData.value.file = null; // Если список пуст, очищаем файл в formData
    } else {
        // Убедимся, что в formData актуальный файл (на случай, если файл был заменен)
        formData.value.file = newFileList[0].file;
    }
    // Принудительно перепроверяем валидность поля 'file'
    uploadFormRef.value?.validate( (errors) => {}, (rule) => rule?.path === 'file');
};

// Кастомный запрос для n-upload (предотвращаем автозагрузку)
const customUploadRequest = ({ onFinish }) => {
    // Вызываем onFinish(), чтобы файл корректно отображался в списке как "готовый",
    // а не "в процессе" или "ошибка". Реальная загрузка произойдет по кнопке.
     setTimeout(onFinish, 0);
};

// Обработка отправки формы (реальная загрузка)
const handleUpload = async () => {
    uploadError.value = null;
    // Валидация формы Naive UI
    try {
        await uploadFormRef.value?.validate(); // Валидируем форму (проверяем наличие файла)
    } catch (errors) {
        message.error("Пожалуйста, выберите PDF файл.");
        console.log('Form validation errors:', errors);
        return;
    }

    if (!formData.value.file) { // Дополнительная проверка
        uploadError.value = "Файл не выбран или был удален.";
        return;
    }

    isUploading.value = true;
    uploadProgress.value = 0;

    // Создаем FormData
    const data = new FormData();
    // Добавляем файл (с уже транслитерированным именем)
    data.append('document', formData.value.file);
    if (formData.value.description) {
        data.append('description', formData.value.description);
    }

    try {
        const response = await uploadDocumentAdmin(data, {
            // Добавляем обработчик прогресса в axios config
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                     const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                     uploadProgress.value = percentCompleted;
                }
            }
        });
        // Используем оригинальное имя из ответа сервера для сообщения
        message.success(`Документ "${response.data.filename}" успешно загружен!`);
        emit('upload-success', response.data);
        handleClose();
    } catch (err) {
        console.error("Ошибка загрузки документа:", err);
        uploadError.value = err.response?.data?.message || err.message || "Неизвестная ошибка при загрузке файла.";
        uploadProgress.value = 0;
    } finally {
        isUploading.value = false;
    }
};

// Обработка закрытия модального окна
const handleClose = () => {
    if (!isUploading.value) {
        resetForm();
        emit('update:show', false);
        emit('close');
    }
};

// Наблюдаем за пропсом show
watch(() => props.show, (newValue) => {
    showModal.value = newValue;
    if (!newValue) {
        resetForm(); // Сбрасываем при закрытии
    }
});

</script>

<style scoped>
/* Дополнительные стили, если нужны */
.n-upload-file-info__name {
    word-break: break-all; /* Перенос длинных имен файлов */
}
</style>