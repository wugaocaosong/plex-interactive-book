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
} from "./learning-store";

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

onMounted(async () => {
  try {
    name.value = localStorage.getItem(NAME_KEY) || "";
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_KEY, id);
    }
    clientId.value = id;
  } catch {
    clientId.value = crypto.randomUUID();
  }
  await load();
  if (!name.value)
    nextTick(() =>
      document
        .querySelector<HTMLInputElement>(".qa-name-input")
        ?.focus(),
    );
});

async function load() {
  try {
    const records = await allLearning();
    messages.value = records
      .filter((r) => r.id.startsWith("qa:msg:"))
      .map((r) => sanitize(r.value as Partial<QaMessage>))
      .filter((m): m is QaMessage => !!m)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    /* 存储错误已由 learning-store 广播提示 */
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
    if (filter.value !== "全部" && m.tag !== filter.value) return false;
    if (
      key &&
      !(
        m.text.toLowerCase().includes(key) ||
        m.author.toLowerCase().includes(key) ||
        m.replies.some((r) => r.text.toLowerCase().includes(key))
      )
    )
      return false;
    return true;
  });
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
  if (!body || saving.value) return;
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
    await load();
  } finally {
    saving.value = false;
  }
}

async function submitReply(message: QaMessage) {
  const body = replyText.value.trim();
  if (!body || saving.value) return;
  saving.value = true;
  await rememberName();
  const reply: QaReply = {
    id: crypto.randomUUID(),
    author: displayName(),
    text: body.slice(0, MAX_TEXT),
    createdAt: new Date().toISOString(),
  };
  try {
    await putLearning("qa:msg:" + message.id, {
      ...message,
      replies: [...message.replies, reply],
    });
    replyText.value = "";
    replyTo.value = undefined;
    await load();
  } finally {
    saving.value = false;
  }
}

async function toggleLike(message: QaMessage) {
  const previous = message.likes;
  const likes = previous.includes(clientId.value)
    ? previous.filter((id) => id !== clientId.value)
    : [...previous, clientId.value];
  message.likes = likes;
  try {
    await putLearning("qa:msg:" + message.id, { ...message, likes });
  } catch {
    message.likes = previous;
  }
}

async function removeMessage(message: QaMessage) {
  const tail = message.replies.length
    ? `及 ${message.replies.length} 条回复`
    : "";
  if (!window.confirm(`确定删除这条${message.tag}（${message.author}）${tail}吗？`))
    return;
  try {
    await removeLearning("qa:msg:" + message.id);
    if (replyTo.value?.id === message.id) replyTo.value = undefined;
    await load();
  } catch {}
}

function startReply(message: QaMessage) {
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
</script>

<template>
  <div class="qa-board">
    <div class="qa-intro">
      <p>
        整本书的留言板——读到哪里有疑问、有想法、发现小错误，都可以留在这里。
      </p>
      <span class="qa-stats">
        {{ stats.asks }} 个提问 · {{ stats.fixes }} 条纠错 ·
        {{ stats.notes }} 条留言 · {{ stats.replies }} 条回复
      </span>
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
        @keydown.enter.exact.prevent="submit"
      />
      <div class="qa-composer-foot">
        <label v-if="current?.id && current.id !== 'cover'" class="qa-attach">
          <input v-model="attach" type="checkbox" />
          附上当前页（{{ current.title || current.id }}）
        </label>
        <span class="qa-count" :class="{ 'near-limit': text.length > MAX_TEXT - 50 }">
          {{ text.length }} / {{ MAX_TEXT }}
        </span>
        <button class="qa-submit" :disabled="!text.trim() || saving" @click="submit">
          <Send :size="15" />{{ saving ? "投递中…" : "发布" }}
        </button>
      </div>
    </div>

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

    <div class="qa-list">
      <p v-if="loading" class="qa-empty">正在翻出大家的话…</p>
      <p v-else-if="!filtered.length" class="qa-empty">
        <MessageSquareText :size="22" />
        <template v-if="messages.length">
          这里还没有匹配的留言，换个筛选条件试试。
        </template>
        <template v-else>
          还没有留言。第一个提问的人，会收到整本书的星星 ✦
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
                @click="toggleLike(message)"
              >
                <Heart :size="15" />
                <span v-if="message.likes.length">{{ message.likes.length }}</span>
              </button>
              <button class="qa-reply-btn" @click="startReply(message)">
                <MessageCircle :size="15" />
                <span v-if="message.replies.length">{{ message.replies.length }}</span>
                <template v-if="!message.replies.length">回复</template>
              </button>
              <button
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
                @keydown.enter.exact.prevent="submitReply(message)"
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
      留言保存在这台设备的浏览器里，会随「学习笔记」的学习记录一起导出备份。
    </p>
  </div>
</template>

<style scoped>
.qa-board {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
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
  flex: 1;
  min-height: min(44vh, 400px);
  overflow: auto;
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
  color: #5f6a5f;
  flex-shrink: 0;
}
</style>
