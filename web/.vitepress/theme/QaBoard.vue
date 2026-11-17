<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  CornerDownRight,
  Heart,
  MessageCircle,
  MessageSquareText,
  Search,
  Send,
  Trash2,
} from "lucide-vue-next";
import {
  allLearning,
  putLearning,
  removeLearning,
  updateLearning,
} from "./learning-store";
import { localLearningKey } from './learning-scope';

/** 整本书共用的留言板：提问 / 留言 / 纠错，带回复与点赞。 */
interface QaReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}
interface QaMessage {
  id: string;
  author: string;
  clientId: string;
  tag: string;
  text: string;
  sectionId?: string;
  sectionTitle?: string;
  createdAt: string;
  likes: string[];
  replies: QaReply[];
  resolved?: boolean;
}

const props = defineProps<{
  current?: { id: string; title?: string; group?: string };
}>();
const emit = defineEmits<{ navigate: [id: string] }>();

const TAGS = ["提问", "留言", "纠错"] as const;
const TAG_STYLE: Record<string, string> = {
  "提问": "qa-tag-ask",
  "留言": "qa-tag-note",
  "纠错": "qa-tag-fix",
};
const AVATAR_COLORS = [
  "#d9b873",
  "#7fae9a",
  "#c98a6b",
  "#9aa8d4",
  "#b48ec4",
  "#a3b86c",
];

const NAME_KEY = "plex:qa-name";
const CLIENT_KEY = "plex:qa-client";
const MAX_TEXT = 500;
const MAX_NAME = 12;

const messages = ref<QaMessage[]>([]);
const loading = ref(true);
const name = ref("");
const clientId = ref("");
const tag = ref<(typeof TAGS)[number]>("提问");
const text = ref("");
const replyTo = ref<QaMessage>();
const replyText = ref("");
const filter = ref<string>("全部");
const keyword = ref("");
const visibleCount = ref(30);
const saving = ref(false);
const attach = ref(true);
const scope = ref('all');
const sort = ref('newest');
const questionState = ref('all');
const feedback = ref('');
const error = ref('');
const loadedDraft = ref(false);
const draftKey = localLearningKey('qa:compose:v1');

onMounted(async () => {
  try {
    name.value = localStorage.getItem(NAME_KEY) || "";
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_KEY, id);
    }
    clientId.value = id;
    let draft: Partial<{text: string; tag: (typeof TAGS)[number]; attach: boolean}> = {};
    try { draft = JSON.parse(localStorage.getItem(draftKey) || 'null') || {}; } catch { /* Ignore a damaged draft, retaining the existing author identity. */ }
    if (draft && typeof draft.text === 'string') {
      text.value = draft.text.slice(0, MAX_TEXT);
      if (draft.tag && TAGS.includes(draft.tag)) tag.value = draft.tag;
      attach.value = draft.attach !== false;
      feedback.value = text.value ? '已恢复上次未发布的草稿。' : '';
    }
  } catch {
    clientId.value = crypto.randomUUID();
  }
  loadedDraft.value = true;
  await load();
  if (!name.value)
    nextTick(() =>
      document
        .querySelector<HTMLInputElement>(".qa-name-input")
        ?.focus(),
    );
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const records = await allLearning();
    messages.value = records
      .filter((r) => r.id.startsWith("qa:msg:"))
      .map((r) => sanitize(r.value as Partial<QaMessage>))
      .filter((m): m is QaMessage => !!m)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    error.value = '留言读取失败，现有内容未被清空。请点击刷新重试。';
  }
  loading.value = false;
}

