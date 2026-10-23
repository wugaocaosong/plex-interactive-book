<script setup lang="ts">
import {computed,onMounted,ref} from 'vue'
import type {AnnotationRecord,ReadingLocator} from './types'
import {allLearning,putLearning,removeLearning,exportBackup,importBackup,validateBackup,download,type Backup} from './learning-store'
import {notesMarkdown} from './annotations'
const emit=defineEmits<{navigate:[place:ReadingLocator];changed:[];rebind:[note:AnnotationRecord]}>()
const origin=typeof window==='undefined'?'':window.location.origin
const notes=ref<AnnotationRecord[]>([]),query=ref(''),kind=ref(''),chapter=ref(''),message=ref(''),pending=ref<Backup>(),conflicts=ref<{id:string;value:unknown}[]>([])
const filtered=computed(()=>notes.value.filter(n=>(!kind.value||n.kind===kind.value)&&(!chapter.value||n.sectionId===chapter.value)&&(n.exact+n.note).includes(query.value)))
async function load(){const records=await allLearning();notes.value=records.filter(r=>r.id.startsWith('annotation:')).map(r=>r.value as AnnotationRecord);conflicts.value=records.filter(r=>r.id.startsWith('conflict:'))}
async function save(note:AnnotationRecord){note.updatedAt=new Date().toISOString();await putLearning('annotation:'+note.id,note);emit('changed')}
async function remove(note:AnnotationRecord){await removeLearning('annotation:'+note.id);await load();emit('changed')}
async function backup(){try{download('plex-learning-backup.json',JSON.stringify(await exportBackup(),null,2));message.value='完整备份已导出。'}catch(e){message.value=String(e)}}
async function pick(event:Event){try{const file=(event.target as HTMLInputElement).files?.[0];if(file)pending.value=validateBackup(JSON.parse(await file.text()))}catch(e){message.value=String(e)}}
async function restore(){try{await importBackup(pending.value);pending.value=undefined;await load();emit('changed');message.value='已合并备份。冲突版本保留在下方；阅读设置将在刷新后应用。'}catch(e){message.value=String(e)}}
onMounted(()=>load().catch(e=>message.value=String(e)))
</script>
<template><div class="notebook">
 <div class="notebook-tools"><input v-model="query" aria-label="搜索笔记" placeholder="搜索引用或笔记"/><select v-model="kind" aria-label="笔记类型"><option value="">全部类型</option><option value="highlight">高亮</option><option value="underline">划线</option><option value="note">批注</option></select><select v-model="chapter" aria-label="笔记章节"><option value="">全部章节</option><option v-for="id in [...new Set(notes.map(n=>n.sectionId))]" :key="id">{{id}}</option></select></div>
 <div class="execution-actions"><button @click="download('星轨学习笔记.md',notesMarkdown(notes,origin),'text/markdown')">导出 Markdown 笔记</button><button @click="backup">导出全部学习备份</button><label>导入备份<input type="file" accept="application/json,.json" @change="pick"/></label></div>
 <p role="status">{{message}}</p><div v-if="pending" class="backup-preview">即将导入 {{pending.records.length}} 条记录。相同内容合并，冲突版本单独保留。<button @click="restore">确认导入</button><button @click="pending=undefined">取消</button></div>
 <p v-if="!filtered.length" class="empty-note">选择正文即可高亮、划线或写下批注。</p>
 <article v-for="note in filtered" :key="note.id" class="note-card"><small>{{note.sectionId}} · {{note.kind}} <b v-if="note.status==='orphan'">待重新定位</b></small><blockquote>{{note.exact}}</blockquote><textarea v-model="note.note" aria-label="编辑笔记" @change="save(note)"/><div class="execution-actions"><button @click="emit('navigate',note.start)">返回原文</button><button @click="emit('rebind',note)">重新关联选区</button><button @click="remove(note)">删除笔记</button></div></article>
 <details v-if="conflicts.length"><summary>备份冲突版本（{{conflicts.length}}）</summary><article v-for="record in conflicts" :key="record.id"><small>{{record.id}}</small><pre>{{JSON.stringify(record.value,null,2)}}</pre><button @click="download('保留的记录.json',JSON.stringify(record,null,2))">导出此版本</button></article></details>
</div></template>
