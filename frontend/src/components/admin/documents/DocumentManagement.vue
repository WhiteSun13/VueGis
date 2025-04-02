<!-- frontend/src/components/admin/documents/DocumentManagement.vue -->
<template>
    <div>
        <!-- Секция управления Документами -->
        <ManagementSection
            title="Управление документами"
            add-button-text="Загрузить документ"
            :add-button-disabled="isProcessing"
            @add="openUploadModal"
        >
            <!-- Спиннер во время загрузки или удаления -->
            <n-spin :show="isLoading || isProcessing" description="Загрузка/обработка документов...">
                <!-- Таблица документов -->
                <n-data-table
                    v-if="!isLoading && documents.length > 0"
                    :columns="documentColumns"
                    :data="documents"
                    :bordered="true"
                    :single-line="false"
                    size="small"
                    style="margin-top: 15px;"
                    :row-key="row => row.id"
                />
                <!-- Сообщение, если документы не найдены -->
                <n-empty v-else-if="!isLoading && documents.length === 0" description="Документы не найдены" style="padding: 20px;" />

                 <!-- Отображение ошибки загрузки списка -->
                 <n-alert v-if="loadError" title="Ошибка" type="error" closable @close="loadError = null" style="margin-top: 15px;">
                    Не удалось загрузить список документов: {{ loadError }}
                </n-alert>

            </n-spin>
        </ManagementSection>

        <!-- Модальное окно для загрузки документов -->
        <DocumentUploadModal
            v-model:show="showUploadModal"
            @upload-success="handleUploadSuccess"
            @close="handleCloseUploadModal"
        />

        <!-- Здесь можно добавить DocumentEditModal, если он нужен -->

    </div>
</template>

<script setup>
import { ref, onMounted, h, computed } from 'vue';
import { NSpin, NDataTable, NEmpty, NButton, NSpace, useMessage, useDialog, NTooltip, NTime, NText, NIcon, NAlert } from 'naive-ui';
import { formatDistanceToNow } from 'date-fns'; // Для форматирования времени
import { ru } from 'date-fns/locale'; // Русская локаль
import ManagementSection from '@/components/admin/ManagementSection.vue';
import DocumentUploadModal from './DocumentUploadModal.vue'; // Импортируем модалку загрузки
// Импортируем API функции
import { getAllDocumentsAdmin, deleteDocumentAdmin, getDocumentDownloadUrl } from '@/components/services/api';

const message = useMessage();
const dialog = useDialog();

// --- Состояния ---
const isLoading = ref(false); // Загрузка списка
const isProcessing = ref(false); // Удаление или другая обработка
const documents = ref([]); // Список документов
const loadError = ref(null); // Ошибка загрузки списка

// Состояния для модального окна загрузки
const showUploadModal = ref(false);

// --- Функции ---

// Загрузка списка документов
const loadDocuments = async () => {
    if (isLoading.value) return;
    isLoading.value = true;
    loadError.value = null;
    try {
        const response = await getAllDocumentsAdmin();
        documents.value = response.data || [];
    } catch (err) {
        console.error("Ошибка загрузки списка документов:", err);
        loadError.value = err.response?.data?.message || err.message || "Неизвестная ошибка";
        documents.value = []; // Очищаем список при ошибке
    } finally {
        isLoading.value = false;
    }
};

// Форматирование размера файла
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- Логика модального окна загрузки ---
const openUploadModal = () => {
    showUploadModal.value = true;
};

const handleCloseUploadModal = () => {
    showUploadModal.value = false;
    // Перезагружаем список, если нужно (или обновляем после upload-success)
    // loadDocuments();
};

// Обработчик успешной загрузки (обновляем список)
const handleUploadSuccess = (newDocument) => {
    // Добавляем новый документ в начало списка для наглядности
    documents.value.unshift(newDocument);
    // Можно и перезагрузить весь список: loadDocuments();
    showUploadModal.value = false; // Закрываем модалку
};


