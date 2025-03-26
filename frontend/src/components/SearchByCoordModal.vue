<template>
    <n-modal v-model:show="internalShow">
      <n-card class="modal-card"
        style="width: 600px"
        title="Поиск по местности"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
        closable
        @close="closeModal"
      >
        <template #header-extra>
          <!-- Дополнительный контент в header -->
        </template>
        <n-h5>Запрос:</n-h5>
        <div>{{ displayQuery }}</div>
        <n-h5>Параметры:</n-h5>
        <n-flex>
          <n-radio-group
            v-model:value="searchAddress.areaType"
            name="areaType"
          >
            <n-radio-button value="Settlement">Поселение</n-radio-button>
            <n-radio-button value="SettlementArea">Поселение, район</n-radio-button>
            <n-radio-button value="Area">Район</n-radio-button>
          </n-radio-group>
          <n-checkbox v-model:checked="searchAddress.addCrimea">Крым</n-checkbox>
        </n-flex>
        <n-h5>Поисковая система:</n-h5>
        <n-radio-group
          v-model:value="searchAddress.searchEngine"
          name="searchEngine"
        >
          <n-radio-button value="Elibrary">Elibrary</n-radio-button>
          <n-radio-button value="Yandex">Яндекс</n-radio-button>
          <n-radio-button value="Google">Google</n-radio-button>
        </n-radio-group>
        <template #footer>
          <n-button type="primary" @click="onSearch">Искать</n-button>
        </template>
      </n-card>
    </n-modal>
  </template>
  
  <script>
  import { ref, computed } from 'vue';
  import { NModal, NCard, NButton, NRadioGroup, NRadioButton, NH5, NCheckbox, NFlex } from 'naive-ui';
  import { getElibrarySearchLink, getYandexSearchLink, getGoogleSearchLink } from './services/utils.vue';
  
  export default {
    name: 'SearchByCoordModal',
    components: { NModal, NCard, NButton, NRadioGroup, NRadioButton, NH5, NCheckbox, NFlex },
    emits: ['update:show', 'search'],
    setup(props, { expose }) {
      const internalShow = ref(false);
  
      // Внутреннее состояние для адреса
      const searchAddress = ref({
        adminArea: "",
        settlement: "",
        areaType: "SettlementArea",
        addCrimea: false,
        searchEngine: "Elibrary",
      });
  
      // Вычисляемый запрос, используемый и для отображения, и для поиска
      const displayQuery = computed(() => {
        let query = "";
        if (searchAddress.value.areaType === "Area" || searchAddress.value.areaType === "SettlementArea") {
          query += searchAddress.value.adminArea + " ";
        }
        if (searchAddress.value.areaType === "Settlement" || searchAddress.value.areaType === "SettlementArea") {
          query += searchAddress.value.settlement + " ";
        }
        if (searchAddress.value.addCrimea) {
          query += "Крым";
        }
        return query.trim();
      });
  
      const closeModal = () => {
        internalShow.value = false;
      };
  
      const onSearch = () => {
        const query = displayQuery.value;
        var url;
  
        switch (searchAddress.value.searchEngine) {
          case "Elibrary":
            url = getElibrarySearchLink(query);
            break;
          case "Yandex":
            url = getYandexSearchLink(query);
            break;
          case "Google":
            url = getGoogleSearchLink(query);
            break;
          default:
            console.warn("Неизвестная поисковая система:", searchAddress.value.searchEngine);
            return;
        }
        window.open(url, '_blank').focus();
      };
  
      // Метод для установки данных адреса, полученных от родительского компонента
      const setAddressData = (data) => {
        if (data.status === "inside") {
          searchAddress.value.adminArea = data.name_ru || "";
          searchAddress.value.settlement = data.name || "";
          internalShow.value = true;
        }
      };
  
      // Экспонируем метод для доступа из родительского компонента
      expose({ setAddressData });
  
      return {
        internalShow,
        searchAddress,
        displayQuery,
        closeModal,
        onSearch,
      };
    },
  };
  </script>