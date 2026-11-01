/**
 * 页内实验台运行时
 *
 * 页面里的 .lab-editor 是纯 DOM 卡片（由 build_lab_pages.py 生成），
 * 这里负责三件事：
 *   1. hydrate —— 回填本地草稿、记录初始代码（供「重置」用）
 *   2. run     —— 交给 /python-worker.js（Pyodide）执行，输出写回卡片
 *   3. draft   —— 输入防抖存 IndexedDB，翻页/刷新后接着改
 *
 * 为什么不用 Vue 组件：翻书模式会把叶子的 HTML 字符串克隆进 StPageFlip，
 * 有状态的组件挂上去会丢实例。事件走 Layout 的 clickBook 委托，状态活在模块里。
 */

import { getLearning, putLearning } from "./learning-store";

const WORKER_URL = "/python-worker.js";
const BOOT_TIMEOUT = 90_000;
const RUN_TIMEOUT = 15_000;
const DRAFT_PREFIX = "draft:lab-editor:";
const INLINE_PATH = "chapter_lab/inline_editor.py";
const MAX_OUTPUT = 8_000;

type Job = { card: HTMLElement; code: string; runId: number };

let worker: Worker | undefined;
let booted = false;
let active: Job | undefined;
let seq = 0;
let bootTimer: ReturnType<typeof setTimeout> | undefined;
let runTimer: ReturnType<typeof setTimeout> | undefined;
const queue: Job[] = [];
/** key → 页面自带的初始代码，用于「重置」 */
const starter = new Map<string, string>();
const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();

/* ---------------------------------------------------------------- DOM 小工具 */

const outOf = (card: HTMLElement) =>
  card.querySelector<HTMLElement>(".lab-editor-out");

const codeOf = (card: HTMLElement) =>
  card.querySelector<HTMLTextAreaElement>(".lab-editor-code");

function setStatus(card: HTMLElement, text: string, kind?: "busy" | "ok" | "error") {
  const node = card.querySelector<HTMLElement>(".lab-editor-status");
  if (!node) return;
  node.textContent = text;
  node.classList.remove("is-busy", "is-ok", "is-error");
  if (kind) node.classList.add(`is-${kind}`);
}

function clearOutput(card: HTMLElement, placeholder = false) {
  const out = outOf(card);
  if (!out) return;
  out.classList.remove("is-error");
  out.textContent = placeholder ? "输出会显示在这里。" : "";
  out.dataset.filled = placeholder ? "0" : "1";
}

function appendOutput(card: HTMLElement, text: string) {
  const out = outOf(card);
  if (!out || !text) return;
  if (out.dataset.filled !== "1") {
    out.textContent = "";
    out.dataset.filled = "1";
  }
  const merged = (out.textContent ?? "") + text;
  out.textContent = merged.length > MAX_OUTPUT ? merged.slice(-MAX_OUTPUT) : merged;
  out.scrollTop = out.scrollHeight;
}

function failOutput(card: HTMLElement, text: string) {
  const out = outOf(card);
  if (!out) return;
  out.classList.add("is-error");
  out.dataset.filled = "1";
  out.textContent = text;
}

/* ---------------------------------------------------------------- 草稿 */

function scheduleDraft(key: string, area: HTMLTextAreaElement) {
  const pending = draftTimers.get(key);
  if (pending) clearTimeout(pending);
  draftTimers.set(
    key,
    setTimeout(() => {
      draftTimers.delete(key);
      void putLearning(DRAFT_PREFIX + key, { code: area.value }).catch(() => {});
    }, 600),
  );
}

function flushDraft(key: string, area: HTMLTextAreaElement) {
  const pending = draftTimers.get(key);
  if (pending) clearTimeout(pending);
  draftTimers.delete(key);
  void putLearning(DRAFT_PREFIX + key, { code: area.value }).catch(() => {});
}

/* ---------------------------------------------------------------- hydrate */

/**
 * 给一份新插入的 HTML 里的实验台接上草稿。
 * 翻书的每一页、学习模式的每一节都会各调一次，必须是幂等的。
 *
 * 输入监听不绑在节点上：PageFlip 会克隆页面节点，克隆体拿不到监听器。
 * 统一走 document 级委托（模块加载时注册一次）。
 */
export function hydrateLabEditors(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(".lab-editor").forEach((card) => {
    const key = card.dataset.labKey;
    const area = codeOf(card);
    if (!key || !area) return;
    if (!starter.has(key)) starter.set(key, area.value);

    if (card.dataset.hydrated === "1") return;
    card.dataset.hydrated = "1";

    void getLearning<{ code?: string }>(DRAFT_PREFIX + key, {})
      .then((draft) => {
        const code = draft?.code;
        if (typeof code === "string" && code && code !== area.value) area.value = code;
      })
      .catch(() => {});
  });
}

function areaOfEvent(event: Event): HTMLTextAreaElement | undefined {
  const target = event.target as HTMLElement | null;
  const area = target?.closest?.<HTMLTextAreaElement>("textarea.lab-editor-code");
  return area ?? undefined;
}

if (typeof document !== "undefined") {
  document.addEventListener("input", (event) => {
    const area = areaOfEvent(event);
    const key = area?.closest<HTMLElement>(".lab-editor")?.dataset.labKey;
    if (area && key) scheduleDraft(key, area);
  });
  document.addEventListener("focusout", (event) => {
    const area = areaOfEvent(event);
    const key = area?.closest<HTMLElement>(".lab-editor")?.dataset.labKey;
    if (area && key) flushDraft(key, area);
  });
}

