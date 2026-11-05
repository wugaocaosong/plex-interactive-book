<script setup lang="ts">
import {computed,onBeforeUnmount,onMounted,ref,watch} from 'vue';
import {buildLab,stationDefaults,stationTitles,pseudo,initialTowers,moveRing,type Station,type LabInput} from './starship-model';
import {getLearning,putLearning,updateLearning} from './learning-store';
import {registerLearningFlush} from './learning-flush';
const props=defineProps<{station:Station}>();
const input=ref<LabInput>(stationDefaults(props.station)),raw=ref(input.value.values.join(',')),ino=ref(input.value.inorder.join(','));
const parameter=ref({...input.value});
const frames=ref(buildLab(props.station,input.value)),cursor=ref(0),mode=ref<'manual'|'demo'>('manual'),speed=ref(1),playing=ref(false),ready=ref(false),error=ref(''),feedback=ref(''),answered=ref(false);
const moves=ref<number[][][]>([initialTowers(3)]),moveIndex=ref(0),source=ref<number>(),decisions=ref<{step:number;choice:string;correct:boolean}[]>([]);
const state=computed(()=>frames.value[cursor.value]),manualHanoi=computed(()=>props.station==='hanoi'&&mode.value==='manual');
const towers=computed(()=>manualHanoi.value?moves.value[moveIndex.value]:state.value.towers||[]);
const finished=computed(()=>manualHanoi.value?towers.value[2]?.length===input.value.rings:cursor.value===frames.value.length-1);
const key='chapter12:starship:'+props.station;let timer:ReturnType<typeof setInterval>|undefined,disposed=false;
function stop(){clearInterval(timer);playing.value=false;}
async function persist(){if(ready.value)await putLearning(key,{version:1,input:input.value,cursor:cursor.value,mode:mode.value,decisions:decisions.value,moves:moves.value,moveIndex:moveIndex.value,updatedAt:new Date().toISOString()});}
async function save(){try{await persist();}catch{error.value='实验保存失败；当前操作仍在窗口中，请重试保存。';}}
const unregister=registerLearningFlush(persist);
async function complete(){if(finished.value&&mode.value==='manual'&&(props.station==='hanoi'||frames.value.slice(0,-1).every((_,i)=>decisions.value.some(d=>d.step===i&&d.correct))))await updateLearning('chapter12:progress',{version:1,visited:[],completed:{} as Record<string,string>},p=>({...p,completed:{...p.completed,['lab-'+props.station]:new Date().toISOString()}})).catch(()=>{error.value='完成记录保存失败，请重试保存。';});}
function reset(){stop();try{const next={...parameter.value,values:raw.value.trim()?raw.value.split(/[,，\s]+/).map(Number):[],inorder:ino.value.trim()?ino.value.split(/[,，\s]+/).map(Number):[]};const built=buildLab(props.station,next);frames.value=built;input.value=next;cursor.value=0;moves.value=[initialTowers(next.rings)];moveIndex.value=0;source.value=undefined;decisions.value=[];feedback.value='';answered.value=false;error.value='';void save();}catch(e){error.value=String(e);}}
function step(delta:number){stop();if(manualHanoi.value)moveIndex.value=Math.max(0,Math.min(moves.value.length-1,moveIndex.value+delta));else cursor.value=Math.max(0,Math.min(frames.value.length-1,cursor.value+delta));feedback.value='';answered.value=false;void complete();void save();}
function choose(choice:string){const correct=choice===state.value.answer;decisions.value=[...decisions.value.slice(-499),{step:cursor.value,choice,correct}];feedback.value=correct?'判断正确。'+state.value.text:'再想一想：'+({merge:'取值只比较尚未取出的两个队首，相等先左组。',search:'比较中点与目标，有序性才能排除半区，已检查的中点也要排除。',tree:'前序首项是根；中序根左边的节点数量决定左子树范围。',hanoi:'只能移动顶部单环，大环不能压小环。',power:'指数为零返回 1；奇数指数平方后还需额外乘一次底数。'}[props.station]);answered.value=correct;void save();}
function tower(index:number){if(!manualHanoi.value)return;if(source.value===undefined){source.value=index;return;}try{if(moves.value.length>=1000)throw Error('已保存 999 步，请重置后开始新一轮。');const next=moveRing(towers.value,source.value,index);moves.value=[...moves.value.slice(0,moveIndex.value+1),next];moveIndex.value++;feedback.value='移动合法。';void complete();void save();}catch(e){feedback.value=String(e);}source.value=undefined;}
function play(){if(playing.value){stop();return;}mode.value='demo';if(cursor.value===frames.value.length-1)cursor.value=0;playing.value=true;timer=setInterval(()=>{if(cursor.value<frames.value.length-1)cursor.value++;if(cursor.value===frames.value.length-1)stop();void save();},1200/speed.value);}
function visibility(){if(document.hidden)stop();}
function switchMode(value:'manual'|'demo'){stop();mode.value=value;feedback.value='';answered.value=false;void save();}
watch(speed,()=>{if(playing.value){stop();play();}});
const treePoints=computed(()=>{const edges=state.value.edges||[];return edges.map(([node,parent])=>{let depth=0,p=parent;while(p!==null&&depth<16){depth++;p=edges.find(e=>e[0]===p)?.[1]??null;}return {node,parent,x:30+Math.max(0,input.value.inorder.indexOf(node))*36,y:30+depth*56};});});
onMounted(async()=>{document.addEventListener('visibilitychange',visibility);try{const saved=await getLearning<any>(key,null);if(disposed)return;if(saved){frames.value=buildLab(props.station,saved.input);input.value=saved.input;parameter.value={...saved.input};raw.value=input.value.values.join(',');ino.value=input.value.inorder.join(',');cursor.value=Math.max(0,Math.min(frames.value.length-1,Number(saved.cursor)||0));mode.value=saved.mode==='demo'?'demo':'manual';decisions.value=Array.isArray(saved.decisions)?saved.decisions.slice(-500):[];const history=[initialTowers(input.value.rings)];for(const candidate of (saved.moves||[]).slice(1,1000)){let valid=false;for(let a=0;a<3;a++)for(let b=0;b<3;b++)try{if(JSON.stringify(moveRing(history.at(-1)!,a,b))===JSON.stringify(candidate))valid=true;}catch{}if(!valid)break;history.push(candidate);}moves.value=history;moveIndex.value=Math.min(history.length-1,Math.max(0,Number(saved.moveIndex)||0));}}catch{error.value='旧实验记录无法读取，已使用默认输入。';}ready.value=true;});
onBeforeUnmount(()=>{disposed=true;stop();document.removeEventListener('visibilitychange',visibility);void save();unregister();});
</script>
<template>
 <section class="starship-workbench" :aria-label="stationTitles[station]+'虚拟实验台'">
  <header><small>PLEX / MISSION LAB</small><h3>{{stationTitles[station]}}</h3><p>教学演示 · 预设算法模型，不是学生代码的执行轨迹。</p></header>
  <div class="starship-tabs"><button :aria-pressed="mode==='manual'" @click="switchMode('manual')">自己操作</button><button :aria-pressed="mode==='demo'" @click="switchMode('demo')">观看流程</button></div>
  <div class="starship-inputs">
   <label v-if="['merge','search','tree'].includes(station)">{{station==='tree'?'前序遍历':'模块编号'}}<input v-model="raw" :aria-label="station==='tree'?'前序遍历':'实验数组'" /></label>
   <label v-if="station==='search'">目标信号<input v-model.number="parameter.target" type="number" /></label>
   <label v-if="station==='tree'">中序遍历<input v-model="ino" /></label>
   <label v-if="station==='hanoi'">能源环数量<select v-model.number="parameter.rings"><option v-for="n in 5" :value="n">{{n}}</option></select></label>
   <template v-if="station==='power'"><label>底数<input v-model.number="parameter.base" type="number" /></label><label>指数<input v-model.number="parameter.exponent" type="number" min="0" max="64" /></label></template>
   <button @click="reset">应用输入并重置</button>
  </div>
  <p v-if="error" role="alert">{{error}} <button @click="save">重试保存</button></p>
  <div class="starship-stage" :key="cursor+'-'+moveIndex">
   <h4>{{manualHanoi?'手动搬运':state.phase}}</h4>
   <div v-if="state.values.length" class="starship-values"><div v-for="(v,i) in state.values" :key="i" :class="{active:state.variables.中点===i,excluded:station==='search'&&(i<Number(state.variables.左边界)||i>Number(state.variables.右边界))}"><small>{{i}}</small><strong>{{v}}</strong></div></div>
   <svg v-if="station==='tree'&&treePoints.length" role="img" aria-label="已连接的空间站树，节点及父节点见下方文字" :viewBox="`0 0 ${Math.max(240,input.inorder.length*36+30)} ${Math.max(180,...treePoints.map(p=>p.y+40))}`" class="starship-tree"><g v-for="p in treePoints" :key="p.node"><line v-if="p.parent!==null" :x1="p.x" :y1="p.y" :x2="treePoints.find(t=>t.node===p.parent)?.x" :y2="treePoints.find(t=>t.node===p.parent)?.y"/><circle :cx="p.x" :cy="p.y" r="17"/><text :x="p.x" :y="p.y+5">{{p.node}}</text></g></svg>
   <p v-if="state.edges?.length">{{state.edges.map(([n,p])=>p===null?`根 ${n}`:`${p} → ${n}`).join('；')}}</p>
   <div v-if="station==='hanoi'" class="ch12-towers"><button v-for="(rings,i) in towers" :key="i" :disabled="!manualHanoi" :aria-pressed="source===i" :aria-label="'选择 '+ 'ABC'[i]+' 柱'" @click="tower(i)"><span class="ch12-pole"><span v-for="r in [...rings].reverse()" class="ch12-ring" :style="{width:(28+r*12)+'%'}">{{r}}</span></span><strong>{{'ABC'[i]}}</strong></button></div>
   <p v-if="station==='hanoi'">{{towers.map((t,i)=>'ABC'[i]+' 从底到顶 ['+t+']').join('；')}} · {{manualHanoi?moveIndex:cursor}} 次移动</p>
   <dl class="starship-variables"><template v-for="(v,k) in state.variables"><dt>{{k}}</dt><dd>{{Array.isArray(v)?'['+v.join(', ')+']':v}}</dd></template></dl>
   <p v-if="mode==='demo'||finished">{{state.text}}</p>
   <div v-if="mode==='manual'&&!manualHanoi&&!finished"><p>{{state.question}}</p><button v-for="choice in state.choices" :key="choice" @click="choose(choice)">{{choice}}</button></div>
   <p role="status">{{feedback}}</p><p v-if="finished">{{mode==='manual'&&(station==='hanoi'||frames.slice(0,-1).every((_,i)=>decisions.some(d=>d.step===i&&d.correct)))?'实验完成，可以进入即时测验或编程验证。':'流程已到终点。未完成全部自主决策时，不计为自主实验完成。'}}</p>
  </div>
  <ol class="starship-pseudo"><li v-for="(line,i) in pseudo[station]" :class="{active:state.line===i+1}">{{line}}</li></ol>
  <div class="execution-actions"><button :disabled="(manualHanoi?moveIndex:cursor)===0" @click="step(-1)">上一步</button><button :disabled="manualHanoi?moveIndex>=moves.length-1:finished||(mode==='manual'&&!answered)" @click="step(1)">下一步</button><button @click="play">{{playing?'暂停':'播放流程'}}</button><button @click="stop();cursor=0;moveIndex=0;answered=false;feedback='';save()">重新播放</button><label>速度<select v-model.number="speed"><option :value=".5">0.5 倍</option><option :value="1">1 倍</option><option :value="2">2 倍</option></select></label><span>{{cursor+1}} / {{frames.length}}</span></div>
 </section>
</template>
