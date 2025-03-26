<template>
  <n-config-provider :locale="ruRU" :date-locale="dateRuRU">
    <div id="app">
        <router-view />
    </div>
  </n-config-provider>
</template>

<script>
  import { defineComponent } from 'vue'
  import { NConfigProvider } from 'naive-ui'
  import { ruRU, dateRuRU } from 'naive-ui'
  
  export default defineComponent({
    name: "app",
    components: {
      NConfigProvider
    },
    setup() {
      return {
        ruRU,
        dateRuRU
      }
    }
  })
</script>