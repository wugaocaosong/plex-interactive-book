<script setup lang="ts">
import {ref,computed} from 'vue';
const props=defineProps<{width:number}>(),emit=defineEmits<{commit:[width:number];reset:[]}>();
const preview=ref<number|null>(null);let origin:{x:number;w:number}|undefined;
const shown=computed(()=>preview.value??props.width);
function bounded(w:number){return Math.round(Math.min(innerWidth-48,Math.max(320,w)));}
function start(e:PointerEvent){if(e.button!==0)return;e.stopPropagation();e.preventDefault();origin={x:e.clientX,w:props.width};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);preview.value=props.width;}
function move(e:PointerEvent){if(origin)preview.value=bounded(origin.w+(e.clientX-origin.x)*2);}
function end(e:PointerEvent){if(!origin)return;origin=undefined;emit('commit',shown.value);preview.value=null;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);}
function keys(e:KeyboardEvent){if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='Home')emit('reset');else emit('commit',bounded(props.width+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?80:20)));}
</script>
<template><div class="reader-width-controls" @pointerdown.stop @keydown.stop><span>书籍宽度 {{Math.round(shown)}}px</span><button role="slider" tabindex="0" aria-label="拖动调整书籍宽度" :aria-valuenow="Math.round(shown)" aria-valuemin="320" :aria-valuemax="2400" @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end" @keydown="keys">⟷</button><button @click="emit('reset')">恢复默认</button><div v-if="preview!==null" class="width-preview" :style="{width:preview+'px'}" aria-hidden="true"/></div></template>
<style>.reader-width-controls{position:relative;display:flex;align-items:center;justify-content:flex-end;gap:12px;margin:8px 24px;color:var(--muted,#a9c3d3);font-size:12px}.reader-width-controls button{min-height:44px;min-width:44px}.reader-width-controls [role=slider]{cursor:ew-resize;touch-action:none;font-size:24px}.width-preview{position:fixed;pointer-events:none;z-index:500;top:140px;bottom:100px;left:50%;transform:translateX(-50%);border:2px dashed #86d5e4;background:#67c9df0c}</style>
