<template>
    <n-layout-footer class="footerLegenda" bordered >
        <n-flex v-if="filters_selected.colorBy === 'byType'">
            <LegendItem :items="filteredTypes" />
        </n-flex>
        <n-flex v-else-if="filters_selected.colorBy === 'byEpoch'">
            <LegendItem :items="filteredEpochs"/>
        </n-flex>
        <n-flex v-else-if="filters_selected.colorBy === 'oneColor'">
            <LegendItem :items="[{ value: 'oneColor', label: 'Археологический памятник', color: '#ff931e' }]" />
        </n-flex>
    </n-layout-footer>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { NAvatar, NFlex, NLayoutFooter } from 'naive-ui'
import LegendItem from './LegendItem.vue'

export default defineComponent({
    name: "FooterLegenda",
    components: { NAvatar, NFlex, NLayoutFooter, LegendItem },
    props: {
        filters: { type: Array, required: true },
        filters_selected: { type: Object, required: true }
    },
    setup(props) {
        const colors_list = [
            "#1e98ff", "#1bad03", "#ed4543", "#b51eff", "#e6761b", "#595959", "#0e4779",
            "#ffd21e", "#177bc9", "#56db40", "#f371d1", "#b3b3b3", "#82cdff", "#793d0e", "#97a100", "#ff931e"
        ];

        const filteredTypes = computed(() => {
            return props.filters_selected.types.slice(0, 15).map((type, index) => ({
                value: type,
                label: props.filters[0].find(i => i.value === type)?.label || 'Неизвестно',
                color: colors_list[index]
            })).concat(props.filters_selected.types.length > 15 ? [{ label: "Прочее", color: colors_list[15] }] : []);
        });

        const filteredEpochs = computed(() => {
            return props.filters_selected.epochs.slice(0, 15).map((epoch, index) => ({
                value: epoch,
                label: props.filters[1].find(i => i.value === epoch)?.label || 'Неизвестно',
                color: colors_list[index]
            })).concat(props.filters_selected.epochs.length > 15 ? [{ label: "Прочее", color: colors_list[15] }] : []);
        });

        return { filteredTypes, filteredEpochs };
    }
});
</script>

<style>
@import './FooterLegenda.css';
</style>
