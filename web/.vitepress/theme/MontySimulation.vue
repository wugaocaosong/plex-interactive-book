<script setup lang="ts">
import { registerLearningFlush } from "./learning-flush";
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import CodeEditor from "./CodeEditor.vue";
import { getLearning, putLearning, download } from "./learning-store";
import { validateSimulation, type SimulationResult } from "./monty-hall";
import type { Diagnostic } from "./types";
const count = ref(1000),
  seed = ref(2026),
  code = ref(""),
  original = ref(""),
  result = ref<SimulationResult>(),
  running = ref(false),
  status = ref(""),
  output = ref(""),
  diagnostics = ref<Diagnostic[]>([]),
  replay = ref(0),
  prediction = ref(""),
  undo = ref<string>(),
  loaded = ref(false),
  playing = ref(false);
let worker: Worker | undefined,
  timer: ReturnType<typeof setTimeout> | undefined,
  saveTimer: ReturnType<typeof setTimeout> | undefined,
  playTimer: ReturnType<typeof setInterval> | undefined,
  runId = 0;
const resultCode = ref("");
const stale = computed(
  () =>
    !!result.value &&
    (code.value !== resultCode.value ||
      count.value !== result.value.count ||
      seed.value !== result.value.seed),
);
const trial = computed(() => result.value?.trials[replay.value]);
const curves = computed(() => {
  let stay = 0,
    change = 0;
  const a: string[] = [],
    b: string[] = [];
  const trials = result.value?.trials || [];
  const every = Math.max(1, Math.ceil(trials.length / 400));
  trials.forEach((t, i) => {
    stay += +t.stayWon;
    change += +t.switchWon;
    if (i % every === 0 || i === trials.length - 1) {
      const x = 40 + (600 * (i + 1)) / trials.length;
      a.push(`${x},${220 - (180 * stay) / (i + 1)}`);
      b.push(`${x},${220 - (180 * change) / (i + 1)}`);
    }
  });
  return [a.join(" "), b.join(" ")];
});
async function save() {
  clearTimeout(saveTimer);
  if (loaded.value)
    await putLearning("simulation:monty-hall", {
      count: count.value,
      seed: seed.value,
      code: code.value,
      prediction: prediction.value,
      result: result.value,
      resultCode: resultCode.value,
      replay: replay.value,
      undo: undo.value,
    }).catch(() => {});
}
watch([code, count, seed, prediction, replay], () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void save(), 500);
});
function pause() {
  clearInterval(playTimer);
  playing.value = false;
}
function play() {
  if (playing.value) {
    pause();
    return;
  }
  playing.value = true;
  playTimer = setInterval(
    () => {
      if (replay.value >= (result.value?.count || 0) - 1) pause();
      else replay.value++;
    },
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 600,
  );
}
function stop(message = "已停止本次 Python 试验。") {
  ++runId;
  worker?.terminate();
  worker = undefined;
  clearTimeout(timer);
  running.value = false;
  status.value = message;
}
async function run() {
  if (running.value) return;
  if (
    !Number.isInteger(seed.value) ||
    seed.value < 0 ||
    seed.value > 2147483647
  ) {
    status.value = "随机种子应为 0–2147483647 的整数";
    return;
  }
  pause();
  await save();
  result.value = undefined;
  output.value = "";
  diagnostics.value = [];
  running.value = true;
  const id = ++runId;
  status.value = "正在加载本地 Python 环境…";
  worker = new Worker("/python-worker.js", { type: "module" });
  timer = setTimeout(() => stop("环境加载超过 90 秒，请重试。"), 90000);
  worker.onerror = (e) => {
    output.value = e.message;
    stop("Python 环境加载失败，可以重试。");
  };
  worker.onmessage = (event) => {
    const msg = event.data;
    if (msg.runId !== runId) return;
    if (msg.type === "ready") {
      clearTimeout(timer);
      status.value = "Python 正在运行实际试验…";
      timer = setTimeout(
        () => stop("运行超过 10 秒，已终止。请检查程序。"),
        10000,
      );
      worker?.postMessage({
        type: "simulate",
        requestId: id,
        runId: id,
        path: "monty_simulation.py",
        code: code.value,
        count: count.value,
        seed: seed.value,
      });
    } else if (msg.type === "stdout" || msg.type === "stderr") {
      if (output.value.length < 30000)
        output.value += (msg.text + "\n").slice(0, 30000 - output.value.length);
    } else if (msg.type === "done" || msg.type === "error") {
      clearTimeout(timer);
      running.value = false;
      worker?.terminate();
      worker = undefined;
      try {
        if (msg.type === "error") throw Error(msg.text);
        const validated = validateSimulation(msg.simulation);
        if (validated.count !== count.value || validated.seed !== seed.value)
          throw Error("返回的试验次数或种子与本次请求不一致");
        result.value = validated;
        resultCode.value = code.value;
        replay.value = 0;
        status.value = `已完成 ${result.value.count} 次真实 Python 试验`;
        void save();
      } catch (e) {
        status.value = String(e);
        if (msg.diagnostic) diagnostics.value = [msg.diagnostic];
      }
    }
  };
  worker.postMessage({ type: "init", requestId: id, runId: id });
}
onMounted(async () => {
  try {
    const response = await fetch("/learning/monty-simulation.py");
    if (!response.ok) throw Error("模拟程序加载失败");
    original.value = await response.text();
    const saved = await getLearning<any>("simulation:monty-hall", undefined);
    if (disposed) return;
    code.value = saved?.code ?? original.value;
    count.value = saved?.count ?? 1000;
    seed.value = saved?.seed ?? 2026;
    prediction.value = saved?.prediction || "";
    undo.value = saved?.undo;
    if (saved?.result) {
      result.value = validateSimulation(saved.result);
      resultCode.value = saved.resultCode ?? saved.code;
      replay.value = Math.min(saved.replay || 0, result.value!.count - 1);
    }
    loaded.value = true;
  } catch (e) {
    status.value = String(e);
  }
});
let disposed = false;
const unregisterFlush = registerLearningFlush(save);
onBeforeUnmount(() => {
  disposed = true;
  unregisterFlush();
});
onBeforeUnmount(() => {
  void save();
  stop();
  pause();
});
</script>
<template>
  <section class="monty-simulation">
    <div class="unit-eyebrow">Python 实际运行 · 可复现实验</div>
    <h3>让试验次数多起来</h3>
    <p class="unit-muted">
      换门和不换门使用同一批核心位置、初选与开门结果。曲线不会被修饰成固定比例。
    </p>
    <label class="unit-field"
      >我的预测（可留空）<input
        v-model="prediction"
        maxlength="300"
        placeholder="增加试验次数后，我预计……"
    /></label>
    <div class="unit-actions">
      <label
        >试验次数<select v-model.number="count" :disabled="running">
          <option v-for="n in [10, 100, 1000, 10000]" :value="n">
            {{ n }}
          </option>
        </select></label
      ><label
        >随机种子<input
          v-model.number="seed"
          type="number"
          min="0"
          max="2147483647"
          :disabled="running" /></label
      ><button class="primary" :disabled="!loaded" v-if="!running" @click="run">
        运行 Python 试验</button
      ><button v-else @click="stop()">停止试验</button>
    </div>
    <details>
      <summary>查看／修改完整 Python 程序</summary>
      <p>
        回放来自函数 simulate
        的返回记录；修改不符合三门规则时会显示错误，不能当作有效对比。
      </p>
      <CodeEditor
        v-model="code"
        :readonly="running"
        :diagnostics="diagnostics"
        @blur="save"
      />
      <div class="unit-actions">
        <button
          :disabled="running"
          @click="
            undo = code;
            code = original;
            save();
          "
        >
          恢复参考程序</button
        ><button
          v-if="undo !== undefined"
          :disabled="running"
          @click="
            code = undo!;
            undo = undefined;
            save();
          "
        >
          撤销恢复
        </button>
      </div>
    </details>
    <p class="unit-status" role="status">{{ status }}</p>
    <pre v-if="output" class="code-output">{{ output }}</pre>
    <template v-if="result"
      ><p v-if="stale" role="status">
        以下为上次运行结果（{{ result.count }} 次，种子
        {{ result.seed }}）；当前程序或设置已变更，请重新运行。
      </p>
      <table class="unit-table">
        <thead>
          <tr>
            <th>策略</th>
            <th>实际获奖</th>
            <th>本次频率</th>
            <th>理论概率</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>不换门</td>
            <td>{{ result.stayWins }} / {{ result.count }}</td>
            <td>{{ ((result.stayWins / result.count) * 100).toFixed(2) }}%</td>
            <td>1/3</td>
          </tr>
          <tr>
            <td>换门</td>
            <td>{{ result.switchWins }} / {{ result.count }}</td>
            <td>
              {{ ((result.switchWins / result.count) * 100).toFixed(2) }}%
            </td>
            <td>2/3</td>
          </tr>
        </tbody>
      </table>
      <svg
        class="frequency-chart"
        viewBox="0 0 680 270"
        role="img"
        aria-label="累计获奖频率曲线：青色不换门，金色换门；虚线是理论概率"
      >
        <rect width="680" height="270" rx="12" fill="#131315" />
        <path d="M40 40V220H640" stroke="#8d998f" fill="none" />
        <path
          d="M40 160H640 M40 100H640"
          stroke="#8d998f"
          stroke-dasharray="6 6"
        />
        <polyline
          :points="curves[0]"
          fill="none"
          stroke="#70bbb0"
          stroke-width="2.5"
        />
        <polyline
          :points="curves[1]"
          fill="none"
          stroke="#D9B873"
          stroke-width="2.5"
        />
        <g fill="#F7EEDB" font-size="14">
          <text x="4" y="45">100%</text>
          <text x="8" y="225">0%</text>
          <text x="46" y="155">1/3</text>
          <text x="46" y="95">2/3</text>
          <text x="40" y="250">1 次</text>
          <text x="550" y="250">{{ result.count }} 次</text>
        </g>
      </svg>
      <p>青色：不换门；金色：换门。更多试验不保证每一步都更接近理论值。</p>
      <h4>实际记录回放 · {{ replay + 1 }} / {{ result.count }}</h4>
      <label class="unit-field"
        >记录位置<input
          v-model.number="replay"
          type="range"
          :min="0"
          :max="result.count - 1"
      /></label>
      <p v-if="trial" role="status">
        核心 {{ trial.prize + 1 }} 号，初选 {{ trial.first + 1 }} 号，小E打开
        {{ trial.opened + 1 }} 号空门。不换门{{
          trial.stayWon ? "获奖" : "未获奖"
        }}；换至 {{ trial.switch + 1 }} 号{{
          trial.switchWon ? "获奖" : "未获奖"
        }}。
      </p>
      <div class="unit-actions">
        <button
          :disabled="replay === 0"
          @click="
            pause();
            replay--;
          "
        >
          上一条记录</button
        ><button @click="play">{{ playing ? "暂停回放" : "播放回放" }}</button
        ><button
          :disabled="replay === result.count - 1"
          @click="
            pause();
            replay++;
          "
        >
          下一条记录</button
        ><button
          @click="
            download('PLEX-三门试验.json', JSON.stringify(result, null, 2))
          "
        >
          导出全部记录
        </button>
      </div></template
    >
  </section>
</template>
