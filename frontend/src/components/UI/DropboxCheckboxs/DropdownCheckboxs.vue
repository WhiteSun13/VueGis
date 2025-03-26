<template>
    <n-dropdown class="dropdown-checkboxs" trigger="click" :options="options">
        <n-button><slot></slot></n-button>
    </n-dropdown>
</template>

<script>
import { ref, h } from 'vue';
import { NButton, NCheckbox, NTransfer, NDropdown } from 'naive-ui'

export default {
    name: 'DropdownCheckbox',
    props: {
        filters: {
            type: Array,
            required: true
        },
        selectedFilters: {
            type: Array,
            required: true
        }
    },
    components: {
        NButton, NCheckbox, NTransfer, NDropdown
    },
    setup(props, { emit }) {
        const open = ref(false);
        const dropdown = ref(null);

        const toggleDropdown = () => {
            open.value = !open.value;
        };

        const renderCustomHeader = () => {
            return h(
                'div',
                {},
                [
                    h(NTransfer, {
                        class: "transfer-dropbox",
                        value: props.selectedFilters, 
                        options: props.filters, 
                        'source-filterable': true,
                        onUpdateValue: (value) => emit('update:selectedFilters', value) 
                    }),
                ]
            )
        }

        return {
            open,
            dropdown,
            toggleDropdown,
            options: [
                {
                    key: "content",
                    type: "render",
                    render: renderCustomHeader
                }
            ],
        };
    }
};
</script>

<style>
.dropdown-checkboxs {
    padding: 0px !important;
}

.transfer-dropbox {
    height: 32rem;
}
</style>