<script setup lang="ts">
import {
  computed,
  toRef,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  defineAsyncComponent,
} from "vue";
import { useData, useRouter } from "vitepress";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  List,
  Search,
  X,
  Expand,
  RotateCcw,
} from "lucide-vue-next";
import type {SceneId} from "./teaching-models";
const TeachingScene=defineAsyncComponent(()=>import("./TeachingScene.vue"));
const teachingScene=ref<SceneId>("merge");
import BookmarkLibrary from "./BookmarkLibrary.vue";
import {organizeBookmarks} from "./bookmark-model";
import {decorateFormulaCopies,handleFormulaCopy} from "./formula-copy";
import renderMathInElement from "katex/contrib/auto-render";
import type { PageFlip } from "page-flip";
import type {
  BookManifest,
  BookPage,
  ReadingLocator,
  SavedBookmark,
  SearchEntry,
  AnnotationRecord,
  ReaderPreferences,
} from "./types";
import { paginate, locateLeaf, type Leaf } from "./pagination";
import { readStore, saveStore } from "./storage";
import { bindPageDrag } from "./page-drag";
import { flushLearning } from "./learning-flush";
const StarMap=defineAsyncComponent(()=>import("./SolarDirectory.vue"));
import StudyReader from "./StudyReader.vue";
import { decorateLabLevel, isLabLevel } from "./lab-level";
import { injectExplorers } from "./explorers";
import { readLabResults, labResultText, type LabRunResult } from "./route-lab";
import ReaderControls from './ReaderControls.vue';
import FloatingToolWindow from './FloatingToolWindow.vue';
import {petHost,showPet} from './pet-host';
import {frameActive,readingMaterial} from './reading-context';
const FrameReading=defineAsyncComponent(()=>import('./FrameReading.vue'));
function openFrame(){if(overlayOpen.value)closeOverlay();readingMaterial.value=null;frameActive.value=true;}
function openQaEvent(event:Event){const id=(event as CustomEvent).detail?.section;if(typeof id==='string'&&id.startsWith('chapter_divide_and_conquer/'))void chapterActivity(id,'qa');}
onMounted(()=>{window.addEventListener('plex-frame-reading',openFrame);window.addEventListener('plex-open-qa',openQaEvent);});
onBeforeUnmount(()=>{frameActive.value=false;readingMaterial.value=null;window.removeEventListener('plex-frame-reading',openFrame);window.removeEventListener('plex-open-qa',openQaEvent);});
const Blackboard=defineAsyncComponent(()=>import('./Blackboard.vue'));
const boardOpen=ref(false),boardSection=ref(''),petOpen=toRef(petHost,'open'),dictating=toRef(petHost,'dictating');
function petLogin(){openUnit('profile');}
async function openBoard(id=sectionId.value){await flushLearning();closeOverlay();boardSection.value=id;boardOpen.value=true;}
async function closeBoard(){try{await flushLearning();boardOpen.value=false;}catch(error){storageMessage.value='板书保存失败，窗口保持打开：'+String(error);}}
import {CommandGate,type PageTurnCommand} from './reader-controls';
const turnGate=new CommandGate();
const controlNotice=ref('');let noticeTimer:ReturnType<typeof setTimeout>|undefined;
function turnNotice(text:string){controlNotice.value=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>controlNotice.value='',2200);}
async function controlTurn(command:PageTurnCommand){
 const editing=(document.activeElement as HTMLElement)?.closest('input,textarea,select,[contenteditable=true],.cm-editor');
 const blocked=!!(frameActive.value||menu.value||searchOpen.value||panel.value||boardOpen.value||petOpen.value||selection.value||loading.value||editing||!document.hasFocus()||document.hidden||!getSelection()?.isCollapsed||(flip&&flip.getState()!=='read'));
 if(!turnGate.accept(command,performance.now(),blocked))return;
 if(preferences.value.mode==='study'&&!cover.value&&study.value){
  const moved=await turnStudy(command.direction==='next'?1:-1);turnNotice(moved?'已滚动一屏':'已到阅读边界');return;
 }
 const previousDirection=command.direction==='previous';
 const available=previousDirection?(pageIndex.value>0||sectionIndex.value>0):(pageIndex.value+(desktop.value?2:1)<leaves.value.length||sectionIndex.value<sections.value.length-1);
 if(!available){turnNotice(previousDirection?'已到封面':'已到封底');return;}
 if(previousDirection)previous();else next();
 turnNotice(previousDirection?'上一页':'下一页');
}
import ChapterTermNote from "./ChapterTermNote.vue";
import ChapterAnnotation from "./ChapterAnnotation.vue";
const Chapter12Panel = defineAsyncComponent(() => import("./Chapter12Panel.vue"));
const QaBoard = defineAsyncComponent(() => import("./QaBoard.vue"));
const chapter12Mode = ref("route");
const annotationPoint = ref({x:16,y:120});
function positionAnnotation(rect?: DOMRect) {
  annotationPoint.value={x:Math.max(12,Math.min(rect?.left||16,window.innerWidth-372)),y:Math.max(16,Math.min((rect?.bottom||100)+10,window.innerHeight-320))};
}
async function chapterTermNote(element: HTMLElement) {
  const range=document.createRange();range.selectNodeContents(element);
  const selected=getSelection();selected?.removeAllRanges();selected?.addRange(range);
  positionAnnotation(element.getBoundingClientRect());
  const root=element.closest<HTMLElement>('[data-section]');if(root)await selectText(root);
}
async function chapterActivity(id:string, mode:string) {
  await flushLearning();
  if(id!==sectionId.value)await navigate(id);
  chapter12Mode.value=mode;panelSource.value=current.value;openPanel("chapter12");
}
import LearningNotebook from "./LearningNotebook.vue";
const UnitPanel = defineAsyncComponent(() => import("./UnitPanel.vue"));
import {blankProgress,upgradeProgress} from "./lesson-state";
import type {LearningUnitDefinition} from "./unit-types";
const unitDefinition=ref<LearningUnitDefinition>();
const lesson=computed(()=>unitDefinition.value?.pages.find(p=>p.id===sectionId.value));
const unitMode = ref("profile");
const unitSection = ref("unit/monty/start");
const CodePanel = defineAsyncComponent(() => import("./CodePanel.vue"));
const H5PPanel = defineAsyncComponent(() => import("./H5PPanel.vue"));
const LearningHub = defineAsyncComponent(() => import("./LearningHub.vue"));
import { decorateGlossary, type GlossaryEntry } from "./glossary";
import { injectChapterQuiz, chapterLearning } from './chapter-learning';
const ChapterQuiz = defineAsyncComponent(() => import('./ChapterQuiz.vue'));
const quizChapter = ref('');
import { retainMathText, canonicalText } from "./text-coordinates";
import {
  defaultPreferences,
  sanitizePreferences,
  getLearning,
  putLearning,
  updateLearning,
  allLearning,
  migrateLegacy,
  migrateLessonData,
} from "./learning-store";
import {
  captureSelection,
  decorateAnnotations,
  reanchor,
  searchText,
  markRange,
  sourceBlocks,
} from "./annotations";

const { frontmatter } = useData();
const router = useRouter();
const manifest = ref<BookManifest>();
const current = ref<BookPage>();
const ready = ref(false);
const loading = ref(true);
const error = ref("");
const sectionId = computed(() => String(frontmatter.value.bookId || "cover"));
const sections = computed(() => manifest.value?.pages || []);
const sectionIndex = computed(() =>
  sections.value.findIndex((p) => p.id === sectionId.value),
);
const cover = computed(() => current.value?.kind === "cover");
const backCover = computed(() => current.value?.kind === "back-cover");
const menu = ref<
  "contents" | "bookmarks" | "settings" | "notes" | "more" | "controls" | "qa" | null
>(null);
const mapView = ref(true);
const query = ref("");
const index = ref<SearchEntry[]>([]);
const searchMode = ref<"exact" | "ai">("exact");
const searchOpen = ref(false);
const searchIndexError = ref("");
const aiSearchProgress = ref("");
const aiSearchError = ref("");
const aiSearching = ref(false);
let searchIndexRequest: Promise<SearchEntry[]> | undefined;
let semanticSearchModule: typeof import("./smart-search") | undefined;
let semanticDatabase: Awaited<ReturnType<(typeof import("./smart-search"))["prepareSemanticIndex"]>> | undefined;
let semanticSearchTimer: ReturnType<typeof setTimeout> | undefined;
let semanticSearchGeneration = 0;
const semanticSectionHits = ref<{ sectionId: string; score: number }[]>([]);
const preferences = ref<ReaderPreferences>({ ...defaultPreferences }),
  study = ref<InstanceType<typeof StudyReader>>(),
  studyPlace = ref<ReadingLocator>(),
  notes = ref<AnnotationRecord[]>([]),
  selection = ref<AnnotationRecord>(),
  noteText = ref(""),
  rebindNote = ref<AnnotationRecord>(),
  storageMessage = ref("");
const systemDark = ref(false),
  dark = computed(
    () =>
      preferences.value.theme === "dark" ||
      (preferences.value.theme === "system" && systemDark.value),
  );
const glossary = ref<GlossaryEntry[]>([]),
  term = ref<GlossaryEntry>(),
  termHover = ref<{ entry: GlossaryEntry; x: number; y: number; below?: boolean }>();
let termHoverTimer: ReturnType<typeof setTimeout> | undefined,
  termHoverTarget: Element | undefined;
function hideTermHover() {
  clearTimeout(termHoverTimer);
  termHoverTimer = undefined;
  termHoverTarget = undefined;
  termHover.value = undefined;
}
function onBookMouseOver(event: MouseEvent) {
  const termEl = (event.target as HTMLElement).closest?.(".glossary-term");
  if (!termEl || termEl === termHoverTarget) return;
  const entry = glossary.value.find(
    (e) => e.term === (termEl as HTMLElement).dataset.term,
  );
  if (!entry) return;
  termHoverTarget = termEl;
  clearTimeout(termHoverTimer);
  termHoverTimer = setTimeout(() => {
    const rect = termEl.getBoundingClientRect();
    if (!rect.width) return;
    const below = rect.top < 230;
    termHover.value = {
      entry,
      below,
      x: Math.min(
        Math.max(rect.left + rect.width / 2, 168),
        window.innerWidth - 168,
      ),
      y: below ? rect.bottom : rect.top,
    };
  }, 130);
}
function onBookMouseOut(event: MouseEvent) {
  const termEl = (event.target as HTMLElement).closest?.(".glossary-term");
  if (termEl && termEl === termHoverTarget) hideTermHover();
}
const lineOptions = [
    { value: 1.5, label: "紧凑" },
    { value: 1.8, label: "标准" },
    { value: 2.1, label: "宽松" },
  ] as const,
  widthOptions = [
    { value: "narrow", label: "窄" },
    { value: "standard", label: "标准" },
    { value: "wide", label: "宽" },
  ] as const;
const readerFontFamily = computed(() =>
  preferences.value.font === "serif"
    ? "'Noto Serif SC', serif"
    : "'Noto Sans SC', sans-serif",
);