function sanitize(value: Partial<QaMessage>): QaMessage | undefined {
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.text !== "string" ||
    !value.text.trim() ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt))
  )
    return undefined;
  return {
    id: value.id,
    author: typeof value.author === "string" && value.author.trim()
      ? value.author.slice(0, MAX_NAME)
      : "匿名旅人",
    clientId: typeof value.clientId === "string" ? value.clientId : "",
    tag: TAGS.includes(value.tag as (typeof TAGS)[number])
      ? value.tag!
      : "留言",
    text: value.text.slice(0, MAX_TEXT),
    sectionId:
      typeof value.sectionId === "string" && value.sectionId
        ? value.sectionId
        : undefined,
    sectionTitle:
      typeof value.sectionTitle === "string" ? value.sectionTitle : undefined,
    createdAt: value.createdAt,
    likes: Array.isArray(value.likes)
      ? value.likes.filter((l) => typeof l === "string").slice(0, 1000)
      : [],
    replies: Array.isArray(value.replies)
      ? value.replies
          .filter(
            (r): r is QaReply =>
              !!r &&
              typeof r.text === "string" &&
              !!r.text.trim() &&
              typeof r.createdAt === "string" &&
              Number.isFinite(Date.parse(r.createdAt)),
          )
          .map((r) => ({
            id: String(r.id),
            author:
              typeof r.author === "string" && r.author.trim()
                ? r.author.slice(0, MAX_NAME)
                : "匿名旅人",
            text: r.text.slice(0, MAX_TEXT),
            createdAt: r.createdAt,
          }))
          .slice(0, 200)
      : [],
    resolved: value.resolved === true,
  };
}

const stats = computed(() => {
  let asks = 0,
    notes = 0,
    fixes = 0,
    replies = 0;
  for (const m of messages.value) {
    if (m.tag === "提问") asks++;
    else if (m.tag === "纠错") fixes++;
    else notes++;
    replies += m.replies.length;
  }
  return { asks, notes, fixes, replies };
});

const filtered = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  return messages.value.filter((m) => {
    if (scope.value === 'current' && m.sectionId !== props.current?.id) return false;
    if (scope.value === 'mine' && m.clientId !== clientId.value) return false;
    if (questionState.value === 'open' && (m.tag !== '提问' || m.resolved)) return false;
    if (questionState.value === 'resolved' && (m.tag !== '提问' || !m.resolved)) return false;
    if (filter.value !== "全部" && m.tag !== filter.value) return false;
    if (
      key &&
      !(
        m.text.toLowerCase().includes(key) ||
        m.author.toLowerCase().includes(key) ||
        m.replies.some((r) => r.text.toLowerCase().includes(key)) ||
        (m.sectionTitle || '').toLowerCase().includes(key)
      )
    )
      return false;
    return true;
  }).sort((a, b) => sort.value === 'active'
    ? (b.replies.length + b.likes.length) - (a.replies.length + a.likes.length) || b.createdAt.localeCompare(a.createdAt)
    : b.createdAt.localeCompare(a.createdAt));
});

async function rememberName() {
  try {
    localStorage.setItem(NAME_KEY, name.value.trim().slice(0, MAX_NAME));
  } catch {}
}

function displayName() {
  const trimmed = name.value.trim().slice(0, MAX_NAME);
  return trimmed || "匿名旅人";
}

function contextSection() {
  if (!attach.value || !props.current?.id) return {};
  if (props.current.id === "cover") return {};
  return {
    sectionId: props.current.id,
    sectionTitle: props.current.title
      ? (props.current.group ? props.current.group + " · " : "") +
        props.current.title
      : props.current.id,
  };
}

async function submit() {
  const body = text.value.trim();
  if (!body || saving.value || loading.value) return;
  error.value = ''; feedback.value = '';
  saving.value = true;
  await rememberName();
  const record: QaMessage = {
    id: crypto.randomUUID(),
    author: displayName(),
    clientId: clientId.value,
    tag: tag.value,
    text: body.slice(0, MAX_TEXT),
    ...contextSection(),
    createdAt: new Date().toISOString(),
    likes: [],
    replies: [],
  };
  try {
    await putLearning("qa:msg:" + record.id, record);
    text.value = "";
    messages.value = [record, ...messages.value];
    scope.value = 'all'; filter.value = '全部'; questionState.value = 'all'; keyword.value = ''; sort.value = 'newest';
    feedback.value = '已发布，并保存在当前浏览器。';
  } catch {
    error.value = '发布失败，草稿已保留。请重试。';
  } finally {
    saving.value = false;
  }
}

