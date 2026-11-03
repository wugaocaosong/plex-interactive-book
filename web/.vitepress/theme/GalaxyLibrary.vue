<script setup lang="ts">
import {ref,computed,watch,onMounted,onBeforeUnmount,defineAsyncComponent,onErrorCaptured,nextTick} from 'vue';
import {useRouter} from 'vitepress';
import {readStore} from './storage';
import {showPet,petHost} from './pet-host';
import {library} from './library';
import {getLearning,putLearning} from './learning-store';
import {revealReader} from './galaxy-transition';
import type {ReadingLocator,BookManifest} from './types';
import type {GalaxyPhase,SceneLabel} from './galaxy-engine';
const Scene=defineAsyncComponent(()=>import('./GalaxyScene.vue')),router=useRouter();
const scene=ref<{reset:()=>void;hover:(id:string)=>void;pulse:(id:string)=>void}>(),initializing=ref(true),phase=ref<GalaxyPhase>('galaxy'),simple=ref(true),active=ref(true),failed=ref(false),sceneReady=ref(false),resume=ref(''),reduced=ref(false),labels=ref<SceneLabel[]>([]),notice=ref('');
const fallback=computed(()=>simple.value||failed.value),book=library.books[0];let timer:ReturnType<typeof setTimeout>|undefined,disposed=false,query:MediaQueryList|undefined;
function background(){active.value=!document.hidden;}
function preference(){reduced.value=!!query?.matches;}
function labelStyle(id:string,i:number){const p=labels.value.find(l=>l.id===id);const defaults=[[71,51],[25,70],[40,31],[64,25],[86,35],[88,73],[48,81]];const x=p?.x??defaults[i][0],y=p?.y??defaults[i][1];return {left:`${Math.max(i===0?28:8,Math.min(i===0?81:92,x))}%`,top:`${Math.max(23,Math.min(82,y))}%`,visibility:!fallback.value&&p&&!p.visible?'hidden' as const:'visible' as const};}
async function showBook(){clearTimeout(timer);phase.value='book';await nextTick();document.querySelector<HTMLButtonElement>('.enter-book')?.focus({preventScroll:true});}
watch(phase,value=>{petHost.bottomInset=value==='book'?160:0;});
onBeforeUnmount(()=>{petHost.bottomInset=0;});
function hover(id:string){scene.value?.hover(id);}
function choose(id='plex-programming'){if(phase.value!=='galaxy')return;if(id!=='plex-programming'){scene.value?.pulse(id);notice.value='这颗星球的书籍尚未上架。';return;}if(reduced.value||fallback.value){void showBook();return;}phase.value='approaching';timer=setTimeout(()=>void showBook(),1500);}
function enter(){if(phase.value!=='book'||(!fallback.value&&!sceneReady.value))return;phase.value='opening';timer=setTimeout(()=>void revealReader(()=>router.go(book.entry!),reduced.value),reduced.value?0:700);}
function skip(){clearTimeout(timer);if(phase.value==='opening')void revealReader(()=>router.go(book.entry!),true);else void showBook();}
function back(){clearTimeout(timer);phase.value='galaxy';notice.value='';nextTick(()=>document.querySelector<HTMLButtonElement>('.planet-0')?.focus({preventScroll:true}));}
function simplify(){simple.value=!simple.value;sceneReady.value=false;failed.value=false;void putLearning('galaxy:simple',simple.value).catch(()=>notice.value='显示偏好未保存，本次设置仍有效。');}
function onFail(){failed.value=true;notice.value='三维场景不可用，已切换简化显示，可继续阅读。';}
function key(event:KeyboardEvent){if(event.key==='Escape'&&phase.value==='book'){event.preventDefault();back();}}
onErrorCaptured(()=>{onFail();return false;});
onMounted(async()=>{
 query=matchMedia('(prefers-reduced-motion: reduce)');preference();query.addEventListener('change',preference);
 try{simple.value=await getLearning('galaxy:simple',reduced.value);const place=await getLearning<ReadingLocator|null>('reading',readStore<ReadingLocator|null>('reading',null));if(place){const response=await fetch('/book/manifest.json');if(response.ok){const manifest:BookManifest=await response.json(),section=manifest.pages.find(p=>p.id===place.sectionId);if(section)resume.value=section.route+'#'+place.blockId+'@'+place.offset;}}}catch{notice.value='未能读取上次位置，仍可从扉页开始。';}
 if(disposed)return;initializing.value=false;document.addEventListener('visibilitychange',background);window.addEventListener('keydown',key);
});
onBeforeUnmount(()=>{disposed=true;clearTimeout(timer);query?.removeEventListener('change',preference);document.removeEventListener('visibilitychange',background);window.removeEventListener('keydown',key);});
</script>
<template><main class="galaxy-library manga-library" :class="{ 'is-book':phase==='book'||phase==='opening','is-simple':fallback }" :data-phase="phase">
 <Scene v-if="!initializing&&!fallback" ref="scene" :phase="phase" :active="active" :reduced="reduced" @failed="onFail" @ready="sceneReady=true" @select="choose" @open="enter" @labels="labels=$event"/>
 <div v-else class="galaxy-static" aria-hidden="true"><div class="static-arm"/><div v-if="phase==='galaxy'" class="static-worlds"><i v-for="(entry,i) in library.books" :key="entry.id" :style="{...labelStyle(entry.id,i),'--world':entry.color}" :class="{'static-main':i===0}"/></div></div>
 <div class="galaxy-vignette" aria-hidden="true"/>
 <header class="galaxy-header"><div class="galaxy-brand"><span class="plex-sticker">PLEX</span><span class="brand-caption">GALACTIC LIBRARY</span><h1>星轨书库</h1></div><button class="comic-button utility" :aria-pressed="simple" :disabled="initializing||phase==='approaching'||phase==='opening'" @click="simplify">{{fallback?'开启三维':'简化显示'}}</button></header>
 <template v-if="phase==='galaxy'||phase==='approaching'">
  <div class="galaxy-intro"><h2>每一本书，<br class="mobile-break">都是一个新世界。</h2><span class="red-slash"/></div>
  <nav class="planet-labels" aria-label="书籍恒星系"><template v-for="(entry,i) in library.books" :key="entry.id"><button v-if="i===0" class="planet-0 planet-title" @pointerenter="hover(entry.id)" @pointerleave="hover('')" @focus="hover(entry.id)" @blur="hover('')" :style="labelStyle(entry.id,i)" :disabled="initializing||phase==='approaching'" @click="choose(entry.id)"><strong>{{entry.title}}</strong><small>{{entry.subtitle}}</small><span class="planet-pointer" aria-hidden="true"/></button><button v-else class="distant-label" :style="labelStyle(entry.id,i)" :aria-label="`待上架书籍 ${i}`" @click="choose(entry.id)">待上架</button></template></nav>
  <div v-if="phase==='approaching'" class="approach-flare" aria-hidden="true"/>
 </template>
 <template v-else>
  <button class="comic-button return-galaxy" :disabled="phase==='opening'" @click="back"><span aria-hidden="true">←</span> 返回银河</button>
  <section v-if="fallback" class="static-book-stage" aria-label="中央实体书简化预览"><button class="static-book" :disabled="phase==='opening'" aria-label="点击封面进入星轨编程" @click="enter"><img :src="book.cover" alt="PLEX 星轨编程原封面"/></button></section>
  <div v-else class="book-drag-hint"><span class="orbit-glyph" aria-hidden="true">↔</span>按住拖动 · 旋转查看<small>方向键旋转 / Home 回正</small></div>
  <div class="book-callout">点击封面，<br>开始探索<span aria-hidden="true"/></div>
  <div class="book-actions"><button class="comic-button primary enter-book" :disabled="phase==='opening'||(!fallback&&!sceneReady)" aria-label="翻开星轨编程" @click="enter">{{phase==='opening'?'正在翻开…':!fallback&&!sceneReady?'准备封面…':'开始探索'}} <span aria-hidden="true">↗</span></button><button v-if="!fallback" class="comic-button reset-book" :disabled="phase==='opening'" @click="scene?.reset()">↻ 回正</button></div>
 </template>
 <footer class="galaxy-footer"><div class="footer-actions"><button class="comic-button utility" @click="showPet()">显示小E</button><a v-if="resume&&phase==='galaxy'" class="comic-button primary" :href="resume">继续探索 <span aria-hidden="true">→</span></a><button v-if="phase==='approaching'||phase==='opening'" class="comic-button utility" @click="skip">跳过动画</button><details v-if="phase==='galaxy'" class="library-index"><summary>书籍导航 <span aria-hidden="true">＋</span></summary><ul><li v-for="entry in library.books" :key="entry.id"><button :disabled="entry.status==='coming'" @click="choose(entry.id)">{{entry.title}}<small>{{entry.status==='available'?'可阅读':'待上架 · 尚无教材'}}</small></button></li></ul></details></div><p class="galaxy-help">{{phase==='galaxy'?(fallback?'选择恒星系，开始探索':'拖动观察 · 滚轮靠近'):fallback?'简化显示 · 点击封面阅读':'查看封面 · 书脊 · 封底'}}</p></footer>
 <p v-if="notice" class="galaxy-notice" role="status">{{notice}}</p><span v-if="initializing" class="scene-loading" role="status">正在点亮书库…</span>
</main></template>
<style src="./galaxy-library.css"/>