const labResults=ref<Record<string,LabRunResult|undefined>>({});
const labRevision=ref(0);
function refreshLabLabels(root:ParentNode=document) {
  root.querySelectorAll<HTMLElement>("[data-lab-result]").forEach(el=>el.textContent=labResultText(labResults.value[el.dataset.labResult!]));
}
function labOutcome(result:LabRunResult){labResults.value[result.key]=result;prepared.clear();refreshLabLabels();}
async function changeLabLevel(level:string) {
  if(!isLabLevel(level)||level===preferences.value.labLevel)return;
  const place=locator();
  preferences.value.labLevel=level;
  saveStore("preferences",preferences.value);
  prepared.clear();labRevision.value++;
  await nextTick();
  if(place){const source=document.createElement("div");source.innerHTML=current.value?.html||"";const block=[...source.querySelectorAll<HTMLElement>("[data-block]")].find(e=>e.dataset.block===place.blockId);if(block?.dataset.level&&block.dataset.level!==level){place.blockId=source.querySelector<HTMLElement>("h1")?.dataset.block||"b0";place.offset=0;}}
  await layout(place);
}
function decorateTerms(root: HTMLElement) {
  injectExplorers(root);
  injectChapterQuiz(root);
  if (root.dataset.section) {
    for (const note of notes.value.filter(
      (n) => n.sectionId === root.dataset.section,
    )) {
      const resolved = reanchor(note, root);
      if (JSON.stringify(resolved) !== JSON.stringify(note)) {
        Object.assign(note, resolved);
        void putLearning("annotation:" + note.id, note).catch(() => {});
      }
    }
  }
  decorateLabLevel(root,preferences.value.labLevel);
  refreshLabLabels(root);
  decorateGlossary(root, glossary.value);
}
let studyRouting = false;
let studyNavigation: string | undefined;
let darkMedia: MediaQueryList | undefined;
function updateSystemTheme() {
  systemDark.value = !!darkMedia?.matches;
}
async function recordUnitVisit(id: string) {
  if(id.startsWith("chapter_divide_and_conquer/")) {
    await updateLearning("chapter12:progress",{version:1,visited:[] as string[],completed:{} as Record<string,string>},p=>({...p,visited:[...new Set([...p.visited,id])]})).catch(()=>{});
  }
  if (!id.startsWith("unit/monty/")) return;
  await updateLearning<any>(
    "unit:monty-hall",
    blankProgress(),
    (p) => ({
      ...upgradeProgress(p),
      visited: [...new Set([...p.visited, id])],
      updatedAt: new Date().toISOString(),
    }),
  ).catch(() => {});
}
watch(sectionId, recordUnitVisit);

async function loadNotes() {
  notes.value = (await allLearning())
    .filter((r) => r.id.startsWith("annotation:"))
    .map((r) => r.value as AnnotationRecord);
}
async function annotate(kind: AnnotationRecord["kind"]) {
  if (!selection.value) return;
  const record = { ...selection.value, kind, note: noteText.value };
  if (rebindNote.value) {
    record.id = rebindNote.value.id;
    record.note = rebindNote.value.note;
    record.kind = rebindNote.value.kind;
    record.createdAt = rebindNote.value.createdAt;
    record.updatedAt = new Date().toISOString();
    rebindNote.value = undefined;
  }
  try { await putLearning("annotation:" + record.id, {...record,updatedAt:new Date().toISOString()}); }
  catch {storageMessage.value="批注保存失败，文字仍保留，请重试或复制备份。";return;}
  storageMessage.value="";
  selection.value = undefined;
  noteText.value = "";
  getSelection()?.removeAllRanges();
  await loadNotes();
  await layout(locator());
}
async function selectText(root: HTMLElement) {
  const nativeSelection=getSelection();
  if(nativeSelection?.rangeCount)positionAnnotation(nativeSelection.getRangeAt(0).getBoundingClientRect());
  const selected = getSelection()?.anchorNode;
  const id =
    (selected?.nodeType === 3
      ? selected.parentElement
      : (selected as HTMLElement)
    )?.closest<HTMLElement>("[data-section]")?.dataset.section ||
    sectionId.value;
  const captured = captureSelection(root, id, current.value?.contentVersion);
  if (!captured) return;
  const page = await getPage(id);
  const source = document.createElement("div");
  source.innerHTML = page.html;
  const blocks = sourceBlocks(source),
    from = blocks.findIndex((b) => b.dataset.block === captured.start.blockId),
    to = blocks.findIndex((b) => b.dataset.block === captured.end.blockId);
  if (from < 0 || to < from) return;
  const first = canonicalText(blocks[from]),
    last = canonicalText(blocks[to]);
  captured.exact =
    from === to
      ? first.slice(captured.start.offset, captured.end.offset)
      : first.slice(captured.start.offset) +
        blocks
          .slice(from + 1, to)
          .map(canonicalText)
          .join("") +
        last.slice(0, captured.end.offset);
  captured.prefix = first.slice(
    Math.max(0, captured.start.offset - 32),
    captured.start.offset,
  );
  captured.suffix = last.slice(captured.end.offset, captured.end.offset + 32);
  noteText.value="";
  selection.value = captured;
  if(id.startsWith('chapter_divide_and_conquer/'))getSelection()?.removeAllRanges();
}
async function blockNote(place: ReadingLocator = locator()) {
  const page = await getPage(place.sectionId);
  if (overlayOpen.value) closeOverlay();
  const source = document.createElement("div");
  source.innerHTML = page.html;
  const block = source.querySelector<HTMLElement>(
    `[data-block="${CSS.escape(place.blockId)}"]`,
  );
  const now = new Date().toISOString();
  selection.value = {
    id: crypto.randomUUID(),
    sectionId: place.sectionId,
    kind: "note",
    start: place,
    end: place,
    exact: block?.textContent?.slice(0, 300) || current.value?.title || "",
    prefix: "",
    suffix: "",
    note: "",
    status: "located",
    blockNote: true,
    createdAt: now,
    updatedAt: now,
  };
  nextTick(() => document.querySelector<HTMLInputElement>('.selection-tools input')?.focus());
}
async function updatePreferences() {
  const place = locator();
  saveStore("preferences", preferences.value);
  await nextTick();
  if (!cover.value) await layout(place);
}
async function toggleMode() {
  const place = locator();
  preferences.value.mode = preferences.value.mode === "flip" ? "study" : "flip";
  studyPlace.value = place;
  await updatePreferences();
}
async function setMode(mode: ReaderPreferences["mode"]) {
  if (preferences.value.mode === mode) return;
  preferences.value.mode = mode;
  await updatePreferences();
}
/** 设置面板「恢复默认」：回到出厂阅读偏好 */
async function resetPreferences() {
  preferences.value = { ...defaultPreferences };
  await updatePreferences();
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    storageMessage.value = "当前浏览器不支持全屏，可使用浏览器的全屏菜单。";
  }
}
function studyPosition(place: ReadingLocator) {
  if (studyNavigation) return;
  studyPlace.value = place;
  saveStore("reading", place);
  resume.value = place;
  history.replaceState(
    history.state || {},
    "",
    `/read/${place.sectionId}#${place.blockId}@${place.offset}`,
  );
}
async function studySection(page: BookPage) {
  if (studyNavigation) return;
  studyRouting = true;
  current.value = page;
  await router.go(page.route);
  studyRouting = false;
}
async function refreshNotes() {
  const place = locator();
  await loadNotes();
  prepared.clear();
  await layout(place);
}
function storageNotice(event: Event) {
  storageMessage.value = (event as CustomEvent).detail;
}
const bookmarks = ref<SavedBookmark[]>([]);
const resume = ref<ReadingLocator>();
const saved = ref(false);
const host = ref<HTMLElement>();
const stage = ref<HTMLElement>();
const measure = ref<HTMLElement>();
const pageIndex = ref(0);
const leaves = ref<Leaf[]>([]);
const panel = ref<
  | "code"
  | "activity"
  | "image"
  | "expanded"
  | "learning"
  | "teaching"
  | "term"
  | "unit"
  | "chapter12"
  | "chapter-quiz"
  | null
