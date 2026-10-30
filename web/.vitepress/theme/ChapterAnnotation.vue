<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch,nextTick} from 'vue';
import type {AnnotationRecord} from './types';
import {getLearning,putLearning} from './learning-store';
import {registerLearningFlush} from './learning-flush';
const props=defineProps<{record:AnnotationRecord;point:{x:number;y:number};error:string}>();
const emit=defineEmits<{save:[kind:AnnotationRecord['kind'],text:string];close:[]}>();
const text=ref(props.record.note),field=ref<HTMLTextAreaElement>(),ready=ref(false);
const key='chapter12:annotation-draft:'+props.record.sectionId+':'+props.record.start.blockId+':'+props.record.start.offset;
let timer:ReturnType<typeof setTimeout>|undefined;
async function persist(){if(ready.value)await putLearning(key,{text:text.value,record:props.record,updatedAt:new Date().toISOString()});}
const unregister=registerLearningFlush(persist);
watch(text,()=>{clearTimeout(timer);timer=setTimeout(()=>void persist().catch(()=>{}),500);});
function close(){void persist().catch(()=>{});emit('close');}
function save(kind:AnnotationRecord['kind']){emit('save',kind,text.value);}
function keys(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();save('note');}}
onMounted(async()=>{const saved=await getLearning<{text:string}|null>(key,null);if(!props.record.note&&saved)text.value=saved.text;ready.value=true;await nextTick();field.value?.focus();});
onBeforeUnmount(()=>{clearTimeout(timer);void persist().catch(()=>{});unregister();});
</script>
<template><div class="ch12-annotation" role="region" aria-label="就近批注" :style="{left:point.x+'px',top:point.y+'px'}" @keydown="keys">
 <blockquote>{{record.exact.slice(0,110)}}</blockquote><textarea ref="field" v-model="text" rows="3" aria-label="批注内容" placeholder="写下理解、疑问，或一个自己的例子…"/>
 <div class="execution-actions"><button @click="save('highlight')">高亮</button><button @click="save('underline')">划线</button><button @click="save('note')">保存批注</button><button @click="close">收起</button></div>
 <small>Ctrl / ⌘ + Enter 保存 · Esc 收起并保留草稿</small><p v-if="error" role="alert">{{error}}</p>
</div></template>
