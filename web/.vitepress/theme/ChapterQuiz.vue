<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getLearning, putLearning } from './learning-store';
import { chapterLearning } from './chapter-learning';
import {
  quizTypeLabel, validQuizAnswer, correctQuizAnswer, canSubmitQuizAnswer,
  initialQuizAnswer, quizAnswerLabel, multiQuizFeedback,
  type QuizAnswer, type QuizResponse,
} from './chapter-quiz-model';
const props = defineProps<{ chapter: string }>();
defineEmits<{ review: [id: string] }>();
const chapter = computed(() => chapterLearning.find(c => c.id === props.chapter)!);
const responses = ref<(QuizResponse | null)[]>([]);
const ready = ref(false);
const message = ref('');
const migration = ref('');
const answered = computed(() => responses.value.filter(r => r?.submitted).length);
const score = computed(() => chapter.value.questions.filter((q, i) => responses.value[i]?.submitted && correctQuizAnswer(q, responses.value[i]!.value)).length);
const key = `chapter-quiz:v2:${props.chapter}`;
let saving = Promise.resolve();
function persist() {
  const snapshot = { version: 2, responses: chapter.value.questions.flatMap((q, i) => {
    const r = responses.value[i];
    return r ? [{ id: q.id, value: Array.isArray(r.value) ? [...r.value] : r.value, submitted: r.submitted }] : [];
  }) };
  saving = saving.catch(() => {}).then(() => putLearning(key, snapshot)).catch(() => {
    message.value = '本次答案仍可查看，但进度未能保存。';
  });
}
function locked(i: number) { return !!responses.value[i]?.submitted; }
function value(i: number) { return responses.value[i]?.value; }
function indices(i: number): number[] { const v = value(i); return Array.isArray(v) ? v : []; }
function selected(i: number, j: number) { return Array.isArray(value(i)) ? indices(i).includes(j) : value(i) === j; }
function correctOption(i: number, j: number) {
  const answer = chapter.value.questions[i].answer;
  return locked(i) && (Array.isArray(answer) ? answer.includes(j) : answer === j);
}
function setValue(i: number, value: QuizAnswer) {
  if (locked(i) || !validQuizAnswer(chapter.value.questions[i], value)) return;
  responses.value[i] = { value, submitted: false }; persist();
}
function choose(i: number, j: number) {
  if (locked(i)) return;
  if (chapter.value.questions[i].type === 'multiple') {
    const old = indices(i);
    setValue(i, old.includes(j) ? old.filter(v => v !== j) : [...old, j].sort((a,b) => a-b));
  } else {
    responses.value[i] = { value: j, submitted: true }; persist();
  }
}
function submit(i: number) {
  if (locked(i) || !canSubmitQuizAnswer(chapter.value.questions[i], value(i))) return;
  responses.value[i] = { value: responses.value[i]!.value, submitted: true }; persist();
}
function move(i: number, position: number, delta: number) {
  if (locked(i)) return;
  const order = [...indices(i)], next = position + delta;
  if (next < 0 || next >= order.length) return;
  [order[position], order[next]] = [order[next], order[position]]; setValue(i, order);
}
function fillKey(event: KeyboardEvent, i: number) {
  if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); submit(i); }
}
function reset() {
  responses.value = chapter.value.questions.map(initialQuizAnswer);
  message.value = ''; migration.value = ''; persist();
}
onMounted(async () => {
  responses.value = chapter.value.questions.map(initialQuizAnswer);
  const saved = await getLearning<unknown>(key, null);
  if (saved && typeof saved === 'object' && (saved as {version?: number}).version === 2) {
    const records = (saved as {responses?: unknown}).responses;
    if (Array.isArray(records)) chapter.value.questions.forEach((q, i) => {
      const r = records.find(r => r && r.id === q.id);
      if (r && validQuizAnswer(q, r.value) && typeof r.submitted === 'boolean' && (!r.submitted || canSubmitQuizAnswer(q, r.value)))
        responses.value[i] = { value: r.value, submitted: r.submitted };
    });
  } else {
    // Only the unchanged first question can inherit a score from the old test.
    const legacy = await getLearning<unknown>(`chapter-quiz:v1:${props.chapter}`, null);
    if (Array.isArray(legacy) && validQuizAnswer(chapter.value.questions[0], legacy[0])) {
      responses.value[0] = { value: legacy[0], submitted: true };
      migration.value = '已保留原第 1 题的作答记录，其余题已更新为新题型。'; persist();
    }
  }
  ready.value = true;
});
</script>