async function submitReply(message: QaMessage) {
  const body = replyText.value.trim();
  if (!body || saving.value) return;
  saving.value = true;
  error.value = ''; feedback.value = '';
  await rememberName();
  const reply: QaReply = {
    id: crypto.randomUUID(),
    author: displayName(),
    text: body.slice(0, MAX_TEXT),
    createdAt: new Date().toISOString(),
  };
  try {
    const updated = await updateLearning<QaMessage>('qa:msg:' + message.id, message,
      current => ({...current, replies: [...current.replies, reply]}));
    messages.value = messages.value.map(m => m.id === updated.id ? updated : m);
    replyText.value = "";
    replyTo.value = undefined;
    feedback.value = '回复已保存。';
  } catch {
    error.value = '回复失败，输入内容已保留，请重试。';
  } finally {
    saving.value = false;
  }
}

async function toggleLike(message: QaMessage) {
  if (saving.value || loading.value) return;
  saving.value = true; error.value = '';
  try {
    const updated = await updateLearning<QaMessage>('qa:msg:' + message.id, message, current => ({
      ...current, likes: current.likes.includes(clientId.value)
        ? current.likes.filter(id => id !== clientId.value) : [...current.likes, clientId.value],
    }));
    messages.value = messages.value.map(m => m.id === updated.id ? updated : m);
  } catch {
    error.value = '点赞未保存，请重试。';
  } finally { saving.value = false; }
}

async function toggleResolved(message: QaMessage) {
  if (message.clientId !== clientId.value || saving.value) return;
  saving.value = true; error.value = '';
  try {
    const updated = await updateLearning<QaMessage>('qa:msg:' + message.id, message,
      current => ({...current, resolved: !current.resolved}));
    messages.value = messages.value.map(m => m.id === updated.id ? updated : m);
    feedback.value = updated.resolved ? '已标记为已解决。' : '问题已重新打开。';
  } catch { error.value = '问题状态未保存，请重试。'; }
  finally { saving.value = false; }
}

async function removeMessage(message: QaMessage) {
  if (message.clientId !== clientId.value || saving.value) return;
  const tail = message.replies.length
    ? `及 ${message.replies.length} 条回复`
    : "";
  if (!window.confirm(`确定删除这条${message.tag}（${message.author}）${tail}吗？`))
    return;
  try {
    saving.value = true;
    await removeLearning("qa:msg:" + message.id);
    if (replyTo.value?.id === message.id) replyTo.value = undefined;
    await load();
    feedback.value = '留言已删除。';
  } catch { error.value = '删除失败，留言仍保留。'; }
  finally { saving.value = false; }
}

function startReply(message: QaMessage) {
  if (replyText.value.trim() && replyTo.value?.id !== message.id) {
    feedback.value = '请先发送或取消当前回复，再回复另一条留言。'; return;
  }
  replyTo.value = replyTo.value?.id === message.id ? undefined : message;
  replyText.value = "";
  nextTick(() =>
    document
      .querySelector<HTMLTextAreaElement>(`[data-reply-input="${message.id}"]`)
      ?.focus(),
  );
}

