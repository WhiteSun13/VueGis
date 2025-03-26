<template>
    <span v-for="(item, index) in items" :key="index">
        <div>
            <n-avatar round :size="15" :style="{ backgroundColor: item.color }"></n-avatar>
            {{ item.label }}
        </div>
    </span>
</template>

<script>
import { defineComponent } from 'vue'
import { NAvatar } from 'naive-ui'

export default defineComponent({
    name: "LegendItem",
    components: { NAvatar },
    props: {
        items: { type: Array, required: true }
    }
});
</script>