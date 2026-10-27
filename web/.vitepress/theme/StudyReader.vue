<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import renderMath from "katex/contrib/auto-render";
import type {
  BookPage,
  BookSection,
  ReadingLocator,
  AnnotationRecord,
} from "./types";
import { decorateAnnotations } from "./annotations";
import { retainMathText, textSegments } from "./text-coordinates";
const props = defineProps<{
  page: BookPage;
  sections: BookSection[];
  getPage: (id: string) => Promise<BookPage>;
  notes: AnnotationRecord[];
  decorate?: (root: HTMLElement) => void;
}>();
const emit = defineEmits<{
  position: [place: ReadingLocator];
  section: [page: BookPage];
  select: [root: HTMLElement];
  action: [event: MouseEvent];
}>();
const root = ref<HTMLElement>(),
  items = ref<BookPage[]>([]),
  busy = ref(false),
  error = ref("");
let scrollTimer: ReturnType<typeof setTimeout> | undefined,
  disposed = false;
async function render() {
  await nextTick();
  if (!root.value) return;
  root.value.querySelectorAll<HTMLElement>(".study-article").forEach((el) => {
    if (el.dataset.decorated) return;
    el.dataset.decorated = "true";
    retainMathText(el);
    renderMath(el, {
      throwOnError: false,
      delimiters: [
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
    props.decorate?.(el);
    decorateAnnotations(
      el,
      props.notes.filter((n) => n.sectionId === el.dataset.section),
    );
  });
}
async function setPage(page: BookPage) {
  if (items.value.some((p) => p.id === page.id)) return;
  items.value = [page];
  await render();
  if (root.value) root.value.scrollTop = 0;
}
async function extend(direction: number) {
  if (busy.value || !items.value.length) return;
  const edge = direction < 0 ? items.value[0] : items.value.at(-1)!;
  const entry =
    props.sections[
      props.sections.findIndex((s) => s.id === edge.id) + direction
    ];
  if (!entry || entry.kind === "cover") return;
  busy.value = true;
  const oldHeight = root.value?.scrollHeight || 0,
    oldTop = root.value?.scrollTop || 0;
  try {
    const page = await props.getPage(entry.id);
    if (disposed) return;
    if (direction < 0) items.value.unshift(page);
    else items.value.push(page);
    await render();
    await Promise.all(
      [...(root.value?.querySelectorAll("img") || [])].map((i) =>
        i.decode().catch(() => {}),
      ),
    );
    if (direction < 0 && root.value)
      root.value.scrollTop = oldTop + root.value.scrollHeight - oldHeight;
    if (items.value.length > 5 && root.value) {
      if (direction > 0) {
        const first = root.value.querySelector<HTMLElement>(".study-article");
        const h = first?.offsetHeight || 0;
        items.value.shift();
        await nextTick();
        root.value.scrollTop -= h;
      } else items.value.pop();
    }
  } catch (e) {
    error.value = String(e);
  } finally {
    busy.value = false;
  }
}
function position() {
  const box = root.value;
  if (!box) return;
  const top = box.getBoundingClientRect().top;
  const blocks = [...box.querySelectorAll<HTMLElement>("[data-block]")];
  const block = blocks.find((b) => b.getBoundingClientRect().bottom > top + 30);
  if (!block) return;
  const id = block.closest<HTMLElement>("[data-section]")!.dataset.section!;
  let offset = 0;
  for (const segment of textSegments(block)) {
    const next = segment.node;
    const range = document.createRange();
    range.selectNodeContents(next);
    if (range.getBoundingClientRect().bottom > top + 30) {
      if (!segment.atomic) {
        let lo = 0,
          hi = next.length;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          range.setStart(next, mid);
          range.setEnd(next, Math.min(next.length, mid + 1));
          if (range.getBoundingClientRect().bottom <= top + 30) lo = mid + 1;
          else hi = mid;
        }
        offset += lo;
      }
      break;
    }
    offset += segment.text.length;
  }
  emit("position", { sectionId: id, blockId: block.dataset.block!, offset });
  const page = items.value.find((p) => p.id === id);
  if (page && props.page.id !== id) emit("section", page);
}
function scroll() {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    position();
    const box = root.value;
    if (!box) return;
    if (box.scrollHeight - box.scrollTop - box.clientHeight < 500)
      void extend(1);
    if (box.scrollTop < 80) void extend(-1);
  }, 120);
}
async function go(place: ReadingLocator) {
  clearTimeout(scrollTimer);
  await nextTick();
  await document.fonts.ready;
  await Promise.all(
    [...(root.value?.querySelectorAll("img") || [])].map((img) => {
      img.loading = "eager";
      return img.decode().catch(() => {});
    }),
  );
  const article = [
    ...(root.value?.querySelectorAll<HTMLElement>(".study-article") || []),
  ].find((a) => a.dataset.section === place.sectionId);
  const block = [
    ...(article?.querySelectorAll<HTMLElement>("[data-block],[id]") || []),
  ].find((b) => b.dataset.block === place.blockId || b.id === place.blockId);
  if (!block) return;
  if (root.value)
    root.value.scrollTop +=
      block.getBoundingClientRect().top -
      root.value.getBoundingClientRect().top -
      30;
  if (place.offset) {
    let total = 0;
    for (const segment of textSegments(block)) {
      const node = segment.node,
        length = segment.text.length;
      if (total + length >= place.offset) {
        const range = document.createRange();
        range.setStart(
          node,
          segment.atomic ? 0 : Math.min(node.length, place.offset - total),
        );
        range.setEnd(
          node,
          segment.atomic
            ? node.length
            : Math.min(node.length, place.offset - total + 1),
        );
        const rect = range.getBoundingClientRect();
        if (root.value)
          root.value.scrollTop +=
            rect.top - root.value.getBoundingClientRect().top - 30;
        break;
      }
      total += length;
    }
  }
}
watch(
  () => props.notes,
  async () => {
    for (const article of root.value?.querySelectorAll<HTMLElement>(
      ".study-article",
    ) || []) {
      const page = items.value.find((p) => p.id === article.dataset.section);
      if (page && article.lastElementChild)
        article.lastElementChild.innerHTML = page.html;
      delete article.dataset.decorated;
    }
    await render();
  },
);
watch(() => props.page, setPage);
onMounted(() => setPage(props.page));
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(scrollTimer);
});
defineExpose({ go, root, position });
</script>
<template>
  <div
    ref="root"
    class="study-reader"
    tabindex="0"
    aria-label="连续正文"
    @scroll="scroll"
    @click="emit('action', $event)"
    @mouseup="root && emit('select', root)"
    @keyup.shift="root && emit('select', root)"
  >
    <button class="study-load" :disabled="busy" @click="extend(-1)">
      加载上一节
    </button>
    <article
      v-for="item in items"
      :key="item.id"
      class="study-article leaf-content vp-raw"
      :data-section="item.id"
    >
      <header>{{ item.group }} · {{ item.title }}</header>
      <div v-html="item.html" />
    </article>
    <p v-if="error" role="alert">
      {{ error
      }}<button
        @click="
          error = '';
          extend(1);
        "
      >
        重试
      </button>
    </p>
    <button class="study-load" :disabled="busy" @click="extend(1)">
      {{ busy ? "正在加载…" : "继续下一节" }}
    </button>
  </div>
</template>
