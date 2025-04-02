// frontend/src/components/admin/utils/mapUtils.js
import { ref } from 'vue';

// --- Состояние для карты в модальном окне точки ---
export const showMapInModal = ref(false); // Показать/скрыть карту
export const modalMapContainerRef = ref(null); // Ссылка на div карты
export const isLoadingModalMap = ref(false); // Состояние загрузки карты в модальном окне

// НЕ ДЕЛАЕМ ЭТИ ПЕРЕМЕННЫЕ РЕАКТИВНЫМИ, храним просто ссылки
let mapInstance = null; // Экземпляр карты (не ref)
let mapPlacemark = null; // Метка на карте (не ref)
let mapClickEventHandler = null; // Ссылка на обработчик клика карты
let placemarkDragEndEventHandler = null; // Ссылка на обработчик перетаскивания
let searchResultSelectEventHandler = null; // Ссылка на обработчик поиска

const YM_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY; // Получаем ключ API
let ymapsApiLoaded = false; // Флаг, что API загружен
let ymapsApiLoading = false; // Флаг, что API грузится

// --- Функции для карты ---

// Загрузка API Яндекс.Карт
export const loadYmapsApi = () => {
    return new Promise((resolve, reject) => {
        if (ymapsApiLoaded) {
            resolve();
            return;
        }
        if (ymapsApiLoading) {
            const interval = setInterval(() => {
                if (ymapsApiLoaded) {
                    clearInterval(interval);
                    resolve();
                } else if (!ymapsApiLoading) {
                    clearInterval(interval);
                    reject(new Error("Ошибка при ожидании загрузки API Яндекс.Карт"));
                }
            }, 100);
            return;
        }

        ymapsApiLoading = true;
        const script = document.createElement('script');
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YM_API_KEY}&lang=ru_RU&coordorder=longlat`;
        script.onload = () => {
            window.ymaps.ready(() => { // Используем window.ymaps
                console.log("API Яндекс.Карт загружен и готов.");
                ymapsApiLoaded = true;
                ymapsApiLoading = false;
                resolve();
            });
        };
        script.onerror = (err) => {
            console.error("Ошибка загрузки скрипта API Яндекс.Карт:", err);
            ymapsApiLoading = false;
            reject(err);
        };
        document.head.appendChild(script);
    });
};

// Инициализация карты в модальном окне
export const initModalMap = async (currentPoint, onCoordsUpdate, showMessage) => {
    if (!ymapsApiLoaded) {
        try {
            isLoadingModalMap.value = true;
            await loadYmapsApi();
        } catch (apiErr) {
            isLoadingModalMap.value = false;
            showMessage?.error("Не удалось загрузить API Карт для отображения.");
            showMapInModal.value = false;
            return;
        }
    }

    if (!modalMapContainerRef.value) {
        console.error("Контейнер для карты в модалке не найден!");
        return;
    }

    isLoadingModalMap.value = true;

    try {
        await window.ymaps.ready(); // Ждем готовности API

        const defaultCoords = [34.36, 45.15];
        const hasCurrentCoords = currentPoint.latitude != null && currentPoint.longitude != null;
        const initialCoords = hasCurrentCoords
            ? [currentPoint.longitude, currentPoint.latitude]
            : defaultCoords;
        const initialZoom = hasCurrentCoords ? 15 : 8;

        destroyModalMap(); // Уничтожаем предыдущий экземпляр

        mapInstance = new window.ymaps.Map(modalMapContainerRef.value, {
            center: initialCoords,
            zoom: initialZoom,
            controls: ['zoomControl', 'searchControl', 'geolocationControl', 'typeSelector'] // Добавим контролы
        });

        mapPlacemark = new window.ymaps.Placemark(initialCoords, {}, {
            preset: 'islands#redDotIcon',
            draggable: true
        });

        mapInstance.geoObjects.add(mapPlacemark);

        const handleMapClick = (e) => {
            const coords = e.get('coords');
            if (coords) {
                const [lon, lat] = coords;
                onCoordsUpdate(parseFloat(lat.toFixed(6)), parseFloat(lon.toFixed(6)));
                if (mapPlacemark) {
                    mapPlacemark.geometry.setCoordinates(coords);
                }
            }
        };

        mapClickEventHandler = handleMapClick; // Сохраняем ссылку на новую функцию
        placemarkDragEndEventHandler = (e) => {
             const coords = mapPlacemark.geometry.getCoordinates();
             handleMapClick({ get: (key) => (key === 'coords' ? coords : null) });
        };
        searchResultSelectEventHandler = (e) => {
            const index = e.get('index');
            mapInstance.controls.get('searchControl').getResult(index).then((geoObject) => {
                 const coords = geoObject.geometry.getCoordinates();
                 mapInstance?.panTo(coords, { flying: true, duration: 500 });
                 handleMapClick({ get: (key) => (key === 'coords' ? coords : null) });
             });
        };

        mapInstance.events.add('click', mapClickEventHandler);
        mapPlacemark.events.add('dragend', placemarkDragEndEventHandler);
        // Добавляем обработчик searchControl после его инициализации
        mapInstance.controls.ready.then(() => {
             const searchControl = mapInstance.controls.get('searchControl');
             if (searchControl) {
                 searchControl.events.add('resultselect', searchResultSelectEventHandler);
             } else {
                 console.warn("SearchControl не найден после инициализации карты.");
             }
        });

        console.log("Карта в модалке инициализирована.");

    } catch (mapError) {
        console.error("Ошибка инициализации карты в модалке:", mapError);
        showMessage?.error("Ошибка при создании карты в модальном окне.");
        showMapInModal.value = false;
        destroyModalMap();
    } finally {
      isLoadingModalMap.value = false;
    }
};


// Уничтожение карты в модальном окне
export const destroyModalMap = () => {
    try {
        if (mapInstance) {
             if(mapClickEventHandler) mapInstance.events.remove('click', mapClickEventHandler);
             try { // Обернем получение контрола в try-catch
                const searchControl = mapInstance.controls.get('searchControl');
                if(searchControl && searchResultSelectEventHandler) searchControl.events.remove('resultselect', searchResultSelectEventHandler);
             } catch (controlError) {
                console.warn("Не удалось получить или удалить обработчик SearchControl:", controlError);
             }
             mapInstance.destroy();
        }
         if (mapPlacemark && placemarkDragEndEventHandler) {
            mapPlacemark.events.remove('dragend', placemarkDragEndEventHandler);
         }
    } catch (e) {
        console.error("Ошибка при удалении обработчиков или уничтожении карты:", e);
    } finally {
        mapInstance = null;
        mapPlacemark = null;
        mapClickEventHandler = null;
        placemarkDragEndEventHandler = null;
        searchResultSelectEventHandler = null;
        // Не меняем showMapInModal здесь
        console.log("Ресурсы карты в модалке очищены.");
    }
};

// Функция для обновления координат метки извне (например, при изменении инпутов)
export const updatePlacemarkCoords = (lat, lon) => {
    if (mapPlacemark && lat != null && lon != null) {
        const newCoords = [lon, lat];
        mapPlacemark.geometry.setCoordinates(newCoords);
    }
    // Можно добавить центрирование карты, если нужно
    // if (mapInstance) {
    //     mapInstance.setCenter(newCoords);
    // }
}