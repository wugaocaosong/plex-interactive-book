<script setup lang="ts">
import {computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {mergeSteps,hanoiSteps,initialTowers,moveRing,type Towers} from './chapter12-model';
import {getLearning,putLearning,updateLearning,allLearning} from './learning-store';
import {registerLearningFlush} from './learning-flush';
import type {ExerciseDefinition,ExerciseAttempt} from './types';
const CodePanel=defineAsyncComponent(()=>import('./CodePanel.vue'));
const props=defineProps<{mode:string}>();
const emit=defineEmits<{activity:[section:string,mode:string]}>();
const prefix='chapter_divide_and_conquer/';
type Route={id:string;title:string;section:string;goal:string;activity:string};
const route=ref<Route[]>([]),tasks=ref<ExerciseDefinition[]>([]),error=ref(''),loaded=ref(false);
const input=ref('6,3,8,2,5,1'), ringCount=ref(3), cursor=ref(0), manual=ref<Towers[]>([initialTowers(3)]),manualCursor=ref(0),source=ref<number>(),demonstration=ref(false),playing=ref(false);
const moves=ref(mergeSteps([6,3,8,2,5,1]));
const steps=computed(()=>hanoiSteps(ringCount.value));
const towers=computed(()=>demonstration.value?steps.value[cursor.value].towers:manual.value[manualCursor.value]);
const currentStep=computed(()=>moves.value[cursor.value]);
const task=computed(()=>tasks.value.find(t=>t.id==='ch12-'+props.mode.slice(5)));
const visited=ref<string[]>([]),completed=ref<Record<string,string>>({}),attempts=ref<Record<string,ExerciseAttempt>>({});
const last=computed(()=>props.mode==='merge'?moves.value.length-1:steps.value.length-1);
let timer:ReturnType<typeof setInterval>|undefined;let disposed=false;
const storageKey='chapter12:lab:'+props.mode;
function stop(){clearInterval(timer);timer=undefined;playing.value=false;}
async function persist(){
 if(!loaded.value||!['merge','hanoi'].includes(props.mode))return;
 await putLearning(storageKey,{version:1,input:input.value,ringCount:ringCount.value,cursor:cursor.value,manual:manual.value,manualCursor:manualCursor.value,demonstration:demonstration.value,updatedAt:new Date().toISOString()});
}
const unregister=registerLearningFlush(persist);
async function completedActivity(){
 await updateLearning('chapter12:progress',{version:1,visited:[] as string[],completed:{} as Record<string,string>},p=>({...p,completed:{...p.completed,[props.mode]:p.completed[props.mode]||new Date().toISOString()}}));
}
async function save(){try{await persist();}catch{error.value='保存失败，当前实验仍保留在面板中，请重试。';}}
function reset(){
 stop();error.value='';
 try{
  if(props.mode==='merge'){
   const values=input.value.trim().split(/[,，\s]+/).map(Number);moves.value=mergeSteps(values);
  }else{manual.value=[initialTowers(ringCount.value)];manualCursor.value=0;demonstration.value=false;source.value=undefined;}
  cursor.value=0;void save();
 }catch(e){error.value=String((e as Error).message);}
}
function step(delta:number){
 error.value='';
 if(props.mode==='hanoi'&&!demonstration.value){manualCursor.value=Math.max(0,Math.min(manual.value.length-1,manualCursor.value+delta));void save();return;}
 cursor.value=Math.max(0,Math.min(last.value,cursor.value+delta));
 if(cursor.value===last.value){stop();void completedActivity().catch(()=>{});}void save();
}
function play(){
 error.value='';
 if(playing.value){stop();return;}
 if(props.mode==='hanoi'&&!demonstration.value){demonstration.value=true;cursor.value=0;}
 if(cursor.value===last.value)cursor.value=0;
 playing.value=true;timer=setInterval(()=>step(1),1100);
}
function selectTower(index:number){
 if(demonstration.value)return;
 error.value='';
 if(source.value===undefined){source.value=index;return;}
 try{
  const next=moveRing(towers.value,source.value,index);
  manual.value=[...manual.value.slice(0,manualCursor.value+1),next];manualCursor.value++;
  if(next[2].length===ringCount.value)void completedActivity().catch(()=>{});
  void save();
 }catch(e){error.value=(e as Error).message;}finally{source.value=undefined;}
}
async function load(){
 try{
  const fetchJson=async(url:string)=>{const r=await fetch(url);if(!r.ok)throw Error('活动资源加载失败');return r.json();};
  const [config,exercises]=await Promise.all([fetchJson('/chapter12/config.json'),fetchJson('/chapter12/tasks.json')]);
  if(disposed)return;route.value=config.route;tasks.value=exercises;
  const progress=await getLearning('chapter12:progress',{visited:[] as string[],completed:{} as Record<string,string>});
  visited.value=progress.visited;completed.value=progress.completed;
  const records=await allLearning();
  attempts.value=Object.fromEntries(records.filter(r=>r.id.startsWith('attempt:ch12-')).map(r=>[(r.value as ExerciseAttempt).exerciseId,r.value as ExerciseAttempt]));
  if(['merge','hanoi'].includes(props.mode)){
   const saved=await getLearning<any>(storageKey,null);
   if(saved){
    ringCount.value=Number.isInteger(saved.ringCount)&&saved.ringCount>=1&&saved.ringCount<=5?saved.ringCount:3;
    input.value=typeof saved.input==='string'?saved.input:input.value;
    try{moves.value=mergeSteps(input.value.trim().split(/[,，\s]+/).map(Number));}catch{input.value='6,3,8,2,5,1';}
    demonstration.value=!!saved.demonstration;
    // Reconstruct manual history through the move validator; reject corrupted backups.
    const history:Towers[]=[initialTowers(ringCount.value)];
    for(const candidate of Array.isArray(saved.manual)?saved.manual.slice(1,1000):[]){
     const previous=history.at(-1)!;let valid:Towers|undefined;
     for(let a=0;a<3;a++)for(let b=0;b<3;b++)try{const next=moveRing(previous,a,b);if(JSON.stringify(next)===JSON.stringify(candidate))valid=next;}catch{}
     if(!valid)break;history.push(valid);
    }
    manual.value=history;manualCursor.value=Math.max(0,Math.min(history.length-1,Math.trunc(saved.manualCursor)||0));
    cursor.value=Math.max(0,Math.min(last.value,Math.trunc(saved.cursor)||0));
   }
  }
  loaded.value=true;
 }catch{error.value='活动加载失败，请检查本地资源后重试。';}
}
onMounted(load);
onBeforeUnmount(()=>{disposed=true;stop();void persist().catch(()=>{});unregister();});
</script>

<template>
 <div class="chapter12-panel">
  <p class="ch12-eyebrow">PLEX · 分治探险</p>
  <p v-if="error" role="alert">{{error}} <button @click="loaded?save():load()">重试</button></p>
  <p v-if="!loaded">正在读取活动…</p>
  <template v-else-if="mode==='route'">
   <h3>本章任务路线</h3><p>可以从任意一站出发。访问、实验完成、代码测试分别记录。</p>
   <ol class="ch12-route">
    <li v-for="item in route" :key="item.id"><h4>{{item.title}}</h4><p>{{item.goal}}</p>
     <p>{{visited.includes(prefix+item.section)?'已访问':'尚未访问'}} · {{completed[item.activity]?'已完成实验':'实验尚未完成'}} · {{attempts['ch12-'+item.id]?.results.length ? '最近代码测试 '+attempts['ch12-'+item.id].results.filter(r=>r.passed).length+'/'+attempts['ch12-'+item.id].results.length : '代码尚未测试'}}</p>
     <button @click="emit('activity',prefix+item.section,item.activity)">前往{{item.title}}</button>
    </li>
   </ol>
  </template>
  <template v-else-if="mode==='merge'">
   <h3>拆分合并 · 能源补给线</h3><p>教学演示 · 根据预设算法模型生成，不跟踪编辑器中的代码。</p>
   <label>模块编号（2—8 个整数）<input v-model="input" aria-label="模块编号" @keydown.enter="reset"/></label><button @click="reset">应用输入并重置</button>
   <div class="ch12-lab" aria-live="polite"><p>{{currentStep.path}} · {{currentStep.phase}}</p>
    <div class="ch12-modules"><span v-for="(n,i) in currentStep.values" :key="i">{{n}}</span></div><p>{{currentStep.explanation}}</p>
   </div>
  </template>
  <template v-else-if="mode==='hanoi'">
   <h3>能源环搬运 · 汉诺塔</h3><p>教学演示 · 点击源柱，再点击目标柱；小环必须在大环上面。</p>
   <label>能源环数量 <select v-model.number="ringCount" aria-label="能源环数量" @change="reset"><option v-for="n in 5" :key="n" :value="n">{{n}}</option></select></label>
   <button @click="stop();error='';demonstration=!demonstration;source=undefined;save()">{{demonstration?'回到手动操作':'查看标准解'}}</button><button @click="reset">重置</button>
   <div class="ch12-towers">
    <button v-for="(tower,i) in towers" :key="i" :aria-label="[...tower].reverse().join('')+'ABC'[i]+'，选择 '+'ABC'[i]+' 柱，能源环从上到下如图'" :aria-pressed="source===i" :disabled="demonstration" @click="selectTower(i)">
     <span class="ch12-pole" aria-hidden="true"><span v-for="n in [...tower].reverse()" :key="n" class="ch12-ring" :style="{width:(28+n*12)+'%'}">{{n}}</span></span><strong>{{'ABC'[i]}}</strong>
    </button>
   </div>
   <p aria-live="polite">{{demonstration?steps[cursor].explanation:source!==undefined?'已选 '+ 'ABC'[source]+' 柱，请选目标柱。':'请选源柱。'}} 当前移动 {{demonstration?cursor:manualCursor}} 次，标准解 {{2**ringCount-1}} 次。</p>
   <p>从底到顶：{{towers.map((t,i)=>'ABC'[i]+' ['+t.join(',')+']').join('；')}}</p>
   <p v-if="towers[2].length===ringCount">已完成搬运！想一想：为什么先搬上面的 n−1 个环？</p>
  </template>
  <div v-if="loaded && ['merge','hanoi'].includes(mode)" class="execution-actions">
   <button :disabled="(mode==='hanoi'&&!demonstration?manualCursor:cursor)===0" @click="stop();step(-1)">上一步</button>
   <button :disabled="mode==='hanoi'&&!demonstration?manualCursor===manual.length-1:cursor===last" @click="stop();step(1)">下一步</button>
   <button @click="play">{{playing?'暂停':'播放标准步骤'}}</button>
   <span v-if="mode==='merge'||demonstration">{{cursor+1}} / {{last+1}} 步</span>
  </div>
  <CodePanel v-if="loaded && task" :key="task.id" :exercise="task" />
 </div>
</template>
