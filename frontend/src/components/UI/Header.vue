<template>
<header>
    <n-flex>
      <n-button @click="$emit('toggle')" type="primary">{{ isActive ? 'Укажите координату' : 'Поиск по местности' }}</n-button>
      <slot></slot>
    </n-flex>
</header>
</template>
  
<script>
import { NButton, NFlex } from 'naive-ui'

export default {
    components:{
      NButton, NFlex
    },
    props: {
      isActive: {
        type: Boolean,
        required: true,
      },
    },
};
  </script>

<style scoped>
    header{
        padding: 8px 10px;
    }
</style>