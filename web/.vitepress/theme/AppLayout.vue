<script setup lang="ts">
import {defineAsyncComponent,ref,onMounted} from 'vue';
import {useRoute} from 'vitepress';
const route=useRoute();const ready=ref(false);onMounted(()=>ready.value=true);
const Reader=defineAsyncComponent(()=>import('./Layout.vue'));
const Galaxy=defineAsyncComponent(()=>import('./GalaxyLibrary.vue'));
</script>
<template><div v-if="!ready" class="reader-boot" role="status">正在准备星轨书库…</div><template v-else><Galaxy v-if="route.path==='/'||route.path==='/index.html'"/><Reader v-else/></template></template>
<style>.reader-boot{min-height:100dvh;background:#060c18;color:#d4e4ee;display:grid;place-items:center;font:18px sans-serif}</style>
