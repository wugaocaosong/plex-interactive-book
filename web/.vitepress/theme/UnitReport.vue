<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount} from 'vue';
import {allLearning,download} from './learning-store';
import {flushLearning} from './learning-flush';
import {blankProgress} from './lesson-state';
import {createLessonReport,reportHtml,reportMarkdown,type LessonReport} from './lesson-report';
import {validateSimulation} from './monty-hall';
import type {ExerciseDefinition} from './types';
const props=defineProps<{exercises:ExerciseDefinition[]}>();
const report=ref<LessonReport>(),html=ref(''),error=ref(''),preview=ref(false),frame=ref<HTMLIFrameElement>();
let disposed=false;
async function refresh(){
  try{
    await flushLearning();
    const records=await allLearning(),get=(id:string)=>records.find(r=>r.id===id)?.value as any;
    let simulation;
    const candidates=records.filter(r=>['simulation:monty-hall','simulation:monty-single'].includes(r.id)).sort((a,b)=>String((b.value as any)?.resultAt||b.updatedAt).localeCompare(String((a.value as any)?.resultAt||a.updatedAt)));
    for(const r of candidates){try{simulation=validateSimulation((r.value as any).result);break;}catch{/* Invalid results are never used as evidence. */}}
    if(disposed)return;
    report.value=createLessonReport({progress:get('unit:monty-hall')||blankProgress(),story:get('lab:monty-hall'),simulation,exercises:props.exercises,attempts:records.filter(r=>r.id.startsWith('attempt:monty-')).map(r=>r.value as any),quiz:get('h5p:monty-hall:v1')});
    html.value=reportHtml(report.value,location.origin);error.value='';
  }catch(e){error.value=String(e);}
}
async function openPreview(){await refresh();preview.value=true;}
onMounted(refresh);onBeforeUnmount(()=>disposed=true);
function save(kind:'html'|'md'){if(!report.value)return;download('PLEX-三门学习报告.'+kind,kind==='html'?html.value:reportMarkdown(report.value,location.origin),kind==='html'?'text/html;charset=utf-8':'text/markdown;charset=utf-8');}
</script>
<template><section class="unit-report"><h4>学习报告</h4><p>先预览，再下载或打印。只导出本机学习证据，不包含登录名、账号编号、会话凭据和在线对话。</p><button @click="openPreview">预览最新学习报告</button><p v-if="error" role="alert">{{error}}</p><template v-if="preview&&report"><div class="unit-actions"><button @click="save('md')">下载 Markdown 报告</button><button @click="save('html')">下载独立 HTML 报告</button><button @click="frame?.contentWindow?.print()">打印报告 / PDF</button></div><iframe ref="frame" title="学习报告预览" :srcdoc="html" style="width:100%;height:620px;border:1px solid #4f8d86;border-radius:10px;background:#f7eedb"/></template></section></template>
