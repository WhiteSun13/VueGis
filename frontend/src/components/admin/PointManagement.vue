<template>
    <div>
        <!-- Секция управления Точками с кнопкой добавления -->
        <ManagementSection title="Управление точками" add-button-text="Добавить точку" :add-button-disabled="isSaving"
            @add="openAddModal">
            <!-- Спиннер во время загрузки или сохранения/удаления -->
            <n-spin :show="isLoading || isSaving" description="Загрузка/обработка точек...">
                <!-- Таблица точек -->
                <n-data-table v-if="!isLoading && points.length > 0" :columns="pointColumns" :data="points"
                    :bordered="true" :single-line="false" size="small" style="margin-top: 15px;" />
                <!-- Сообщение, если точки не найдены -->
                <n-empty v-else-if="!isLoading && points.length === 0" description="Точки не найдены"
                    style="padding: 20px;" />

                <!-- Пагинация -->
                <n-pagination v-if="totalPages > 1" v-model:page="currentPage" :page-count="totalPages"
                    :item-count="totalItems" :page-size="limit" show-quick-jumper show-size-picker
                    :page-sizes="[10, 15, 20, 50]" @update:page="handlePageChange" @update:page-size="handleSizeChange"
                    :disabled="isLoading || isSaving" style="margin-top: 20px; justify-content: center;">
                    <template #prefix="{ itemCount }">
                        Всего: {{ itemCount }}
                    </template>
                </n-pagination>
            </n-spin>
        </ManagementSection>

        <!-- Модальное окно для добавления/редактирования точек -->
        <PointFormModal v-model:show="showPointModal" :item-data="currentPointData" :is-saving="isSavingPoint"
            :is-loading-data="isLoadingPointData" :types="types" :epochs="epochs" @save="handleSavePoint"
            @close="handleClosePointModal" />
    </div>
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue';
import {
    NSpin, NDataTable, NPagination, NEmpty, NButton, NSpace, useMessage, useDialog
} from 'naive-ui';
import ManagementSection from './ManagementSection.vue';
import PointFormModal from './PointFormModal.vue';
// Импортируем функции API
import {
    getAllPointsAdmin, createPointAdmin, updatePointAdmin, deletePointAdmin, fetchPointInfo
} from '@/components/services/api';

const props = defineProps({
    // Типы и эпохи нужны для передачи в модальное окно
    types: { type: Array, required: true },
    epochs: { type: Array, required: true },
});

const message = useMessage();
const dialog = useDialog();

// --- Состояния ---
const isLoading = ref(false); // Общая загрузка таблицы
const isSaving = ref(false);  // Сохранение/удаление (блокировка действий в таблице)
const points = ref([]);

// Пагинация
const currentPage = ref(1);
const limit = ref(15);
const totalPages = ref(1);
const totalItems = ref(0);

// Состояния для модального окна точки
const showPointModal = ref(false);
const currentPointData = ref(null); // Данные для редактирования/добавления
const isSavingPoint = ref(false); // Сохранение конкретной точки
const isLoadingPointData = ref(false); // Загрузка данных точки для редактирования

// --- Загрузка данных ---
const loadPoints = async (page = currentPage.value, size = limit.value) => {
    isLoading.value = true;
    try {
        const response = await getAllPointsAdmin(page, size);
        points.value = response.data.items;
        totalItems.value = response.data.totalItems;
        totalPages.value = response.data.totalPages;
        // Устанавливаем корректную текущую страницу (может измениться из-за удаления)
        currentPage.value = Math.min(response.data.currentPage, totalPages.value || 1);
    } catch (err) {
        console.error("Ошибка загрузки точек:", err);
        message.error(`Не удалось загрузить точки: ${err.response?.data?.message || err.message}`);
    } finally {
        isLoading.value = false;
    }
};

// --- Обработчики пагинации ---
const handlePageChange = (page) => {
    currentPage.value = page;
    loadPoints(page, limit.value);
};

const handleSizeChange = (size) => {
    limit.value = size;
    currentPage.value = 1; // Сбрасываем на первую страницу
    loadPoints(1, size);
};

// --- Логика модального окна ---
const openAddModal = () => {
    currentPointData.value = null; // Сбрасываем данные для добавления
    isLoadingPointData.value = false;
    isSavingPoint.value = false;
    showPointModal.value = true;
};

