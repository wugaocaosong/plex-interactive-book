<script setup lang="ts">
import {ref,watch,onMounted,onBeforeUnmount,nextTick} from 'vue';
import {getLearning,putLearning} from './learning-store';
import {defaultControls,sanitizeControls,validKey,keyDirection,type TurnDirection,type PageTurnCommand,SwipeTracker,voiceDirection,openPalm} from './reader-controls';
import type {SensorHandle} from './input-sensors';
const props=defineProps<{settings:boolean;blocked:boolean;notice:string}>();
const emit=defineEmits<{command:[command:PageTurnCommand];configure:[]}>();
const prefs=ref({...defaultControls}),recording=ref<TurnDirection>(),candidate=ref(''),keyLabel=ref('尚未收到按键'),message=ref('');
let sequence=0;const session=Date.now();
const cameraState=ref('关闭'),voiceState=ref('关闭'),sensorError=ref(''),transcript=ref(''),level=ref(0),preview=ref(true),mounted=ref(false);
const devices=ref<MediaDeviceInfo[]>([]),cameraDevice=ref(''),micDevice=ref(''),video=ref<HTMLVideoElement>();
let cameraAbort:AbortController|undefined,voiceAbort:AbortController|undefined,camera:SensorHandle|undefined,voice:SensorHandle|undefined;
let sensorSession=0,voiceSession=0;const swipe=new SwipeTracker();
const isBlocked=()=>props.blocked||!!document.activeElement?.closest('input,textarea,select,[contenteditable=true],.cm-editor')||!getSelection()?.isCollapsed||document.hidden||!document.hasFocus();
async function refreshDevices(){try{devices.value=await navigator.mediaDevices.enumerateDevices();}catch{sensorError.value='无法读取设备，请使用 localhost 或 HTTPS 并检查浏览器权限';}}
function stopCamera(){cameraAbort?.abort();camera?.stop();camera=undefined;cameraState.value='关闭';swipe.reset();}
function stopVoice(){voiceAbort?.abort();voice?.stop();voice=undefined;voiceState.value='关闭';level.value=0;transcript.value='';}
function background(){if(document.hidden||!document.hasFocus()){const active=cameraState.value!=='关闭'||voiceState.value!=='关闭';stopCamera();stopVoice();if(active)sensorError.value='页面已离开前台，设备已释放；返回后请重新开启。';}}
async function enableCamera(){
 stopCamera();sensorError.value='';cameraState.value='加载中';cameraAbort=new AbortController();const abort=cameraAbort,own=++sensorSession;
 try{const {startCamera}=await import('./input-sensors');await nextTick();if(abort.signal.aborted)return;
  camera=await startCamera(video.value!,cameraDevice.value,abort.signal,(hands,time)=>{
   if(abort.signal.aborted)return;cameraState.value=hands.length>1?'检测到多只手，请只保留一只':hands.length===1?(openPalm(hands[0])?'已识别张掌':'已识别手，请张开手掌'):'未检测到手';
   if(isBlocked()){swipe.reset();return;}
   const direction=swipe.update(hands,time,prefs.value);if(direction)emit('command',{direction,source:'gesture',session:own,event:++sequence});
  },error=>{stopCamera();sensorError.value=String(error);});
  if(abort.signal.aborted){camera?.stop();return;}cameraState.value='识别中';void refreshDevices();
 }catch(error){if(!abort.signal.aborted){stopCamera();sensorError.value='摄像头未启动：'+String(error);}}
}
async function enableVoice(){
 stopVoice();sensorError.value='';voiceState.value='加载中文模型…';voiceAbort=new AbortController();const abort=voiceAbort,own=++voiceSession;
 try{const {startVoice}=await import('./input-sensors');if(abort.signal.aborted)return;
  voice=await startVoice(micDevice.value,abort.signal,(text,final,id)=>{
   if(abort.signal.aborted)return;transcript.value=text;
   if(!final||isBlocked())return;
   const direction=voiceDirection(text);if(direction==='conflict'){sensorError.value='方向有冲突，请只说一个翻页指令';return;}
   if(direction)emit('command',{direction,source:'voice',session:own,event:id});
  },value=>level.value=value,error=>{stopVoice();sensorError.value=String(error);});
  if(abort.signal.aborted){voice?.stop();return;}voiceState.value='离线聆听中';void refreshDevices();
 }catch(error){if(!abort.signal.aborted){stopVoice();sensorError.value='语音未启动：'+String(error);}}
}
watch(()=>props.blocked,()=>{swipe.reset();voice?.reset?.();transcript.value='';});
watch(cameraDevice,()=>{stopCamera();try{localStorage.setItem('plex-device-camera',cameraDevice.value);}catch{}});
watch(micDevice,()=>{stopVoice();try{localStorage.setItem('plex-device-mic',micDevice.value);}catch{}});
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
 if(props.blocked||(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true],.cm-editor')||!getSelection()?.isCollapsed)return;
 if(['Enter',' '].includes(event.key)&&(event.target as HTMLElement)?.closest('button,a,[role=button]'))return;
 const direction=keyDirection(event.code||event.key,prefs.value);if(!direction)return;
 event.preventDefault();emit('command',{direction,source:'keyboard',session,event:++sequence});
}
function confirmKey(){if(!recording.value||!candidate.value)return;const other=recording.value==='next'?'previous':'next';
 if(candidate.value===prefs.value[other]||(candidate.value==='ArrowLeft'&&recording.value==='next')||(candidate.value==='ArrowRight'&&recording.value==='previous')||(candidate.value==='PageUp'&&recording.value==='next')||(candidate.value==='PageDown'&&recording.value==='previous')){message.value='按键与另一方向冲突';return;}
 prefs.value[recording.value]=candidate.value;recording.value=undefined;candidate.value='';void save();}
