<template>
    <div>
        <!-- Секция управления Типами ОАН -->
        <ManagementSection title="Управление типами ОАН" add-button-text="Добавить тип" :add-button-disabled="isSaving"
            @add="openAddModal">
            <!-- Спиннер во время загрузки или сохранения/удаления -->
            <n-spin :show="isLoading || isSaving" description="Загрузка/обработка типов...">
                <!-- Таблица типов -->
                <n-data-table v-if="!isLoading && types.length > 0" :columns="typeColumns" :data="types"
                    :bordered="true" :single-line="false" size="small" style="margin-top: 15px;" />
                <!-- Сообщение, если типы не найдены -->
                <n-empty v-else-if="!isLoading && types.length === 0" description="Типы не найдены"
                    style="padding: 20px;" />
            </n-spin>
        </ManagementSection>

        <!-- Модальное окно для добавления/редактирования типов -->
        <TypeFormModal v-model:show="showTypeModal" :item-data="currentTypeData" :is-saving="isSavingType"
            @save="handleSaveType" @close="handleCloseTypeModal" />
    </div>
</template>

<script setup>
import { ref, onMounted, h, watch } from 'vue';
import {
    NSpin, NDataTable, NEmpty, NButton, NSpace, useMessage, useDialog
} from 'naive-ui';
import ManagementSection from '@/components/admin/ManagementSection.vue';
import TypeFormModal from './TypeFormModal.vue';
// Импортируем функции API
import {
    getAllTypesAdmin, createTypeAdmin, updateTypeAdmin, deleteTypeAdmin
} from '@/components/services/api';

const props = defineProps({
    // Получаем типы от родителя для инициализации и обновления
    initialTypes: { type: Array, required: true },
});

const emit = defineEmits(['typesUpdated']); // Событие для уведомления родителя об изменениях

const message = useMessage();
const dialog = useDialog();

// --- Состояния ---
const isLoading = ref(false);
const isSaving = ref(false); // Общее состояние сохранения/удаления для блокировки таблицы
const types = ref([...props.initialTypes]); // Локальная копия для таблицы

// Состояния для модального окна
const showTypeModal = ref(false);
const currentTypeData = ref(null);
const isSavingType = ref(false); // Сохранение конкретного типа

// --- Загрузка данных (используем initialTypes, но можем добавить функцию принудительной перезагрузки) ---
const loadTypes = async () => {
    isLoading.value = true;
    try {
        // Можно перезагрузить с сервера, если нужно
        const response = await getAllTypesAdmin();
        types.value = response.data;
        emit('typesUpdated', [...types.value]); // Уведомляем родителя
    } catch (err) {
        console.error("Ошибка загрузки типов:", err);
        message.error(`Не удалось загрузить типы: ${err.response?.data?.message || err.message}`);
    } finally {
        isLoading.value = false;
    }
};

// Обновляем локальное состояние, если initialTypes изменились извне
watch(() => props.initialTypes, (newTypes) => {
    types.value = [...newTypes];
}, { deep: true });


// --- Логика модального окна ---
const openAddModal = () => {
    currentTypeData.value = null;
    isSavingType.value = false;
    showTypeModal.value = true;
};

const openEditModal = (type) => {
    // Передаем копию объекта, чтобы изменения в модалке не отражались сразу в таблице
    currentTypeData.value = { ...type };
    isSavingType.value = false;
    showTypeModal.value = true;
};

const handleCloseTypeModal = () => {
    showTypeModal.value = false;
    currentTypeData.value = null;
};

const handleSaveType = async (typeData) => {
    isSavingType.value = true;
    isSaving.value = true;
    try {
        let action = '';
        let savedType;
        if (typeData.id) {
            const response = await updateTypeAdmin(typeData.id, { type_value: typeData.type_value, label: typeData.label });
            savedType = response.data; // Бэкенд должен вернуть обновленный объект
            action = 'обновлен';
        } else {
            const response = await createTypeAdmin({ type_value: typeData.type_value, label: typeData.label });
            savedType = response.data; // Бэкенд должен вернуть созданный объект
            action = 'создан';
        }

        // Обновляем локальный массив типов
        if (typeData.id) {
            const index = types.value.findIndex(t => t.id === typeData.id);
            if (index !== -1) types.value.splice(index, 1, savedType);
        } else {
            types.value.push(savedType);
        }
        emit('typesUpdated', [...types.value]); // Уведомляем родителя об изменениях

        showTypeModal.value = false;
        message.success(`Тип ОАН успешно ${action}!`);
        // Перезагрузка не нужна, так как обновили локально и уведомили родителя
        // await loadTypes();
    } catch (err) {
        console.error("Ошибка сохранения типа:", err);
        message.error(`Ошибка сохранения типа: ${err.response?.data?.message || err.message}`);
    } finally {
        isSavingType.value = false;
        isSaving.value = false;
    }
};

// --- Удаление ---
const confirmDeleteType = (typeId, typeLabel) => {
    dialog.warning({
        title: 'Подтверждение удаления',
        content: `Вы уверены, что хотите удалить тип "${typeLabel}" (ID: ${typeId})? Это действие может повлиять на связанные точки.`,
        positiveText: 'Удалить',
        negativeText: 'Отмена',
        onPositiveClick: async () => {
            isSaving.value = true;
            try {
                await deleteTypeAdmin(typeId);
                // Удаляем из локального массива
                types.value = types.value.filter(t => t.id !== typeId);
                emit('typesUpdated', [...types.value]); // Уведомляем родителя
                message.success(`Тип "${typeLabel}" успешно удален.`);
                // await loadTypes(); // Можно перезагрузить для полной синхронизации
            } catch (err) {
                console.error(`Ошибка удаления типа:`, err);
                // Проверяем, есть ли ошибка о связанных записях (зависит от ответа бэкенда)
                const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
                if (err.response?.status === 409 || detail?.includes('foreign key constraint')) { // Пример проверки
                    message.error(`Невозможно удалить тип "${typeLabel}", так как он используется в точках.`);
                } else {
                    message.error(`Ошибка удаления типа: ${detail}`);
                }
            } finally {
                isSaving.value = false;
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
        h(NButton, {
            size: 'tiny', type: 'warning', ghost: true, disabled: isSaving.value || isLoading.value,
            onClick: () => openEditModal(row), // Передаем весь объект строки
        }, { default: () => 'Ред.' }),
        h(NButton, {
            size: 'tiny', type: 'error', ghost: true, disabled: isSaving.value || isLoading.value,
            onClick: () => confirmDeleteType(row.id, row.label),
        }, { default: () => 'Удал.' }),
    ]);
};

const typeColumns = [
    { title: 'ID', key: 'id', width: 60, sorter: 'default' },
    { title: 'Ключ (type_value)', key: 'type_value', resizable: true, sorter: 'default' },
    { title: 'Название (label)', key: 'label', resizable: true, ellipsis: { tooltip: true }, sorter: 'default' },
    { title: 'Действия', key: 'actions', width: 100, align: 'center', render: renderActions },
];

// --- Жизненный цикл ---
// onMounted(() => {
//   // loadTypes(); // Загружаем при монтировании, если не полагаемся только на initialTypes
// });

</script>

<style scoped>
.n-data-table {
    margin-bottom: 20px;
}
</style>