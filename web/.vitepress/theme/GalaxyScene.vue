<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue';
import {GalaxyEngine,type GalaxyPhase,type SceneLabel} from './galaxy-engine';
const props=defineProps<{phase:GalaxyPhase;active:boolean;reduced:boolean}>();
const emit=defineEmits<{failed:[];ready:[];select:[id:string];open:[];labels:[labels:SceneLabel[]]}>();
const canvas=ref<HTMLCanvasElement>();let engine:GalaxyEngine|undefined;
const rotation=ref('');
onMounted(()=>{try{engine=new GalaxyEngine(canvas.value!,{failed:()=>emit('failed'),ready:()=>emit('ready'),select:id=>emit('select',id),open:()=>emit('open'),labels:labels=>emit('labels',labels),rotation:values=>rotation.value=values.map(n=>n.toFixed(3)).join(',')},props.reduced);engine.setPhase(props.phase);engine.setActive(props.active);}catch{engine?.dispose();emit('failed');}});
watch(()=>props.reduced,value=>engine?.setReduced(value));watch(()=>props.phase,value=>engine?.setPhase(value));watch(()=>props.active,value=>engine?.setActive(value));
onBeforeUnmount(()=>engine?.dispose());
function key(event:KeyboardEvent){if(props.phase!=='book')return;const delta=.15;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')engine?.resetBook();else engine?.rotateBook(event.key==='ArrowLeft'?-delta:event.key==='ArrowRight'?delta:0,event.key==='ArrowUp'?-delta:event.key==='ArrowDown'?delta:0);}}
defineExpose({reset:()=>engine?.resetBook(),hover:(id:string)=>engine?.hover(id),pulse:(id:string)=>engine?.pulse(id)});
</script>
<template><canvas ref="canvas" class="galaxy-canvas" tabindex="0" :data-rotation="rotation" :aria-label="phase==='book'?'立体书：拖动或方向键旋转，Home 回正；使用开始探索按钮阅读':'交互银河：拖动观察，滚轮缩放；也可用书籍导航选择'" @keydown="key"/></template>
<style>.galaxy-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;outline:none;cursor:grab}.galaxy-canvas:active{cursor:grabbing}.galaxy-canvas:focus-visible{outline:2px solid #7ad7de;outline-offset:-5px}</style>