function avatarColor(author: string) {
  let hash = 0;
  for (const ch of author) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function ago(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const seconds = (Date.now() - time) / 1000;
  if (seconds < 60) return "刚刚";
  if (seconds < 3600) return Math.floor(seconds / 60) + " 分钟前";
  if (seconds < 86400) return Math.floor(seconds / 3600) + " 小时前";
  if (seconds < 172800) return "昨天";
  return new Date(time).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

watch(filter, () => (visibleCount.value = 30));
watch(keyword, () => (visibleCount.value = 30));
watch(name, () => { if (loadedDraft.value) void rememberName(); });
watch([scope, sort, questionState], () => (visibleCount.value = 30));
watch([text, tag, attach], () => {
  if (!loadedDraft.value) return;
  try { localStorage.setItem(draftKey, JSON.stringify({text: text.value, tag: tag.value, attach: attach.value})); }
  catch { error.value = '草稿暂时无法自动保存，请保留当前窗口并复制内容。'; }
});
function composeKey(event: KeyboardEvent, reply?: QaMessage) {
  if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
  event.preventDefault();
  if (reply) void submitReply(reply); else void submit();
}
</script>

<template>
  <div class="qa-board">
    <div class="qa-intro">
      <p>
        <strong>本机 QA 留言板</strong> · 提问、交流思路、记录纠错。点击关联页面可返回原文。
      </p>
      <span class="qa-stats">
        {{ stats.asks }} 个提问 · {{ stats.fixes }} 条纠错 ·
        {{ stats.notes }} 条留言 · {{ stats.replies }} 条回复
      </span>
    </div>
    <div class="qa-notices" aria-live="polite">
      <p v-if="error" class="qa-error" role="alert">{{ error }}</p>
      <p v-else-if="feedback" class="qa-feedback" role="status">{{ feedback }}</p>
    </div>

    <div class="qa-composer">
      <div class="qa-composer-row">
        <input
          v-model="name"
          class="qa-name-input"
          :maxlength="MAX_NAME"
          aria-label="你的昵称"
          placeholder="怎么称呼你？默认「匿名旅人」"
          @change="rememberName"
        />
        <div class="qa-tag-picker" role="radiogroup" aria-label="留言类型">
          <button
            v-for="t in TAGS"
            :key="t"
            role="radio"
            :aria-checked="tag === t"
            :class="{ 'is-on': tag === t, [TAG_STYLE[t]]: true }"
            @click="tag = t"
          >
            {{ t }}
          </button>
        </div>
      </div>
      <textarea
        v-model="text"
        :maxlength="MAX_TEXT"
        rows="3"
        aria-label="留言内容"
        placeholder="写下你的问题或想法…"
        @keydown="composeKey($event)"
      />
      <div class="qa-composer-foot">
        <label v-if="current?.id && current.id !== 'cover'" class="qa-attach">
          <input v-model="attach" type="checkbox" />
          附上当前页（{{ current.title || current.id }}）
        </label>
        <span class="qa-count" :class="{ 'near-limit': text.length > MAX_TEXT - 50 }">
          {{ text.length }} / {{ MAX_TEXT }}
        </span>
        <button class="qa-submit" :disabled="!text.trim() || saving || loading" @click="submit">
          <Send :size="15" />{{ saving ? "投递中…" : "发布" }}
        </button>
      </div>
    </div>
    <p class="qa-compose-hint">Enter 换行 · Ctrl / ⌘ + Enter 发布 · 未发布的正文会自动保存为草稿</p>

    <div class="qa-toolbar">
      <div class="qa-filter" role="radiogroup" aria-label="按类型筛选">
        <button
          v-for="f in ['全部', ...TAGS]"
          :key="f"
          role="radio"
          :aria-checked="filter === f"
          :class="{ 'is-on': filter === f }"
          @click="filter = f"
        >
          {{ f }}
        </button>
      </div>
      <div class="qa-search">
        <Search :size="14" />
        <input
          v-model="keyword"
          aria-label="在留言中搜索"
          placeholder="搜留言…"
        />
      </div>
    </div>
    <div class="qa-view-options">
      <label>查看范围 <select v-model="scope" aria-label="查看范围"><option value="all">全书留言</option><option value="current">当前页</option><option value="mine">我的留言</option></select></label>
      <label>提问状态 <select v-model="questionState" aria-label="提问状态"><option value="all">全部状态</option><option value="open">待解答</option><option value="resolved">已解决</option></select></label>
      <label>排序 <select v-model="sort" aria-label="留言排序"><option value="newest">最新发布</option><option value="active">讨论热度</option></select></label>
      <button :disabled="loading || saving" class="qa-refresh" @click="load">{{ loading ? '读取中…' : '刷新留言' }}</button>
      <span>{{ filtered.length }} 条结果</span>
    </div>

    <div class="qa-list">
      <p v-if="loading" class="qa-empty">正在翻出大家的话…</p>
      <p v-else-if="!filtered.length" class="qa-empty">
        <MessageSquareText :size="22" />
        <template v-if="messages.length">
          这里还没有匹配的留言，换个筛选条件试试。
        </template>
        <template v-else>
          这里还没有留言。写下第一个问题，或把你的思考留在这一页。
        </template>
      </p>
      <template v-else>
        <article
          v-for="message in filtered.slice(0, visibleCount)"
          :key="message.id"
          class="qa-item"
        >
          <span
            class="qa-avatar"
            :style="{ background: avatarColor(message.author) + '26', color: avatarColor(message.author) }"
            >{{ message.author.slice(0, 1) }}</span
          >
          <div class="qa-item-main">
            <header class="qa-item-head">
              <strong>{{ message.author }}</strong>
              <span class="qa-tag" :class="TAG_STYLE[message.tag]">{{
                message.tag
              }}</span>
              <time>{{ ago(message.createdAt) }}</time>
              <span v-if="message.tag === '提问'" class="qa-state" :class="{resolved: message.resolved}">{{ message.resolved ? '已解决' : '待解答' }}</span>
            </header>
            <p class="qa-item-text">{{ message.text }}</p>
            <button
              v-if="message.sectionId"
              class="qa-context"
              title="跳到留言所在的页面"
              @click="emit('navigate', message.sectionId!)"
            >
              <CornerDownRight :size="13" />来自「{{ message.sectionTitle || message.sectionId }}」
            </button>
            <footer class="qa-item-actions">
              <button
                class="qa-like"
                :class="{ liked: message.likes.includes(clientId) }"
                :aria-label="message.likes.length ? `点赞（${message.likes.length}）` : '点赞'"
                :aria-pressed="message.likes.includes(clientId)"
                :disabled="saving"
                @click="toggleLike(message)"
              >
                <Heart :size="15" />
                <span v-if="message.likes.length">{{ message.likes.length }}</span>
              </button>
              <button class="qa-reply-btn" @click="startReply(message)">
                <MessageCircle :size="15" />
                <span>回复<span v-if="message.replies.length">（{{ message.replies.length }}）</span></span>
              </button>
              <button v-if="message.tag === '提问' && message.clientId === clientId" class="qa-resolve" :disabled="saving" @click="toggleResolved(message)">{{ message.resolved ? '重新打开' : '标记已解决' }}</button>
              <button
                v-if="message.clientId === clientId"
                class="qa-delete"
                aria-label="删除这条留言"
                @click="removeMessage(message)"
              >
                <Trash2 :size="14" />
              </button>
            </footer>
            <div v-if="replyTo?.id === message.id" class="qa-reply-box">
              <textarea
                v-model="replyText"
                :maxlength="MAX_TEXT"
                rows="2"
                :data-reply-input="message.id"
                aria-label="回复内容"
                :placeholder="'回复 ' + message.author + '…'"
                @keydown="composeKey($event, message)"
              />
              <div class="qa-reply-foot">
                <span class="qa-count">{{ replyText.length }} / {{ MAX_TEXT }}</span>
                <button class="qa-plain" @click="replyTo = undefined">取消</button>
                <button
                  class="qa-submit qa-submit-small"
                  :disabled="!replyText.trim() || saving"
                  @click="submitReply(message)"
                >
                  <Send :size="13" />回复
                </button>
              </div>
            </div>
            <div v-if="message.replies.length" class="qa-replies">
              <div v-for="reply in message.replies" :key="reply.id" class="qa-reply">
                <span
                  class="qa-avatar qa-avatar-small"
                  :style="{ background: avatarColor(reply.author) + '26', color: avatarColor(reply.author) }"
                  >{{ reply.author.slice(0, 1) }}</span
                >
                <div>
                  <header class="qa-item-head">
                    <strong>{{ reply.author }}</strong>
                    <time>{{ ago(reply.createdAt) }}</time>
                  </header>
                  <p class="qa-item-text">{{ reply.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </article>
        <button
          v-if="filtered.length > visibleCount"
          class="qa-more"
          @click="visibleCount += 30"
        >
          还有 {{ filtered.length - visibleCount }} 条，继续翻…
        </button>
      </template>
    </div>
    <p class="qa-foot-note">
      仅保存在当前浏览器和当前地址，不会自动同步给其他读者。更换浏览器或端口后不会显示旧地址的留言；可在「学习笔记」导出学习记录备份。
    </p>
  </div>
</template>

<style scoped>
.qa-board {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  color: #e6e3d8;
}
.qa-intro {
  padding: 14px 30px 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
}
.qa-intro p {
  margin: 0;
  font-size: 12.5px;
  color: #a7b7a4;
}
.qa-stats {
  font-size: 11px;
  color: #7c8a7a;
  white-space: nowrap;
}
.qa-composer {
  margin: 14px 30px 0;
  padding: 14px;
  background: #ffffff08;
  border: 1px solid #ffffff14;
  border-radius: 10px;
  flex-shrink: 0;
}
.qa-composer-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.qa-name-input {
  width: 220px;
  padding: 7px 10px;
  background: #141a19;
  border: 1px solid #ffffff1c;
  border-radius: 8px;
  color: inherit;
  font-size: 12.5px;
}
.qa-name-input::placeholder {
  color: #6f7b6e;
}
.qa-tag-picker {
  display: flex;
  gap: 6px;
}
.qa-tag-picker button {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid #ffffff1c;
  color: #9caa98;
}
.qa-tag-picker .is-on {
  background: #ffffff0f;
  color: #f2e6c8;
  border-color: #d9b87388;
}
.qa-tag-picker .is-on.qa-tag-ask {
  color: var(--gold);
  border-color: #d9b87388;
  background: #d9b8731a;
}
.qa-tag-picker .is-on.qa-tag-note {
  color: #8fc0ac;
  border-color: #7fae9a77;
  background: #7fae9a1a;
}
.qa-tag-picker .is-on.qa-tag-fix {
  color: #e0a189;
  border-color: #cf8f7477;
  background: #cf8f741a;
}
.qa-composer textarea,
.qa-reply-box textarea {
  width: 100%;
  min-height: 76px;
  padding: 10px 12px;
  background: #141a19;
  border: 1px solid #ffffff1c;
  border-radius: 8px;
  color: inherit;
  font-size: 13px;
  line-height: 1.7;
  resize: vertical;
}
.qa-composer-foot,
.qa-reply-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.qa-composer-foot {
  justify-content: space-between;
}
.qa-attach {
  font-size: 11.5px;
  color: #8b988a;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.qa-attach input {
  accent-color: var(--gold);
}
.qa-count {
  font-size: 11px;
  color: #6f7b6e;
  margin-left: auto;
}
.qa-count.near-limit {
  color: var(--gold);
}
.qa-submit {
  background: var(--gold);
  color: #242723;
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 16px;
  border-radius: 8px;
}
.qa-submit:disabled {
  opacity: 0.4;
}
.qa-submit-small {
  padding: 5px 12px;
  font-size: 12px;
}
.qa-plain {
  font-size: 12px;
  color: #9caa98;
}
.qa-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 30px 4px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.qa-filter {
  display: flex;
  gap: 4px;
}
.qa-filter button {
  font-size: 12px;
  color: #9caa98;
  padding: 6px 12px;
  border-bottom: 1px solid transparent;
}
.qa-filter .is-on {
  color: var(--gold);
  border-color: var(--gold);
}
.qa-search {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6f7b6e;
}
.qa-search input {
  width: 140px;
  padding: 5px 8px;
  background: #141a19;
  border: 1px solid #ffffff1c;
  border-radius: 8px;
  color: inherit;
  font-size: 12px;
}
.qa-list {
  flex: none;
  min-height: 160px;
  overflow: visible;
  padding: 8px 30px 12px;
}
.qa-empty {
  color: #8b988a;
  font-size: 13px;
  padding: 40px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.qa-item {
  display: flex;
  gap: 12px;
  padding: 14px 4px 12px;
  border-bottom: 1px solid #ffffff0d;
}
.qa-item:hover {
  background: #ffffff05;
  border-radius: 10px;
}
.qa-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Noto Serif SC", serif;
  font-size: 15px;
  flex-shrink: 0;
}
.qa-avatar-small {
  width: 24px;
  height: 24px;
  font-size: 12px;
}
.qa-item-main {
  flex: 1;
  min-width: 0;
}
.qa-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qa-item-head strong {
  font-size: 13px;
  font-weight: 500;
}
.qa-item-head time {
  font-size: 11px;
  color: #6f7b6e;
}
.qa-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid;
}
.qa-tag-ask {
  color: var(--gold);
  border-color: #d9b87355;
}
.qa-tag-note {
  color: #7fae9a;
  border-color: #7fae9a55;
}
.qa-tag-fix {
  color: #cf8f74;
  border-color: #cf8f7455;
}
.qa-item-text {
  margin: 6px 0 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: #e6e3d8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.qa-context {
  margin-top: 6px;
  font-size: 11.5px;
  color: #8b988a;
  padding: 0;
  border-bottom: 1px dashed #8b988a55;
}
.qa-item-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
}
.qa-item-actions button {
  font-size: 12px;
  color: #7c8a7a;
  padding: 2px 0;
  gap: 5px;
}
.qa-like.liked {
  color: #d97a7a;
}
.qa-like.liked svg {
  fill: #d97a7a;
}
.qa-delete {
  margin-left: auto;
}
.qa-reply-box {
  margin-top: 10px;
  padding: 10px;
  background: #ffffff06;
  border-left: 2px solid #d9b87355;
  border-radius: 0 8px 8px 0;
}
.qa-reply-foot {
  justify-content: flex-end;
}
.qa-replies {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 12px;
  border-left: 2px solid #ffffff12;
}
.qa-reply {
  display: flex;
  gap: 10px;
}
.qa-reply .qa-item-text {
  font-size: 12.5px;
  margin-top: 3px;
}
.qa-more {
  display: block;
  margin: 14px auto 6px;
  font-size: 12px;
  color: #9caa98;
  padding: 8px 18px;
  border: 1px solid #ffffff1c;
  border-radius: 999px;
}
.qa-foot-note {
  margin: 0;
  padding: 8px 30px 14px;
  font-size: 10.5px;
  color: #a5b0a2;
  flex-shrink: 0;
}
:global(.reader .qa-dialog) {
  width: min(980px, 96vw);
  height: min(820px, calc(100dvh - 112px));
  max-height: calc(100dvh - 112px);
  min-height: 0;
}
:global(.reader .qa-dialog > .dialog-header) { flex-shrink: 0; }
.qa-board input,.qa-board textarea,.qa-board select { box-sizing: border-box; }
.qa-notices { margin: 0 30px; flex-shrink: 0; }
.qa-error,.qa-feedback { margin: 10px 0 0; padding: 10px 12px; border-radius: 8px; line-height: 1.7; font-size: 13px; }
.qa-error { color: #ffc5b5; background: #a8403026; border: 1px solid #c77a66; }
.qa-feedback { color: #c5e6d4; background: #54967824; border: 1px solid #54967888; }
.qa-compose-hint { margin: 7px 30px 0; font-size: 11px; color: #acb7a8; }
.qa-view-options { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 10px 30px; font-size: 12px; flex-shrink: 0; border-bottom: 1px solid #ffffff14; }
.qa-view-options label { display: flex; align-items: center; gap: 6px; color: #bdc9b9; }
.qa-view-options select { max-width: 140px; padding: 6px 8px; color: #e6e3d8; background: #141a19; border: 1px solid #74816d; }
.qa-view-options > span { color: #aab6a4; }
.qa-refresh { border: 1px solid #6f7f69; padding: 6px 10px; border-radius: 7px; color: #dfdac9; }
.qa-state { font-size: 10px; border: 1px solid #b59454; color: #e8c982; padding: 2px 6px; border-radius: 5px; }
.qa-state.resolved { color: #a3dac0; border-color: #6b9e84; }
.qa-item-head,.qa-item-actions { flex-wrap: wrap; }
.qa-item-actions .qa-resolve { color: #d9c18f; }
.qa-count,.qa-item-head time,.qa-item-actions button,.qa-search { color: #a6b5a0; }
.qa-board :is(input,textarea)::placeholder { color: #96a38f; opacity: 1; }
.qa-board button:disabled { cursor: not-allowed; }
.qa-board :is(button,input,textarea,select):focus-visible { outline: 2px solid #d9b873; outline-offset: 3px; }
.qa-submit { background: #d9b873; }
@media(max-width:600px) {
  :global(.reader .qa-dialog) { height: calc(100dvh - 36px); max-height: calc(100dvh - 36px); width: calc(100vw - 24px); }
  .qa-intro,.qa-toolbar,.qa-view-options { padding-left: 16px; padding-right: 16px; }
  .qa-composer { margin-left: 16px; margin-right: 16px; }
  .qa-notices,.qa-compose-hint { margin-left: 16px; margin-right: 16px; }
  .qa-list,.qa-foot-note { padding-left: 16px; padding-right: 16px; }
  .qa-name-input { width: 100%; }
  .qa-composer-foot { flex-wrap: wrap; }
  .qa-attach { flex-basis: 100%; line-height: 1.7; }
  .qa-search { width: 100%; }.qa-search input { flex: 1; width: auto; }
}
</style>
