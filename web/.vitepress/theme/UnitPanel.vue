<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
  watch,
} from "vue";
import { getLearning, updateLearning, allLearning } from "./learning-store";
import { registerLearningFlush, flushLearning } from "./learning-flush";
import type { LearningUnitDefinition, UnitProgress } from "./unit-types";
import type {
  ExerciseDefinition,
  ExerciseAttempt,
  ActivityRecord,
} from "./types";
const MontyStory = defineAsyncComponent(() => import("./MontyStory.vue"));
const MontySimulation = defineAsyncComponent(
  () => import("./MontySimulation.vue"),
);
const Blackboard = defineAsyncComponent(() => import("./Blackboard.vue"));
const CodePanel = defineAsyncComponent(() => import("./CodePanel.vue"));
const H5PPanel = defineAsyncComponent(() => import("./H5PPanel.vue"));
const PlexProfile = defineAsyncComponent(() => import("./PlexProfile.vue"));
const PlexCoach = defineAsyncComponent(() => import("./PlexCoach.vue"));
const props = defineProps<{ sectionId: string; initialMode?: string }>();
const emit = defineEmits<{ navigate: [id: string] }>();
const tabs = [
  ["profile", "学习起点"],
  ["story", "三门挑战"],
  ["simulation", "批量实验"],
  ["exercises", "编程练习"],
  ["quiz", "理解自测"],
  ["blackboard", "小黑板"],
  ["coach", "小E辅导"],
  ["progress", "学习回顾"],
];
const mode = ref(props.initialMode || "profile"),
  unit = ref<LearningUnitDefinition>(),
  exercises = ref<ExerciseDefinition[]>([]),
  selected = ref<ExerciseDefinition>(),
  error = ref(""),
  loaded = ref(false),
  assessmentOpen = ref(false),
  saved = ref(false),
  quiz = ref<ActivityRecord>(),
  attempts = ref<ExerciseAttempt[]>([]),
  activity = ref({ rounds: 0, trials: 0, hints: 0 });
const progress = ref<UnitProgress>({
  version: 1,
  visited: [],
  assessment: [],
  reflection: "",
  updatedAt: "",
});
let timer: ReturnType<typeof setTimeout> | undefined,
  disposed = false;