/* ---------------------------------------------------------------- worker */

function killWorker() {
  if (bootTimer) clearTimeout(bootTimer);
  if (runTimer) clearTimeout(runTimer);
  bootTimer = undefined;
  runTimer = undefined;
  worker?.terminate();
  worker = undefined;
  booted = false;
}

function finish(card: HTMLElement, text: string, kind?: "ok" | "error") {
  if (runTimer) clearTimeout(runTimer);
  runTimer = undefined;
  const run = card.querySelector<HTMLElement>('[data-action="lab-run"]');
  const stop = card.querySelector<HTMLElement>('[data-action="lab-stop"]');
  if (run) run.hidden = false;
  if (stop) stop.hidden = true;
  setStatus(card, text, kind);
  active = undefined;
}

function sendRun(job: Job) {
  const card = job.card;
  setStatus(card, "运行中…", "busy");
  const run = card.querySelector<HTMLElement>('[data-action="lab-run"]');
  const stop = card.querySelector<HTMLElement>('[data-action="lab-stop"]');
  if (run) run.hidden = true;
  if (stop) stop.hidden = false;
  runTimer = setTimeout(() => {
    const timedOut = job.card;
    killWorker();
    appendOutput(timedOut, "\n运行超过 15 秒，已停止。检查一下是不是写了死循环。\n");
    finish(timedOut, "超时停止", "error");
    pump();
  }, RUN_TIMEOUT);
  worker!.postMessage({
    type: "run",
    path: INLINE_PATH,
    code: job.code,
    stdin: "",
    requestId: job.runId,
    runId: job.runId,
  });
}

function onWorkerMessage(event: MessageEvent) {
  const data = event.data as {
    type?: string;
    text?: string;
    runId?: number;
  };
  const job = active;
  if (!job) return;
  if (typeof data.runId === "number" && data.runId !== job.runId) return;

  switch (data.type) {
    case "ready": {
      if (bootTimer) clearTimeout(bootTimer);
      bootTimer = undefined;
      booted = true;
      sendRun(job);
      return;
    }
    case "stdout":
    case "stderr": {
      appendOutput(job.card, data.text ?? "");
      return;
    }
    case "done": {
      if (data.text) appendOutput(job.card, data.text);
      appendOutput(job.card, "");
      finish(job.card, "运行完成 ✓", "ok");
      pump();
      return;
    }
    case "error": {
      killWorker(); // 出错时环境状态不可信，下次重开
      failOutput(job.card, (data.text ?? "").trim() || "运行失败，但没有返回错误信息。");
      finish(job.card, "运行出错，改改再跑", "error");
      pump();
      return;
    }
    default:
      return;
  }
}

function ensureWorker(job: Job) {
  setStatus(job.card, "正在启动 Python 环境…（首次约 10 秒）", "busy");
  try {
    worker = new Worker(WORKER_URL, { type: "module" });
  } catch (error) {
    worker = undefined;
    failOutput(job.card, `无法启动 Python：${String(error)}`);
    finish(job.card, "环境启动失败", "error");
    pump();
    return;
  }
  worker.onmessage = onWorkerMessage;
  worker.onerror = (event) => {
    const message = (event as ErrorEvent).message || "Python 环境初始化失败";
    killWorker();
    failOutput(job.card, message);
    finish(job.card, "环境启动失败", "error");
    pump();
  };
  bootTimer = setTimeout(() => {
    killWorker();
    failOutput(job.card, "环境加载超时。网络慢的时候第一次会久一点，可以再点一次运行。");
    finish(job.card, "启动超时", "error");
    pump();
  }, BOOT_TIMEOUT);
  worker.postMessage({ type: "init", requestId: job.runId, runId: job.runId });
}

function pump() {
  if (active || !queue.length) return;
  const job = queue.shift()!;
  active = job;
  clearOutput(job.card);
  if (!worker) {
    ensureWorker(job);
    return;
  }
  if (!booted) {
    setStatus(job.card, "正在启动 Python 环境…（首次约 10 秒）", "busy");
    return;
  }
  sendRun(job);
}

/* ---------------------------------------------------------------- 动作 */

export function labEditorAction(action: HTMLElement): boolean {
  const value = action.dataset.action;
  if (value !== "lab-run" && value !== "lab-stop" && value !== "lab-reset") return false;
  const card = action.closest<HTMLElement>(".lab-editor");
  if (!card) return false;
  const key = card.dataset.labKey ?? "";

  if (value === "lab-run") {
    const area = codeOf(card);
    if (!area) return true;
    flushDraft(key, area);
    const code = area.value.trim();
    if (!code) {
      failOutput(card, "代码是空的，先写点什么再运行。");
      return true;
    }
    queue.push({ card, code, runId: ++seq });
    setStatus(card, queue.length > 1 || active ? "排队中…" : "准备运行…", "busy");
    pump();
    return true;
  }

  if (value === "lab-stop") {
    const isOwner = active?.card === card;
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (queue[i].card === card) queue.splice(i, 1);
    }
    if (isOwner) {
      killWorker();
      appendOutput(card, "\n已停止。\n");
      finish(card, "已停止");
      pump();
    } else {
      setStatus(card, "就绪 · 首次运行需加载 Python 环境");
    }
    return true;
  }

  const area = codeOf(card);
  const original = starter.get(key);
  if (area && original !== undefined) {
    area.value = original;
    flushDraft(key, area);
  }
  const out = outOf(card);
  if (out) {
    out.classList.remove("is-error");
    clearOutput(card, true);
  }
  setStatus(card, "已恢复初始代码", "ok");
  return true;
}
