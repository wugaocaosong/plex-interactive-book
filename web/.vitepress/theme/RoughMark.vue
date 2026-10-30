<script setup lang="ts">
import {computed} from 'vue';
import rough from 'roughjs';
import type {BlackboardMark} from './blackboard-model';
const props=defineProps<{mark:BlackboardMark}>();
const paths=computed(()=>{const m=props.mark,g=rough.generator(),x=m.x||0,y=m.y||0,w=m.width||0,h=m.height||0,options={seed:m.seed,stroke:m.color,strokeWidth:m.strokeWidth||3,roughness:1.2};
  if(m.shape==='rectangle')return g.toPaths(g.rectangle(Math.min(x,x+w),Math.min(y,y+h),Math.abs(w),Math.abs(h),options));
  if(m.shape==='ellipse')return g.toPaths(g.ellipse(x+w/2,y+h/2,Math.abs(w),Math.abs(h),options));
  const angle=Math.atan2(h,w),a=0.45,len=Math.min(24,Math.hypot(w,h)/3);
  return [g.line(x,y,x+w,y+h,options),g.linearPath([[x+w-len*Math.cos(angle-a),y+h-len*Math.sin(angle-a)],[x+w,y+h],[x+w-len*Math.cos(angle+a),y+h-len*Math.sin(angle+a)]],options)].flatMap(d=>g.toPaths(d));
});
</script>
<template><g><path v-for="(p,i) in paths" :key="i" :d="p.d" :fill="p.fill||'none'" :stroke="p.stroke" :stroke-width="p.strokeWidth"/></g></template>