<template>
  <section class="chapter-quiz" :aria-label="chapter.title + '章末测试'" :aria-busy="!ready">
    <h3>{{ chapter.title }} · 章末测试</h3>
    <p>共 {{ chapter.questions.length }} 题。单选与判断点选后立即反馈；填空、多选与排序完成后点击检查。每题提交后锁定，可重做整章。</p>
    <p v-if="migration" class="quiz-hint">{{ migration }}</p>
    <p v-if="!ready" role="status">正在读取答题进度…</p>
    <template v-else>
      <p class="quiz-progress" role="status" aria-live="polite">已答 {{ answered }}/{{ chapter.questions.length }} · 答对 {{ score }} 题<span v-if="answered === chapter.questions.length"> · 本次测试完成</span></p>
      <fieldset v-for="(q, i) in chapter.questions" :key="q.id" class="quiz-question" :data-question-type="q.type">
        <legend><span class="quiz-type">{{ quizTypeLabel[q.type] }}</span> {{ i + 1 }}. {{ q.prompt }}</legend>
        <template v-if="q.type === 'single' || q.type === 'judge' || q.type === 'multiple'">
          <p v-if="q.type === 'multiple' && !locked(i)" class="quiz-hint">可选多项，选完后点击“检查答案”；需全部选对，且不多选。</p>
          <div :class="{'quiz-judge-options': q.type === 'judge'}">
            <button v-for="(option, j) in q.options" :key="j" class="quiz-option" :class="{selected:selected(i,j),correct:correctOption(i,j)}" :disabled="locked(i)" :aria-pressed="selected(i,j)" @click="choose(i,j)">
              <span v-if="q.type === 'multiple'" aria-hidden="true">{{ selected(i,j) ? '☑' : '☐' }} </span><span v-if="q.type !== 'judge'">{{ String.fromCharCode(65+j) }}. </span>{{ option }}<span v-if="correctOption(i,j)"> ✓ 正确答案</span><span v-else-if="locked(i) && selected(i,j)"> ✗ 你的选择</span>
            </button>
          </div>
        </template>
        <div v-else-if="q.type === 'fill'" class="quiz-fill">
          <label :for="'quiz-fill-'+i">你的答案</label>
          <input :id="'quiz-fill-'+i" :value="value(i) ?? ''" :disabled="locked(i)" maxlength="200" :placeholder="q.placeholder || '填写答案'" autocomplete="off" @input="setValue(i, ($event.target as HTMLInputElement).value)" @keydown="fillKey($event, i)" />
          <p v-if="!locked(i)" class="quiz-hint">填写后按 Enter 或点击检查。忽略首尾空格、全半角和字母大小写。</p>
        </div>
        <div v-else-if="q.type === 'order'" class="quiz-order">
          <p v-if="!locked(i)" class="quiz-hint">当前顺序已打乱，用上移、下移按钮调整，完成后检查。按钮也可用 Tab 和 Enter 操作。</p>
          <ol>
            <li v-for="(item, position) in indices(i)" :key="item">
              <span class="quiz-order-number">{{ position+1 }}</span><span class="quiz-order-text">{{ q.options[item] }}</span>
              <span class="quiz-order-controls"><button :disabled="locked(i) || position===0" :aria-label="'上移：'+q.options[item]" @click="move(i,position,-1)">↑</button><button :disabled="locked(i) || position===indices(i).length-1" :aria-label="'下移：'+q.options[item]" @click="move(i,position,1)">↓</button></span>
            </li>
          </ol>
        </div>
        <button v-if="!locked(i) && ['multiple','fill','order'].includes(q.type)" class="quiz-check" :disabled="!canSubmitQuizAnswer(q,value(i))" @click="submit(i)">{{ q.type === 'order' ? '检查顺序' : '检查答案' }}</button>
        <div class="quiz-feedback" aria-live="polite" aria-atomic="true">
          <template v-if="locked(i)">
            <strong :class="{ 'quiz-correct':correctQuizAnswer(q,value(i)) }">{{ correctQuizAnswer(q,value(i)) ? '回答正确。' : '回答有误。' }}</strong>
            <p v-if="q.type === 'multiple' && responses[i]">{{ multiQuizFeedback(q,responses[i]!.value) }}</p>
            <p v-if="q.type === 'fill' || q.type === 'order'">{{ q.type==='order' ? '正确顺序' : '参考答案' }}：{{ quizAnswerLabel(q) }}</p>
            <p>{{ q.explanation }}</p>
          </template>
        </div>
        <button v-if="locked(i)" class="quiz-review" @click="$emit('review',chapter.review)">回看本章正文 →</button>
      </fieldset>
      <button class="quiz-reset" @click="reset">重新作答本章</button>
      <p v-if="message" role="alert">{{ message }}</p>
    </template>
  </section>
