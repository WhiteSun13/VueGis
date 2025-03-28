<template>
  <div class="page-container">
    <HeaderTools class="header" :is-active="isActive" @toggle="toggleState">
      <DropdownCheckbox v-model:filters="AON_TYPES" v-model:selectedFilters="AON_TYPES_selected">
        Тип ОАН ▼
      </DropdownCheckbox>
      <DropdownCheckbox v-model:filters="AON_EPOCHES" v-model:selectedFilters="AON_EPOCHES_selected">
        Эпоха ▼
      </DropdownCheckbox>
      <n-dropdown trigger="click" :options="colorizeFilterOptions"
        @select="handleSelect">
        <n-button>Раскраска ▼</n-button>
      </n-dropdown>
    </HeaderTools>
    <YandexMap class="map-container"
      :api-key="YM_API_KEY"
      :center="[34.36, 45.15]"
      :zoom="8"
      :filters="{ types: AON_TYPES_selected, epochs: AON_EPOCHES_selected, colorBy: COLORIZE_FILTER, types_list: AON_TYPES, epochs_list: AON_EPOCHES}"
      @map-click="getAddress"
    />
    <FooterLegenda class="footer" :filters="[AON_TYPES, AON_EPOCHES]" :filters_selected="{ types: AON_TYPES_selected, epochs: AON_EPOCHES_selected, colorBy: COLORIZE_FILTER }"></FooterLegenda>
    <SearchByCoordModal
      ref="searchModalRef"
    />
  </div>
</template>

<script>
import { ref, onMounted, defineComponent } from 'vue';
import HeaderTools from '@/components/UI/Header.vue';
import YandexMap from '@/components/YandexMap.vue';
import FooterLegenda from '@/components/UI/FooterLegenda/FooterLegenda.vue';
import DropdownCheckbox from '@/components/UI/DropboxCheckboxs/DropdownCheckboxs.vue';
import SearchByCoordModal from '@/components/SearchByCoordModal.vue';
import { NDropdown, NButton } from 'naive-ui';

export default defineComponent({
  name: 'App',
  components: {
    HeaderTools,
    YandexMap,
    DropdownCheckbox,
    SearchByCoordModal,
    FooterLegenda,
    NDropdown,
    NButton,
  },
  setup() {
    // Задаём реактивные переменные для фильтров
    const AON_TYPES = ref([]);
    const AON_EPOCHES = ref([]);
    const AON_TYPES_selected = ref([]);
    const AON_EPOCHES_selected = ref([]);
    const COLORIZE_FILTER = ref("byType");
    const isActive = ref(false);
    const searchModalRef = ref(null);

    // Функция для загрузки фильтров с сервера
    const loadFilters = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/filters');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        AON_TYPES.value = data.types.map(item => ({
          id: item.id,
          value: item.id,
          label: item.label
        }));
        AON_EPOCHES.value = data.epochs.map(item => ({
          id: item.id,
          value: item.id,
          label: item.label
        }));

        // Выбираем все значения по умолчанию (или задаём логику выбора)
        AON_TYPES_selected.value = AON_TYPES.value.map(item => item.id);
        AON_EPOCHES_selected.value = AON_EPOCHES.value.map(item => item.id);
      } catch (err) {
        console.error('Ошибка при загрузке фильтров:', err);
      }
    };

    onMounted(() => {
      loadFilters();
    });

    const toggleState = () => {
      isActive.value = !isActive.value;
    };

    const getAddress = async (coords) => {
      if (!isActive.value) return;
      try {
        const response = await fetch(
          `http://localhost:3000/api/check-location?lon=${coords[0]}&lat=${coords[1]}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.status === "inside") {
          searchModalRef.value.setAddressData(data);
        }
      } catch (err) {
        console.error('Ошибка при запросе:', err);
        alert(err.message);
      } finally {
        toggleState();
      }
    };

    return {
      isActive,
      YM_API_KEY: import.meta.env.VITE_YANDEX_MAPS_API_KEY,
      toggleState,
      getAddress,
      AON_TYPES,
      AON_EPOCHES,
      AON_TYPES_selected,
      AON_EPOCHES_selected,
      COLORIZE_FILTER,
      searchModalRef,
      colorizeFilterOptions: [
        { label: 'Тип', key: 'byType' },
        { label: 'Эпоха', key: 'byEpoch' },
        { label: 'Без раскраски', key: 'oneColor' },
      ],
      handleSelect(key) {
        COLORIZE_FILTER.value = String(key);
      },
    };
  },
});

</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

.header {
  flex-shrink: 0;
}

.map-container {
  flex: 1 1 auto;
  position: relative;
  min-height: 0;
}
</style>