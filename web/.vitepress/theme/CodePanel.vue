<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type {
  CodeExample,
  ExerciseDefinition,
  TestResult,
  Diagnostic,
  ExerciseAttempt,
} from "./types";
import { readStore, saveStore } from "./storage";
import { getLearning, putLearning } from "./learning-store";
import { registerLearningFlush } from "./learning-flush";
import {summonCodeAssistant,activeCodeProvider,snapshotVersion} from "./code-context";
import PlexCoach from "./PlexCoach.vue";
import CodeEditor from "./CodeEditor.vue";
import type { LabRunResult } from "./route-lab";
import {readHistory,saveRun,deleteRun,exportRuns,type RunSnapshot} from './run-history';
const emit=defineEmits<{completed:[]; outcome:[result:LabRunResult]}>();
const props = defineProps<{
  example?: CodeExample;
  exercise?: ExerciseDefinition;
  foldSourceHeader?: boolean;
}>();
const lang = ref(props.exercise ? "python" : readStore("language", "python")),
  more = ref(false),
  code = ref(""),
  output = ref(""),
  status = ref(""),
  running = ref(false),
  ready = ref(false),
  stdin = ref(""),
  diff = ref(false),
  undo = ref<string>(),
  hints = ref(0),
  results = ref<TestResult[]>([]),
  diagnostics = ref<Diagnostic[]>([]),
  readonlyHtml = ref(""),
  editor = ref<InstanceType<typeof CodeEditor>>();
const selectedCode=ref('');
const lastTestVersion=ref('');
const historyOpen=ref(false),history=ref<RunSnapshot[]>([]),historyError=ref(''),compare=ref<RunSnapshot>();
let activeRun:RunSnapshot|undefined;
const unsavedRuns=new Map<string,RunSnapshot>();
async function persistRun(run:RunSnapshot){unsavedRuns.set(run.id,run);await saveRun(run);if(unsavedRuns.get(run.id)===run)unsavedRuns.delete(run.id);}
async function retryHistory(){try{for(const run of [...unsavedRuns.values()])await persistRun(run);historyError.value='';await reloadHistory();}catch{historyError.value='历史仍无法保存，可先导出当前历史。';}}
async function reloadHistory(){const rows=await readHistory(props.exercise?.id||props.example?.id||'example');history.value=[...unsavedRuns.values(),...rows.filter(r=>!unsavedRuns.has(r.id))].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,50);}
function finishHistory(state:RunSnapshot['state']){if(!activeRun)return;const run={...activeRun,state,endedAt:new Date().toISOString(),output:output.value,diagnostics:JSON.parse(JSON.stringify(diagnostics.value)),results:activeRun.kind==='test'?JSON.parse(JSON.stringify(results.value)):[]};activeRun=undefined;void persistRun(run).then(()=>{if(!disposed)void reloadHistory();}).catch(()=>{history.value=[run,...history.value.filter(r=>r.id!==run.id)].slice(0,50);historyError.value='历史保存失败，记录暂存在当前窗口；请导出或重试后再关闭。';});}
async function restoreRun(run:RunSnapshot){await persist();undo.value=code.value;code.value=run.code;stdin.value=run.stdin;await persist();status.value='已恢复历史代码，未自动运行；可撤销重置。';}
function reviewRun(run:RunSnapshot){const snapshot={source:'history' as const,file:run.file,reference:run.reference,language:run.language,code:run.code,selection:'',output:run.output,diagnostics:run.diagnostics.map(x=>`${x.line||'?'}: ${x.message}`).join('\n'),version:run.version};summonCodeAssistant(()=>snapshot);window.dispatchEvent(new CustomEvent('plex-review-code',{detail:'请复查此历史代码版本的正确性、边界条件、复杂度和可读性。'}));}
async function removeRun(run:RunSnapshot){try{history.value=await deleteRun(run.reference,run.id);}catch{historyError.value='删除历史失败，请重试。';}}
const codeSnapshot=()=>({file:props.example?.file||props.exercise?.title||'example.py',reference:props.exercise?.id||props.example?.id||'',language:lang.value,code:code.value,selection:selectedCode.value,output:output.value,diagnostics:diagnostics.value.map(d=>`${d.line||'?'}: ${d.message}`).join('\n'),version:snapshotVersion(code.value)});
onBeforeUnmount(()=>{if(activeCodeProvider.value===codeSnapshot)activeCodeProvider.value=null;});
const variant = computed(
  () =>
    props.example?.variants.find((v) => v.language === lang.value) ||
    props.example?.variants[0],
);
const python = computed(
  () => !!props.exercise || variant.value?.language === "python",
);
const original = computed(
  () => props.exercise?.starter || variant.value?.fullSource || "",
);
const version = computed(() => {
  let hash = 2166136261;
  for (const c of original.value)
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
});
const draftKey = computed(
  () =>
    `draft:${props.exercise?.id || props.example?.id}:${props.exercise ? "python" : variant.value?.language}:${version.value}`,
);
let activeLabRun: { key: string; codeVersion: string } | undefined;
function recordLabRun(state: LabRunResult["state"]) {
  if (!activeLabRun) return;
  const result: LabRunResult = {...activeLabRun, state, updatedAt: new Date().toISOString()};
  activeLabRun=undefined;
  void putLearning("lab-run:"+result.key,result).then(()=>emit("outcome",result)).catch(()=>{});
}
let activeKey = "",
  restoring = false,
  disposed = false,
  loadSerial = 0,
  worker: Worker | undefined,
  timer: ReturnType<typeof setTimeout> | undefined,
  saveTimer: ReturnType<typeof setTimeout> | undefined,
  runId = 0,
  checking = false;
