<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  algorithms,
  buildLab,
  defaultInput,
  labGroups,
  type LabInput,
  type LabSession,
  type LabStep,
} from "./algorithm-labs";
import { getLearning, putLearning } from "./learning-store";
const props = defineProps<{ initialGroup?: number }>();
const algorithm = ref(
    algorithms.find((a) => a.group === (props.initialGroup || 0))!.id,
  ),
  input = ref<LabInput>(structuredClone(defaultInput)),
  text = ref(""),
  steps = ref<LabStep[]>([]),
  step = ref(0),
  error = ref(""),
  pending = ref<number>(),
  predictions = ref<LabSession["predictions"]>({}),
  playing = ref(false),
  hydrated = ref(false);
const definition = computed(
    () => algorithms.find((a) => a.id === algorithm.value)!,
  ),
  state = computed(() => steps.value[step.value]),
  prediction = computed(() =>
    pending.value === undefined
      ? undefined
      : steps.value[pending.value]?.prediction,
  );
let timer: ReturnType<typeof setInterval> | undefined,
  disposed = false,
  restoreSerial = 0;
const isTree = computed(() => algorithm.value.startsWith("tree-")),
  isGraph = computed(() => algorithm.value.startsWith("graph-"));
function textFromInput() {
  text.value = JSON.stringify(
    isTree.value
      ? input.value.tree
      : isGraph.value
        ? input.value.graph
        : input.value.values,
  );
}
async function save() {
  if (hydrated.value)
    await putLearning("lab:" + algorithm.value, {
      algorithm: algorithm.value,
      input: input.value,
      step: step.value,
      predictions: predictions.value,
    }).catch(() => {});
}
function pause() {
  clearInterval(timer);
  playing.value = false;
}
function build() {
  pause();
  try {
    if (definition.value.group !== 5) {
      const parsed = JSON.parse(text.value);
      if (!Array.isArray(parsed)) throw Error("请输入 JSON 数组");
      if (isTree.value) input.value.tree = parsed;
      else if (isGraph.value) input.value.graph = parsed;
      else input.value.values = parsed;
    }
    steps.value = buildLab(algorithm.value, input.value);
    step.value = 0;
    predictions.value = {};
    pending.value = undefined;
    error.value = "";
    void save();
  } catch (e) {
    error.value = String(e);
  }
}
async function restore() {
  pause();
  const own = ++restoreSerial;
  hydrated.value = false;
  const session = await getLearning<LabSession | undefined>(
    "lab:" + algorithm.value,
    undefined,
  );
  if (disposed || own !== restoreSerial) return;
  input.value = session?.input || structuredClone(defaultInput);
  textFromInput();
  try {
    steps.value = buildLab(algorithm.value, input.value);
    step.value = Math.min(session?.step || 0, steps.value.length - 1);
    predictions.value = session?.predictions || {};
    pending.value = undefined;
    error.value = "";
  } catch (e) {
    error.value = String(e);
    steps.value = [];
  }
  hydrated.value = true;
}
function next() {
  if (step.value >= steps.value.length - 1) {
    pause();
    return;
  }
  const n = step.value + 1;
  if (steps.value[n].prediction && !predictions.value[n]) {
    pending.value = n;
    pause();
  } else {
    step.value = n;
    void save();
  }
}
function answer(choice: number) {
  const n = pending.value;
  if (n === undefined) return;
  predictions.value[n] = {
    choice,
    correct: choice === steps.value[n].prediction!.answer,
  };
  step.value = n;
  pending.value = undefined;
  void save();
}
function play() {
  if (playing.value) {
    pause();
    return;
  }
  playing.value = true;
  next();
  if (playing.value) timer = setInterval(next, 900);
}
function previous() {
  pause();
  pending.value = undefined;
  step.value = Math.max(0, step.value - 1);
  void save();
}
function point(id: number) {
  const nodes = state.value?.nodes || [],
    i = nodes.findIndex((n) => n.id === id);
  if (isTree.value) {
    const level = Math.floor(Math.log2(id + 1)),
      position = id - (2 ** level - 1);
    return {
      x: ((position + 0.5) * 560) / 2 ** level + 20,
      y: 35 + level * 66,
    };
  }
  if (isGraph.value) {
    const angle = (2 * Math.PI * i) / Math.max(1, nodes.length) - Math.PI / 2;
    return { x: 300 + 220 * Math.cos(angle), y: 150 + 112 * Math.sin(angle) };
  }
  return { x: 45 + (i % 6) * 100, y: 50 + Math.floor(i / 6) * 85 };
}
watch(algorithm, restore);
onMounted(restore);
onBeforeUnmount(() => {
  void save();
  disposed = true;
  pause();
});
</script>
<template>
  <div class="algorithm-lab">
    <div class="lab-title">
      <span>教学演示 · 预设算法状态模型</span>
      <h3>{{ definition.title }}</h3>
      <p>
        先预测，再观察变化。这里的代码行对应教学模型，编辑器运行结果单独展示。
      </p>
    </div>
    <label
      >实验<select v-model="algorithm" aria-label="选择算法实验">
        <optgroup v-for="(group, i) in labGroups" :key="group" :label="group">
          <option
            v-for="item in algorithms.filter((a) => a.group === i)"
            :key="item.id"
            :value="item.id"
          >
            {{ item.title }}
          </option>
        </optgroup>
      </select></label
    >
    <div class="lab-inputs">
      <label v-if="definition.group !== 5"
        >{{
          isTree
            ? "二叉树数组（null 表示空位）"
            : isGraph
              ? "无向图邻接表（从 0 编号）"
              : "整数数组"
        }}<textarea
          v-model="text"
          aria-label="实验数据"
          spellcheck="false"
        /></label
      ><label v-if="algorithm === 'binary'"
        >目标<input
          v-model.number="input.target"
          type="number"
          aria-label="查找目标" /></label
      ><template v-if="definition.group < 2"
        ><label
          >操作<select v-model="input.operation" aria-label="实验操作">
            <option value="insert">
              {{ definition.group === 0 ? "插入" : "加入" }}
            </option>
            <option value="delete">
              {{ definition.group === 0 ? "删除" : "取出" }}
            </option>
          </select></label
        ><label v-if="definition.group === 0"
          >索引<input v-model.number="input.index" type="number" /></label
        ><label v-if="input.operation === 'insert'"
          >新值<input
            v-model.number="input.value"
            type="number" /></label></template
      ><label v-if="isGraph"
        >起点<input v-model.number="input.start" type="number" /></label
      ><label v-if="definition.group === 5"
        >n（0–8）<input
          v-model.number="input.n"
          type="number"
          min="0"
          max="8"
          aria-label="递归输入" /></label
      ><button class="primary-action" @click="build">应用输入／重置</button>
    </div>
    <p v-if="error" role="alert" class="lab-error">{{ error }}</p>
    <template v-if="state"
      ><div class="lab-visual" aria-label="算法状态图">
        <svg
          v-if="state.nodes"
          viewBox="0 0 600 300"
          role="img"
          :aria-label="state.explanation"
        >
          <defs>
            <marker
              id="lab-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L7,3 z" fill="#91baaa" />
            </marker>
          </defs>
          <line
            v-for="(edge, i) in state.edges"
            :key="i"
            :x1="point(edge[0]).x"
            :y1="point(edge[0]).y"
            :x2="point(edge[1]).x"
            :y2="point(edge[1]).y"
            stroke="#759b8d"
            stroke-width="2"
            :marker-end="algorithm === 'linked' ? 'url(#lab-arrow)' : undefined"
          />
          <g v-for="node in state.nodes" :key="node.id">
            <circle
              :cx="point(node.id).x"
              :cy="point(node.id).y"
              r="21"
              :fill="state.active.includes(node.id) ? '#d9b873' : '#345f55'"
            />
            <text
              :x="point(node.id).x"
              :y="point(node.id).y + 5"
              text-anchor="middle"
              :fill="state.active.includes(node.id) ? '#1a251f' : '#f7eedb'"
            >
              {{ node.label }}
            </text>
          </g>
        </svg>
        <div v-else-if="state.stack" class="call-stack">
          <div v-for="(call, i) in state.stack" :key="i">
            第 {{ i + 1 }} 层 · {{ call }}
          </div>
          <p v-if="!state.stack.length">调用栈为空</p>
        </div>
        <div v-else class="array-cells">
          <div
            v-for="(value, i) in state.values"
            :key="i"
            :class="{ active: state.active.includes(i) }"
          >
            <span>{{ value }}</span
            ><small>{{ i }}</small>
          </div>
          <p v-if="!state.values.length">空序列</p>
        </div>
      </div>
      <div class="execution-actions">
        <button :disabled="step === 0" @click="previous">上一步</button
        ><button
          :disabled="step >= steps.length - 1 || pending !== undefined"
          @click="next"
        >
          下一步</button
        ><button
          :disabled="step >= steps.length - 1 || pending !== undefined"
          @click="play"
        >
          {{ playing ? "暂停" : "播放" }}</button
        ><span>步骤 {{ step + 1 }} / {{ steps.length }}</span>
      </div>
      <div v-if="prediction" class="prediction">
        <h4>{{ prediction.question }}</h4>
        <button
          v-for="(option, i) in prediction.options"
          :key="i"
          @click="answer(i)"
        >
          {{ option }}</button
        ><button @click="answer(-1)">跳过，查看解释</button>
      </div>
      <div class="lab-explanation" aria-live="polite">
        <strong v-if="predictions[step]">{{
          predictions[step].choice < 0
            ? "已跳过预测"
            : predictions[step].correct
              ? "预测正确"
              : "再观察一下"
        }}</strong>
        <p>{{ state.explanation }}</p>
        <p v-if="state.nodes">
          节点：{{ state.nodes.map((n) => n.label).join("、") }}；连接：{{
            state.edges?.map((e) => e.join(" → ")).join("；")
          }}
        </p>
      </div>
      <dl class="lab-variables">
        <template v-for="(value, key) in state.variables" :key="key"
          ><dt>{{ key }}</dt>
          <dd>{{ JSON.stringify(value) }}</dd></template
        >
      </dl>
      <pre
        class="lab-code"
        aria-label="教学代码"
      ><div v-for="(line,i) in definition.code.split('\n')" :key="i" :class="{active:state.lines.includes(i+1)}"><span>{{i+1}}</span>{{line}}</div></pre>
    </template>
  </div>
</template>
