<template>
    <section class="admin-section">
        <div class="section-header">
            <!-- Заголовок секции, передается через пропс title -->
            <n-h4 style="margin: 0;">{{ title }}</n-h4>
            <!-- Кнопка "Добавить", текст передается через пропс addButtonText -->
            <!-- Событие 'add' эмитится при клике на кнопку -->
            <n-button type="success" @click="$emit('add')" :disabled="addButtonDisabled" size="small">
                <template #icon>
                    <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
                        </svg></n-icon>
                </template>
                {{ addButtonText }}
            </n-button>
        </div>
        <!-- Слот для вставки основного контента секции (например, таблицы) -->
        <slot></slot>
    </section>
</template>

<script setup>
import { NH4, NButton, NIcon } from 'naive-ui';

// Определяем пропсы компонента
defineProps({
    // Заголовок секции
    title: {
        type: String,
        required: true,
    },
    // Текст на кнопке добавления
    addButtonText: {
        type: String,
        default: 'Добавить',
    },
    // Флаг для отключения кнопки добавления (например, во время сохранения)
    addButtonDisabled: {
        type: Boolean,
        default: false,
    },
});

// Определяем события, которые компонент может генерировать
defineEmits(['add']); // Событие 'add' при клике на кнопку добавления
</script>

<style scoped>
/* Стили, перенесенные из AdminPanelView.vue */
.admin-section {
    margin-top: 10px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}
</style>