async function persist() {
  clearTimeout(saveTimer);
  if (activeKey && !restoring)
    await putLearning(activeKey, {
      code: code.value,
      stdin: stdin.value,
      undo: undo.value,
    }).catch(() => {});
}
watch([code, stdin], () => {
  if (!restoring) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void persist(), 500);
  }
});
watch(
  draftKey,
  async (key) => {
    await persist();
    const own = ++loadSerial;
    stop("");
    restoring = true;
    let draft = await getLearning<
      { code: string; stdin?: string; undo?: string } | undefined
    >(key, undefined);
    if (!draft && props.example?.legacyDraftKey) {
      draft=await getLearning<{code:string;stdin?:string;undo?:string}|undefined>(props.example.legacyDraftKey,undefined);
      if (draft) await putLearning(key,draft).catch(()=>{});
    }
    if (disposed || own !== loadSerial) return;
    code.value = draft?.code ?? original.value;
    stdin.value = draft?.stdin || "";
    undo.value = draft?.undo;
    activeKey = key;
    output.value = "";
    diagnostics.value = [];
    readonlyHtml.value = "";
    results.value = [];
    status.value = draft ? "已恢复本机草稿" : "草稿自动保存";
    await Promise.resolve();
    restoring = false;
    if (!props.exercise && variant.value)
      saveStore("language", variant.value.language);
    if (props.exercise) {
      const attempt = await getLearning<ExerciseAttempt | undefined>(
        "attempt:" + props.exercise.id,
        undefined,
      );
      hints.value = attempt?.hints || 0;
      results.value = attempt?.results || [];
    }
    if (!python.value && variant.value) {
      const { codeToHtml } = await import("shiki");
      try {
        const html = await codeToHtml(original.value, {
          lang: variant.value.language,
          theme: "vitesse-dark",
        });
        if (!disposed && own === loadSerial) readonlyHtml.value = html;
      } catch {
        readonlyHtml.value = "";
      }
    }
  },
  { immediate: true },
);
function stop(message = "已停止运行。",reason:RunSnapshot['state']='stopped') {
  finishHistory(reason);
  if (running.value) recordLabRun("stopped");
  ++runId;
  worker?.terminate();
  worker = undefined;
  ready.value = false;
  running.value = false;
  clearTimeout(timer);
  status.value = message;
}
async function saveAttempt() {
  if (props.exercise)
    await putLearning("attempt:" + props.exercise.id, {
      exerciseId: props.exercise.id,
      hints: hints.value,
      results: results.value,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
}
async function start(check = false) {
  if (running.value) return;
  const generation=++runId;
  running.value = true;
  output.value='';diagnostics.value=[];if(check)results.value=[];
  activeRun={id:crypto.randomUUID(),reference:props.exercise?.id||props.example?.id||'example',file:props.example?.file||props.exercise?.title||'example.py',language:lang.value,version:snapshotVersion(code.value),code:code.value,stdin:stdin.value,kind:check?'test':'run',state:'running',at:new Date().toISOString(),output:'',diagnostics:[],results:[]};
  try{await persistRun(activeRun);}catch{historyError.value='无法保存运行历史，代码仍可运行。';}
  if (props.example?.labKey) activeLabRun={key:props.example.labKey,codeVersion:snapshotVersion(code.value)};
  await persist();
  if (disposed || generation!==runId) return;
  if (check || checking !== check) {
    worker?.terminate();
    worker = undefined;
    ready.value = false;
  }
  checking = check;
  running.value = true;
  output.value = "";
  diagnostics.value = [];
  results.value = check ? [] : results.value;
  const id = generation;
  status.value = ready.value ? "运行中…" : "首次启动 Python 环境…";
  const execute = () => {
    status.value = check ? "正在检查测试用例…" : "运行中…";
    worker?.postMessage({
      type: check ? "check" : "run",
      requestId: id,
      runId: id,
      code: code.value,
      path: props.exercise
        ? "exercises/" + props.exercise.id + ".py"
        : variant.value!.sourcePath.replace("codes/python/", ""),
      stdin: stdin.value,
      tests: props.exercise
        ? JSON.parse(JSON.stringify(props.exercise.tests))
        : undefined,
    });
    clearTimeout(timer);
    timer = setTimeout(
      () => stop("执行超过 10 秒，已停止。可以修改代码后重新运行。",'timeout'),
      10000,
    );
  };
  try {
    if (!worker) {
      worker = new Worker("/python-worker.js", { type: "module" });
      worker.onerror = (e) => {
        output.value = e.message;
        stop("Python 初始化失败，请重试。",'error');
      };
      worker.onmessage = (event) => {
        const msg = event.data;
        if (msg.runId !== runId) return;
        if (msg.type === "ready") {
          ready.value = true;
          execute();
        } else if (msg.type === "stdout" || msg.type === "stderr") {
          if (output.value.length < 50000)
            output.value += (msg.text + "\n").slice(
              0,
              50000 - output.value.length,
            );
        } else if (
          msg.type === "done" ||
          msg.type === "result" ||
          msg.type === "error"
        ) {
          clearTimeout(timer);
          recordLabRun(msg.type==="error"?"error":"done");
          if(msg.type==="done")emit("completed");
          running.value = false;
          status.value =
            msg.type === "error"
              ? "运行出错"
              : msg.type === "result"
                ? "检查完成"
                : "运行完成";
          if (msg.text) output.value += "\n" + msg.text;
          if (msg.diagnostic) diagnostics.value = [msg.diagnostic];
          if (msg.results) {
            results.value = msg.results;
            lastTestVersion.value=activeRun?.version||'';
            void saveAttempt();
          }
          finishHistory(msg.type==='error'?'error':'done');
          if (!ready.value || check) {
            worker?.terminate();
            worker = undefined;
            ready.value = false;
          }
        }
      };
      timer = setTimeout(() => stop("环境加载超时，请重试。",'timeout'), 90000);
      worker.postMessage({ type: "init", requestId: id, runId: id });
    } else execute();
  } catch (e) {
    output.value = String(e);
    stop("无法启动 Python，请重试。",'error');
  }
}
function reset() {
  undo.value = code.value;
  code.value = original.value;
  output.value = "";
  diagnostics.value = [];
  status.value = "已恢复原示例，可撤销";
  void persist();
}
async function copy() {
  try {
    await navigator.clipboard.writeText(code.value);
    status.value = "已复制";
  } catch {
    status.value = "请在编辑区选择并复制";
  }
}
const unregisterFlush = registerLearningFlush(persist);
onBeforeUnmount(() => {
  unregisterFlush();
  void persist();
  disposed = true;
  stop();
  clearTimeout(saveTimer);
});
</script>
<template>
  <div class="code-panel">
    <header v-if="exercise?.id.startsWith('ch12-')" class="mission-code-header"><small>PLEX / FLIGHT ENGINEERING</small><h3>星舰代码工作台</h3><p>任务简报 → 编辑程序 → 实际运行 → 测试验证</p><p v-if="results.length">{{lastTestVersion!==snapshotVersion(code)?'下面显示历史测试结果；当前代码需要重新检查。':results.every(r=>r.passed)?'任务验证通过。可以回顾本次解法并进入下一站。':'任务尚未完成：查看失败用例，修改后重新验证。'}}</p></header>
    <template v-if="exercise"
      ><p class="dialog-eyebrow">{{ exercise.group }} · {{ exercise.kind }}</p>
      <h3>{{ exercise.title }}</h3>
      <div class="exercise-description">
        <p>{{ exercise.description }}</p>
        <p>实现 <code>solve(...)</code>，使用函数返回值判题。示例：</p>
        <pre>
输入：{{ JSON.stringify(exercise.tests[0].args) }}
预期：{{ JSON.stringify(exercise.tests[0].expected) }}</pre
        >
      </div></template
    >
    <div v-else class="language-tabs" role="tablist" aria-label="代码语言">
      <button
        role="tab"
        :aria-selected="python"
        :disabled="running"
        @click="lang = 'python'"
      >
        python</button
      ><button :aria-expanded="more" @click="more = !more">更多语言</button
      ><template v-if="more || !python"
        ><button
          v-for="v in example?.variants.filter((v) => v.language !== 'python')"
          :key="v.language"
          role="tab"
          :aria-selected="variant?.language === v.language"
          :disabled="running"
          @click="lang = v.language"
        >
          {{ v.language }}
        </button></template
      >
    </div>
    <div v-if="variant" class="code-file">
      <span>{{ variant.sourcePath }}</span
      ><a v-if="variant.sourceUrl" :href="variant.sourceUrl" target="_blank" rel="noopener"
        >上游源码 ↗</a
      >
    </div>
    <p class="panel-note">
      {{
        exercise ? "提交测试会逐例反馈结果。" : example?.labKey ? "本题起始代码：基础档可跟做，进阶与挑战需按题意补全。运行完成不代表测试通过。" : "完整示例源文件，包含演示入口。"
      }}
      草稿保存在本机，关闭后可继续。
    </p>
    <CodeEditor
      v-if="python"
      ref="editor"
      v-model="code"
      :readonly="running"
      :original="compare ? compare.code : diff ? original : undefined"
      :diagnostics="diagnostics"
      :fold-source-header="foldSourceHeader"
      @blur="persist" @selection="selectedCode=$event"
    />
    <div
      v-else-if="readonlyHtml"
      class="code-readonly"
      aria-label="完整示例代码"
      v-html="readonlyHtml"
    />
    <pre v-else class="code-output" aria-label="完整示例代码">{{
      original
    }}</pre>
    <label v-if="python" class="stdin-label"
      >预设标准输入（每行一次 input）<textarea
        v-model="stdin"
        aria-label="标准输入"
        :disabled="running"
      />
    </label>
    <button class="summon-code-assistant" @click="summonCodeAssistant(codeSnapshot)">召唤小E · 查看代码上下文</button>
    <button @click="historyOpen=!historyOpen;reloadHistory()">运行与测试历史</button><button v-if="compare" @click="compare=undefined">关闭历史差异</button><p v-if="historyError" role="alert">{{historyError}}<button @click="retryHistory">重试保存历史</button></p>
    <section v-if="historyOpen" class="run-history" aria-label="本机代码历史"><h4>本机运行历史 · 非服务端正式提交</h4><button @click="exportRuns(history)">导出历史</button><p v-if="!history.length">尚无运行记录。</p><article v-for="run in history" :key="run.id"><p>{{run.kind==='test'?'测试':'运行'}} · {{run.at}} · {{run.version}} · {{run.state==='running'?'未收到结束结果':run.state}}</p><details><summary>查看此版本代码和结果</summary><pre>{{run.code}}</pre><pre>{{run.output}}</pre><pre v-if="run.results.length">{{JSON.stringify(run.results,null,2)}}</pre></details><button :disabled="running" @click="restoreRun(run)">恢复到编辑器</button><button @click="compare=run">比较版本差异</button><button @click="reviewRun(run)">小E复查此版本</button><button :disabled="running" @click="removeRun(run)">删除记录</button></article></section>
    <div class="execution-actions">
      <button
        v-if="python && !running"
        class="primary-action"
        @click="start(false)"
      >
        运行 Python</button
      ><button
        v-if="exercise && !running"
        class="primary-action"
        @click="start(true)"
      >
        检查答案</button
      ><button v-if="running" class="primary-action" @click="stop()">
        停止运行</button
      ><button v-if="python" :disabled="running" @click="reset">重置</button
      ><button
        v-if="undo !== undefined"
        :disabled="running"
        @click="
          code = undo!;
          undo = undefined;
          persist();
        "
      >
        撤销重置</button
      ><button v-if="python" @click="diff = !diff">
        {{ diff ? "关闭差异" : "查看修改差异" }}</button
      ><button @click="copy">复制</button
      ><span role="status">{{ status }}</span>
    </div>
    <div v-if="diagnostics.length" class="diagnostics">
      <button
        v-for="(item, i) in diagnostics"
        :key="i"
        @click="editor?.focusLine(item.line || 1)"
      >
        第 {{ item.line || "?" }} 行：{{ item.message }}
      </button>
    </div>
    <pre
      v-if="python"
      class="code-output"
      aria-label="运行结果"
      aria-live="polite"
      >{{ output || "输出会显示在这里。" }}</pre
    >
    <details v-if="exercise?.serverRef" class="online-coach-details"><summary>小E在线辅导与 PLEX 正式提交</summary><PlexCoach :exercise="exercise" :code="code"/></details>
    <template v-if="exercise"
      ><div class="execution-actions">
        <button
          :disabled="hints >= 3"
          @click="
            hints++;
            saveAttempt();
          "
        >
          {{
            hints === 0
              ? "提示 1：思路"
              : hints === 1
                ? "提示 2：关键步骤"
                : "提示 3：参考解法"
          }}</button
        ><span>已查看 {{ hints }} / 3 层提示</span>
      </div>
      <p
        v-for="hint in exercise.hints.slice(0, Math.min(hints, 2))"
        :key="hint"
        class="panel-note"
      >
        {{ hint }}
      </p>
      <pre v-if="hints >= 3" class="code-output" aria-label="参考解法">{{
        exercise.solution
      }}</pre>
      <div class="test-results" aria-live="polite">
        <p v-if="results.length">
          通过 {{ results.filter((r) => r.passed).length }} /
          {{ results.length }} 个用例
        </p>
        <article
          v-for="(result, i) in results"
          :key="i"
          :class="{ passed: result.passed }"
        >
          <strong
            >用例 {{ i + 1 }} ·
            {{ result.passed ? "通过" : "需要修改" }}</strong
          >
          <pre>
输入：{{ JSON.stringify(result.input) }}
预期：{{ JSON.stringify(result.expected) }}
实际：{{ JSON.stringify(result.actual)
            }}{{ result.error ? "\n错误：" + result.error : "" }}</pre
          >
        </article>
      </div></template
    >
  </div>
</template>
