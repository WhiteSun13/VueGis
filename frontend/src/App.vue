<template>
  <n-config-provider :locale="ruRU" :date-locale="dateRuRU">
    <!-- Оборачиваем в провайдеры Naive UI -->
    <n-message-provider>
      <n-dialog-provider>
        <div id="app">
            <router-view />
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script>
  import { defineComponent } from 'vue'
  // Импортируем нужные компоненты
  import { NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
  import { ruRU, dateRuRU } from 'naive-ui'

  export default defineComponent({
    name: "app",
    components: {
      NConfigProvider,
      NMessageProvider, // Регистрируем
      NDialogProvider   // Регистрируем
    },
    setup() {
      return {
        ruRU,
        dateRuRU
      }
    }
  })
</script>