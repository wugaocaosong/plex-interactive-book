<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from "vue";
import type { ActivityRecord } from "./types";
import { putLearning, getLearning, storageError } from "./learning-store";
import { learningScope, localLearningKey } from './learning-scope';
import {registerLearningFlush} from './learning-flush';
const props=withDefaults(defineProps<{activityId?:string}>(),{activityId:'binary-search'});
const activity=computed(()=>props.activityId==='monty-hall'?'monty-hall':'binary-search');
const storageId=computed(()=>`h5p:${activity.value}:v1`);
const mounted=ref(false);
const frame = ref<HTMLIFrameElement>();
const record = ref<ActivityRecord>();
const ready = ref(false);
let disposed=false;
async function save(){
 const value=(frame.value?.contentWindow as (Window & {plexSaveActivity?:()=>ActivityRecord})|null)?.plexSaveActivity?.();
 if(value)await putLearning(storageId.value,value);
}
const unregister=registerLearningFlush(save);
function message(event: MessageEvent) {
  if (
    event.origin !== location.origin ||
    event.source !== frame.value?.contentWindow
  )
    return;
  if (event.data.type === "plex-activity-ready") ready.value = true;
  if (event.data.type === 'plex-activity-storage-error') storageError(event.data.message);
  if (event.data.type === "plex-activity-state") {
    record.value = event.data.record;
    void putLearning(storageId.value, event.data.record).catch(() => {});
  }
}
onMounted(async () => {
  window.addEventListener('message',message);
  const stored=await getLearning<ActivityRecord|undefined>(storageId.value,undefined);
  if(stored) try { localStorage.setItem(localLearningKey(storageId.value),JSON.stringify(stored)); } catch(e) { storageError(e); }
  if(!disposed)mounted.value=true;
});
onBeforeUnmount(() => {
  disposed=true;unregister();void save().catch(()=>{});
  (
    frame.value?.contentWindow as
      | (Window & { plexSaveActivity?: () => void })
      | null
  )?.plexSaveActivity?.();
  window.removeEventListener("message", message);
});
</script>
<template>
  <div class="activity-panel">
    <p class="panel-note">
      共 {{ activity==='monty-hall'?4:3 }} 道题 · 答案和得分自动保存在本机
      <span v-if="record?.maxScore"
        >· {{ record.score }} / {{ record.maxScore }} 分</span
      >
    </p>
    <iframe
      v-if="mounted"
      ref="frame"
      :src="`/h5p-player.html?activity=${activity}&scope=${encodeURIComponent(learningScope)}`"
      :title="activity==='monty-hall'?'三门问题理解自测':'二分查找互动练习'"
      class="h5p-frame"
    />
  </div>
</template>
