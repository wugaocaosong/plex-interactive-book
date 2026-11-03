<script setup lang="ts">
import {defineAsyncComponent,ref,onMounted,watch} from 'vue';
import {useRoute,useRouter} from 'vitepress';
import './galaxy-library.css';
import EntryTransition from './EntryTransition.vue';
import EbookPet from './EbookPet.vue';
import {petHost} from './pet-host';
import {entryTransition} from './galaxy-transition';
const route=useRoute(),router=useRouter();const ready=ref(false);onMounted(()=>ready.value=true);
const Reader=defineAsyncComponent(()=>import('./Layout.vue'));
const Galaxy=defineAsyncComponent(()=>import('./GalaxyLibrary.vue'));
const Solar=defineAsyncComponent(()=>import('./SolarLibrary.vue'));
watch(()=>route.path,path=>{if(!path.startsWith('/read/')){petHost.sectionId='library';petHost.sectionTitle=path.includes('/contents')?'星轨编程太阳系目录':'银河书库';petHost.suspended=false;}else{petHost.sectionId=decodeURIComponent(path.slice(6)).replace(/\.html$/,'').replace(/\/$/,'/index');petHost.sectionTitle='星轨编程';}},{immediate:true});
async function login(){if(!route.path.startsWith('/read/')){petHost.pendingLogin=true;await router.go('/read/unit/monty/start');}else window.dispatchEvent(new Event('plex-pet-login'));}

</script>
<template><div v-if="!ready" class="reader-boot" role="status">正在准备星轨书库…</div><template v-else><div :inert="entryTransition.phase!=='idle'"><Galaxy v-if="route.path==='/'||route.path==='/index.html'"/><Solar v-else-if="route.path.startsWith('/library/plex-programming/contents')"/><Reader v-else/></div><EbookPet :bottom-inset="petHost.bottomInset" :section-id="petHost.sectionId" :section-title="petHost.sectionTitle" :suspended="petHost.suspended||entryTransition.phase!=='idle'" @open="petHost.open=$event" @dictating="petHost.dictating=$event" @login="login"/><EntryTransition/></template></template>
<style>.reader-boot{min-height:100dvh;background:#060c18;color:#d4e4ee;display:grid;place-items:center;font:18px sans-serif}</style>