// --- Удаление документа ---
const confirmDeleteDocument = (docId, docName) => {
    dialog.warning({
        title: 'Подтверждение удаления',
        content: `Вы уверены, что хотите удалить документ "${docName}" (ID: ${docId})? Это действие необратимо и отвяжет документ от всех точек.`,
        positiveText: 'Удалить',
        negativeText: 'Отмена',
        onPositiveClick: async () => {
            isProcessing.value = true; // Используем isProcessing для блокировки
            try {
                await deleteDocumentAdmin(docId);
                // Удаляем из локального массива
                documents.value = documents.value.filter(d => d.id !== docId);
                message.success(`Документ "${docName}" успешно удален.`);
            } catch (err) {
                console.error(`Ошибка удаления документа:`, err);
                message.error(`Ошибка удаления документа: ${err.response?.data?.message || err.message}`);
            } finally {
                isProcessing.value = false;
            }
        },
        onNegativeClick: () => {
            message.info('Удаление отменено');
        }
    });
};

// --- Конфигурация таблицы ---
const renderActions = (row) => {
    return h(NSpace, { size: 'small', justify: 'center' }, () => [
        // Кнопка Просмотр/Скачать
         h(NButton, {
            size: 'tiny', type: 'info', ghost: true, tag: 'a',
            href: getDocumentDownloadUrl(row.id), // Генерируем ссылку
            target: '_blank', // Открыть в новой вкладке
            title: 'Открыть/скачать документ'
        }, { default: () => '👁️' }), // Иконка или текст
        // Кнопка Редактировать (если будет)
        // h(NButton, { size: 'tiny', type: 'warning', ghost: true, disabled: isProcessing.value || isLoading.value, onClick: () => openEditModal(row) }, { default: () => 'Ред.' }),
        // Кнопка Удалить
        h(NButton, {
            size: 'tiny', type: 'error', ghost: true,
            disabled: isProcessing.value || isLoading.value,
            onClick: () => confirmDeleteDocument(row.id, row.filename),
            title: 'Удалить документ'
        }, { default: () => h(NIcon, null, { default: () => h('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24" }, [h('path', { fill: "currentColor", d: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z" })]) }) }) // Иконка корзины
    ]);
};

const documentColumns = computed(() => [
    { title: 'ID', key: 'id', width: 60, sorter: 'default' },
    {
        title: 'Имя файла', key: 'filename', resizable: true, ellipsis: { tooltip: true }, sorter: 'default',
        render: (row) => h('a', {
            href: getDocumentDownloadUrl(row.id),
            target: '_blank',
            rel: 'noopener noreferrer',
            title: row.filename,
            style: 'color: inherit; text-decoration: none;' // Чтобы выглядело как обычный текст
         }, row.filename)
    },
    { title: 'Описание', key: 'description', resizable: true, ellipsis: { tooltip: true } },
    {
        title: 'Размер', key: 'size', width: 100, sorter: (a, b) => a.size - b.size,
        render: (row) => formatFileSize(row.size)
    },
    {
        title: 'Загружен', key: 'created_at', width: 150, sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        render: (row) => h(NTooltip, null, {
            trigger: () => h(NTime, { time: new Date(row.created_at), type: 'relative', locale: ru }),
            default: () => h(NTime, { time: new Date(row.created_at), format: 'dd.MM.yyyy HH:mm', locale: ru }) // Точное время в подсказке
        })
    },
    { title: 'Действия', key: 'actions', width: 100, align: 'center', render: renderActions },
]);

// --- Жизненный цикл ---
onMounted(() => {
  loadDocuments(); // Загружаем документы при монтировании
});

</script>

<style scoped>
.n-data-table {
    margin-bottom: 20px;
}
/* Стили для ссылки в имени файла */
.n-data-table a {
    transition: color 0.3s ease;
}
.n-data-table a:hover {
     color: var(--n-color-target, #18a058); /* Или другой цвет из темы */
     text-decoration: underline;
}
</style>