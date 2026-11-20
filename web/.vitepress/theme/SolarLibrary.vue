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
<template><main class="solar-library"><header class="solar-library-header"><a href="/" class="comic-button">← 返回银河</a><div>PLEX <span>星轨编程 · 章节星图</span></div><button v-if="resume" class="comic-button resume-chapter" @click="navigate(resume.sectionId)">继续阅读 →</button><button class="comic-button" @click="showPet()">显示小E</button></header>
 <div v-if="error" class="reader-error" role="alert">{{error}}<button @click="load">重新加载</button><a href="/">返回银河</a></div>
 <template v-else-if="manifest"><p v-if="storageNotice" role="status">{{storageNotice}}</p><SolarDirectory :sections="manifest.pages" :current="resume?.sectionId" @navigate="navigate"/><details class="solar-all-pages"><summary>完整书籍编排 · 前言、章节与附页</summary><a v-for="section in manifest.pages" :key="section.id" :href="section.route">{{section.title}}</a></details></template><p v-else role="status">正在载入目录…</p></main></template>
<style>
.solar-library{--ink:#07111f;--paper:#eff3ed;position:fixed;inset:0;z-index:100;box-sizing:border-box;width:100%;height:100dvh;display:flex;flex-direction:column;color:#e5f5ff;background:#07111f;overflow:auto}
.solar-library-header{flex:none;display:flex;gap:18px;align-items:center;padding:12px 28px;border-bottom:1px solid #90e5ef22;background:#08131f}.solar-library-header div{flex:1;font-weight:700;font-size:22px}.solar-library-header span{display:inline-block;margin-left:16px;font-size:12px;letter-spacing:.08em;color:#a6bfcc}.solar-library-header .comic-button{clip-path:none;background:transparent;color:#d9edf1;border:1px solid #90e5ef40;border-radius:8px;font-size:12px;min-height:44px;padding:8px 14px}.solar-library-header .comic-button:before,.solar-library-header .comic-button:after{display:none}
.solar-library>.solar-directory{flex:1;min-height:550px;border:0;border-radius:0}.solar-all-pages{flex:none;border-top:1px solid #90e5ef22;padding:0 28px;font-size:12px;background:#08131f}.solar-all-pages summary{cursor:pointer;padding:12px 0;color:#bad1dc}.solar-all-pages a{display:inline-block;width:25%;padding:10px;color:#bddbe9}.solar-library .reader-error{padding:32px;color:#ffd1bd}.solar-library .reader-error button{margin:16px}
@media(max-width:700px){.solar-library-header{padding:10px 12px;gap:8px;flex-wrap:wrap}.solar-library-header div{font-size:18px}.solar-library-header span{display:block;font-size:10px;margin:3px 0 0}.solar-library-header .comic-button{font-size:11px;padding:6px 10px}.solar-library-header .resume-chapter{display:none}.solar-library>.solar-directory{flex:none;min-height:0}.solar-all-pages{padding:0 14px}.solar-all-pages a{width:50%;box-sizing:border-box}}
</style>
