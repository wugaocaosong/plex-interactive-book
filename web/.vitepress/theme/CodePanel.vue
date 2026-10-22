<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Play, Square, RotateCcw, Copy, ExternalLink } from 'lucide-vue-next'
import type { CodeExample } from './types'
import { readStore, saveStore } from './storage'
const props = defineProps<{ example: CodeExample }>()
const lang = ref(readStore('language','python'))
const variant = computed(() => props.example.variants.find(v=>v.language===lang.value) || props.example.variants[0])
const code=ref(''); const output=ref(''); const status=ref(''); const running=ref(false); const ready=ref(false); const copied=ref(false)
let worker: Worker | undefined; let timeout: ReturnType<typeof setTimeout> | undefined; let initTimeout: ReturnType<typeof setTimeout> | undefined
watch(variant, value=>{ code.value=value.fullSource; output.value=''; saveStore('language',value.language) }, {immediate:true})
function stop(message='已停止运行。') {
  worker?.terminate(); worker=undefined; ready.value=false; running.value=false
  clearTimeout(timeout); clearTimeout(initTimeout); status.value=message
}
async function run() {
  if (running.value) return
  running.value=true; output.value=''; status.value=ready.value?'运行中…':'首次启动 Python 环境…'
  try {
    if (!worker) {
      worker=new Worker('/python-worker.js',{type:'module'})
      worker.onerror=(event)=>{ stop('Python 初始化失败，请重试。'); output.value=event.message }
      worker.onmessage=(event)=>{
        const msg=event.data
        if(msg.type==='ready') { clearTimeout(initTimeout); ready.value=true; execute() }
        if(msg.type==='stdout'||msg.type==='stderr') { if(output.value.length<50000)output.value+=(msg.text+'\n').slice(0,50000-output.value.length);else if(!output.value.endsWith('输出已截断。'))output.value+='\n输出已截断。' }
        if(msg.type==='done') { clearTimeout(timeout); running.value=false; status.value='运行完成' }
        if(msg.type==='error') { clearTimeout(timeout); clearTimeout(initTimeout); running.value=false; status.value='运行出错'; output.value+='\n'+msg.text; if(!ready.value) {worker?.terminate();worker=undefined} }
      }
      initTimeout=setTimeout(()=>stop('环境加载超时，请重试。'),90000)
      worker.postMessage({type:'init'})
    } else execute()
  } catch(error) { stop('无法启动 Python，请重试。'); output.value=String(error) }
}
function execute() {
  status.value='运行中…'
  worker?.postMessage({type:'run',code:code.value,path:variant.value.sourcePath.replace('codes/python/','')})
  timeout=setTimeout(()=>stop('执行超过 10 秒，已停止。可以修改代码后重新运行。'),10000)
}
async function copy() { try {await navigator.clipboard.writeText(code.value);copied.value=true;setTimeout(()=>copied.value=false,1500)} catch {status.value='请在编辑区选择代码并复制。'} }
onBeforeUnmount(()=>stop())
</script>
<template>
  <div class="code-panel">
    <div class="language-tabs" role="tablist" aria-label="代码语言">
      <button v-for="v in example.variants" :key="v.language" role="tab" :aria-selected="variant.language===v.language" :disabled="running" @click="lang=v.language">{{ v.language }}</button>
    </div>
    <div class="code-file"><span>{{ variant.sourcePath }}</span><a :href="variant.sourceUrl" target="_blank" rel="noopener">上游源码 <ExternalLink :size="13" /></a></div>
    <p class="panel-note">完整示例源文件，包含演示入口。修改仅在本次打开期间生效。</p>
    <textarea v-model="code" class="code-editor" aria-label="完整示例代码" spellcheck="false" :readonly="running" />
    <div class="execution-actions">
      <button v-if="variant.runnable&&!running" class="primary-action" @click="run"><Play :size="16" />运行 Python</button>
      <button v-if="running" class="primary-action" @click="stop()"><Square :size="16" />停止运行</button>
      <button :disabled="running" @click="code=variant.fullSource;output='';status='' "><RotateCcw :size="16" />重置</button>
      <button @click="copy"><Copy :size="16" />{{copied?'已复制':'复制'}}</button>
      <span role="status">{{ status }}</span>
    </div>
    <pre v-if="output||variant.runnable" class="code-output" aria-label="运行结果" aria-live="polite">{{output||'输出会显示在这里。'}}</pre>
  </div>
</template>
