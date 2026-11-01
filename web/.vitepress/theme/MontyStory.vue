<script setup lang="ts">
import MontyScene from "./MontyScene.vue";
import { registerLearningFlush } from "./learning-flush";
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { getLearning, putLearning } from "./learning-store";
import {
  doors,
  newSession,
  chooseFirst,
  revealHost,
  finishRound,
  nextRound,
  upgradeSession,
  revisePrediction,
  type MontyHallSession,
  type Door,
} from "./monty-hall";
const emit = defineEmits<{ blackboard: []; completed: [] }>();
const session = ref<MontyHallSession>(newSession()),
  view = ref(0),
  prediction = ref(""),
  reason = ref(""),
  skipAnimation = ref(false),
  loaded = ref(false),
  notice = ref("");
const steps = ["选择舱门", "提出预测", "小E打开空门", "揭晓结果"];
const explanation = computed(() =>
  session.value.first === session.value.prize
    ? "这一轮初选正确：保留初选获奖，换门没有获奖。"
    : "这一轮初选错误：小E排除了另一扇空门，换门会得到核心。",
);
async function save() {
  if (loaded.value)
    await putLearning("lab:monty-hall", session.value).catch(() => {});
}
onMounted(async () => {
  const saved = await getLearning<MontyHallSession | undefined>(
    "lab:monty-hall",
    undefined,
  );
  if (disposed) return;
  if ((saved?.version === 1 || saved?.version === 2) && doors.includes(saved.prize))
    session.value = upgradeSession(saved);
  prediction.value=session.value.prediction || "";
  reason.value=session.value.reason || "";
  view.value = session.value.step;
  loaded.value = true;
});
watch(session, () => void save(), { deep: true });
watch([prediction,reason],()=>{if(loaded.value&&session.value.step===1){session.value={...session.value,prediction:prediction.value,reason:reason.value};}});
let disposed = false;
const unregisterFlush = registerLearningFlush(save);
onBeforeUnmount(() => {
  disposed = true;
  unregisterFlush();
});
onBeforeUnmount(() => void save());
function pick(door: Door) {
  if(view.value!==session.value.step)return;
  skipAnimation.value=false;
  session.value = chooseFirst(session.value, door);
  view.value = 1;
}
function open(skip = false) {
  if(session.value.step!==1 || (!skip&&!prediction.value))return;
  skipAnimation.value=false;
  session.value = revealHost(
    session.value,
    skip ? "跳过预测" : prediction.value, reason.value, new Date().toISOString(),
  );
  view.value = 2;
}
function finish(change: boolean) {
  if(session.value.step!==2)return;
  skipAnimation.value=false;
  session.value = finishRound(session.value, change);
  view.value = 3;
  emit("completed");
}
function again() {
  session.value = nextRound(session.value);
  view.value = 0;
  prediction.value="";reason.value="";
  notice.value = "已保存上一轮，开始新的试验。";
}
function reset() {
  const {firstPrediction,revisions}=session.value;
  session.value = newSession(
    session.value.seed,
    session.value.round,
    session.value.history,
  );
  view.value = 0;
  session.value={...session.value,firstPrediction,revisions};
  prediction.value="";reason.value="";
  notice.value = "本轮重置，首次预测与历史记录保留。";
}
</script>
<template>
  <section class="monty-story">
    <div class="unit-eyebrow">教学演示 · 第 {{ session.round + 1 }} 轮</div>
    <h3>三扇舱门，一枚能源核心</h3>
    <p class="unit-muted">
      小E始终打开未被初选的空门，并始终提供换门机会。有两扇合法空门时等概率选择。
    </p>
    <ol class="monty-steps">
      <li
        v-for="(label, i) in steps"
        :key="label"
        :class="{ active: view === i }"
      >
        {{ i + 1 }} {{ label }}
      </li>
    </ol>
    <MontyScene :step="view" :prize="session.prize" :first="session.first" :opened="session.opened" :final="session.final" :interactive="view===0&&session.step===0" :skip="skipAnimation" @choose="pick" />
    <button @click="skipAnimation=true">跳过动画</button>
    <p role="status" class="unit-status">
      {{
        view === 0
          ? "请选择一扇门，奖品位置暂不揭示。"
          : view === 1
            ? `你初选了 ${session.first! + 1} 号门。先预测换门是否更好。`
            : view === 2
              ? `小E打开了 ${session.opened! + 1} 号空门。保留初选，还是换到另一扇未开门？`
              : `核心在 ${session.prize + 1} 号门；你最终选择 ${session.final! + 1} 号门。${session.final === session.prize ? "本轮获奖。" : "本轮未获奖。"}`
      }}
    </p>
    <div v-if="view === 1 && session.step===1" class="unit-actions">
      <label
        >我的预测<select v-model="prediction">
          <option disabled value="">请选择预测</option>
          <option>换门更好</option>
          <option>不换门更好</option>
          <option>两者一样</option>
        </select></label
      ><label>理由（可选）<textarea v-model="reason" maxlength="2000" /></label><button class="primary" :disabled="!prediction" @click="open()">提交预测，打开空门</button
      ><button @click="open(true)">跳过预测</button>
    </div>
    <div v-if="view === 2 && session.step===2" class="unit-actions">
      <button @click="finish(false)">保留初选</button
      ><button class="primary" @click="finish(true)">换到另一扇门</button>
    </div>
    <div v-if="view === 3" class="unit-explanation">
      <strong>{{ explanation }}</strong>
      <p>
        你的预测：{{
          session.prediction
        }}。一次输赢不能证明策略优劣；请把初选正确和初选错误分别列出来。
      </p>
      <button class="primary" @click="again">记录并开始下一轮</button>
    </div>
    <details v-if="session.firstPrediction">
      <summary>首次预测与想法修正</summary>
      <p>首次：{{session.firstPrediction.choice}}；理由：{{session.firstPrediction.reason || '未记录'}}</p>
      <label>现在的想法<select v-model="prediction"><option value="" disabled>请选择</option><option>换门更好</option><option>不换门更好</option><option>两者一样</option></select></label>
      <label class="unit-field">修正理由<textarea v-model="reason" maxlength="2000" /></label>
      <button :disabled="!prediction" @click="session=revisePrediction(session,prediction,reason,new Date().toISOString());notice='已保存修正，首次预测保持不变。'">保存修正</button>
      <p>已记录 {{session.revisions?.length || 0}} 次后续预测或修正。</p>
    </details>
    <div class="unit-actions">
      <button :disabled="view === 0" @click="view--">上一步回看</button
      ><button :disabled="view >= session.step" @click="view++">
        下一步回看</button
      ><button @click="reset">重置本轮</button
      ><button @click="emit('blackboard')">把这轮画到小黑板</button>
    </div>
    <p role="status">{{ notice }}</p>
    <details v-if="session.history.length">
      <summary>已记录 {{ session.history.length }} 轮（不计知识得分）</summary>
      <ol>
        <li v-for="(t, i) in session.history" :key="i">
          初选 {{ t.first + 1 }} → 空门 {{ t.opened + 1 }} → 最终
          {{ t.final + 1 }}；{{ t.won ? "获奖" : "未获奖" }}
        </li>
      </ol>
    </details>
  </section>
</template>
