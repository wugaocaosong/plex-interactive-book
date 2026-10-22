<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { ActivityRecord } from './types'
const frame=ref<HTMLIFrameElement>();const record=ref<ActivityRecord>(); const ready=ref(false)
function message(event:MessageEvent){if(event.origin!==location.origin||event.source!==frame.value?.contentWindow)return;if(event.data.type==='plex-activity-ready')ready.value=true;if(event.data.type==='plex-activity-state')record.value=event.data.record}
onMounted(()=>window.addEventListener('message',message))
onBeforeUnmount(()=>{(frame.value?.contentWindow as (Window & {plexSaveActivity?:()=>void}) | null)?.plexSaveActivity?.();window.removeEventListener('message',message)})
</script>
<template><div class="activity-panel"><p class="panel-note">共 3 道题 · 答案和得分自动保存在本机 <span v-if="record?.maxScore">· {{record.score}} / {{record.maxScore}} 分</span></p><iframe ref="frame" src="/h5p-player.html" title="二分查找互动练习" class="h5p-frame" /></div></template>