</template>

<style scoped>
/* The floating window owns scrolling. An unconstrained inner scroll container
   with overscroll containment swallows the wheel before it reaches that window. */
.chapter-quiz{max-width:800px;width:100%;box-sizing:border-box;margin:0 auto;padding:12px 20px 32px;color:inherit;min-height:0;overflow:visible}
.chapter-quiz h3{font-size:24px}.chapter-quiz p{line-height:1.8}
.quiz-progress{font-weight:700;border-bottom:1px solid #8e9075;padding-bottom:12px}
.quiz-question{border:1px solid #8e9075;border-radius:14px;margin:24px 0;padding:18px;min-width:0}
.quiz-question legend{font-weight:700;padding:0 8px;line-height:1.8;max-width:100%;overflow-wrap:anywhere}
.quiz-type{display:inline-block;padding:2px 8px;border-radius:5px;background:#d9b87322;color:#e5cb91;font-size:12px;font-weight:500}
.quiz-option{display:block;width:100%;margin:9px 0;padding:12px 14px;text-align:left;border:1px solid #8e9075;border-radius:9px;background:transparent;color:inherit;line-height:1.7;cursor:pointer;white-space:normal}
.quiz-option:disabled{opacity:1;cursor:default}.quiz-option.selected{border-width:2px;border-color:#d9b873}.quiz-option.correct{border-color:#6bb99a;background:#559c751c}
.quiz-judge-options{display:flex;gap:12px}.quiz-judge-options .quiz-option{flex:1;text-align:center}
.quiz-fill{display:flex;flex-direction:column;gap:8px;margin:12px 0}.quiz-fill input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #8e9075;border-radius:8px;background:#141a19;color:#eeeade;font:inherit}.quiz-fill input:disabled{opacity:1}
.quiz-hint{font-size:12px;color:#c0c5b5;margin:8px 0}.quiz-order ol{list-style:none;padding:0;margin:14px 0}.quiz-order li{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #8e907588;border-radius:9px;margin:9px 0;line-height:1.7}.quiz-order-number{color:#e5cb91;font-weight:700}.quiz-order-text{flex:1;min-width:0;overflow-wrap:anywhere}.quiz-order-controls{display:flex;gap:5px}.quiz-order-controls button{width:36px;height:36px;border:1px solid #8e9075;border-radius:6px;background:transparent;color:inherit;cursor:pointer}
.quiz-feedback{line-height:1.8;margin-top:12px;overflow-wrap:anywhere}.quiz-feedback p{margin:8px 0}.quiz-correct{color:#a1d7b9}
.quiz-review,.quiz-reset,.quiz-check{padding:10px 16px;border:1px solid #8e9075;border-radius:9px;background:transparent;color:inherit;cursor:pointer;margin-top:12px}.quiz-check{background:#d9b873;color:#242723;border-color:#d9b873;font-weight:600}
.chapter-quiz button:disabled{cursor:default}.quiz-order-controls button:disabled,.quiz-check:disabled{opacity:.4}.chapter-quiz :is(button,input):focus-visible{outline:3px solid #d9b873;outline-offset:3px}
@media(max-width:600px){.chapter-quiz{padding:8px 2px 24px}.quiz-question{padding:12px}.quiz-order li{padding:9px;gap:6px}.quiz-order-controls{flex-direction:column}.quiz-order-controls button{width:32px;height:32px}}
</style>
