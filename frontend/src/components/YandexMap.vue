<template>
    <div ref="map" style="width: 100%; height: 100%;"></div>
</template>

<script>
import { watch } from 'vue';
import axios from 'axios'
import { getElibrarySearchLink } from './services/utils.vue';

export default {
    name: 'YandexMap',
    props: {
        apiKey: {
            type: String,
            required: true
        },
        center: {
            type: Array,
            default: () => [45.28, 34.19]
        },
        zoom: {
            type: Number,
            default: 7
        },
        filters: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            iconsets: ['islands#blueIcon', 'islands#darkGreenIcon', 'islands#redIcon',
                'islands#violetIcon', 'islands#darkOrangeIcon', 'islands#blackIcon', 'islands#nightIcon',
                'islands#yellowIcon', 'islands#darkBlueIcon', 'islands#greenIcon', 'islands#pinkIcon',
                'islands#grayIcon', 'islands#lightBlueIcon', 'islands#brownIcon', 'islands#oliveIcon', 'islands#orangeIcon'],
        };
    },
    mounted() {
        this.loadYandexMap();
    },
    methods: {
        loadYandexMap() {
            const script = document.createElement('script');
            script.src = `https://api-maps.yandex.ru/2.1/?apikey=${this.apiKey}&lang=ru_RU&coordorder=longlat`;
            script.onload = this.initMap;
            document.head.appendChild(script);
        },
        initMap() {
            ymaps.ready(() => {
                const map = new ymaps.Map(this.$refs.map, {
                    center: this.center,
                    zoom: this.zoom
                });

                // Open Street Map слой //
                var OSMLayer = function () {
                    var layer = new ymaps.Layer('https://tile.openstreetmap.org/%z/%x/%y.png', {
                        projection: ymaps.projection.sphericalMercator
                    });
                    layer.getZoomRange = function () {
                        return ymaps.vow.resolve([0, 19]);
                    };
                    return layer;
                };

                ymaps.layer.storage.add('osm#layer', OSMLayer);
                var myMapType = new ymaps.MapType('Open Street Map', ['osm#layer']);
                ymaps.mapType.storage.add('osm#mapType', myMapType);
                var typeSelector = map.controls.get('typeSelector');
                typeSelector.addMapType('osm#mapType', 10);


                // Обработчик кликов на карте //
                map.events.add('click', (e) => {
                    const coords = e.get('coords');
                    this.$emit('map-click', coords);
                });


                // Создаем LoadingObjectManager с шаблоном URL и callback //
                let loader = new ymaps.LoadingObjectManager(
                    'http://localhost:3000/api/data?bbox=%b',
                    {
                        paddingTemplate: "myCallback_%b",
                        jsonp: true,
                        clusterize: true,
                        gridSize: 64,
                        clusterIconLayout: "default#pieChart",
                        geoObjectOpenBalloonOnClick: false
                    }
                );

                // Применение фильтров (смотрим изменения во всех группах фильтров)
                watch(() => this.filters, (newFilters) => {
                    loader.setFilter(() => { return false; });
                    loader.setFilter(this.getFilterFunction(newFilters, loader));
                }, { deep: true });

                loader.objects.events.add(["add"], (object) => {
                    const geoObject = object.get("child");
                    if (geoObject.geometry.type === "Point") {
                        let typeIndex = this.filters.types.indexOf(geoObject.properties.type);
                        geoObject.options.preset = this.iconsets[typeIndex < 16 ? typeIndex : 15];
                    }
                });

                // Функция для получения описания точки с сервера по её id
                function loadBalloonData(objectId) {
                    var dataDeferred = ymaps.vow.defer();
                    axios.get(`http://localhost:3000/api/points/${objectId}`)
                        .then(response => {
                            dataDeferred.resolve(
                                `<h3>${response.data.name}</h3>
                                <b>Тип:</b> ${response.data.type}<br>
                                <b>Эпоха:</b> ${response.data.epoch}<br>
                                <b>Район:</b> ${response.data.admin_division_name}<br>
                                ${response.data.description != null ? response.data.description : "Описание отсутствует"}<br>
                                <a href="${getElibrarySearchLink(response.data.name)}" target="_blank" rel="noopener noreferrer">Поиск в Elibrary</a>`);
                        })
                        .catch(error => {
                            console.error('Ошибка при загрузке описания:', error);
                            dataDeferred.reject(error);
                            throw error;
                    });
                    return dataDeferred.promise();
                }

                function hasBalloonData(objectId) {
                    return loader.objects.getById(objectId).properties.balloonContent;
                }

                loader.objects.events.add('click', function (e) {
                    var objectId = e.get('objectId'),
                        obj = loader.objects.getById(objectId);
                    if (hasBalloonData(objectId)) {
                        loader.objects.balloon.open(objectId);
                    } else {
                        obj.properties.balloonContent = "Идет загрузка данных...";
                        loader.objects.balloon.open(objectId);
                        loadBalloonData(objectId).then(function (data) {
                            obj.properties.balloonContent = data;
                            loader.objects.balloon.setData(obj);
                        });
                    }
                });

                map.geoObjects.add(loader);
            });
        },
        getFilterFunction(filters, loader) {
            return (obj) => {
                // Получаем индекс типа в массиве filters.types
                let typeIndex = filters.types.indexOf(obj.properties.type);
                let typeAllowed = typeIndex !== -1;

                // Получаем индекс эпохи в массиве filters.epochs
                let epochIndex = filters.epochs.indexOf(obj.properties.epoch);
                let epochAllowed = epochIndex !== -1;

                if (filters.colorBy == 'byType' && typeAllowed && typeIndex < 16) {
                    obj.options.preset = this.iconsets[typeIndex];
                    loader.objects.setObjectOptions(obj.id, { preset: this.iconsets[typeIndex] });
                } else if (filters.colorBy == 'byEpoch' && epochAllowed && epochIndex < 16) {
                    obj.options.preset = this.iconsets[epochIndex];
                    loader.objects.setObjectOptions(obj.id, { preset: this.iconsets[epochIndex] });
                } else {
                    obj.options.preset = this.iconsets[15];
                    loader.objects.setObjectOptions(obj.id, { preset: this.iconsets[15] });
                }


                return typeAllowed && epochAllowed;
            };
        }
    }
};
</script>