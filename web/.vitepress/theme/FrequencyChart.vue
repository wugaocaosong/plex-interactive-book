<script setup lang="ts">
import {computed,ref,onMounted,onBeforeUnmount} from 'vue';
import {use} from 'echarts/core';
import {LineChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,LegendComponent,MarkLineComponent,AriaComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
import VChart from 'vue-echarts';
import {validateSimulation,type SimulationResult} from './monty-hall';
use([LineChart,GridComponent,TooltipComponent,LegendComponent,MarkLineComponent,AriaComponent,SVGRenderer]);
const props=defineProps<{result:SimulationResult}>();
const chart=ref<InstanceType<typeof VChart>>(),position=ref(1),dark=ref(false);
let observer:MutationObserver|undefined;
onMounted(()=>{const reader=document.querySelector('.reader');const update=()=>dark.value=!!reader?.classList.contains('theme-dark');update();observer=new MutationObserver(update);if(reader)observer.observe(reader,{attributes:true,attributeFilter:['class']});});
onBeforeUnmount(()=>observer?.disconnect());
const points=computed(()=>{const r=validateSimulation(props.result);let stay=0,change=0;return r.trials.map((t,i)=>{stay+=+t.stayWon;change+=+t.switchWon;return {n:i+1,stay,change,a:stay/(i+1),b:change/(i+1)};});});
const current=computed(()=>points.value[Math.min(points.value.length,Math.max(1,Math.trunc(position.value)||1))-1]);
const option=computed(()=>({backgroundColor:dark.value?'#131315':'#f7eedb',animation:false,aria:{enabled:true},color:dark.value?['#80c9bc','#d9b873']:['#326b63','#886110'],textStyle:{color:dark.value?'#f7eedb':'#242723'},grid:{left:55,right:26,top:50,bottom:45},legend:{textStyle:{color:dark.value?'#f7eedb':'#242723'}},tooltip:{trigger:'axis',valueFormatter:(v:unknown)=>`${(Number(v)*100).toFixed(4)}%`},xAxis:{type:'value',min:1,max:Math.max(2,props.result.count),name:'次数',nameLocation:'middle',nameGap:28,axisLabel:{color:dark.value?'#f7eedb':'#242723'},splitLine:{show:false}},yAxis:{type:'value',min:0,max:1,axisLabel:{color:dark.value?'#f7eedb':'#242723',formatter:(v:number)=>`${v*100}%`},splitLine:{lineStyle:{color:dark.value?'#ffffff22':'#24272322'}}},series:[['不换门','a',1/3],['换门','b',2/3]].map(([name,field,theory])=>({name,type:'line',smooth:false,showSymbol:props.result.count===1,data:points.value.map(p=>[p.n,p[field as 'a'|'b']]),markLine:{symbol:'none',silent:true,label:{formatter:name==='换门'?'理论 2/3':'理论 1/3',color:dark.value?'#f7eedb':'#242723',position:'insideEndTop'},lineStyle:{type:'dashed'},data:[{yAxis:theory}]}}))}));
function exportChart(){const url=chart.value?.getDataURL({type:'svg'});if(url){const a=document.createElement('a');a.href=url;a.download='PLEX-实际频率.svg';a.click();}}
</script>
<template><div class="frequency-chart"><VChart ref="chart" :option="option" :init-options="{renderer:'svg'}" autoresize style="height:320px;width:100%"/><p>青色：不换门；金色：换门。虚线为固定理论值。曲线保留每条实际记录，不平滑。</p><label>查看前几次的精确累计值<input v-model.number="position" type="number" min="1" :max="result.count" /></label><p v-if="current" role="status">前 {{current.n}} 次：不换门 {{current.stay}} / {{current.n}} = {{(current.a*100).toFixed(4)}}%；换门 {{current.change}} / {{current.n}} = {{(current.b*100).toFixed(4)}}%。</p><button @click="exportChart">导出频率图 SVG</button></div></template>
