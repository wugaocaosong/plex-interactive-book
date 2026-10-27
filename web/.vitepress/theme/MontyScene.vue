<script setup lang="ts">
import { motion } from 'motion-v';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { doors, type Door } from './monty-hall';
const props = defineProps<{ step:number; prize:Door; first?:Door; opened?:Door; final?:Door; interactive?:boolean; skip?:boolean }>();
const emit=defineEmits<{choose:[door:Door]}>();
const reduced=ref(true);
let media:MediaQueryList|undefined;
function update(){reduced.value=media?.matches??true;}
onMounted(()=>{media=matchMedia('(prefers-reduced-motion: reduce)');update();media.addEventListener('change',update);});
onBeforeUnmount(()=>media?.removeEventListener('change',update));
const isOpen=(d:Door)=>props.step===3||(props.step>=2&&props.opened===d);
</script>
<template>
  <div class="space-scene" aria-label="三扇舱门">
    <div class="scene-orbit" aria-hidden="true" />
    <div class="scene-doors">
      <button v-for="d in doors" :key="d" class="scene-door" :class="{chosen:step>0&&first===d, final:step===3&&final===d}" :disabled="!interactive" :aria-label="interactive ? `选择${d+1}号舱门` : `${d+1}号舱门：${isOpen(d)?(step===3&&prize===d?'能源核心':'空舱'):'未打开'}${step>0&&first===d?'，你的初选':''}${step===3&&final===d?'，最终选择':''}`" @click="emit('choose',d)">
        <span class="scene-chamber" aria-hidden="true">
          <motion.span v-if="step===3&&prize===d" class="energy-core" :initial="{scale:0.5,opacity:0}" :animate="{scale:1,opacity:1}" :transition="{duration:reduced||skip?0:0.5}">✦</motion.span>
          <span v-else-if="isOpen(d)" class="empty-chamber">空舱</span>
          <motion.span class="door-shutter left" :key="`left-${skip}-${reduced}`" :initial="false" :animate="{x:isOpen(d)?'-105%':'0%'}" :transition="{duration:reduced||skip?0:0.55}" />
          <motion.span class="door-shutter right" :key="`right-${skip}-${reduced}`" :initial="false" :animate="{x:isOpen(d)?'105%':'0%'}" :transition="{duration:reduced||skip?0:0.55}" />
          <span class="door-plaque">0{{d+1}}</span>
        </span>
        <span>{{d+1}} 号舱门</span><small>{{step===3&&final===d?'最终选择':step>0&&first===d?'你的初选':' '}}</small>
      </button>
    </div>
    <motion.div class="scene-guide" :animate="{x:step>=2?8:0}" :transition="{duration:reduced||skip?0:0.4}"><img src="/brand/little-e.png" alt=""/><span>小E · {{step===0?'请先选择':step===1?'先说说你的预测':step===2?'只打开未被初选的空门':'用初选情况解释结果'}}</span></motion.div>
  </div>
</template>
<style scoped>
.space-scene{position:relative;isolation:isolate;background:radial-gradient(ellipse at 50% 100%,#29463f,#131315 75%);border-radius:18px;padding:24px 12px 12px;color:#f7eedb;overflow:hidden;margin:18px 0}.scene-orbit{position:absolute;border:1px solid #d9b87333;border-radius:50%;width:120%;height:220px;left:-10%;top:20px;z-index:-1}.scene-doors{display:flex;gap:12px}.scene-door{flex:1;min-width:0;border:1px solid #68766d!important;background:#242723!important;color:#f7eedb!important;padding:8px!important;border-radius:12px;opacity:1!important}.scene-door.chosen{outline:2px solid #80c9bc;outline-offset:2px}.scene-door.final{outline-color:#d9b873}.scene-door:focus-visible{outline:3px solid white}.scene-chamber{display:grid;place-items:center;height:160px;position:relative;overflow:hidden;background:#0c1314;border-radius:7px;border:2px solid #59635a;margin-bottom:8px}.door-shutter{position:absolute;top:0;bottom:0;width:50%;background:repeating-linear-gradient(0deg,#34423d 0,#34423d 29px,#56635a 30px);box-shadow:inset 0 0 12px #0008}.left{left:0;border-right:1px solid #93a594}.right{right:0;border-left:1px solid #93a594}.door-plaque{position:absolute;top:6px;left:8px;font:12px monospace;color:#f7eedb;background:#131315;padding:2px 4px}.energy-core{font-size:72px;color:#f7d38a;text-shadow:0 0 25px #d9b873}.empty-chamber{font-size:14px;color:#bac7bf}.scene-door>span:not(.scene-chamber),.scene-door small{display:block}.scene-door small{min-height:1.6em;color:#e0cc9e}.scene-guide{display:flex;align-items:center;gap:10px;margin-top:16px;font-size:13px}.scene-guide img{width:42px;height:42px;object-fit:contain}@media(max-width:480px){.scene-doors{gap:8px}.scene-chamber{height:120px}.energy-core{font-size:52px}.scene-door{font-size:12px}}
</style>
