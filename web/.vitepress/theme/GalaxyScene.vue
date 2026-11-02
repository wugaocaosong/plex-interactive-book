<script setup lang="ts">
import {TresCanvas} from '@tresjs/core';
import GalaxyObjects from './GalaxyObjects.vue';
defineProps<{zoom:boolean;active:boolean}>();
const emit=defineEmits<{failed:[]}>();
</script>
<template><div class="galaxy-canvas" @webglcontextlost.capture.prevent="emit('failed')"><TresCanvas clear-color="#060c18" :dpr="1" :render-mode="active?'always':'on-demand'" @error="emit('failed')"><GalaxyObjects :zoom="zoom" :active="active"/></TresCanvas></div></template>
