<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount,nextTick} from 'vue';
import {getLearning,putLearning} from './learning-store';
const props=defineProps<{title:string;storageKey:string;mobileFullscreen?:boolean;directScroll?:boolean}>();const emit=defineEmits<{close:[]}>();
const rect=ref({x:60,y:90,w:760,h:620}),root=ref<HTMLElement>();let drag:{x:number;y:number;start:typeof rect.value;resize:boolean}|undefined,last:HTMLElement|null=null;let disposed=false;const maximized=ref(false);let restoreRect:typeof rect.value|undefined;
function scrollContent(event:WheelEvent){
 if(!props.directScroll||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
 const body=event.currentTarget as HTMLElement;
 if(body.scrollHeight<=body.clientHeight)return;
 const unit=event.deltaMode===1?20:event.deltaMode===2?body.clientHeight:1;
 event.preventDefault();event.stopPropagation();body.scrollTop+=event.deltaY*unit;
}
function maximize(){if(maximized.value&&restoreRect)rect.value=restoreRect;else{restoreRect={...rect.value};rect.value={x:8,y:12,w:innerWidth-16,h:innerHeight-24};}maximized.value=!maximized.value;clamp();void persist();}
function clamp(){const r=rect.value,w=window.innerWidth,h=window.innerHeight;r.w=Math.max(Math.min(320,w-16),Math.min(r.w,w-16));r.h=Math.max(Math.min(300,h-24),Math.min(r.h,h-24));r.x=Math.max(8,Math.min(r.x,w-r.w-8));r.y=Math.max(8,Math.min(r.y,h-r.h-8));}
function start(e:PointerEvent,resize=false){if(e.button!==0||(!resize&&(e.target as HTMLElement).closest('button,input')))return;e.preventDefault();drag={x:e.clientX,y:e.clientY,start:{...rect.value},resize};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);}
function move(e:PointerEvent){if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;rect.value=drag.resize?{...drag.start,w:drag.start.w+dx,h:drag.start.h+dy}:{...drag.start,x:drag.start.x+dx,y:drag.start.y+dy};clamp();}
function end(e:PointerEvent){drag=undefined;const target=e.currentTarget as HTMLElement;if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId);void persist();}
async function persist(){await putLearning(props.storageKey,rect.value).catch(()=>{});}
function keys(e:KeyboardEvent,resize=false){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const delta=e.shiftKey?40:10,r=rect.value;if(e.key==='ArrowLeft')resize?r.w-=delta:r.x-=delta;if(e.key==='ArrowRight')resize?r.w+=delta:r.x+=delta;if(e.key==='ArrowUp')resize?r.h-=delta:r.y-=delta;if(e.key==='ArrowDown')resize?r.h+=delta:r.y+=delta;clamp();void persist();}
onMounted(async()=>{last=document.activeElement as HTMLElement;const saved=await getLearning<typeof rect.value|undefined>(props.storageKey,undefined);if(disposed)return;if(saved&&[saved.x,saved.y,saved.w,saved.h].every(Number.isFinite))rect.value=saved;clamp();window.addEventListener('resize',clamp);await nextTick();root.value?.focus({preventScroll:true});});onBeforeUnmount(()=>{disposed=true;window.removeEventListener('resize',clamp);if(last?.isConnected)last.focus({preventScroll:true});});
</script>
<template><section ref="root" class="floating-tool-window" :class="{'mobile-tool-fullscreen':mobileFullscreen,'window-expanded':maximized}" role="dialog" :aria-label="title" tabindex="-1" :style="{left:rect.x+'px',top:rect.y+'px',width:rect.w+'px',height:rect.h+'px'}" @keydown.esc.stop.prevent="emit('close')">
<div class="floating-tool-title" tabindex="0" :aria-label="title==='小黑板'?'拖动画板窗口，方向键也可移动':'拖动'+title+'窗口，方向键也可移动'" @pointerdown="start($event)" @pointermove="move" @pointerup="end" @pointercancel="end" @keydown="keys($event)"><div><small>PLEX / CREATIVE DESK</small><strong>{{title}}</strong></div><button v-if="mobileFullscreen" :aria-label="maximized?'还原窗口':'放大窗口'" :aria-pressed="maximized" @click="maximize">⛶</button><button :class="{'dialog-close':mobileFullscreen}" :aria-label="mobileFullscreen?'关闭':'关闭'+title" @click="emit('close')">×</button></div>
<div class="floating-tool-body" @wheel.capture="scrollContent"><slot/></div><button class="floating-tool-resize" :aria-label="'调整'+title+'窗口大小，拖动或使用方向键'" @pointerdown="start($event,true)" @pointermove="move" @pointerup="end" @pointercancel="end" @keydown="keys($event,true)">◢</button>
</section></template>
<style>
.floating-tool-window{position:fixed;z-index:650;display:flex;flex-direction:column;min-width:0;background:#0c2030;color:#eef8ff;border:2px solid #77c6d9;border-radius:12px;box-shadow:0 16px 70px #0009;overflow:hidden}.floating-tool-title{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:linear-gradient(110deg,#1a455c,#102338);cursor:move;touch-action:none;user-select:none;flex-shrink:0}.floating-tool-title div{display:flex;flex-direction:column;gap:4px;min-width:0}.floating-tool-title small{font-size:9px;letter-spacing:2px;color:#8ac8da}.floating-tool-title strong{font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.floating-tool-title button{color:white;font-size:26px;line-height:1;width:36px;height:36px;border:1px solid #6596ab;background:#133146;border-radius:5px}.floating-tool-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding-bottom:18px}.floating-tool-resize{position:absolute;right:0;bottom:0;width:26px;height:26px;background:#20495d;color:#bcefff;cursor:nwse-resize;touch-action:none;border-top-left-radius:8px}.floating-tool-window :focus-visible{outline:2px solid #ffe48f;outline-offset:-2px}
@media(max-width:700px){.mobile-tool-fullscreen{left:0!important;top:0!important;width:100vw!important;height:100dvh!important;border-radius:0}.mobile-tool-fullscreen .floating-tool-resize{display:none}}
</style>
