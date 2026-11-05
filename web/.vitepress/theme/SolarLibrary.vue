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
function continueReading(){if(!resume.value)return;const section=manifest.value?.pages.find(s=>s.id===resume.value!.sectionId);if(section)void router.go(section.route+'#'+resume.value.blockId+'@'+resume.value.offset);}
onMounted(load);
</script>
<template><main class="solar-library"><header class="solar-library-header"><a href="/" class="comic-button">← 返回银河</a><div>PLEX <span>星轨编程 · 太阳系目录</span></div><button class="comic-button" @click="showPet()">显示小E</button></header>
 <div v-if="error" class="reader-error" role="alert">{{error}}<button @click="load">重新加载</button><a href="/">返回银河</a></div>
 <template v-else-if="manifest"><p v-if="storageNotice" role="status">{{storageNotice}}</p><SolarDirectory :sections="manifest.pages" :current="resume?.sectionId" @navigate="navigate"/><nav class="solar-book-links" aria-label="卷首与学习单元"><button class="comic-button" @click="navigate('title')">从扉页开始 →</button><button v-if="resume" class="comic-button" @click="continueReading">继续阅读 →</button><button class="comic-button" @click="navigate('unit/monty/start')">学习起点 · 三门挑战</button><button class="comic-button" @click="navigate('unit/lab/index')">星航驿站 · 综合实验</button></nav><details class="solar-all-pages"><summary>完整书籍编排 · 前言、章节与附页</summary><a v-for="section in manifest.pages" :key="section.id" :href="section.route">{{section.title}}</a></details></template><p v-else role="status">正在载入目录…</p></main></template>
<style>.solar-library{--ink:#070d20;--paper:#fff5df;--red:#e33745;min-height:100dvh;padding:24px max(16px,calc((100vw - 1280px)/2)) 90px;color:#e5f5ff;background:#060c18}.solar-library-header{display:flex;gap:18px;justify-content:space-between;align-items:center;margin-bottom:24px}.solar-library-header div{font-weight:800;font-size:22px}.solar-library-header span{display:block;font-size:12px;letter-spacing:.08em;color:#9bbbcf}.solar-book-links{display:flex;gap:12px;flex-wrap:wrap;padding:24px 0}.solar-library button,.solar-library a{cursor:pointer}.solar-all-pages{border-top:1px solid #385165;padding:20px}.solar-all-pages summary{cursor:pointer;padding:10px}.solar-all-pages a{display:inline-block;width:33%;padding:10px;color:#bddbe9;font-size:13px}.solar-library .reader-error{color:#ffd1bd;padding:30px}.solar-library .reader-error button{margin:16px}@media(max-width:700px){.solar-library{padding:12px 12px 90px}.solar-library-header{flex-wrap:wrap}.solar-library-header div{order:-1;width:100%}.solar-all-pages a{width:100%}}</style>