>(null);
const overlayOpen = computed(() => !!(menu.value || panel.value));
const windowExpanded = ref(false);
watch(() => [sectionId.value, pageIndex.value, menu.value, panel.value], hideTermHover);
let previousBodyOverflow = "";
watch(overlayOpen, (open) => {
  if (typeof document === "undefined") return;
  windowExpanded.value = false;
  if (open) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else document.body.style.overflow = previousBodyOverflow;
});
const codeIndex = ref(0);
const imageUrl = ref("");
const imageAlt = ref("");
const expandedHtml = ref("");
const widthViewport = ref(typeof window === 'undefined' ? 1440 : window.innerWidth);
const actualReaderWidth = computed(() => Math.min(widthViewport.value-48, preferences.value.customWidth?.[preferences.value.mode] ?? (preferences.value.mode==='flip'?{narrow:860,standard:1020,wide:1140}:{narrow:680,standard:840,wide:980})[preferences.value.width]));
const pageWidth = ref(510);
const pageHeight = ref(670);
const desktop = ref(true);
const panelSource = ref<BookPage>();
const navigationFailure = ref<{
  id: string;
  place?: ReadingLocator;
  message: string;
}>();
const panelBlock = ref<ReadingLocator>();
const panelLabel = computed(
  () =>
    ({
      code: "代码实验室",
      activity: "星轨试炼",
      image: "查看图解",
      expanded: "展开阅读",
      learning: "学习实验室",
      teaching: "算法教学演示",
      term: "术语解释",
      unit: "小E · 三门学习单元",
      chapter12: "分治 · 探险工作台",
      'chapter-quiz': '章末即时测试',
    })[panel.value || "expanded"],
);
const menuLabel = computed(
  () =>
    ({
      contents: "星域目录",
      bookmarks: "我的书签",
      settings: "阅读设置",
      qa: "QA 留言板",
      controls: "翻页控制",
      notes: "学习笔记",
      more: "阅读工具",
    })[menu.value || "contents"],
);
const coverElement = ref<HTMLElement>();
let disposeDrag: (() => void) | undefined;
const searchResults = computed(() => {
  const term = query.value.trim();
  return term
    ? index.value
        .flatMap((entry) =>
          entry.blocks.flatMap((block) => {
            const match = searchText(block.text, term);
            return match
              ? [
                  {
                    ...entry,
                    blockId: block.blockId,
                    offset: match.offset,
                    end: match.end,
                    before: block.text.slice(
                      Math.max(0, match.offset - 35),
                      match.offset,
                    ),
                    hit: block.text.slice(match.offset, match.end),
                    after: block.text.slice(match.end, match.end + 90),
                  },
                ]
              : [];
          }),
        )
    : [];
});
const previewSearchStart = computed(() => {
  const visibleCount = 6;
  const lastStart = Math.max(0, searchResults.value.length - visibleCount);
  return Math.min(Math.max(0, activeSearchResultIndex.value - 2), lastStart);
});
const previewSearchResults = computed(() =>
  searchResults.value.slice(previewSearchStart.value, previewSearchStart.value + 6),
);
type ConceptSearchResult = {
  concept: string;
  related: string[];
  sectionIds: string[];
  explanation: string;
  preferredTerms?: string[];
};
const conceptRelations: (ConceptSearchResult & {
  aliases: string[];
})[] = [
  {
    aliases: ["先进先出", "先入先出", "fifo", "first in first out"],
    concept: "队列",
    related: ["先进先出", "队首", "队尾", "入队", "出队", "广度优先搜索", "层序遍历"],
    sectionIds: ["chapter_stack_and_queue/queue", "chapter_tree/binary_tree_traversal", "chapter_graph/graph_traversal"],
    explanation: "先进先出是队列的核心规则。除了队列本身，还能在树的层序遍历和图的广度优先搜索中看到它的实际用法。",
    preferredTerms: ["先入先出"],
  },
  {
    aliases: ["后进先出", "后入先出", "lifo"],
    concept: "栈",
    related: ["后进先出", "栈顶", "入栈", "出栈"],
    sectionIds: ["chapter_stack_and_queue/stack"],
    explanation: "后进先出对应栈：最后放入栈顶的数据，会最先被取出。",
  },
  {
    aliases: ["层序遍历", "按层遍历", "广度优先", "bfs"],
    concept: "广度优先搜索与层序遍历",
    related: ["广度优先搜索", "层序遍历", "队列"],
    sectionIds: ["chapter_tree/binary_tree_traversal", "chapter_graph/graph_traversal"],
    explanation: "这类遍历会先访问近处节点，再逐层向外扩展，通常借助队列保存待访问节点。",
  },
  {
    aliases: ["最近最少使用", "最久未使用", "lru"],
    concept: "缓存与 LRU",
    related: ["缓存", "最近最少使用", "链表"],
    sectionIds: ["chapter_array_and_linkedlist/ram_and_cache"],
    explanation: "LRU 会优先淘汰最长时间没有被使用的数据，常结合哈希表和链表实现。",
  },
  {
    aliases: ["分而治之", "分治"],
    concept: "分治策略",
    related: ["分治", "递归", "子问题"],
    sectionIds: ["chapter_divide_and_conquer/divide_and_conquer"],
    explanation: "分治把大问题拆成若干同类小问题，分别解决后再合并结果。",
  },
];
const matchedConcept = computed<ConceptSearchResult | undefined>(() => {
  const term = query.value.trim().replace(/\s+/g, "").toLocaleLowerCase();
  if (!term) return undefined;
  const relation = conceptRelations.find((item) =>
    item.aliases.some((alias) => term.includes(alias.replace(/\s+/g, "").toLocaleLowerCase())),
  );
  if (relation) return relation;
  const glossaryMatch = glossary.value
    .map((item) => {
      const name = item.term.toLocaleLowerCase();
      const english = item.english.toLocaleLowerCase().replace(/\s+/g, "");
      const definition = item.definition.toLocaleLowerCase().replace(/\s+/g, "");
      const score = name === term ? 6 : english === term ? 5 : name.includes(term) ? 4 : definition.includes(term) ? 3 : english.includes(term) ? 2 : 0;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item;
  if (!glossaryMatch) return undefined;
  return {
    concept: glossaryMatch.term,
    related: [glossaryMatch.term, glossaryMatch.english],
    sectionIds: [glossaryMatch.sectionId],
    explanation: glossaryMatch.definition,
  };
});
const relatedSearchResults = computed(() => {
  const relation = matchedConcept.value;
  if (!relation || !index.value.length) return [];
  return relation.sectionIds.flatMap((sectionId) => {
    const root = index.value.find((item) => item.id === sectionId);
    const prefix = sectionId.endsWith("/index") ? sectionId.slice(0, -"index".length) : "";
    const siblings = prefix
      ? index.value.filter((item) => item.id.startsWith(prefix) && item.id !== sectionId)
      : [];
    const targets = siblings.length
      ? siblings.map((entry) => {
          const titleScore = relation.related.some((word) => entry.title.toLocaleLowerCase().includes(word.toLocaleLowerCase())) ? 8 : 0;
          const bodyScore = relation.related.reduce((total, word) => total + (entry.text.includes(word) ? 1 : 0), 0);
          return { entry, score: titleScore + bodyScore };
        }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map((item) => item.entry)
      : [];
    const entries = targets.length ? targets : root ? [root] : [];
    return entries.flatMap((entry) => {
      const candidates = entry.blocks
        .map((block) => ({
          block,
          score: relation.related.reduce(
            (score, word) => score + (block.text.includes(word) ? 1 : 0),
            0,
          ),
        }))
        .sort((a, b) => b.score - a.score);
      const preferred = relation.preferredTerms?.find((word) =>
        entry.blocks.some((item) => item.text.includes(word)),
      );
      const block = (preferred
        ? entry.blocks.find((item) => item.text.includes(preferred))
        : undefined) || candidates[0]?.block || entry.blocks[0];
      if (!block) return [];
      const matchedTerm = preferred || relation.related.find((word) => block.text.includes(word));
      const match = matchedTerm ? searchText(block.text, matchedTerm) : null;
      const offset = match?.offset || 0;
      const end = match?.end || 0;
      return [{
        ...entry,
        blockId: block.blockId,
        offset,
        end,
        before: match ? block.text.slice(Math.max(0, offset - 35), offset) : "",
        hit: match ? block.text.slice(offset, end) : "",
        after: match ? block.text.slice(end, end + 90) : block.text.slice(0, 125),
        relation: relation.concept,
      }];
    });
  });
});
const aiSearchResults = computed(() => {
  const relationResults = relatedSearchResults.value;
  const relatedIds = new Set(relationResults.map((item) => item.id));
  const semanticResults = semanticSectionHits.value.flatMap(({ sectionId }) => {
    if (relatedIds.has(sectionId)) return [];
    const entry = index.value.find((item) => item.id === sectionId);
    if (!entry) return [];
    const block = [...entry.blocks]
      .filter((item) => item.text.trim().length > 35)
      .sort((a, b) => b.text.length - a.text.length)[0] || entry.blocks[0];
    if (!block) return [];
    const exactMatch = searchText(block.text, query.value.trim());
    const offset = exactMatch?.offset || 0;
    const end = exactMatch?.end || 0;
    return [{
      ...entry,
      blockId: block.blockId,
      offset,
      end,
      before: exactMatch ? block.text.slice(Math.max(0, offset - 35), offset) : "",
      hit: exactMatch ? block.text.slice(offset, end) : "",
      after: exactMatch ? block.text.slice(end, end + 90) : block.text.slice(0, 125),
      relation: "语义匹配",
    }];
  });
  return [...relationResults, ...semanticResults].slice(0, 20);
});
const activeSearchResults = computed(() =>
  searchMode.value === "exact" ? searchResults.value : aiSearchResults.value,
);
const activeSearchResultIndex = ref(0);
async function ensureSearchIndex() {
  if (index.value.length) return;
  searchIndexRequest ??= fetch("/book/search.json").then(async (response) => {
    if (!response.ok) throw Error("全书搜索索引加载失败");
    const entries = await response.json();
    if (!Array.isArray(entries)) throw Error("全书搜索索引格式不正确");
    index.value = entries;
    return entries as SearchEntry[];
  });
  try {
    searchIndexError.value = "";
    await searchIndexRequest;
  } catch (error) {
    searchIndexError.value = String(error);
    throw error;
  } finally {
    searchIndexRequest = undefined;
  }
}
watch(query, (rawTerm) => {
  const term = rawTerm.trim();
  activeSearchResultIndex.value = 0;
  searchOpen.value = !!term && !menu.value;
  if (term) void ensureSearchIndex().catch(() => {});
  if (searchMode.value === "ai") queueSemanticSearch();
});
function queueSemanticSearch() {
  if (semanticSearchTimer) clearTimeout(semanticSearchTimer);
  const term = query.value.trim();
  const generation = ++semanticSearchGeneration;
  semanticSectionHits.value = [];
  aiSearchError.value = "";
  if (!term || searchMode.value !== "ai") {
    aiSearching.value = false;
    aiSearchProgress.value = "";
    return;
  }
  aiSearching.value = true;
  aiSearchProgress.value = "准备本地语义搜索…";
  semanticSearchTimer = setTimeout(async () => {
    try {
      await ensureSearchIndex();
      semanticSearchModule ??= await import("./smart-search");
      semanticDatabase ??= await semanticSearchModule.prepareSemanticIndex(
        index.value,
        (message) => {
          if (generation === semanticSearchGeneration) aiSearchProgress.value = message;
        },
      );
      if (generation !== semanticSearchGeneration) return;
      aiSearchProgress.value = "正在理解你的问题…";
      const hits = await semanticSearchModule.searchSemanticIndex(semanticDatabase, term);
      if (generation === semanticSearchGeneration) semanticSectionHits.value = hits;
    } catch (error) {
      if (generation === semanticSearchGeneration) {
        aiSearchError.value = "本地语义搜索暂时不可用，请检查网络后重试。";
        console.error("Local semantic search failed", error);
      }
    } finally {
      if (generation === semanticSearchGeneration) {
        aiSearching.value = false;
        aiSearchProgress.value = "";
      }
    }
  }, 320);
}
function selectSearchMode(mode: "exact" | "ai") {
  searchMode.value = mode;
  activeSearchResultIndex.value = 0;
  searchOpen.value = true;
  if (mode === "ai") queueSemanticSearch();
  else {
    semanticSearchGeneration++;
    aiSearching.value = false;
  }
}
function stepSearchResult(direction: -1 | 1) {
  const results = activeSearchResults.value;
  if (!results.length) return;
  activeSearchResultIndex.value =
    (activeSearchResultIndex.value + direction + results.length) % results.length;
  void goSearch(results[activeSearchResultIndex.value]);
}
function openSearchResult(entry: (typeof activeSearchResults.value)[number], index: number) {
  activeSearchResultIndex.value = index;
  void goSearch(entry);
}
function submitSmartSearch() {
  const entry = activeSearchResults.value[0];
  if (entry) void goSearch(entry);
}
function dismissSearch(event: PointerEvent) {
  if (!(event.target as HTMLElement).closest(".smart-search-anchor"))
    searchOpen.value = false;
}
const groups = computed(() => {
  const map = new Map<string, typeof sections.value>();
  for (const item of sections.value) {
    if (item.kind === "cover" || item.kind === "back-cover") continue;
    const label = item.group || "卷首";
    map.set(label, [...(map.get(label) || []), item]);
  }
  return [...map];
});
const progress = computed(() =>
  sections.value.length
    ? Math.round(
        (Math.max(0, sectionIndex.value) / (sections.value.length - 1)) * 100,
      )
    : 0,
);
let flip: PageFlip | undefined;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let animationTimer: ReturnType<typeof setInterval> | undefined;
let serial = 0;
let rendering = false;
let pendingLocator: ReadingLocator | undefined;
let currentLoadTask: Promise<void> | undefined;
let lastFocus: HTMLElement | null = null;
let mounted = false;
const cache = new Map<string, Promise<BookPage>>();
const leafSections = ref<string[]>([]),
  windowPages = new Map<string, BookPage>(),
  prepared = new Map<string, Leaf[]>();
let finishingFlip = false;
function preparedKey(id: string) {
  return JSON.stringify([
    id,
    pageWidth.value,
    pageHeight.value,
    desktop.value,
    preferences.value.fontSize,
    preferences.value.lineHeight,
    preferences.value.font,
    preferences.value.labLevel,
    notes.value.map((n) => n.updatedAt),
  ]);
}
function contentsLeaf(): Leaf[] {
  return [
    {
      html: '<div class="contents-leaf"><h1>星域目录</h1><p>每一颗行星，都是一段新的旅程。</p><img src="/upstream/assets/hero/astronaut.png" alt="正在探索的宇航员"/><button data-action="star-map">打开星域目录</button></div>',
      blockId: "b0",
      offset: 0,
    },
  ];
}
async function prepareAdjacent(page: BookPage) {
  const key = preparedKey(page.id);
  if (prepared.has(key)) return prepared.get(key)!;
  if (page.kind === "contents") return contentsLeaf();
  const area = document.createElement("div");
  area.className = "measurement-area";
  const source = document.createElement("div"),
    test = document.createElement("div");
  source.className = "leaf-content source-neighbor";
  source.dataset.section = page.id;
  test.className = "leaf-content page-measure";
  test.dataset.section = page.id;
  source.innerHTML = page.html;
  area.append(source, test);
  document.querySelector(".reader")!.append(area);
  try {
    decorateTerms(source);
    decorateAnnotations(
      source,
      notes.value.filter((n) => n.sectionId === page.id),
    );
    retainMathText(source);
    source.querySelectorAll("details").forEach((d) => (d.open = true));
    renderMathInElement(source, {
      throwOnError: false,
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
    decorateFormulaCopies(source);
    await Promise.all(
      [...source.querySelectorAll("img")].map((image) => {
        image.loading = "eager";
        return image.decode().catch(() => {});
      }),
    );
    source
      .querySelectorAll<HTMLImageElement>(".step-player img")
      .forEach(
        (img) => (img.style.height = img.getBoundingClientRect().height + "px"),
      );
    const pages = paginate(
      source,
      test,
      pageHeight.value - (desktop.value ? 112 : 92),
    );
    prepared.set(key, pages);
    while (prepared.size > 9) prepared.delete(prepared.keys().next().value!);
    return pages;
  } finally {
    area.remove();
  }
}
function updateLeafAccessibility() {
  const start = pageIndex.value;
  host.value?.querySelectorAll<HTMLElement>(".book-leaf").forEach((leaf, i) => {
    const visible = i >= start && i < start + (desktop.value ? 2 : 1);
    leaf.inert = !visible;
    leaf.setAttribute("aria-hidden", String(!visible));
  });
}
function activeLeafIndex() {
  const left = Math.max(0, Math.min(pageIndex.value, leaves.value.length - 1));
  const right = left + 1;
  // At a chapter boundary, the next chapter starts on the right-hand leaf.
  // Treat it as the active reading location so the route and progress follow
  // the page the reader has just turned to, without inserting a blank verso.
  return desktop.value && right < leaves.value.length &&
    leafSections.value[left] !== leafSections.value[right]
    ? right
    : left;
}
async function finishFlip() {
  if (rendering || finishingFlip || !flip || flip.getState() !== "read") return;
  updateLeafAccessibility();
  const activeIndex = activeLeafIndex();
  const id = leafSections.value[activeIndex];
  if (!id || id === current.value?.id) {
    remember();
    return;
  }
  const page = windowPages.get(id);
  if (!page) return;
  finishingFlip = true;
  const place = {
    sectionId: id,
    blockId: leaves.value[activeIndex].blockId,
    offset: leaves.value[activeIndex].offset,
  };
  current.value = page;
  studyRouting = true;
  await router.go(page.route + `#${place.blockId}@${place.offset}`);
  studyRouting = false;
  finishingFlip = false;
  await layout(place);
}
function getPage(id: string) {
  if (!cache.has(id))
    cache.set(
      id,
      fetch(`/book/pages/${id}.json`)
        .then((r) => {
          if (!r.ok) throw Error("这一节暂时无法加载。");
          return r.json();
        })
        .catch((e) => {
          cache.delete(id);
          throw e;
        }),
    );
  while (cache.size > 9) cache.delete(cache.keys().next().value!);
  return cache.get(id)!;
}
function locator(): ReadingLocator {
  if (preferences.value.mode === "study" && studyPlace.value)
    return {...studyPlace.value,bookId:"plex-programming"};
  const index = activeLeafIndex();
  const leaf = leaves.value[index];
  return {
    bookId: "plex-programming",
    sectionId: leafSections.value[index] || sectionId.value,
    blockId: leaf?.blockId || "b0",
    offset: leaf?.offset || 0,
    contentVersion: current.value?.contentVersion,
  };
}
function alignLabLocator(place?:ReadingLocator) {
  if(!place || !current.value?.id.startsWith('unit/lab/') || current.value.id!==place.sectionId)return false;
  const source=document.createElement('div');source.innerHTML=current.value.html;
  const block=[...source.querySelectorAll<HTMLElement>('[data-block]')].find(el=>el.dataset.block===place.blockId);
  const level=block?.closest<HTMLElement>('[data-level]')?.dataset.level;
  if(!level || !isLabLevel(level) || level===preferences.value.labLevel)return false;
  preferences.value.labLevel=level;saveStore('preferences',preferences.value);prepared.clear();labRevision.value++;return true;
}
function resolvePlace(place?: ReadingLocator) {
  if (place && current.value?.blockAliases?.[place.blockId])
    return { ...place, blockId: current.value.blockAliases[place.blockId] };
  return place;
}
function parseHash(): ReadingLocator | undefined {
  if (!location.hash) return;
  const [block, offset] = decodeURIComponent(location.hash.slice(1)).split("@");
  return {
    sectionId: sectionId.value,
    blockId: block,
    offset: Number(offset || 0),
  };
}
function remember() {
  if (rendering || !current.value) return;
  const place = locator();
  saveStore("reading", place);
  if (!cover.value) {
    resume.value = place;
    history.replaceState(
      history.state || {},
      "",
      `${location.pathname}#${place.blockId}@${place.offset}`,
    );
  }
}
async function navigate(id: string, place?: ReadingLocator) {
  menu.value = null;
  if(panel.value!=="unit")panel.value = null;
  pendingLocator = place;
  stopAnimation();
  const route =
    id === "cover" ? "/read/cover" : sections.value.find((p) => p.id === id)?.route;
  if (!route) return;
  if (id === sectionId.value) {
    if (place) {
      place = resolvePlace(place)!;
      if(alignLabLocator(place)){await nextTick();await layout(place);return;}
      if (preferences.value.mode === "study") await study.value?.go(place);
      else
        flip?.turnToPage(locateLeaf(leaves.value, place.blockId, place.offset));
    }
    return;
  }
  if (preferences.value.mode === "study") studyNavigation = id;
  try {
    await getPage(id);
    navigationFailure.value = undefined;
  } catch (error) {
    if (studyNavigation === id) studyNavigation = undefined;
    pendingLocator = undefined;
    navigationFailure.value = { id, place, message: String(error) };
    return;
  }
  await router.go(route + (place ? `#${place.blockId}@${place.offset}` : ""));
}
async function turnStudy(direction:number){
 const moved=await study.value?.turnScreen(direction);
 if(!moved&&direction<0&&sectionIndex.value===1&&sections.value[0]?.kind==='cover'){
  await navigate(sections.value[0].id);return true;
 }
 return !!moved;
}
function previous() {
  if (preferences.value.mode === "study" && !cover.value && study.value) {
    void turnStudy(-1); return;
  }
  stopAnimation();
  if (pageIndex.value > 0) {
    flip?.flipPrev();
    return;
  }
  const entry = sections.value[sectionIndex.value - 1];
  if (entry)
    navigate(entry.id, { sectionId: entry.id, blockId: "__last", offset: 0 });
}
function next() {
  if (preferences.value.mode === "study" && !cover.value && study.value) {
    void turnStudy(1); return;
  }
  stopAnimation();
  const step = desktop.value ? 2 : 1;
  if (!cover.value && pageIndex.value + step < leaves.value.length) {
    flip?.flipNext();
    return;
  }
  const entry = sections.value[sectionIndex.value + 1];
  if (entry) navigate(entry.id);
}
function addBookmark() {
  const place = locator();
  const existing = bookmarks.value.findIndex(
    (b) =>
      b.sectionId === place.sectionId &&
      b.blockId === place.blockId &&
      b.offset === place.offset,
  );
  if (existing < 0)
    bookmarks.value.push({...organizeBookmarks([{...place,title:current.value?.title||"书签"}])[0],id:crypto.randomUUID(),createdAt:new Date().toISOString()});
  saveStore("bookmarks", bookmarks.value);
  saved.value = true;
  setTimeout(() => (saved.value = false), 1500);
}
async function openMenu(type: typeof menu.value) {
  if (type === "contents") {
    try {
      await flushLearning();
    } catch (e) {
      storageMessage.value = String(e);
    }
    panel.value = null;
    menu.value = null;
    await router.go("/library/plex-programming/contents");
    return;
  }
  try {
    await flushLearning();
  } catch (e) {
    storageMessage.value = String(e);
  }
  panel.value = null;
  rememberFocus();
  menu.value = type;
  await nextTick();
  (document.querySelector<HTMLInputElement>(".search-input") || document.querySelector<HTMLButtonElement>(".dialog-close"))?.focus();
}
async function focusSmartSearch() {
  menu.value = null;
  panel.value = null;
  searchOpen.value = !!query.value.trim();
  await nextTick();
  document.querySelector<HTMLInputElement>(".cir-search__field")?.focus({preventScroll:true});
}
async function goSearch(entry: (typeof searchResults.value)[number]) {
  searchOpen.value = false;
  await navigate(entry.id, {
    sectionId: entry.id,
    blockId: entry.blockId,
    offset: entry.offset,
  });
  await nextTick();
  await currentLoadTask;
  if (sectionId.value !== entry.id || error.value) return;
  document
    .querySelectorAll<HTMLElement>(
      ".book-host [data-block],.study-reader [data-block]",
    )
    .forEach((block) => {
      if (block.dataset.block === entry.blockId)
        markRange(block, entry.offset, entry.end, "search", "search");
    });
}
async function openLesson(id:string){
  await flushLearning();
  const page=unitDefinition.value?.pages.find(p=>p.id===id);
  panel.value=null;
  await nextTick();
  await navigate(id);
  openUnit(page?.mode||'profile',id);
}
async function openUnit(mode?:string, id = sectionId.value) {
  searchOpen.value = false;
  if(mode==='blackboard'){await openBoard(id);return;}
  await flushLearning();
  if(!mode&&!unitDefinition.value){try{unitDefinition.value=await fetch('/learning/monty-unit.json').then(r=>r.json());}catch{}}
  mode=mode||unitDefinition.value?.pages.find(p=>p.id===id)?.mode||'profile';
  menu.value = null;
  unitMode.value = mode;
  unitSection.value = id;
  panelSource.value = current.value;
  openPanel("unit");
}
function closeOverlay() {
  menu.value = null;
  panel.value = null;
  nextTick(() => {
    if (lastFocus?.isConnected && !lastFocus.closest('[inert]')) lastFocus.focus({preventScroll:true});
    else document.getElementById('reading-content')?.focus({preventScroll:true});
  });
}
function rememberFocus() {
  const active = document.activeElement as HTMLElement | null;
  if (active && !active.closest('[role="dialog"]')) lastFocus = active;
}
function openPanel(type: typeof panel.value) {
  rememberFocus();
  stopAnimation();
  panelSource.value ??= current.value;
  panel.value = type;
  nextTick(() =>
    document.querySelector<HTMLButtonElement>(".dialog-close")?.focus(),
  );
}
function stopAnimation() {
  clearInterval(animationTimer);
  animationTimer = undefined;
  host.value
    ?.querySelectorAll('[data-action="step-play"]')
    .forEach((b) => (b.textContent = "播放"));
  study.value?.root
    ?.querySelectorAll('[data-action="step-play"]')
    .forEach((b) => (b.textContent = "播放"));
}
async function stepFigure(figure: HTMLElement, delta: number) {
  const n = Number(figure.dataset.animation);
  const page = await getPage(
    figure.closest<HTMLElement>("[data-section]")?.dataset.section ||
      sectionId.value,
  );
  const frames = page.animations[n];
  if (!figure.isConnected) return;
  if (!frames?.length) return;
  const next =
    (((Number(figure.dataset.frame || 0) + delta) % frames.length) +
      frames.length) %
    frames.length;
  figure.dataset.frame = String(next);
  const img = figure.querySelector("img")!;
  img.src = frames[next].src;
  img.alt = frames[next].alt;
  const caption = figure.querySelector<HTMLElement>("[data-frame-caption]");
  if (caption) caption.textContent = frames[next].caption || frames[next].alt;
  figure.querySelector("[data-step-label]")!.textContent =
    `${next + 1} / ${frames.length}`;
}
async function clickBook(event: MouseEvent) {
  if(await handleFormulaCopy(event))return;
  const target = event.target as HTMLElement;
  const contentBlock = target.closest<HTMLElement>("[data-block]");
  if (contentBlock)
    panelBlock.value = {
      sectionId:
        target.closest<HTMLElement>("[data-section]")?.dataset.section ||
        sectionId.value,
      blockId: contentBlock.dataset.block!,
      offset: 0,
    };
  const noteMark=target.closest<HTMLElement>('[data-annotation]');
  if(noteMark && (panelBlock.value?.sectionId||sectionId.value).startsWith('chapter_divide_and_conquer/')) {
    const existing=notes.value.find(n=>n.id===noteMark.dataset.annotation);
    if(existing){event.preventDefault();positionAnnotation(noteMark.getBoundingClientRect());selection.value={...existing};noteText.value=existing.note;return;}
  }
  const action = target.closest<HTMLElement>("[data-action]");
  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (action?.dataset.action === "code") {
    const id =
      target.closest<HTMLElement>("[data-section]")?.dataset.section ||
      sectionId.value;
    panelSource.value = await getPage(id);
  }
  if (!action && target.closest(".katex")) {
    expandedHtml.value =
      target.closest(".arithmatex")?.outerHTML ||
      target.closest(".katex")!.outerHTML;
    openPanel("expanded");
    return;
  }
  if (action) {
    event.preventDefault();
    event.stopPropagation();
    const value = action.dataset.action;
    if (value === 'chapter-quiz') {
      const chapter = chapterLearning.find(c => c.id === action.dataset.chapter);
      if (chapter) { quizChapter.value = chapter.id; openPanel('chapter-quiz'); }
      return;
    }
    if(value==="lab-level"){await changeLabLevel(action.dataset.labLevel||"");return;}
    if(value==="explorer"&&action.dataset.target){await navigate(action.dataset.target);return;}
    if(value === "teaching-scene"){teachingScene.value=action.dataset.scene as SceneId;openPanel("teaching");return;}
    if (value === "chapter12") {
      await chapterActivity(panelBlock.value?.sectionId || sectionId.value,action.dataset.mode || "route");
      return;
    }
    if (value === "term") {
      term.value = glossary.value.find((e) => e.term === action.dataset.term);
      openPanel("term");
    }
    if (value === "code") {
      codeIndex.value = Number(action.dataset.code);
      openPanel("code");
    }
    if (value === "activity") openPanel("activity");
    if(value==="next-lesson" && action.dataset.next)void openLesson(action.dataset.next);
    if (value === "unit" || value === "blackboard")
      openUnit(
        value === "blackboard"
          ? "blackboard"
          : action.dataset.unitMode || "profile",
        panelBlock.value?.sectionId || sectionId.value,
      );
    if (value === "image") {
      imageUrl.value = action.dataset.src || (action as HTMLImageElement).src;
      imageAlt.value = action.dataset.alt || (action as HTMLImageElement).alt;
      openPanel("image");
    }
    if (value === "expand") {
      const original = stage.value?.querySelector(
        `[data-block="${action.dataset.block}"]`,
      );
      expandedHtml.value = original?.outerHTML || "";
      openPanel("expanded");
    }
    if (value?.startsWith("step-")) {
      const figure = action.closest<HTMLElement>(".step-player")!;
      if (value === "step-next") stepFigure(figure, 1);
      if (value === "step-prev") stepFigure(figure, -1);
      if (value === "step-play") {
        if (animationTimer) {
          stopAnimation();
        } else {
          action.textContent = "暂停";
          animationTimer = setInterval(() => stepFigure(figure, 1), 1000);
        }
      }
    }
    return;
  }
  if (anchor && anchor.getAttribute("href")?.startsWith("/read/")) {
    event.preventDefault();
    const url = new URL(anchor.href);
    const id = url.pathname.replace("/read/", "").replace(/\.html$/, "");
    navigate(
      id,
      url.hash
        ? {
            sectionId: id,
            blockId: decodeURIComponent(url.hash.slice(1)),
            offset: 0,
          }
        : undefined,
    );
  } else if (anchor?.getAttribute("href")?.startsWith("#")) {
    event.preventDefault();
    const id = decodeURIComponent(anchor.hash.slice(1));
    if (preferences.value.mode === "study")
      void study.value?.go({
        sectionId:
          anchor.closest<HTMLElement>("[data-section]")?.dataset.section ||
          sectionId.value,
        blockId: id,
        offset: 0,
      });
    else flip?.turnToPage(locateLeaf(leaves.value, id));
  }
}
async function layout(place?: ReadingLocator) {
  if (!current.value || !measure.value || !stage.value) return;
  place = resolvePlace(place);
  if(alignLabLocator(place))await nextTick();
  if (preferences.value.mode === "study") {
    disposeDrag?.();
    flip?.destroy();
    flip = undefined;
    loading.value = false;
    rendering = false;
    stage.value.innerHTML = current.value.html;
  stage.value.dataset.section=current.value.id;
    await nextTick();
    if (place) await study.value?.go(place);
    return;
  }
  if (!host.value) return;
  const own = ++serial;
  rendering = true;
  loading.value = true;
  stopAnimation();
  const available = Math.max(280, window.innerWidth - 48);
  const wanted = preferences.value.customWidth?.flip ?? ({narrow:860,standard:1020,wide:1140}[preferences.value.width]);
  const total = Math.min(available, wanted);
  desktop.value = window.innerWidth >= 1024 && total >= 800;
  pageHeight.value = Math.max(300, Math.min(window.innerHeight - 240, 850));
  pageWidth.value = desktop.value ? Math.floor(total/2) : total;
  await nextTick();
  stage.value.innerHTML = current.value.html;
  stage.value.dataset.section=current.value.id;
  const pageNotes = notes.value.filter(
    (n) => n.sectionId === current.value!.id,
  );
  for (const note of pageNotes) {
    const resolved = reanchor(note, stage.value);
    if (JSON.stringify(resolved) !== JSON.stringify(note)) {
      Object.assign(note, resolved);
      void putLearning("annotation:" + note.id, note).catch(() => {});
    }
  }
  decorateAnnotations(stage.value, pageNotes);
  decorateTerms(stage.value);
  retainMathText(stage.value);
  stage.value.querySelectorAll("details").forEach((el) => (el.open = true));
  renderMathInElement(stage.value, {
    throwOnError: false,
    delimiters: [
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true },
    ],
  });
  decorateFormulaCopies(stage.value);
  stage.value
    .querySelectorAll<HTMLImageElement>("img")
    .forEach((img) => (img.loading = "eager"));
  await Promise.all([
    document.fonts.ready,
    ...Array.from(stage.value.querySelectorAll<HTMLImageElement>("img")).map(
      (img) => img.decode().catch(() => undefined),
    ),
  ]);
  if (own !== serial) return;
  stage.value
    .querySelectorAll<HTMLImageElement>(".step-player img")
    .forEach(
      (img) => (img.style.height = img.getBoundingClientRect().height + "px"),
    );
  const primary = current.value;
  measure.value.dataset.section = primary.id;
  const primaryLeaves =
      primary.kind === "contents"
        ? contentsLeaf()
        : paginate(
            stage.value,
            measure.value,
            pageHeight.value - (desktop.value ? 112 : 92),
          );
  prepared.set(preparedKey(primary.id), primaryLeaves);
  const locationIndex = sections.value.findIndex((s) => s.id === primary.id),
    entries = sections.value
      .slice(Math.max(0, locationIndex - 1), locationIndex + 2)
      .filter((s) => s.kind !== "cover");
  const readyPages = await Promise.all(
    entries.map(async (entry) => {
      try {
        const page =
          entry.id === primary.id ? primary : await getPage(entry.id);
        return {
          page,
          pages:
            entry.id === primary.id
              ? primaryLeaves
              : await prepareAdjacent(page),
        };
      } catch {
        return undefined;
      }
    }),
  );
  if (own !== serial) return;
  leaves.value = [];
  leafSections.value = [];
  windowPages.clear();
  let sectionStart = 0,
    sectionEnd = 0;
  for (const item of readyPages) {
    if (!item) continue;
    windowPages.set(item.page.id, item.page);
    if (item.page.id === primary.id) sectionStart = leaves.value.length;
    for (const leaf of item.pages) {
      leaves.value.push(leaf);
      leafSections.value.push(item.page.id);
    }
    if (item.page.id === primary.id) sectionEnd = leaves.value.length - 1;
  }
  // PageFlip owns these nodes; stateful panels stay outside the three-section window.
  disposeDrag?.();
  disposeDrag = undefined;
  if (flip) {
    flip.destroy();
    flip = undefined;
  }
  const node = document.createElement("div");
  host.value.replaceChildren(node);
  const elements = leaves.value.map((leaf, i) => {
    const page = windowPages.get(leafSections.value[i])!;
    const el = document.createElement("div");
    el.className = "book-leaf";
    el.dataset.section = page.id;
    const head = document.createElement("div");
    head.className = "leaf-header";
    head.textContent = page.group + " / " + page.title;
    const content = document.createElement("div");
    content.className = "leaf-content";
    content.dataset.section = page.id;
    content.innerHTML = leaf.html;
    const foot = document.createElement("div");
    foot.className = "leaf-footer";
    foot.textContent = `${i + 1} / ${leaves.value.length}　·　PLEX 星轨编程`;
    el.append(head, content, foot);
    node.append(el);
    return el;
  });
  const { PageFlip } = await import("page-flip");
  if (own !== serial) return;
  const target =
    place?.blockId === "__last"
      ? sectionEnd
      : place
        ? sectionStart + locateLeaf(primaryLeaves, place.blockId, place.offset)
        : sectionStart;
  flip = new PageFlip(node, {
    width: pageWidth.value,
    height: pageHeight.value,
    size: "fixed",
    usePortrait: !desktop.value,
    autoSize: true,
    showCover: false,
    startPage: target,
    drawShadow: true,
    maxShadowOpacity: 0.22,
    flippingTime: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 480,
    useMouseEvents: false,
    mobileScrollSupport: false,
    disableFlipByClick: true,
  });
  flip.on("flip", (event) => {
    pageIndex.value = Math.min(Number(event.data), leaves.value.length - 1);
    setTimeout(() => void finishFlip(), 0);
  });
  flip.on("changeState", (event) => {
    if (event.data === "read") void finishFlip();
  });
  flip.loadFromHTML(elements);
  pageIndex.value = Math.min(
    flip.getCurrentPageIndex(),
    leaves.value.length - 1,
  );
  disposeDrag = bindPageDrag(host.value, {
    flip,
    canTurn: (direction) =>
      !loading.value &&
      !menu.value &&
      !panel.value &&
      (direction === "previous"
        ? pageIndex.value > 0 || sectionIndex.value > 0
        : pageIndex.value + (desktop.value ? 2 : 1) < leaves.value.length ||
          sectionIndex.value < sections.value.length - 1),
    atBoundary: (direction) =>
      direction === "previous"
        ? pageIndex.value === 0
        : pageIndex.value + (desktop.value ? 2 : 1) >= leaves.value.length,
    turn: (direction) => (direction === "previous" ? previous() : next()),
    onStart: stopAnimation,
  });
  rendering = false;
  loading.value = false;
  updateLeafAccessibility();
  remember();
}
async function loadCurrent() {
  if (!mounted) return;
  const id = sectionId.value;
  if (preferences.value.mode === "study") studyNavigation = id;
  error.value = "";
  loading.value = true;
  disposeDrag?.();
  disposeDrag = undefined;
  try {
    const data = await getPage(id);
    if (id !== sectionId.value) return;
    current.value = data;
    await nextTick();
    const place = resolvePlace(pendingLocator || parseHash());
    pendingLocator = undefined;
    studyPlace.value = place || {
      sectionId: id,
      blockId: data.blockAliases?.b0 || "b0",
      offset: 0,
    };
    if (cover.value) {
      ++serial;
      flip?.destroy();
      flip = undefined;
      leaves.value = [];
      pageIndex.value = 0;
      loading.value = false;
      rendering = false;
      if (coverElement.value)
        disposeDrag = bindPageDrag(coverElement.value, {
          cover: true,
          canTurn: () => !menu.value,
          atBoundary: () => true,
          turn: next,
          onStart: stopAnimation,
        });
    } else await layout(preferences.value.mode === "study" ? studyPlace.value : place);
    for (const adjacent of [
      sections.value[sectionIndex.value - 1],
      sections.value[sectionIndex.value + 1],
    ])
      if (adjacent) getPage(adjacent.id).catch(() => {});
  } catch (e) {
    error.value = String(e);
    loading.value = false;
  } finally {
    if (studyNavigation === id) studyNavigation = undefined;
  }
}
function resize() {
  widthViewport.value=window.innerWidth;
  desktop.value = window.innerWidth >= 1024 && actualReaderWidth.value >= 800;
  if (cover.value) return;
  const place = locator();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => layout(place), 200);
}
function keydown(event: KeyboardEvent) {
  if(frameActive.value)return;
  const editing=(event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true],.cm-editor');
  if((event.ctrlKey||event.metaKey)&&event.altKey&&event.key.toLowerCase()==='m'&&!editing){
    const native=getSelection();const node=native?.anchorNode;
    const root=(node?.nodeType===3?node.parentElement:node as HTMLElement)?.closest<HTMLElement>('[data-section]');
    if(root?.dataset.section?.startsWith('chapter_divide_and_conquer/')&&!native?.isCollapsed){event.preventDefault();void selectText(root);return;}
  }
  if(event.key==='Escape'&&selection.value?.sectionId.startsWith('chapter_divide_and_conquer/')){selection.value=undefined;event.preventDefault();return;}
  if(selection.value?.sectionId.startsWith('chapter_divide_and_conquer/'))return;
  if (
    (event.key === "Enter" || event.key === " ") &&
    (event.target as HTMLElement).matches(".glossary-term")
  ) {
    event.preventDefault();
    (event.target as HTMLElement).click();
    return;
  }
  if (event.key === "Escape") {
    searchOpen.value = false;
    closeOverlay();
    return;
  }
  if (panel.value && !menu.value) return;
  if (menu.value) {
    if (event.key === "Tab") {
      const box = document.querySelector<HTMLElement>('[role="dialog"]');
      const focusable = [
        ...(box?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,textarea,select,a[href],iframe,[tabindex="0"],[contenteditable=true]',
        ) || []),
      ].filter((e) => e.offsetParent !== null);
      const first = focusable[0],
        last = focusable.at(-1);
      if (!box?.contains(document.activeElement)) {
        event.preventDefault();first?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    return;
  }
  if (
    (event.target as HTMLElement).closest(
      "input,textarea,select,[contenteditable=true]",
    ) ||
    preferences.value.mode === "study"
  )
    return;

}
async function hashchange() {
  const place = resolvePlace(parseHash());
  if (place) {
    if(alignLabLocator(place)){await nextTick();await layout(place);return;}
    if (preferences.value.mode === "study") void study.value?.go(place);
    else
      flip?.turnToPage(locateLeaf(leaves.value, place.blockId, place.offset));
  }
}
watch(sectionId, () => {
  if (!studyRouting) {
    if(panel.value!=="unit")panel.value = null;
    currentLoadTask = loadCurrent();
  }
});
watch([sectionId,()=>current.value?.title,menu],()=>{petHost.sectionId=sectionId.value;petHost.sectionTitle=current.value?.title||'星轨编程';petHost.suspended=!!menu.value;},{immediate:true});
onMounted(async () => {
  window.addEventListener('plex-pet-login',petLogin);
  mounted = true;
  document.addEventListener("pointerdown", dismissSearch);
  void fetch("/learning/monty-unit.json").then(r=>r.json()).then(d=>unitDefinition.value=d).catch(()=>{});
  desktop.value = window.innerWidth >= 1024 && actualReaderWidth.value >= 800;
  ready.value = true;
  window.addEventListener("plex-storage-error", storageNotice);
  darkMedia = matchMedia("(prefers-color-scheme: dark)");
  updateSystemTheme();
  darkMedia.addEventListener("change", updateSystemTheme);
  try {
    await migrateLegacy();
    await migrateLessonData();
    await recordUnitVisit(sectionId.value);
    await loadNotes();
    preferences.value = sanitizePreferences(
      await getLearning(
        "preferences",
        readStore("preferences", defaultPreferences),
      ),
    );
    bookmarks.value = await getLearning(
      "bookmarks",
      readStore("bookmarks", []),
    );
    resume.value = await getLearning<ReadingLocator | undefined>(
      "reading",
      readStore("reading", undefined),
    );
  } catch (e) {
    storageMessage.value = String(e);
  }
  try {
    manifest.value = await fetch("/book/manifest.json").then((r) => r.json());
    const labKeys=(await Promise.all((manifest.value?.pages||[]).filter(p=>p.id.startsWith("unit/lab/")).map(p=>getPage(p.id)))).flatMap(p=>p.codeExamples.flatMap(e=>e.labKey?[e.labKey]:[]));
    try {labResults.value=await readLabResults(labKeys);} catch(e) {storageMessage.value=String(e);}
    glossary.value = await fetch("/learning/glossary.json").then((r) =>
      r.json(),
    );
    if (
      location.pathname === "/" &&
      resume.value?.sectionId &&
      resume.value.sectionId !== "cover"
    )
      await navigate(resume.value.sectionId, resume.value);
    else await loadCurrent();
    if(petHost.pendingLogin){petHost.pendingLogin=false;petLogin();}
  } catch (e) {
    error.value = String(e);
    loading.value = false;
  }
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", keydown);
  window.addEventListener("hashchange", hashchange);
  document.addEventListener("mouseover", onBookMouseOver);
  document.addEventListener("mouseout", onBookMouseOut);
});
onBeforeUnmount(() => {
  window.removeEventListener('plex-pet-login',petLogin);
  petHost.suspended=false;
  if (overlayOpen.value) document.body.style.overflow = previousBodyOverflow;
  ++serial;
  if (semanticSearchTimer) clearTimeout(semanticSearchTimer);
  document.removeEventListener("pointerdown", dismissSearch);
  disposeDrag?.();
  flip?.destroy();
  stopAnimation();
  clearTimeout(resizeTimer);
  window.removeEventListener("resize", resize);
  window.removeEventListener("keydown", keydown);
  window.removeEventListener("hashchange", hashchange);
  hideTermHover();
  document.removeEventListener("mouseover", onBookMouseOver);
  document.removeEventListener("mouseout", onBookMouseOut);
  window.removeEventListener("plex-storage-error", storageNotice);
  darkMedia?.removeEventListener("change", updateSystemTheme);
});
</script>

<template>
  <div
    class="reader"
    :data-section="current?.id"
    :data-mode="preferences.mode"
    :data-font="preferences.font"
    :class="{
      'is-cover': cover,
      'is-immersed': preferences.immersion,
      'is-back-cover': backCover,
      'theme-dark': dark,
      'is-immersive': preferences.immersion,
      'font-serif-body': preferences.font === 'serif',
      'has-floating-window': overlayOpen,
    }"
    :style="{
      '--page-width': pageWidth + 'px',
      '--page-height': pageHeight + 'px',
      '--content-height': pageHeight - (desktop ? 112 : 92) + 'px',
      '--reader-font': preferences.fontSize + 'px',
      '--reader-line': preferences.lineHeight,
      '--reader-body': readerFontFamily,
      '--study-width':
        (preferences.customWidth?.study ?? { narrow: 680, standard: 840, wide: 980 }[preferences.width]) + 'px',
    }"
  >
    <button v-if="preferences.immersion && !overlayOpen" class="immersion-exit" @click="preferences.immersion=false;updatePreferences()">退出沉浸阅读</button>
    <a class="skip-link" href="#reading-content">跳到正文</a>
    <header class="reader-toolbar" :inert="overlayOpen">
      <button class="brand" aria-label="返回封面" @click="navigate('cover')">
        <span class="plex-symbol"
          ><img src="/brand/plex-mark.png" alt="" /></span
        >PLEX<span>星轨编程</span>
      </button>
      <div class="reader-masthead"><span>交互式编程读本</span><button @click="openMenu('contents')">章节导航 <Compass :size="16" /></button></div>
    </header>
    <p v-if="storageMessage" class="storage-notice" role="alert">
      {{ storageMessage
      }}<button @click="openMenu('notes')">备份学习记录</button
      ><button @click="storageMessage = ''">关闭提示</button>
    </p>
    <p v-if="navigationFailure" class="storage-notice" role="alert">
      {{ navigationFailure.message }} 当前阅读位置已保留。<button
        @click="navigate(navigationFailure.id, navigationFailure.place)"
      >
        重试加载
      </button>
    </p>
    <main id="reading-content" class="reading-main" tabindex="-1" :inert="overlayOpen">
      <div v-if="error" class="reader-error" role="alert">
        <h1>暂时无法打开这一页</h1>
        <p>{{ error }}</p>
        <button @click="loadCurrent">重新加载</button
        ><button @click="navigate('cover')">返回封面</button>
      </div>
      <div v-else-if="cover" class="cover-scene">
        <div class="cover-introduction"><span class="cover-series">PLEX / 星轨编程</span><h1>把好奇心<br /><span>写成代码。</span></h1><p>翻开一页，拆解一个问题。<br />和小E一起，把想法变成看得见的答案。</p><button class="cover-directory" @click="openMenu('contents')">探索全书 <ArrowRight :size="20" /></button></div>
        <button
          ref="coverElement"
          class="cover-book"
          aria-label="打开星轨编程，进入扉页"
          title="点击打开，或按住封面向左拖动"
          @click="next"
        >
          <img
            src="/images/cover.png"
            alt="PLEX 星轨编程：Python 与算法的探索之旅。宇航员坐在月牙上读书。"
            fetchpriority="high"
            draggable="false"
          />
        </button>
        <div class="cover-controls">
          <button class="resume-button" @click="openMenu('qa')">QA 留言板</button>
          <button class="open-book" @click="next">
            翻开这本书 <ArrowRight :size="18" /></button
          ><button
            v-if="resume && resume.sectionId !== 'cover'"
            class="resume-button"
            @click="navigate(resume.sectionId, resume)"
          >
            <BookOpen :size="15" />继续上次阅读
          </button>
        </div>
      </div>
      <section
        v-else
        class="open-book-scene"
        aria-label="电子书阅读区"
        :aria-busy="loading"
      >
        <div class="section-heading">
          <span>{{ current?.group }}</span>
          <h1>{{ current?.title || "星轨编程" }}</h1>
          <button
            v-if="sectionId.startsWith('unit/monty/')"
            data-testid="lesson-entry" @click="openUnit()"
          >
            {{lesson?.activityLabel || "学习活动"}}</button
          ><button @click="blockNote()">本段笔记</button
          ><button @click="openMenu('qa')">留言</button><div class="smart-search-anchor">
            <form class="cir-search" role="search" @submit.prevent="submitSmartSearch">
              <Search class="cir-search__icon" :size="16" aria-hidden="true" />
              <input
                v-model="query"
                class="cir-search__field"
                aria-label="搜索全书内容"
                placeholder="搜索全书"
                autocomplete="off"
                @focus="searchOpen = !!query.trim()"
                @keydown.esc.stop.prevent="searchOpen = false"
              />
            </form>
            <section
              v-if="searchOpen && query.trim() && !menu"
              class="smart-search-popover"
              aria-label="搜索结果"
              @pointerdown.stop
            >
              <div class="smart-search-tabs" role="tablist" aria-label="搜索方式">
                <button type="button" role="tab" :aria-selected="searchMode === 'exact'" @click="selectSearchMode('exact')">
                  精确查找 <span>{{ index.length ? searchResults.length : "…" }}</span>
                </button>
                <button type="button" role="tab" :aria-selected="searchMode === 'ai'" @click="selectSearchMode('ai')">
                  AI 模糊查找 <span>{{ aiSearching && !aiSearchResults.length ? "…" : aiSearchResults.length }}</span>
                </button>
              </div>
              <div class="smart-search-toolbar">
                <span class="smart-search-count">找到 <strong>{{ activeSearchResults.length }}</strong> 个匹配项</span>
                <div class="smart-search-actions">
                  <button type="button" class="smart-search-all" :disabled="aiSearching" @click="selectSearchMode('ai')">{{ aiSearching ? "AI 查找中…" : "AI 查找全部" }}</button>
                  <button type="button" :disabled="!activeSearchResults.length" @click="stepSearchResult(-1)">上一个</button>
                  <button type="button" :disabled="!activeSearchResults.length" @click="stepSearchResult(1)">下一个</button>
                </div>
              </div>
              <div v-if="searchMode === 'exact'" class="smart-search-body">
                <p v-if="searchIndexError" class="smart-search-message" role="alert">{{ searchIndexError }}</p>
                <p v-else-if="!index.length" class="smart-search-message">正在查找教材内容…</p>
                <p v-else-if="!previewSearchResults.length" class="smart-search-message">没有找到精确匹配，可以试试 AI 相关搜索。</p>
                <button
                  v-for="(entry, resultIndex) in previewSearchResults"
                  :key="entry.id + entry.blockId"
                  type="button"
                  class="smart-search-hit"
                  :class="{ 'is-current': activeSearchResultIndex === previewSearchStart + resultIndex }"
                  @click="openSearchResult(entry, previewSearchStart + resultIndex)"
                >
                  <small><span class="smart-search-number">{{ String(resultIndex + 1).padStart(2, "0") }}</span>{{ entry.group }}</small>
                  <strong>{{ entry.title }}</strong>
                  <p>…{{ entry.before }}<mark v-if="entry.hit">{{ entry.hit }}</mark>{{ entry.after }}…</p>
                </button>
              </div>
              <div v-else class="smart-search-body smart-ai-body">
                <div v-if="aiSearching" class="reader-loading-indicator smart-search-loading" role="status" aria-live="polite">
                  <div class="loader" aria-hidden="true"><span class="loader-text">GENIUS</span><span class="load"></span></div>
                  <small class="loading-caption">{{ aiSearchProgress || "正在理解你的问题…" }}<template v-if="aiSearchResults.length"> · 已先显示教材匹配结果</template></small>
                </div>
                <p v-if="aiSearchError" class="smart-search-message" role="alert">{{ aiSearchError }} <button type="button" class="smart-search-retry" @click="queueSemanticSearch">重试</button></p>
                <p v-if="!aiSearchResults.length && !aiSearching && !aiSearchError" class="smart-search-message">暂未找到相关知识点。可以换一种说法，或切换到精确搜索。</p>
                <template v-if="aiSearchResults.length">
                  <p class="smart-search-message"><strong v-if="matchedConcept">关联知识点：{{ matchedConcept.concept }}</strong><strong v-else>教材语义匹配</strong><br>{{ matchedConcept?.explanation || "根据问题含义，从教材章节中找到了这些相关内容。" }}<small class="smart-search-local-note">{{ matchedConcept ? '预设知识关联；语义模型就绪后补充检索结果' : '本地语义检索' }} · 无需登录</small></p>
                  <button
                    v-for="(entry, resultIndex) in aiSearchResults"
                    :key="entry.id + entry.blockId"
                    type="button"
                    class="smart-search-hit"
                    :class="{ 'is-current': activeSearchResultIndex === resultIndex }"
                    @click="openSearchResult(entry, resultIndex)"
                  >
                    <small><span class="smart-search-number">{{ String(resultIndex + 1).padStart(2, "0") }}</span>{{ entry.group }} · {{ entry.relation }}</small>
                    <strong>{{ entry.title }}</strong>
                    <p>…{{ entry.before }}<mark v-if="entry.hit">{{ entry.hit }}</mark>{{ entry.after }}…</p>
                  </button>
                </template>
              </div>
            </section>
          </div
          ><button
            class="bookmark-page"
            :aria-label="saved ? '已加入书签' : '收藏当前页'"
            @click="addBookmark"
          >
            <Check v-if="saved" :size="17" /><Bookmark v-else :size="17" />
          </button>
        </div>
        <StudyReader
          v-if="preferences.mode === 'study' && current"
          ref="study"
          :page="current"
          :sections="sections"
          :get-page="getPage"
          :notes="notes"
          :decorate="decorateTerms"
          :revision="labRevision"
          @position="studyPosition"
          @section="studySection"
          @select="selectText"
          @action="clickBook"
        />
        <div
          v-show="preferences.mode === 'flip'"
          class="book-holder"
          :class="{ loading }"
          @mouseup="host && selectText(host)"
          @keyup.shift="host && selectText(host)"
          @click="
            ($event.target as HTMLElement).closest('[data-action=star-map]')
              ? openMenu('contents')
              : clickBook($event)
          "
        >
          <button
            class="edge-nav edge-prev"
            aria-label="页边上一页"
            :disabled="sectionIndex <= 0 && pageIndex === 0"
            @click.stop="previous"
          >
            <ChevronLeft :size="24" />
          </button>
          <div
            ref="host"
            class="book-host vp-raw"
            title="按住书页左右边缘，拖动翻页"
          />
          <button
            class="edge-nav edge-next"
            aria-label="页边下一页"
            :disabled="
              sectionIndex === sections.length - 1 &&
              pageIndex + (desktop ? 2 : 1) >= leaves.length
            "
            @click.stop="next"
          >
            <ChevronRight :size="24" />
          </button>
        </div>
        <div v-if="loading" class="loading-label" role="status" aria-label="正在排版这一节">
          <div class="reader-loading-indicator">
            <div class="loader" aria-hidden="true">
              <p class="loader-text">Loading...</p>
              <span class="load"></span>
            </div>
            <span class="loading-caption">正在排版这一节…</span>
          </div>
        </div>
        <div class="page-navigation">
          <button
            aria-label="上一节"
            :disabled="sectionIndex <= 0"
            @click="navigate(sections[sectionIndex - 1].id)"
          >
            <ArrowLeft :size="14" />上一节</button
          ><span v-if="preferences.mode === 'flip'"
            >第 {{ pageIndex + 1
            }}{{
              desktop && pageIndex + 1 < leaves.length
                ? "–" + (pageIndex + 2)
                : ""
            }}
            页 / {{ leaves.length }} 页</span
          ><span v-else>连续阅读 · 学习记录自动保存</span
          ><button
            aria-label="下一节"
            :disabled="sectionIndex >= sections.length - 1"
            @click="navigate(sections[sectionIndex + 1].id)"
          >
            下一节<ArrowRight :size="14" />
          </button>
        </div>
        <p v-if="preferences.mode === 'flip'" class="drag-hint">
          按住页边向内拖动翻书 · 拖回可取消
        </p>
      </section>
      <div v-if="!ready" class="loading-label" role="status" aria-label="正在打开星轨编程">
        <div class="reader-loading-indicator">
          <div class="loader" aria-hidden="true">
            <p class="loader-text">Loading...</p>
            <span class="load"></span>
          </div>
          <span class="loading-caption">正在打开星轨编程…</span>
        </div>
      </div>
    </main>
    <nav class="bottom-navigation" aria-label="阅读主导航" :inert="overlayOpen || loading">
      <button aria-label="打开目录" @click="openMenu('contents')">
        <Compass :size="20" /><span>目录</span>
      </button>
      <button
        aria-label="上一页"
        :disabled="sectionIndex <= 0 && pageIndex === 0"
        @click="previous"
      >
        <ChevronLeft :size="22" /><span>上一页</span>
      </button>
      <button
        class="bottom-progress"
        aria-label="查看学习进度"
        @click="openUnit('progress')"
      >
        <span>{{ progress }}% 全书</span
        ><meter :value="progress" min="0" max="100" aria-label="全书阅读进度" />
      </button>
      <button
        aria-label="下一页"
        :disabled="backCover && pageIndex + (desktop ? 2 : 1) >= leaves.length"
        @click="next"
      >
        <ChevronRight :size="22" /><span>下一页</span>
      </button>
      <button aria-label="打开小黑板" @click="openBoard()">
        <BookOpen :size="20" /><span>小黑板</span>
      </button>
      <button aria-label="更多阅读工具" @click="openMenu('more')">
        <List :size="20" /><span>更多</span>
      </button>
    </nav>
    <div class="measurement-area" aria-hidden="true">
      <div ref="stage" class="leaf-content source-stage" />
      <div ref="measure" class="leaf-content page-measure" />
    </div>
    <ChapterTermNote :context="sectionId + ':' + pageIndex + ':' + preferences.mode" @note="chapterTermNote" />
    <ChapterAnnotation v-if="selection?.sectionId.startsWith('chapter_divide_and_conquer/')" :key="selection.id" :record="selection" :point="annotationPoint" :error="storageMessage" @save="(kind,text)=>{noteText=text;annotate(kind)}" @close="selection=undefined" />
    <div
      v-else-if="selection"
      class="selection-tools"
      role="region"
      aria-label="选区批注"
    >
      <span>{{
        rebindNote ? "选择新位置后保存关联" : selection.exact.slice(0, 45)
      }}</span
      ><input
        v-model="noteText"
        aria-label="批注内容"
        placeholder="写下你的想法…"
      /><button @click="annotate('highlight')">高亮</button
      ><button @click="annotate('underline')">划线</button
      ><button @click="annotate('note')">
        {{ rebindNote ? "保存关联" : "保存批注" }}</button
      ><button @click="selection = undefined">取消</button>
    </div>

    <div v-if="menu" class="overlay" :data-window="menu" @click.self="closeOverlay">
      <section
        :class="{ 'qa-dialog': menu === 'qa' }"
        class="navigation-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="menuLabel"
      >
        <div class="dialog-header">
          <div>
            <span class="dialog-eyebrow">星轨编程</span>
            <h2>{{ menuLabel }}</h2>
          </div>
          <button class="dialog-close" aria-label="关闭" @click="closeOverlay">
            <X :size="22" />
          </button>
        </div>
        <QaBoard v-if="menu === 'qa'" :current="{ id: sectionId, title: current?.title, group: current?.group }" @navigate="(id: string) => { closeOverlay(); navigate(id); }" />
        <div v-if="menu === 'controls'" id="reader-control-slot"></div>
        <div v-if="menu === 'more'" class="more-tools">
          <button aria-label="QA 留言板" @click="openMenu('qa')">QA 留言板</button>
          <button @click="openMenu('controls')">翻页控制</button><button @click="closeOverlay();showPet()">显示小E</button>
          <button
            aria-label="切换阅读模式"
            @click="
              toggleMode();
              closeOverlay();
            "
          >
            切换阅读模式
          </button>
          <button aria-label="搜索全书" @click="focusSmartSearch">
            搜索全书
          </button>
          <button aria-label="学习笔记" @click="openMenu('notes')">
            学习笔记
          </button>
          <button aria-label="阅读设置" @click="openMenu('settings')">
            阅读设置
          </button>
          <a href="/" class="galaxy-return">返回银河书库</a><button aria-label="查看书签" @click="openMenu('bookmarks')">
            查看书签
          </button>
          <button
            @click="
              fullscreen();
              closeOverlay();
            "
          >
            全屏阅读
          </button>
          <button
            aria-label="打开学习实验室"
            @click="
              menu = null;
              openPanel('learning');
            "
          >
            打开学习实验室
          </button>
          <button @click="navigate('unit/monty/start')">
            学习起点 · 三门单元
          </button>
          <button @click="openUnit('blackboard')">本页小黑板</button>
        </div>
        <template v-if="menu === 'contents'">
          <div class="view-tabs">
            <button :class="{ active: mapView }" @click="mapView = true">
              <Compass :size="16" />星域导航</button
            ><button :class="{ active: !mapView }" @click="mapView = false">
              <List :size="16" />全部章节
            </button>
          </div>
          <div class="contents-scroll">
            <button
              class="unit-directory-entry"
              @click="navigate('unit/monty/start')"
            >
              学习起点 · 三扇舱门：直觉可靠吗？ →
            </button>
            <StarMap v-if="mapView" :sections="sections" :current="sectionId" @navigate="navigate" />
            <div v-if="!mapView || !desktop" class="chapter-directory">
              <section v-for="[group, items] in groups" :key="group">
                <h3>{{ group }}</h3>
                <button
                  v-for="entry in items"
                  :key="entry.id"
                  :class="{ current: entry.id === sectionId }"
                  @click="navigate(entry.id)"
                >
                  {{ entry.title }}<ChevronRight :size="15" />
                </button>
              </section>
            </div>
          </div>
        </template>
        <div v-if="menu === 'settings'" class="settings-sheet">
          <div class="settings-group settings-preview-group">
            <span class="settings-preview-label">预览 · 下面的调整实时变化</span>
            <p class="settings-preview">
              星轨上的一次遍历，从起点出发，把每条边都走一遍——这就是图的意义。遍历不是路过，是记住每一站。
            </p>
          </div>
          <div class="settings-grid">
            <div class="settings-col">
              <span class="settings-col-label">阅读方式</span>
              <div class="settings-mode settings-mode-col">
                <button
                  :class="{ 'is-on': preferences.mode === 'flip' }"
                  :aria-pressed="preferences.mode === 'flip'"
                  @click="setMode('flip')"
                >
                  <span>📖 翻书模式</span>
                  <small>像看书一样，左右翻页</small>
                </button>
                <button
                  :class="{ 'is-on': preferences.mode === 'study' }"
                  :aria-pressed="preferences.mode === 'study'"
                  @click="setMode('study')"
                >
                  <span>📝 学习模式</span>
                  <small>长页连续滚动，适合做笔记</small>
                </button>
              </div>
              <span class="settings-col-label settings-col-label-plain">沉浸阅读</span>
              <p class="settings-note">收起工具栏与页脚，只留书页 · Esc 退出</p>
              <button
                class="settings-switch"
                :class="{ 'is-on': preferences.immersion }"
                :aria-pressed="preferences.immersion"
                @click="
                  preferences.immersion = !preferences.immersion;
                  updatePreferences();
                "
              >
                <i><em /></i>
                {{ preferences.immersion ? "已开启" : "已关闭" }}
              </button>
            </div>
            <div class="settings-col">
              <span class="settings-col-label">字里行间</span>
              <span class="settings-label">
                字号 <small>{{ preferences.fontSize }} px</small>
              </span>
              <div class="settings-fontsize">
                <button
                  class="step-btn"
                  aria-label="减小字号"
                  :disabled="preferences.fontSize <= 14"
                  @click="
                    preferences.fontSize = Math.max(14, preferences.fontSize - 2);
                    updatePreferences();
                  "
                >
                  A−
                </button>
                <input
                  v-model.number="preferences.fontSize"
                  type="range"
                  min="14"
                  max="26"
                  step="2"
                  aria-label="正文字号"
                  @change="updatePreferences"
                />
                <button
                  class="step-btn"
                  aria-label="增大字号"
                  :disabled="preferences.fontSize >= 26"
                  @click="
                    preferences.fontSize = Math.min(26, preferences.fontSize + 2);
                    updatePreferences();
                  "
                >
                  A+
                </button>
              </div>
              <span class="settings-label">行距</span>
              <div class="settings-seg">
                <button
                  v-for="opt in lineOptions"
                  :key="opt.value"
                  :class="{ 'is-on': preferences.lineHeight === opt.value }"
                  :aria-pressed="preferences.lineHeight === opt.value"
                  @click="
                    preferences.lineHeight = opt.value;
                    updatePreferences();
                  "
                >
                  {{ opt.label }}
                </button>
              </div>
              <span class="settings-label">正文字体</span>
              <div class="settings-seg">
                <button
                  :class="{ 'is-on': preferences.font === 'sans' }"
                  :aria-pressed="preferences.font === 'sans'"
                  @click="
                    preferences.font = 'sans';
                    updatePreferences();
                  "
                >
                  无衬线 · 清爽
                </button>
                <button
                  :class="{ 'is-on': preferences.font === 'serif' }"
                  :aria-pressed="preferences.font === 'serif'"
                  @click="
                    preferences.font = 'serif';
                    updatePreferences();
                  "
                >
                  衬线 · 书卷
                </button>
              </div>
              <span class="settings-label">阅读宽度</span>
              <div class="settings-seg">
                <button
                  v-for="opt in widthOptions"
                  :key="opt.value"
                  :class="{ 'is-on': preferences.width === opt.value }"
                  :aria-pressed="preferences.width === opt.value"
                  @click="
                    preferences.width = opt.value;
                    updatePreferences();
                  "
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="settings-col">
              <span class="settings-col-label">纸面</span>
              <div class="settings-paper settings-paper-col">
                <button
                  :class="{ 'is-on': preferences.theme === 'light' }"
                  :aria-pressed="preferences.theme === 'light'"
                  @click="
                    preferences.theme = 'light';
                    updatePreferences();
                  "
                >
                  <span class="paper-chip" aria-hidden="true">Aa</span>
                  暖白纸面
                </button>
                <button
                  :class="{ 'is-on': preferences.theme === 'dark' }"
                  :aria-pressed="preferences.theme === 'dark'"
                  @click="
                    preferences.theme = 'dark';
                    updatePreferences();
                  "
                >
                  <span class="paper-chip paper-dark" aria-hidden="true">Aa</span>
                  墨夜
                </button>
                <button
                  :class="{ 'is-on': preferences.theme === 'system' }"
                  :aria-pressed="preferences.theme === 'system'"
                  @click="
                    preferences.theme = 'system';
                    updatePreferences();
                  "
                >
                  <span class="paper-chip paper-system" aria-hidden="true" />
                  跟随系统
                </button>
              </div>
              <div class="settings-foot">
                <button class="settings-plain" @click="fullscreen">
                  ⛶ 全屏
                </button>
                <button class="settings-plain" @click="resetPreferences">
                  ↺ 恢复默认
                </button>
              </div>
            </div>
          </div>
        </div>
        <LearningNotebook
          v-if="menu === 'notes'"
          @navigate="(place) => navigate(place.sectionId, place)"
          @changed="refreshNotes"
          @rebind="
            (note) => {
              rebindNote = note;
              closeOverlay();
              storageMessage = '请重新选择原文，然后保存关联。';
            }
          "
        />
        <BookmarkLibrary v-if="menu==='bookmarks'" :marks="bookmarks" :sections="sections" @update="bookmarks=$event" @navigate="navigate($event.sectionId,$event)"/>
      </section>
    </div>
    <FloatingToolWindow v-if="panel" :title="panelLabel" storage-key="activity-window" mobile-fullscreen @close="closeOverlay">
      <section class="content-dialog movable-activity" :data-window="panel">
        <button
          v-if="
            panelBlock && ['code', 'image', 'expanded'].includes(panel || '')
          "
          class="back-exercises"
          @click="blockNote(panelBlock)"
        >
          为这段代码／图解添加笔记
        </button>
        <CodePanel
          v-if="panel === 'code' && panelSource?.codeExamples[codeIndex]"
          :example="panelSource.codeExamples[codeIndex]"
          @outcome="labOutcome"
          :fold-source-header="panelSource.html.includes('ch12-')"
        />
        <TeachingScene v-if="panel==='teaching'" :key="teachingScene" :scene-id="teachingScene"/>
        <Chapter12Panel v-if="panel === 'chapter12'" :key="chapter12Mode" :mode="chapter12Mode" :section-id="sectionId" @activity="chapterActivity" />
        <ChapterQuiz v-if="panel === 'chapter-quiz'" :key="quizChapter" :chapter="quizChapter" @review="(id: string) => { closeOverlay(); navigate(id); }" />
        <UnitPanel
          v-if="panel === 'unit'"
          :key="unitSection + unitMode"
          :section-id="unitSection"
          :initial-mode="unitMode"
          :current-section-id="sectionId"
          @activity="openLesson"
          @blackboard="openBoard"
          @navigate="navigate"
        />
        <LearningHub v-if="panel === 'learning'" :section-id="sectionId" />
        <div v-if="panel === 'term' && term" class="term-sheet">
          <div class="term-head">
            <h2>{{ term.term }}</h2>
            <small>{{ term.english }}</small>
          </div>
          <p class="term-definition">{{ term.definition }}</p>
          <div v-if="term.tip" class="term-tip">
            <span class="term-tip-label">说人话</span>
            <p>{{ term.tip }}</p>
          </div>
          <div v-if="term.keys?.length" class="term-keys">
            <span class="term-tip-label">顺手记</span>
            <kbd v-for="k in term.keys" :key="k">{{ k }}</kbd>
          </div>
          <button class="term-link" @click="navigate(term.sectionId)">
            阅读相关章节 →
          </button>
        </div>
        <H5PPanel v-if="panel === 'activity'" />
        <div v-if="panel === 'image'" class="image-viewer">
          <img :src="imageUrl" :alt="imageAlt" />
          <p>{{ imageAlt }}</p>
        </div>
        <div
          v-if="panel === 'expanded'"
          class="expanded-viewer leaf-content vp-raw"
          v-html="expandedHtml"
          @click="clickBook"
        />
      </section>
    </FloatingToolWindow>
    <FloatingToolWindow v-if="boardOpen" v-show="!overlayOpen" :inert="overlayOpen" title="小黑板" storage-key="blackboard-window" @close="closeBoard"><Blackboard :key="boardSection" :section-id="boardSection" /></FloatingToolWindow>

    <div
      v-if="termHover && !panel && !menu"
      class="term-pop"
      :class="{ below: termHover.below }"
      :style="{ left: termHover.x + 'px', top: termHover.y + 'px' }"
      role="tooltip"
    >
      <div class="term-pop-head">
        <b>{{ termHover.entry.term }}</b>
        <small>{{ termHover.entry.english }}</small>
      </div>
      <p class="term-pop-body">{{ termHover.entry.definition }}</p>
      <div v-if="termHover.entry.tip" class="term-pop-tip">
        {{ termHover.entry.tip }}
      </div>
      <span class="term-pop-foot">点击术语以展开完整解释</span>
    </div>
    <ReaderControls :settings="menu==='controls'" :blocked="overlayOpen||boardOpen||petOpen" :dictating="dictating" :notice="controlNotice" @command="controlTurn" @fullscreen="fullscreen" @configure="openMenu('controls')" />
  </div>
  <FrameReading v-if="frameActive" :section-id="sectionId" @close="frameActive=false" />
</template>
