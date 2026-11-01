<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, watch } from "vue";
import {
  plex,
  account,
  type TutorContext,
  type TutorReply,
} from "./plex-client";
import { getLearning, putLearning } from "./learning-store";
import type { ExerciseDefinition } from "./types";
const props = defineProps<{ exercise?: ExerciseDefinition; code?: string; serverRef?: string; suggestedQuestion?:string }>();
const mode = ref("next_step"),
  question = ref(props.suggestedQuestion || ""),
  busy = ref(false),
  message = ref(""),
  reply = ref<TutorReply>(),
  context = ref<TutorContext>(),
  requestId = ref(""),
  submission = ref<any>(),
  run = ref<any>();
const sessionId = ref("");
let controller: AbortController | undefined,
  serial = 0,
  disposed = false;
const key = () => `online:${props.exercise?.id || props.serverRef || "monty-general"}`;
async function persist() {
  await putLearning(key(), {
    requestId: requestId.value,
    sessionId: sessionId.value,
    submission: submission.value,
    run: run.value,
  }).catch(() => {});
}
async function loadContext(refresh = false) {
  if (!account()) throw Error("请在学习起点登录 PLEX 学生账号。");
  if (!context.value || refresh) {
    context.value = await plex<TutorContext>("/student/tutor/context", {
      question_ref: props.exercise?.serverRef || props.serverRef || "MH030001",
      code: props.code || "",
    });
    if (!context.value.task)
      throw Error("本单元题目尚未在 PLEX 注册，请运行增量导入脚本。");
  }
  return context.value.task!;
}
async function refresh() {
  try {
    await loadContext(true);
    reply.value = undefined;
    sessionId.value = "";
    submission.value = undefined;
    run.value = undefined;
    message.value = "已重新核对题目版本，请再次提交当前代码。";
  } catch (e) {
    message.value = String(e);
  }
}
async function submit() {
  if (busy.value) return;
  busy.value = true;
  message.value = "正在由 PLEX 服务器判题…";
  try {
    const task = await loadContext();
    const code = props.code || "";
    const previous = await getLearning<any>(key() + ":request", undefined);
    const rid =
      previous?.code === code && previous?.version === task.version
        ? previous.id
        : crypto.randomUUID();
    await putLearning(key() + ":request", {
      id: rid,
      code,
      version: task.version,
    });
    submission.value = await plex(
      "/student/practice-submissions/" + encodeURIComponent(task.ref),
      { request_id: rid, question_version: task.version, code },
    );
    run.value = undefined;
    await persist();
    message.value = `服务端作答已记录：${submission.value.result?.all_passed ? "通过" : "尚未通过"}。编号 ${submission.value.id}`;
  } catch (e) {
    message.value = String(e);
  } finally {
    busy.value = false;
  }
}
async function ask() {
  if (busy.value) return;
  busy.value = true;
  reply.value = undefined;
  const own = ++serial;
  controller = new AbortController();
  message.value = "小E在线辅导中…";
  try {
    const task = await loadContext();
    const code = props.code || "";
    if (mode.value === "explain_error") {
      if (!props.exercise)
        throw Error("请从编程练习中打开报错解释，并先在线提交。");
      if (!submission.value || submission.value.code !== code)
        throw Error("请先在线提交当前代码，再解释报错。");
      // Explicit server self-test produces attributable runtime diagnostics; local verdicts are never sent as evidence.
      run.value = await plex(
        "/code/submit",
        {
          language: "python",
          code,
          question_ref: task.ref,
          question_version: task.version,
          run_mode: "expression",
          test_cases: props.exercise.tests.map((t) => ({
            invoke: `__import__('json').dumps(solve(*__import__('json').loads(${JSON.stringify(JSON.stringify(t.args))})), ensure_ascii=False)`,
            expected: JSON.stringify(t.expected)
              .replaceAll(",", ", ")
              .replaceAll(":", ": "),
          })),
        },
        "POST",
        controller.signal,
      );
    }
    if (own !== serial) return;
    requestId.value = crypto.randomUUID();
    await persist();
    const value = await plex<TutorReply>(
      "/student/tutor/ask",
      {
        request_id: requestId.value,
        ...(sessionId.value ? { session_id: sessionId.value } : {}),
        mode: mode.value,
        hint_level: 1,
        question: question.value || "请帮助我理解三门问题中的这一步。",
        question_ref: task.ref,
        question_version: task.version,
        code,
        ...(submission.value?.code === code
          ? { submission_id: submission.value.id }
          : {}),
        ...(mode.value === "explain_error" && run.value?.run_id
          ? { run_id: run.value.run_id }
          : {}),
      },
      "POST",
      controller.signal,
    );
    if (own === serial && !disposed) {
      reply.value = value;
      sessionId.value = value.session_id;
      await persist();
      message.value =
        value.status === "safe_fallback"
          ? "在线辅导未完成，请查看原因后重试。"
          : "辅导已返回。";
    }
  } catch (e) {
    if (own === serial && !disposed) message.value = String(e);
  } finally {
    if (own === serial) busy.value = false;
  }
}
async function cancel() {
  ++serial;
  controller?.abort();
  busy.value = false;
  if (!requestId.value) {
    message.value = "已停止等待。";
    return;
  }
  try {
    const result = await plex<{ status: string }>(
      "/student/tutor/turns/" + requestId.value + "/cancel",
      {},
    );
    message.value =
      result.status === "complete"
        ? "该请求已完成，可恢复结果。"
        : "服务端已确认取消。";
  } catch (e) {
    message.value = "取消未确认，可重试取消或恢复：" + String(e);
  }
}
async function restore() {
  if (!requestId.value) return;
  try {
    reply.value = await plex<TutorReply>(
      "/student/tutor/turns/" + requestId.value,
    );
    message.value = "已恢复服务端辅导结果。";
  } catch (e) {
    message.value = String(e);
  }
}
function clearView() {
  reply.value = undefined;
  context.value = undefined;
  message.value = "登录已失效，请到学习起点重新登录。";
}
watch(
  () => props.code,
  () => {
    reply.value = undefined;
    run.value = undefined;
  },
);
onMounted(async () => {
  window.addEventListener("plex-session-expired", clearView);
  const saved = await getLearning<any>(key(), undefined);
  if (disposed) return;
  requestId.value = saved?.requestId || "";
  sessionId.value = saved?.sessionId || "";
  submission.value = saved?.submission;
  run.value = saved?.run;
});
onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener("plex-session-expired", clearView);
  if (busy.value) void cancel();
  else controller?.abort();
});
</script>
<template>
  <p class="coach-association">本次关联题目：{{exercise?.serverRef || serverRef || "MH030001"}}。请核对下方问题后再发送；题目版本由 PLEX 服务器核验。</p>
  <section class="plex-coach">
    <div class="little-e-heading">
      <img src="/brand/little-e.png" alt="小E" />
      <div>
        <span class="unit-eyebrow">PLEX 在线辅导</span>
        <h3>一起检查你的思路</h3>
      </div>
    </div>
    <p class="unit-muted">
      本页提示由 PLEX
      服务返回。网络不可用时，可继续使用本机练习中的三层教学提示。
    </p>
    <p v-if="!account()">
      当前是访客。在线提交和辅导需要在「学习起点」登录学生账号。
    </p>
    <label class="unit-field"
      >辅导方式<select v-model="mode" :disabled="busy">
        <option value="review_approach">检查思路</option>
        <option value="next_step">只提示下一步</option>
        <option value="explain_error">解释报错</option>
        <option value="pseudocode">伪代码</option>
      </select></label
    ><label class="unit-field"
      >我想问<textarea
        v-model="question"
        maxlength="4000"
        placeholder="说说你已经尝试了什么，以及卡在哪一步。"
      />
    </label>
    <div class="unit-actions">
      <button v-if="exercise" :disabled="busy" @click="submit">
        在线提交当前代码</button
      ><button class="primary" :disabled="busy" @click="ask">请小E辅导</button
      ><button v-if="busy || requestId" @click="cancel">取消辅导</button
      ><button v-if="requestId" :disabled="busy" @click="restore">
        恢复上次辅导</button
      ><button :disabled="busy" @click="refresh">重新核对题目版本</button>
    </div>
    <p role="status">{{ message }}</p>
    <p v-if="context?.task" class="unit-muted">
      服务端题目：{{ context.task.title }} · {{ context.task.ref }}
    </p>
    <div v-if="reply" class="unit-explanation">
      <strong>{{
        reply.generation_mode === "llm_reviewed"
          ? "在线模型辅导（已审核）"
          : reply.generation_mode === "rules"
            ? "服务端规则提示（非模型生成）"
            : "服务端状态说明（未生成模型辅导）"
      }}</strong>
      <p>{{ reply.summary }}</p>
      <p>{{ reply.next_step }}</p>
      <p>{{ reply.follow_up }}</p>
      <ul>
        <li v-for="a in reply.annotations" :key="a.line">
          第 {{ a.line }} 行：{{ a.message }}
        </li>
        <li v-for="p in reply.pseudocode_lines" :key="p.step">
          {{ p.step }}：{{ p.explanation }}
        </li>
      </ul>
      <small>{{ reply.evidence_notice }}</small>
    </div>
  </section>
</template>
