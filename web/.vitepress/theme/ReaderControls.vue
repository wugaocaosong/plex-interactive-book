<script setup lang="ts">
import {ref,watch,onMounted,onBeforeUnmount} from 'vue';
import {getLearning,putLearning} from './learning-store';
import {defaultControls,sanitizeControls,validKey,keyDirection,type TurnDirection,type PageTurnCommand} from './reader-controls';
const props=defineProps<{settings:boolean;blocked:boolean;notice:string}>();
const emit=defineEmits<{command:[command:PageTurnCommand];configure:[]}>();
const prefs=ref({...defaultControls}),recording=ref<TurnDirection>(),candidate=ref(''),keyLabel=ref('尚未收到按键'),message=ref('');
let sequence=0;const session=Date.now();
async function save(){try{await putLearning('reader-controls',prefs.value);message.value='控制设置已保存';}catch{message.value='保存失败，当前设置仍可使用，请重试保存';}}
function keyboard(event:KeyboardEvent){
 if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
 if(props.settings){
  if(event.key==='Escape'||event.key==='Tab')return;
  if((event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]'))return;
  keyLabel.value=`key: ${event.key} / code: ${event.code}`;
  if(recording.value){event.preventDefault();if(validKey(event.code))candidate.value=event.code;else message.value='此按键不可用，请换一个按键';}
  else if(keyDirection(event.code,prefs.value)){event.preventDefault();message.value=keyDirection(event.code,prefs.value)==='next'?'检测成功：下一页（测试区不翻动正文）':'检测成功：上一页（测试区不翻动正文）';}
  return;
 }
 if(props.blocked||(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true],.cm-editor,button,a,[role=button]')||!getSelection()?.isCollapsed)return;
 const direction=keyDirection(event.code||event.key,prefs.value);if(!direction)return;
 event.preventDefault();emit('command',{direction,source:'keyboard',session,event:++sequence});
}
function confirmKey(){if(!recording.value||!candidate.value)return;const other=recording.value==='next'?'previous':'next';
 if(candidate.value===prefs.value[other]||(candidate.value==='ArrowLeft'&&recording.value==='next')||(candidate.value==='ArrowRight'&&recording.value==='previous')||(candidate.value==='PageUp'&&recording.value==='next')||(candidate.value==='PageDown'&&recording.value==='previous')){message.value='按键与另一方向冲突';return;}
 prefs.value[recording.value]=candidate.value;recording.value=undefined;candidate.value='';void save();}
watch(()=>props.settings,()=>{recording.value=undefined;candidate.value='';});
onMounted(async()=>{prefs.value=sanitizeControls(await getLearning('reader-controls',defaultControls));window.addEventListener('keydown',keyboard);});
onBeforeUnmount(()=>window.removeEventListener('keydown',keyboard));
</script>
<template>
 <Teleport v-if="settings" to="#reader-control-slot">
  <div class="input-settings">
   <p>翻书模式翻一页；连续阅读滚动一屏。编辑、选字或活动打开时暂停翻动正文。</p>
   <section><h3>USB 翻页笔 · 按键映射</h3><p>先点击录入，再按翻页笔。设备须向当前浏览器窗口发送键盘事件。</p>
    <div class="input-buttons"><button @click="recording='previous';candidate=''">录入上一页</button><code>{{prefs.previous}}</code><button @click="recording='next';candidate=''">录入下一页</button><code>{{prefs.next}}</code></div>
    <p v-if="recording">请按{{recording==='previous'?'上一页':'下一页'}}按键：{{candidate||'等待按键…'}}</p>
    <button v-if="candidate" @click="confirmKey">确认映射</button><button v-if="recording" @click="recording=undefined;candidate=''">取消录入</button>
    <div tabindex="0" class="input-key-test" aria-label="翻页笔按键测试区">点击这里测试按键<br>{{keyLabel}}</div>
    <p>未收到信号时先点击测试区，检查接收器和设备电源。USB 接入不等于按键已映射。</p>
   </section>
   <slot name="sensors" :prefs="prefs" :save="save" />
   <button @click="save">保存控制设置</button><p role="status">{{message}}</p>
  </div>
 </Teleport>
 <slot :prefs="prefs" />
 <div v-if="notice&&!blocked" class="input-turn-notice" role="status">{{notice}}</div>
</template>
<style>
.input-settings{padding:4px 6px 24px;line-height:1.8}.input-settings section{border-top:1px solid #526a7b;padding:18px 0}.input-settings h3{font-size:20px;color:#bcefff}.input-buttons{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.input-settings button,.input-settings select{padding:10px 14px;margin:4px;background:#102535;color:#e9f8ff;border:1px solid #68bdcf}.input-key-test{padding:16px;border:1px dashed #68bdcf;margin:12px 0}.input-turn-notice{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:35;background:#0c2335;color:white;padding:8px 16px;pointer-events:none;max-width:90vw}.input-settings :focus-visible{outline:3px solid #ffe48f;outline-offset:3px}
</style>