const openEditModal = async (pointId) => {
    currentPointData.value = null; // Сбрасываем сначала
    isLoadingPointData.value = true;
    isSavingPoint.value = false;
    showPointModal.value = true; // Открываем сразу со спиннером
    try {
        // Используем fetchPointInfo для получения ПОЛНЫХ данных точки
        const response = await fetchPointInfo(pointId);
        const data = response.data;
        // Преобразуем данные в формат, ожидаемый модалкой (с ID для type/epoch)
        currentPointData.value = {
            id: data.id, // Убедимся что ID тоже передается
            name: data.name,
            latitude: data.lat,
            longitude: data.lon,
            // Находим ID по label, так как fetchPointInfo возвращает label
            type_id: props.types.find(t => t.label === data.type)?.id ?? null,
            epoch_id: props.epochs.find(e => e.label === data.epoch)?.id ?? null,
            // admin_division_id: props.adminDivisions.find(d => d.name === data.admin_division_name)?.id ?? null,
            short_description: data.short_description || '',
            description: data.description || ''
        };
    } catch (err) {
        console.error("Ошибка загрузки точки для редактирования:", err);
        message.error(`Не удалось загрузить данные точки: ${err.response?.data?.message || err.message}`);
        showPointModal.value = false; // Закрываем модалку в случае ошибки
    } finally {
        isLoadingPointData.value = false;
    }
};


const handleClosePointModal = () => {
    showPointModal.value = false;
    currentPointData.value = null;
};

const handleSavePoint = async (pointData) => {
    isSavingPoint.value = true;
    isSaving.value = true; // Блокируем таблицу тоже
    try {
        let action = '';
        if (pointData.id) { // Если есть ID, значит редактируем
            await updatePointAdmin(pointData.id, pointData);
            action = 'обновлена';
        } else { // Иначе создаем новую
            await createPointAdmin(pointData);
            action = 'создана';
        }
        showPointModal.value = false;
        message.success(`Точка успешно ${action}!`);
        await loadPoints(currentPage.value, limit.value); // Обновляем список
    } catch (err) {
        console.error("Ошибка сохранения точки:", err);
        message.error(`Ошибка сохранения точки: ${err.response?.data?.message || err.message}`);
        // Оставляем модалку открытой для исправления ошибки
    } finally {
        isSavingPoint.value = false;
        isSaving.value = false;
    }
};

// --- Удаление ---
const confirmDeletePoint = (pointId, pointName) => {
    dialog.warning({
        title: 'Подтверждение удаления',
        content: `Вы уверены, что хотите удалить точку "${pointName}" (ID: ${pointId})? Это действие необратимо.`,
        positiveText: 'Удалить',
        negativeText: 'Отмена',
        onPositiveClick: async () => {
            isSaving.value = true; // Блокируем кнопки
            try {
                await deletePointAdmin(pointId);
                message.success(`Точка "${pointName}" успешно удалена.`);
                // Пересчитываем страницу перед перезагрузкой
                const newTotalItems = totalItems.value - 1;
                const newTotalPages = Math.ceil(newTotalItems / limit.value);
                let pageToLoad = currentPage.value;
                if (points.value.length === 1 && currentPage.value > 1 && currentPage.value > newTotalPages) {
                    pageToLoad = currentPage.value - 1;
                }
                await loadPoints(pageToLoad, limit.value); // Загружаем нужную страницу
            } catch (err) {
                console.error(`Ошибка удаления точки:`, err);
                message.error(`Ошибка удаления точки: ${err.response?.data?.message || err.message}`);
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
            onClick: () => openEditModal(row.id), // Вызываем openEditModal
        }, { default: () => 'Ред.' }),
        h(NButton, {
            size: 'tiny', type: 'error', ghost: true, disabled: isSaving.value || isLoading.value,
            onClick: () => confirmDeletePoint(row.id, row.name), // Передаем ID и имя
        }, { default: () => 'Удал.' }),
    ]);
};

const pointColumns = [
    { title: 'ID', key: 'id', width: 60, sorter: 'default' },
    { title: 'Название', key: 'name', resizable: true, ellipsis: { tooltip: true }, sorter: 'default' },
    // Используем данные из связанных таблиц, которые приходят в ответе getAllPointsAdmin
    { title: 'Тип', key: 'type.label', width: 150, ellipsis: { tooltip: true }, sorter: (a, b) => (a.type?.label ?? '').localeCompare(b.type?.label ?? '') },
    { title: 'Эпоха', key: 'epoch.label', width: 150, ellipsis: { tooltip: true }, sorter: (a, b) => (a.epoch?.label ?? '').localeCompare(b.epoch?.label ?? '') },
    // { title: 'Район', key: 'admin_division.name', width: 180, ellipsis: { tooltip: true }, sorter: (a, b) => (a.admin_division?.name ?? '').localeCompare(b.admin_division?.name ?? '') },
    { title: 'Координаты', key: 'coords', width: 150, render: (row) => `${row.latitude?.toFixed(5)}, ${row.longitude?.toFixed(5)}` },
    { title: 'Действия', key: 'actions', width: 100, align: 'center', render: renderActions },
];

// --- Жизненный цикл ---
onMounted(() => {
    loadPoints(); // Загружаем точки при монтировании компонента
});

</script>

<style scoped>
.n-data-table {
    margin-bottom: 20px;
}
</style>