const passed = computed(() =>
  exercises.value.filter((e) => {
    const a = attempts.value.find((a) => a.exerciseId === e.id);
    return (
      a?.results.length === e.tests.length && a.results.every((r) => r.passed)
    );
  }),
);
const quizPassed = computed(
  () =>
    !!quiz.value &&
    (quiz.value.score || 0) >= 3 &&
    (quiz.value.questionScores?.[0] || 0) >= 1,
);
const complete = computed(() => passed.value.length === 3 && quizPassed.value);
async function save() {
  clearTimeout(timer);
  if (!loaded.value) return;
  const snapshot = JSON.parse(JSON.stringify(progress.value)) as UnitProgress;
  snapshot.updatedAt = new Date().toISOString();
  const merged = await updateLearning(
    "unit:monty-hall",
    snapshot,
    (current) => ({
      ...snapshot,
      visited: [...new Set([...current.visited, ...snapshot.visited])],
    }),
  );
  progress.value.visited = merged.visited;
  saved.value = true;
}
const unregister = registerLearningFlush(save);
watch(
  () => [progress.value.reflection, ...progress.value.assessment],
  () => {
    saved.value = false;
    clearTimeout(timer);
    timer = setTimeout(() => void save().catch(() => {}), 500);
  },
);
async function refresh() {
  const records = await allLearning();
  if (disposed) return;
  attempts.value = records
    .filter((r) => r.id.startsWith("attempt:monty-"))
    .map((r) => r.value as ExerciseAttempt);
  quiz.value = records.find((r) => r.id === "h5p:monty-hall:v1")?.value as
    | ActivityRecord
    | undefined;
  const story = records.find((r) => r.id === "lab:monty-hall")?.value as any,
    simulation = records.find((r) => r.id === "simulation:monty-hall")
      ?.value as any;
  activity.value = {
    rounds: (story?.history?.length || 0) + (story?.step === 3 ? 1 : 0),
    trials: simulation?.result?.count || 0,
    hints: attempts.value.reduce((n, a) => n + (a.hints || 0), 0),
  };
}
function changed(event: Event) {
  if (
    /^(attempt:|h5p:|lab:|simulation:)/.test(
      (event as CustomEvent).detail?.id || "",
    )
  )
    void refresh().catch(() => {});
}
async function change(value: string) {
  await flushLearning();
  mode.value = value;
  selected.value = undefined;
  await refresh();
}
async function load() {
  error.value = "";
  try {
    const responses = await Promise.all(
      ["/learning/monty-unit.json", "/learning/exercises.json"].map((p) =>
        fetch(p),
      ),
    );
    if (responses.some((r) => !r.ok)) throw Error("学习单元资源加载失败");
    const [definition, catalog] = await Promise.all(
      responses.map((r) => r.json()),
    );
    if (disposed) return;
    unit.value = definition;
    exercises.value = catalog.filter((e: ExerciseDefinition) =>
      e.id.startsWith("monty-"),
    );
    progress.value = await getLearning("unit:monty-hall", progress.value);
    if (disposed) return;
    if (
      props.sectionId.startsWith("unit/monty/") &&
      !progress.value.visited.includes(props.sectionId)
    )
      progress.value.visited.push(props.sectionId);
    loaded.value = true;
    await save();
    await refresh();
  } catch (e) {
    error.value = String(e);
  }
}
onMounted(() => {
  void load();
  window.addEventListener("plex-learning-changed", changed);
});
onBeforeUnmount(() => {
  disposed = true;
  unregister();
  window.removeEventListener("plex-learning-changed", changed);
  void save().catch(() => {});
});
</script>
<template>
  <div class="unit-panel">
    <nav class="unit-tabs" aria-label="三门学习活动">
      <button
        v-for="[key, label] in tabs"
        :key="key"
        :aria-current="mode === key ? 'page' : undefined"
        @click="change(key)"
      >
        {{ label }}
      </button>
    </nav>
    <p v-if="error" role="alert">
      {{ error }} <button @click="load">重试</button>
    </p>
    <template v-if="loaded">
      <section v-if="mode === 'profile'" class="unit-start">
        <div class="little-e-heading">
          <img src="/brand/little-e.png" alt="小E" />
          <div>
            <span class="unit-eyebrow">FIRST MISSION · 45 MIN</span>
            <h3>三扇舱门：直觉可靠吗？</h3>
            <p>不用先学会编程，从一次选择开始。</p>
          </div>
        </div>
        <ol class="unit-goals">
          <li v-for="goal in unit?.goals" :key="goal">{{ goal }}</li>
        </ol>
        <div class="unit-metrics">
          <span
            >已阅读<strong>{{ progress.visited.length }} / 14 页</strong></span
          ><span
            >编程测试<strong>{{ passed.length }} / 3 题</strong></span
          ><span
            >理解自测<strong>{{ quiz?.score || 0 }} / 4 分</strong></span
          >
        </div>
        <div class="unit-actions">
          <button class="primary" @click="change('story')">
            跳过登录与自评，开始挑战</button
          ><button @click="assessmentOpen = !assessmentOpen">
            {{ assessmentOpen ? "收起自评" : "基础自评（可跳过）" }}
          </button>
        </div>
        <fieldset v-if="assessmentOpen">
          <legend>只用来选择补学起点，不计成绩</legend>
          <label
            v-for="(text, i) in [
              '我能分清概率与试验频率',
              '我能读懂 Python 的 if 条件',
              '我能读懂 for 循环',
            ]"
            :key="text"
            class="unit-field"
            >{{ text
            }}<select v-model="progress.assessment[i]">
              <option value="">暂不回答</option>
              <option value="new">还不会</option>
              <option value="some">了解一点</option>
              <option value="ready">可以解释</option>
            </select></label
          >
          <p>刚开始也没关系：先玩故事，再按第 7–10 页补学。</p>
        </fieldset>
        <details class="account-details">
          <summary>登录／查看 PLEX 学习画像</summary>
          <PlexProfile />
        </details>
      </section>
      <MontyStory v-if="mode === 'story'" @blackboard="change('blackboard')" />
      <MontySimulation v-if="mode === 'simulation'" />
      <template v-if="mode === 'exercises'"
        ><button
          v-if="selected"
          class="back-exercises"
          @click="selected = undefined"
        >
          ← 返回三门练习</button
        ><CodePanel v-if="selected" :key="selected.id" :exercise="selected" />
        <div v-else class="unit-exercise-list">
          <h3>把解释写成可运行的程序</h3>
          <p>本机检查可反复尝试；联网后可将代码交给 PLEX 正式判题。</p>
          <button v-for="(e, i) in exercises" :key="e.id" @click="selected = e">
            <span>0{{ i + 1 }} · {{ e.kind }}</span
            ><strong>{{ e.title }}</strong
            ><small
              >{{
                passed.some((p) => p.id === e.id)
                  ? "本机测试已通过"
                  : "继续练习"
              }}
              →</small
            >
          </button>
        </div></template
      >
      <H5PPanel v-if="mode === 'quiz'" activity-id="monty-hall" />
      <Blackboard
        v-if="mode === 'blackboard'"
        :key="sectionId"
        :section-id="sectionId"
      />
      <PlexCoach v-if="mode === 'coach'" />
      <section v-if="mode === 'progress'" class="unit-progress">
        <span class="unit-eyebrow">MISSION LOG · 学习回顾</span>
        <h3>
          {{ complete ? "本单元达成条件已满足" : "让你的解释经得起检验" }}
        </h3>
        <p>
          阅读 {{ progress.visited.length }} / 14 页；编程 {{ passed.length }} /
          3 题通过；自测 {{ quiz?.score || 0 }} / 4 分。主持人规则题{{
            (quiz?.questionScores?.[0] || 0) >= 1 ? "答对" : "尚未答对"
          }}。
        </p>
        <p>
          达成条件：三道编程题通过测试；自测至少三题正确，且规则题正确。阅读和后续章节始终开放。
        </p>
        <h4>本机学习活动</h4>
        <p>
          故事 {{ activity.rounds }} 轮 · 最近批量实验 {{ activity.trials }} 次
          · 编程提示使用
          {{ activity.hints }} 层。活动次数及抽中奖品不代表知识掌握。
        </p>
        <label class="unit-field"
          >用自己的话解释，为什么换门更有利？<textarea
            v-model="progress.reflection"
            maxlength="8000"
            placeholder="试着从初选正确／初选错误开始，再说明小E的规则为什么重要。"
          /></label
        ><button @click="save">保存反思</button
        ><span role="status">{{ saved ? "已保存到本机" : "" }}</span>
        <h4>下一步建议</h4>
        <ul>
          <li v-if="(quiz?.questionScores?.[0] || 0) < 1">
            重读规则页：小E能打开哪些门？
          </li>
          <li v-if="passed.length < 3">
            回到 Python 补学，先完成一道模板练习。
          </li>
          <li v-if="!quizPassed">重新枚举三种初选情况，再尝试理解自测。</li>
          <li v-if="complete">尝试改变主持人规则，讨论原结论是否仍适用。</li>
        </ul>
        <details>
          <summary>14 页学习路线</summary>
          <ol>
            <li v-for="p in unit?.pages" :key="p.id">
              <button @click="emit('navigate', p.id)">{{ p.title }}</button>
            </li>
          </ol>
        </details>
      </section>
    </template>
  </div>
</template>
