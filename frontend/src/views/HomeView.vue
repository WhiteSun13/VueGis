<template>
  <div class="page-container">
    <HeaderTools class="header" :is-active="isActive" @toggle="toggleState">
      <DropdownCheckbox v-model:filters="AON_TYPES" v-model:selectedFilters="AON_TYPES_selected">
        Тип ОАН ▼
      </DropdownCheckbox>
      <DropdownCheckbox v-model:filters="AON_EPOCHES" v-model:selectedFilters="AON_EPOCHES_selected">
        Эпоха ▼
      </DropdownCheckbox>
      <n-dropdown trigger="click" :options="colorizeFilterOptions" @select="handleSelect">
        <n-button>Раскраска ▼</n-button>
      </n-dropdown>
    </HeaderTools>
    <YandexMap
      class="map-container"
      :api-key="YM_API_KEY"
      :center="mapCenter"
      :zoom="mapZoom"
      :filters="{ types: AON_TYPES_selected, epochs: AON_EPOCHES_selected, colorBy: COLORIZE_FILTER, types_list: AON_TYPES, epochs_list: AON_EPOCHES }"
      @map-click="getAddress"
    />
    <FooterLegenda class="footer" :filters="[AON_TYPES, AON_EPOCHES]"
      :filters_selected="{ types: AON_TYPES_selected, epochs: AON_EPOCHES_selected, colorBy: COLORIZE_FILTER }">
    </FooterLegenda>
    <SearchByCoordModal ref="searchModalRef" />
  </div>
</template>

<script>
import { ref, onMounted, defineComponent } from 'vue';
// Импортируем useRoute для доступа к параметрам текущего маршрута
import { useRoute } from 'vue-router';
import HeaderTools from '@/components/UI/Header.vue';
import YandexMap from '@/components/YandexMap.vue';
import FooterLegenda from '@/components/UI/FooterLegenda/FooterLegenda.vue';
import DropdownCheckbox from '@/components/UI/DropboxCheckboxs/DropdownCheckboxs.vue';
import SearchByCoordModal from '@/components/SearchByCoordModal.vue';
import { NDropdown, NButton, NLayout, NLayoutHeader, NLayoutContent, NFlex, } from 'naive-ui';

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
    NLayout,
    NLayoutHeader,
    NLayoutContent,
    NFlex,
  },
  setup() {
    // Получаем доступ к текущему маршруту
    const route = useRoute();

    // --- Начало: Логика определения центра карты ---
    const defaultCenter = [34.36, 45.15]; // [longitude, latitude]
    const mapCenter = ref([...defaultCenter]); // Используем [...defaultCenter] для создания копии
    const latFromQuery = route.query.lat;
    const lonFromQuery = route.query.lon;

    if (latFromQuery && lonFromQuery) {
      const parsedLat = parseFloat(latFromQuery);
      const parsedLon = parseFloat(lonFromQuery);
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        mapCenter.value = [parsedLon, parsedLat];
        console.log('Центр карты установлен из параметров URL:', mapCenter.value);
      } else {
        console.warn('Некорректные значения lat/lon в URL, используется центр по умолчанию.');
      }
    } else {
      console.log('Параметры lat/lon в URL отсутствуют, используется центр по умолчанию.');
    }
    // --- Конец: Логика определения центра карты ---

    // --- Начало: Логика определения уровня масштабирования (Zoom) ---
    const defaultZoom = 8; // Уровень масштабирования по умолчанию
    const mapZoom = ref(defaultZoom); // Реактивная переменная для zoom
    const zoomFromQuery = route.query.z; // Получаем параметр 'zoom' из URL

    if (zoomFromQuery) {
      // Пытаемся преобразовать значение из URL в целое число
      const parsedZoom = parseInt(zoomFromQuery, 10); // Указываем основание 10

      // Проверяем, является ли результат валидным числом и находится ли в разумном диапазоне
      // (Yandex Maps обычно поддерживает zoom от 0 до 21, можно уточнить)
      if (!isNaN(parsedZoom) && parsedZoom >= 0 && parsedZoom <= 21) {
         mapZoom.value = parsedZoom;
         console.log('Уровень масштабирования установлен из параметра URL:', mapZoom.value);
      } else {
        // Если парсинг не удался или значение вне диапазона, выводим предупреждение
        console.warn('Некорректное или недопустимое значение zoom в URL, используется zoom по умолчанию.');
      }
    } else {
      // Если параметр zoom отсутствует, сообщаем, что используется значение по умолчанию
      console.log('Параметр zoom в URL отсутствует, используется zoom по умолчанию.');
    }
    // --- Конец: Логика определения уровня масштабирования (Zoom) ---


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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/filters`);
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
          `${import.meta.env.VITE_API_URL}/check-location?lon=${coords[0]}&lat=${coords[1]}`
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
      // Возвращаем mapCenter и mapZoom, чтобы использовать их в шаблоне
      mapCenter,
      mapZoom, // Добавлено
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