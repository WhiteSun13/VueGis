<template>
    <n-layout-header bordered style="padding: 10px 20px; height: 60px; display: flex; align-items: center;">
        <n-flex justify="space-between" style="width: 100%;">
            <n-h3 style="margin: 0;">Панель администратора</n-h3>
            <n-space align="center">
                <!-- Отображаем имя пользователя, если оно передано -->
                <span v-if="username" style="font-size: 0.9em;">Привет, {{ username }}!</span>
                <!-- Кнопка выхода, событие logout эмитится при клике -->
                <n-button type="error" ghost @click="$emit('logout')" :loading="logoutLoading" size="small">
                    Выход
                </n-button>
            </n-space>
        </n-flex>
    </n-layout-header>
</template>

<script setup>
import { NLayoutHeader, NFlex, NH3, NSpace, NButton } from 'naive-ui';

// Определяем пропсы, которые компонент ожидает получить
defineProps({
    // Имя пользователя для отображения
    username: {
        type: String,
        default: null, // По умолчанию null, если имя не передано
    },
    // Состояние загрузки для кнопки выхода
    logoutLoading: {
        type: Boolean,
        default: false, // По умолчанию не загружается
    },
});

// Определяем события, которые компонент может генерировать
defineEmits(['logout']); // Событие 'logout' для обработки выхода пользователя
</script>