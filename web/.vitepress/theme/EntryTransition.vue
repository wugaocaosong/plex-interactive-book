<script setup lang="ts">
import {useRouter} from 'vitepress';
import {nextTick,watch} from 'vue';
import {entryTransition,cancelEntryTransition,revealReader,skipEntryAnimation} from './galaxy-transition';
const router=useRouter();
async function back(){cancelEntryTransition();await router.go('/');}
function retry(){void revealReader(async()=>{const button=document.querySelector<HTMLButtonElement>('.reader-error button');if(button){button.click();await nextTick();}else await router.go('/library/plex-programming/contents');},matchMedia('(prefers-reduced-motion: reduce)').matches);}
watch(()=>entryTransition.phase,async phase=>{if(phase==='idle'||phase==='revealing')return;await nextTick();document.querySelector<HTMLButtonElement>('.entry-veil button')?.focus();});
function key(event:KeyboardEvent){if(event.key!=='Tab')return;const buttons=[...document.querySelectorAll<HTMLButtonElement>('.entry-veil button')].filter(b=>getComputedStyle(b).visibility!=='hidden');if(!buttons.length){event.preventDefault();return;}const i=buttons.indexOf(document.activeElement as HTMLButtonElement);event.preventDefault();buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
</script>
<template><div v-if="entryTransition.phase!=='idle'" class="entry-veil" role="dialog" aria-modal="true" aria-label="打开书籍" :class="entryTransition.phase" :aria-busy="entryTransition.phase!=='error'" @keydown="key">
 <svg class="eyelid eyelid-top" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H100V80Q50 110 0 80Z"/></svg>
 <svg class="eyelid eyelid-bottom" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20Q50 -10 100 20V100H0Z"/></svg>
 <div v-if="entryTransition.phase==='error'" class="entry-error" role="alert"><h2>还没能打开书页</h2><p>{{entryTransition.error}}</p><button @click="retry">重新加载</button><button @click="back">返回银河</button></div>
 <template v-else><span class="entry-status" role="status">{{entryTransition.phase==='revealing'?'开始探索':'正在准备书页…'}}</span><button class="entry-skip" @click="skipEntryAnimation">跳过动画</button></template>
</div></template>
<style>
.entry-veil{position:fixed;inset:0;z-index:10000;overflow:hidden;color:#fff7e5}.eyelid{position:absolute;left:0;width:100%;height:65%;fill:#020309;transition:transform 1.2s cubic-bezier(.22,.65,.2,1);pointer-events:none}.eyelid-top{top:0}.eyelid-bottom{bottom:0}.entry-veil.closing{animation:entry-dim .25s both}.entry-veil.loading,.entry-veil.error{background:#020309}.revealing .eyelid-top{transform:translateY(-120%)}.revealing .eyelid-bottom{transform:translateY(120%)}.entry-status{position:absolute;bottom:12%;width:100%;text-align:center;font-size:15px;color:#c8d4e0}.revealing .entry-status,.revealing .entry-skip{visibility:hidden}.entry-skip{position:absolute;right:24px;top:24px;padding:12px 20px;color:#fff7e5;background:#151722;border:1px solid #fff7e5;cursor:pointer}.entry-error{position:absolute;inset:25% 10%;text-align:center}.entry-error button{margin:12px;padding:12px 24px;background:#e33745;color:white;border:2px solid white;cursor:pointer}@keyframes entry-dim{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){.eyelid{transition:none}.entry-veil.closing{animation:none}}
</style>
