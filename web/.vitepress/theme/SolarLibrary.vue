<script setup lang="ts">
import {ref,onMounted} from 'vue';
import {useRouter} from 'vitepress';
import SolarDirectory from './SolarDirectory.vue';
import type {BookManifest,ReadingLocator} from './types';
import {getLearning} from './learning-store';
import {readStore} from './storage';
import {showPet} from './pet-host';
const manifest=ref<BookManifest>(),error=ref(''),storageNotice=ref(''),resume=ref<ReadingLocator|null>(null),router=useRouter();
async function load(){error.value='';try{const r=await fetch('/book/manifest.json');if(!r.ok)throw Error('目录暂时无法加载');manifest.value=await r.json();try{resume.value=await getLearning('reading',readStore('reading',null));}catch{storageNotice.value='无法读取上次进度，仍可自由选择章节。';}}catch(e){error.value=String(e);}}
function navigate(id:string){const section=manifest.value?.pages.find(s=>s.id===id);if(section)void router.go(section.route);}
onMounted(load);
</script>
<template><main class="solar-library"><header class="solar-library-header"><a href="/" class="comic-button">← 返回银河</a><div>PLEX <span>星轨编程 · 太阳系目录</span></div><button class="comic-button" @click="showPet()">显示小E</button></header>
 <div v-if="error" class="reader-error" role="alert">{{error}}<button @click="load">重新加载</button><a href="/">返回银河</a></div>
 <template v-else-if="manifest"><p v-if="storageNotice" role="status">{{storageNotice}}</p><SolarDirectory :sections="manifest.pages" :current="resume?.sectionId" @navigate="navigate"/><details class="solar-all-pages"><summary>完整书籍编排 · 前言、章节与附页</summary><a v-for="section in manifest.pages" :key="section.id" :href="section.route">{{section.title}}</a></details></template><p v-else role="status">正在载入目录…</p></main></template>
<style>
.solar-library{--ink:#070d20;--paper:#fff5df;--red:#e33745;box-sizing:border-box;position:fixed;inset:0;z-index:100;width:100vw;height:100dvh;min-height:0;overflow:hidden;display:flex;flex-direction:column;padding:0;color:#e5f5ff;background:#060c18}
.solar-library-header{order:2;flex:none;display:flex;gap:18px;justify-content:space-between;align-items:center;margin:0;padding:8px clamp(12px,3vw,48px);min-height:60px;border-top:1px solid #294357;background:#070f1d}
.solar-library-header div{font-weight:800;font-size:22px}.solar-library-header span{display:block;font-size:12px;letter-spacing:.08em;color:#9bbbcf}
.solar-library>.solar-directory{order:1;box-sizing:border-box;flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:clamp(12px,2vw,24px);border:0;border-radius:0}
.solar-library .solar-heading{flex:none}.solar-library .solar-stage,.solar-library .solar-simple-mascot{flex:1;min-height:0;height:auto;max-height:none}
.solar-library .solar-start{flex:none;padding:6px 0 0}.solar-library .solar-start p{margin-bottom:8px}
.solar-library .solar-chapter-list,.solar-all-pages{display:none}
.solar-library button,.solar-library a{cursor:pointer}.solar-all-pages{border-top:1px solid #385165;padding:20px}.solar-all-pages summary{cursor:pointer;padding:10px}.solar-all-pages a{display:inline-block;width:33%;padding:10px;color:#bddbe9;font-size:13px}.solar-library .reader-error{color:#ffd1bd;padding:30px}.solar-library .reader-error button{margin:16px}
@media(max-width:700px){.solar-library-header{min-height:48px;gap:8px}.solar-library-header div{font-size:17px}.solar-library-header span{font-size:10px}.solar-library>.solar-directory{padding:10px}.solar-library .solar-heading{align-items:center}.solar-library .solar-heading h2{font-size:clamp(17px,4vw,22px)!important}.solar-library .solar-tools{gap:4px}.solar-library .solar-tools button{font-size:10px;padding:5px 8px}}
</style>
