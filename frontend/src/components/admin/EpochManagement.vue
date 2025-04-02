<template>
    <div>
        <!-- Секция управления Эпохами -->
        <ManagementSection title="Управление эпохами" add-button-text="Добавить эпоху" :add-button-disabled="isSaving"
            @add="openAddModal">
            <!-- Спиннер во время загрузки или сохранения/удаления -->
            <n-spin :show="isLoading || isSaving" description="Загрузка/обработка эпох...">
                <!-- Таблица эпох -->
                <n-data-table v-if="!isLoading && epochs.length > 0" :columns="epochColumns" :data="epochs"
                    :bordered="true" :single-line="false" size="small" style="margin-top: 15px;" />
                <!-- Сообщение, если эпохи не найдены -->
                <n-empty v-else-if="!isLoading && epochs.length === 0" description="Эпохи не найдены"
                    style="padding: 20px;" />
            </n-spin>
        </ManagementSection>

        <!-- Модальное окно для добавления/редактирования эпох -->
        <EpochFormModal v-model:show="showEpochModal" :item-data="currentEpochData" :is-saving="isSavingEpoch"
            @save="handleSaveEpoch" @close="handleCloseEpochModal" />
    </div>
</template>

<script setup>
import { ref, onMounted, h, watch } from 'vue';
import {
    NSpin, NDataTable, NEmpty, NButton, NSpace, useMessage, useDialog
} from 'naive-ui';
import ManagementSection from './ManagementSection.vue';
import EpochFormModal from './EpochFormModal.vue';
// Импортируем функции API
import {
    getAllEpochsAdmin, createEpochAdmin, updateEpochAdmin, deleteEpochAdmin
} from '@/components/services/api';

const props = defineProps({
    // Получаем эпохи от родителя для инициализации и обновления
    initialEpochs: { type: Array, required: true },
});

const emit = defineEmits(['epochsUpdated']); // Событие для уведомления родителя об изменениях

const message = useMessage();
const dialog = useDialog();

// --- Состояния ---
const isLoading = ref(false);
const isSaving = ref(false); // Общее состояние сохранения/удаления для блокировки таблицы
const epochs = ref([...props.initialEpochs]); // Локальная копия для таблицы

// Состояния для модального окна
const showEpochModal = ref(false);
const currentEpochData = ref(null);
const isSavingEpoch = ref(false); // Сохранение конкретной эпохи

// --- Загрузка данных (используем initialEpochs, но можем добавить функцию принудительной перезагрузки) ---
const loadEpochs = async () => {
    isLoading.value = true;
    try {
        // Можно перезагрузить с сервера, если нужно
        const response = await getAllEpochsAdmin();
        epochs.value = response.data;
        emit('epochsUpdated', [...epochs.value]); // Уведомляем родителя
    } catch (err) {
        console.error("Ошибка загрузки эпох:", err);
        message.error(`Не удалось загрузить эпохи: ${err.response?.data?.message || err.message}`);
    } finally {
        isLoading.value = false;
    }
};

// Обновляем локальное состояние, если initialEpochs изменились извне
watch(() => props.initialEpochs, (newEpochs) => {
    epochs.value = [...newEpochs];
}, { deep: true });


// --- Логика модального окна ---
const openAddModal = () => {
    currentEpochData.value = null;
    isSavingEpoch.value = false;
    showEpochModal.value = true;
};

const openEditModal = (epoch) => {
    currentEpochData.value = { ...epoch }; // Передаем копию
    isSavingEpoch.value = false;
    showEpochModal.value = true;
};

const handleCloseEpochModal = () => {
    showEpochModal.value = false;
    currentEpochData.value = null;
};

const handleSaveEpoch = async (epochData) => {
    isSavingEpoch.value = true;
    isSaving.value = true;
    try {
        let action = '';
        let savedEpoch;
        if (epochData.id) {
            const response = await updateEpochAdmin(epochData.id, { epoch_value: epochData.epoch_value, label: epochData.label });
            savedEpoch = response.data;
            action = 'обновлена';
        } else {
            const response = await createEpochAdmin({ epoch_value: epochData.epoch_value, label: epochData.label });
            savedEpoch = response.data;
            action = 'создана';
        }

        // Обновляем локальный массив
        if (epochData.id) {
            const index = epochs.value.findIndex(e => e.id === epochData.id);
            if (index !== -1) epochs.value.splice(index, 1, savedEpoch);
        } else {
            epochs.value.push(savedEpoch);
        }
        emit('epochsUpdated', [...epochs.value]); // Уведомляем родителя

        showEpochModal.value = false;
        message.success(`Эпоха успешно ${action}!`);
        // await loadEpochs();
    } catch (err) {
        console.error("Ошибка сохранения эпохи:", err);
        message.error(`Ошибка сохранения эпохи: ${err.response?.data?.message || err.message}`);
    } finally {
        isSavingEpoch.value = false;
        isSaving.value = false;
    }
};

// --- Удаление ---
const confirmDeleteEpoch = (epochId, epochLabel) => {
    dialog.warning({
        title: 'Подтверждение удаления',
        content: `Вы уверены, что хотите удалить эпоху "${epochLabel}" (ID: ${epochId})? Это действие может повлиять на связанные точки.`,
        positiveText: 'Удалить',
        negativeText: 'Отмена',
        onPositiveClick: async () => {
            isSaving.value = true;
            try {
                await deleteEpochAdmin(epochId);
                epochs.value = epochs.value.filter(e => e.id !== epochId); // Удаляем локально
                emit('epochsUpdated', [...epochs.value]); // Уведомляем родителя
                message.success(`Эпоха "${epochLabel}" успешно удалена.`);
                // await loadEpochs();
            } catch (err) {
                console.error(`Ошибка удаления эпохи:`, err);
                const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
                if (err.response?.status === 409 || detail?.includes('foreign key constraint')) {
                    message.error(`Невозможно удалить эпоху "${epochLabel}", так как она используется в точках.`);
                } else {
                    message.error(`Ошибка удаления эпохи: ${detail}`);
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
            onClick: () => openEditModal(row),
        }, { default: () => 'Ред.' }),
        h(NButton, {
            size: 'tiny', type: 'error', ghost: true, disabled: isSaving.value || isLoading.value,
            onClick: () => confirmDeleteEpoch(row.id, row.label),
        }, { default: () => 'Удал.' }),
    ]);
};

const epochColumns = [
    { title: 'ID', key: 'id', width: 60, sorter: 'default' },
    { title: 'Ключ (epoch_value)', key: 'epoch_value', resizable: true, sorter: 'default' },
    { title: 'Название (label)', key: 'label', resizable: true, ellipsis: { tooltip: true }, sorter: 'default' },
    { title: 'Действия', key: 'actions', width: 100, align: 'center', render: renderActions },
];

// --- Жизненный цикл ---
// onMounted(() => {
//   // loadEpochs(); // Загружаем при монтировании, если нужно
// });

</script>

<style scoped>
.n-data-table {
    margin-bottom: 20px;
}
</style>