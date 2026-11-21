<script setup lang="ts">
import './solar-directory.css';
import {ref,computed,onMounted,onBeforeUnmount,watch} from 'vue';
import type {BookSection} from './types';
import {chapterWorlds} from './space-model';
import type {SolarEngine,SolarLabel} from './solar-engine';
const props=defineProps<{sections:BookSection[];current?:string}>();
const emit=defineEmits<{navigate:[id:string]}>();
const worlds=computed(()=>chapterWorlds(props.sections));const canvas=ref<HTMLCanvasElement>(),labels=ref<SolarLabel[]>([]),paused=ref(false),simple=ref(false),ready=ref(false),failed=ref(false),hovered=ref(-1),notice=ref('');
const query=ref(''),model=ref<'loading'|'ready'|'failed'>('loading');
let motion:MediaQueryList|undefined;
function motionChanged(){if(motion?.matches){paused.value=true;simple.value=true;}}
let engine:SolarEngine|undefined,disposed=false,generation=0;
const pinned=ref<{index:number;x:number;y:number}>();
// Keep 44px hit targets separate even where projected orbits overlap on phones.
const targets=computed(()=>{
 const w=canvas.value?.clientWidth||340,h=canvas.value?.clientHeight||420;
 const points=labels.value.map(p=>({...p,x:p.x*w/100+(p.x<50?-54:54),y:p.y*h/100+4}));
 const fixed=pinned.value;
 if(fixed&&points[fixed.index])Object.assign(points[fixed.index],{x:fixed.x*w/100,y:fixed.y*h/100});
 for(let pass=0;pass<96;pass++){
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
   const a=points[i],b=points[j];if(!a.visible||!b.visible)continue;
   const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),gap=w<700?64:100;if(d>=gap)continue;
   const ux=d?dx/d:1,uy=d?dy/d:0,overlap=gap-d;
   const fa=fixed?.index===i,fb=fixed?.index===j;
   if(!fa){a.x-=ux*overlap*(fb?1:.5);a.y-=uy*overlap*(fb?1:.5);}
   if(!fb){b.x+=ux*overlap*(fa?1:.5);b.y+=uy*overlap*(fa?1:.5);}
  }
  points.forEach((p,i)=>{if(fixed?.index!==i){const edge=w<700?26:68;const dx=p.x-w/2,dy=p.y-h/2;const ex=w<700?65:110,ey=w<700?90:155;if(Math.abs(dx)<ex&&Math.abs(dy)<ey)p.x=w/2+(dx<0?-ex:ex);p.x=Math.max(edge,Math.min(w-edge,p.x));p.y=Math.max(45,Math.min(h-75,p.y));}});
 }
 return points.map(p=>({...p,x:p.x/w*100,y:p.y/h*100}));
});
const style=(i:number)=>({left:(targets.value[i]?.x??(18+(i%4)*21))+'%',top:(targets.value[i]?.y??(20+Math.floor(i/4)*19))+'%',visibility:labels.value[i]?.visible===false?'hidden' as const:'visible' as const});
function focus(i:number){const p=targets.value[i];pinned.value=p?{index:i,x:p.x,y:p.y}:undefined;hovered.value=i;engine?.hover(i);}
function select(i:number){emit('navigate',worlds.value[i].section.id);}
async function start(){const own=++generation;engine?.dispose();engine=undefined;ready.value=false;model.value='loading';if(simple.value){ready.value=true;return;}try{const {SolarEngine}=await import('./solar-engine');if(disposed||own!==generation)return;engine=new SolarEngine(canvas.value!,worlds.value.length,v=>labels.value=v,select,()=>{failed.value=true;simple.value=true;notice.value='三维目录不可用，已显示文字章节。';},state=>model.value=state);engine.pause(paused.value);await engine.ready;if(!disposed&&own===generation)ready.value=true;}catch{if(disposed||own!==generation)return;failed.value=true;simple.value=true;notice.value='已切换为简化目录。';}}
watch(paused,v=>engine?.pause(v));watch(simple,()=>void start());
onMounted(()=>{motion=matchMedia('(prefers-reduced-motion: reduce)');motionChanged();motion.addEventListener('change',motionChanged);void start();});
onBeforeUnmount(()=>{disposed=true;motion?.removeEventListener('change',motionChanged);generation++;engine?.dispose();});
</script>
<template><section class="solar-directory" :data-ready="ready" :data-simple="simple" aria-label="星轨章节目录">
 <header class="solar-heading"><div><small>PLEX / CHAPTER ATLAS</small><h2>从好奇，抵达理解。</h2></div><p class="solar-caption">{{hovered>=0?worlds[hovered].section.title:'拖动观察轨道 · 点选章节星体'}}<small>16 个章节 · Python 与算法的探索之旅</small></p><div class="solar-tools"><button :aria-pressed="paused" @click="paused=!paused">{{paused?'继续公转':'暂停公转'}}</button><button :aria-pressed="simple" @click="simple=!simple;failed=false">{{simple?'开启三维':'简化显示'}}</button></div></header>
 <div v-show="!simple" class="solar-stage"><canvas ref="canvas" aria-label="星轨知识目录：拖动观察，点击知识星球进入章节"/><svg class="solar-leaders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><template v-for="(p,i) in targets" :key="i"><line v-if="p.visible&&labels[i]" :x1="labels[i].x" :y1="labels[i].y" :x2="p.x" :y2="p.y"/></template></svg>
  <nav class="solar-labels" aria-label="章节星体"><button v-for="(world,i) in worlds" :key="world.section.id" :style="style(i)" :class="{'is-current':current?.startsWith(world.section.id.replace('/index',''))}" :aria-label="`进入${String(world.number).padStart(2,'0')} ${world.section.title.replace(/^\d+\.?\s*/, '')}`" @pointerenter="focus(i)" @pointerleave="focus(-1)" @focus="focus(i)" @blur="focus(-1)" @click="select(i)"><b>{{String(world.number).padStart(2,'0')}}</b><span>{{world.section.title.replace(/^\d+\.?\s*/, '')}}</span></button></nav>
  <p class="solar-model-status" role="status">{{model==='ready'?'小E与你一起探索 · 拖动环视':model==='failed'?'小E暂未到达，章节仍可正常阅读':'小E正在到达星轨…'}}</p><div v-if="!ready" class="solar-loading" role="status">正在点亮章节星体…</div>
 </div>
 <p v-if="notice" role="status">{{notice}}</p>
 <aside class="solar-catalog"><div class="solar-catalog-heading"><span>探索航线</span><small>01 — 16</small></div><label class="solar-filter">查找章节<input v-model="query" type="search" placeholder="输入章节名称"/></label><nav class="solar-chapter-list" aria-label="全部章节文字目录"><button v-for="(world,i) in worlds" :key="world.section.id" v-show="!query||world.section.title.toLowerCase().includes(query.toLowerCase())" :class="{'is-current':current?.startsWith(world.section.id.replace('/index',''))}" @click="select(i)" @focus="focus(i)" @blur="focus(-1)"><span>{{String(world.number).padStart(2,'0')}}</span><strong>{{world.section.title.replace(/^\d+\.?\s*/, '')}}</strong><small aria-hidden="true">↗</small></button></nav><p v-if="query&&!worlds.some(w=>w.section.title.toLowerCase().includes(query.toLowerCase()))" role="status">没有找到对应章节</p><p class="solar-catalog-foot">向下滚动，查看全部 16 个章节。</p></aside>
</section></template>