watch(()=>props.settings,async()=>{recording.value=undefined;candidate.value='';await nextTick();if(video.value?.srcObject)void video.value.play().catch(()=>{});});
onMounted(async()=>{prefs.value=sanitizeControls(await getLearning('reader-controls',defaultControls));window.addEventListener('keydown',keyboard);mounted.value=true;try{cameraDevice.value=localStorage.getItem('plex-device-camera')||'';micDevice.value=localStorage.getItem('plex-device-mic')||'';}catch{}void refreshDevices();window.addEventListener('blur',background);document.addEventListener('visibilitychange',background);navigator.mediaDevices?.addEventListener('devicechange',refreshDevices);});
onBeforeUnmount(()=>{window.removeEventListener('keydown',keyboard);window.removeEventListener('blur',background);document.removeEventListener('visibilitychange',background);navigator.mediaDevices?.removeEventListener('devicechange',refreshDevices);stopCamera();stopVoice();});
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
   <section><h3>摄像头 · 张掌挥动</h3><p>关闭设置后，张掌稳定片刻，再向左挥下一页、向右挥上一页。回手后先停稳再挥。</p>
    <label>摄像头 <select v-model="cameraDevice"><option value="">系统默认</option><option v-for="d in devices.filter(d=>d.kind==='videoinput')" :key="d.deviceId" :value="d.deviceId">{{d.label||'摄像头 '+d.deviceId.slice(0,5)}}</option></select></label>
    <label>灵敏度 <select v-model="prefs.sensitivity" @change="save"><option value="low">低</option><option value="standard">标准</option><option value="high">高</option></select></label>
    <label><input type="checkbox" v-model="prefs.reverse" @change="save">反转挥动方向</label>
    <div><button :disabled="cameraState!=='关闭'" @click="enableCamera">开启摄像头</button><button :disabled="cameraState==='关闭'" @click="stopCamera">关闭摄像头</button></div>
   </section>
   <section><h3>离线中文语音</h3><p>说“上／前／上一页”或“下／后／翻页／下一页”。模型约 42 MB，由本机服务加载；音频不上传、不保存。</p>
    <label>麦克风 <select v-model="micDevice"><option value="">系统默认</option><option v-for="d in devices.filter(d=>d.kind==='audioinput')" :key="d.deviceId" :value="d.deviceId">{{d.label||'麦克风 '+d.deviceId.slice(0,5)}}</option></select></label>
    <button :disabled="voiceState!=='关闭'" @click="enableVoice">开启离线语音</button><button :disabled="voiceState==='关闭'" @click="stopVoice">关闭语音</button>
   </section>
   <button @click="save">保存控制设置</button><p role="status">{{message}}</p>
  </div>
 </Teleport>
 <div id="reader-sensor-dock" :inert="blocked&&!settings" v-show="!blocked"></div>
 <Teleport v-if="mounted" :to="settings?'#reader-control-slot':'#reader-sensor-dock'">
  <div v-show="settings||cameraState!=='关闭'||voiceState!=='关闭'||sensorError" class="sensor-status">
   <p role="status">摄像头：{{cameraState}} · 语音：{{voiceState}}{{blocked?' · 正文翻页暂停':''}}</p>
   <p v-if="sensorError" role="alert">{{sensorError}} <button @click="sensorError=''">清除提示</button></p>
   <video ref="video" v-show="preview&&cameraState!=='关闭'" class="camera-preview" muted playsinline aria-label="镜像摄像头预览"></video>
   <p v-if="voiceState!=='关闭'">输入音量 <meter min="0" max="0.3" :value="level" aria-label="麦克风音量"></meter> {{transcript||'等待语音…'}}</p>
   <div class="input-buttons"><button v-if="cameraState!=='关闭'" @click="preview=!preview">{{preview?'收起预览':'显示预览'}}</button><button v-if="cameraState!=='关闭'" @click="stopCamera">停止手势</button><button v-if="voiceState!=='关闭'" @click="stopVoice">停止聆听</button><button v-if="!settings" @click="emit('configure')">控制设置</button></div>
  </div>
 </Teleport>
 <div v-if="notice&&!blocked" class="input-turn-notice" role="status">{{notice}}</div>
</template>
<style>
.input-settings{padding:4px 6px 24px;line-height:1.8}.input-settings section{border-top:1px solid #526a7b;padding:18px 0}.input-settings h3{font-size:20px;color:#bcefff}.input-buttons{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.input-settings button,.input-settings select{padding:10px 14px;margin:4px;background:#102535;color:#e9f8ff;border:1px solid #68bdcf}.input-key-test{padding:16px;border:1px dashed #68bdcf;margin:12px 0}.input-turn-notice{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:35;background:#0c2335;color:white;padding:8px 16px;pointer-events:none;max-width:90vw}.input-settings :focus-visible{outline:3px solid #ffe48f;outline-offset:3px}
#reader-sensor-dock{position:fixed;left:12px;bottom:82px;z-index:34;max-width:min(340px,calc(100vw - 24px))}.sensor-status{background:#102333;color:#f1f8ff;border:1px solid #639cb4;padding:10px;font-size:13px;line-height:1.5}.sensor-status p{margin:4px 0}.sensor-status button{padding:6px;background:#173c50;color:white;border:1px solid #81c8d8}.camera-preview{width:220px;max-width:100%;max-height:165px;object-fit:contain;transform:scaleX(-1)}.input-settings label{display:block;margin:8px 0}@media(max-width:600px){.camera-preview{width:140px;max-height:105px}#reader-sensor-dock{max-width:260px;bottom:80px}}
</style>
