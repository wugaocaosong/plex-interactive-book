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
import PlexCoach from "./PlexCoach.vue";
import CodeEditor from "./CodeEditor.vue";
const props = defineProps<{
  example?: CodeExample;
  exercise?: ExerciseDefinition;
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
    const draft = await getLearning<
      { code: string; stdin?: string; undo?: string } | undefined
    >(key, undefined);
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
function stop(message = "已停止运行。") {
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
  await persist();
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
  const id = ++runId;
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
      () => stop("执行超过 10 秒，已停止。可以修改代码后重新运行。"),
      10000,
    );
  };
  try {
    if (!worker) {
      worker = new Worker("/python-worker.js", { type: "module" });
      worker.onerror = (e) => {
        stop("Python 初始化失败，请重试。");
        output.value = e.message;
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
            void saveAttempt();
          }
          if (!ready.value || check) {
            worker?.terminate();
            worker = undefined;
            ready.value = false;
          }
        }
      };
      timer = setTimeout(() => stop("环境加载超时，请重试。"), 90000);
      worker.postMessage({ type: "init", requestId: id, runId: id });
    } else execute();
  } catch (e) {
    stop("无法启动 Python，请重试。");
    output.value = String(e);
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
      ><a :href="variant.sourceUrl" target="_blank" rel="noopener"
        >上游源码 ↗</a
      >
    </div>
    <p class="panel-note">
      {{
        exercise ? "提交测试会逐例反馈结果。" : "完整示例源文件，包含演示入口。"
      }}
      草稿保存在本机，关闭后可继续。
    </p>
    <CodeEditor
      v-if="python"
      ref="editor"
      v-model="code"
      :readonly="running"
      :original="diff ? original : undefined"
      :diagnostics="diagnostics"
      @blur="persist"
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
