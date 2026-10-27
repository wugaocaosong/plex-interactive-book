<script setup lang="ts">
import { registerLearningFlush } from "./learning-flush";
import { ref, onMounted, onBeforeUnmount } from "vue";
import { getLearning, putLearning } from "./learning-store";
import type { MontyHallSession } from "./monty-hall";
import RoughMark from './RoughMark.vue';
import {probabilityTemplate,type BlackboardMark as Mark,type BlackboardDocument} from './blackboard-model';
const props = defineProps<{ sectionId: string }>();
const marks = ref<Mark[]>([]),
  redo = ref<Mark[][]>([]),
  undo = ref<Mark[][]>([]),
  tool = ref("pen"),
  color = ref("#F7EEDB"),
  label = ref(""),
  svg = ref<SVGSVGElement>(),
  status = ref(""),
  loaded = ref(false);
const key = "blackboard:" + props.sectionId;
let active: Mark | undefined,
  saveTimer: ReturnType<typeof setTimeout> | undefined;
const snapshot = () => JSON.parse(JSON.stringify(marks.value)) as Mark[];
function checkpoint() {
  undo.value.push(snapshot());
  if (undo.value.length > 40) undo.value.shift();
  redo.value = [];
}
async function save() {
  clearTimeout(saveTimer);
  if (!loaded.value) return;
  const doc: BlackboardDocument = {
    version: 2,
    sectionId: props.sectionId,
    marks: snapshot(),
    updatedAt: new Date().toISOString(),
  };
  try {
    await putLearning(key, doc);
    status.value = "板书已保存到本机";
  } catch {
    status.value = "保存失败，请导出 PNG 保留当前板书";
  }
}
function changed() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void save(), 500);
}
function point(e: PointerEvent) {
  const p = svg.value!.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  const transformed = p.matrixTransform(svg.value!.getScreenCTM()!.inverse());
  return [
    Math.max(0, Math.min(1000, transformed.x)),
    Math.max(0, Math.min(600, transformed.y)),
  ];
}
function erase(e: PointerEvent) {
  const target = document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest("[data-mark]");
  if (target)
    marks.value = marks.value.filter(
      (m) => m.id !== target.getAttribute("data-mark"),
    );
}
function start(e: PointerEvent) {
  if (e.button !== 0 || !loaded.value) return;
  e.preventDefault();
  if (marks.value.length >= 300 && tool.value !== "eraser") {
    status.value = "本页最多保留 300 个对象，请先导出或清理。";
    return;
  }
  checkpoint();
  svg.value!.setPointerCapture(e.pointerId);
  const [x, y] = point(e);
  if (tool.value === "eraser") erase(e);
  else if (tool.value === "text") addText(x, y, false);
  else {
    active = {
      id: crypto.randomUUID(),
      kind: tool.value==="pen"?"stroke":"shape",
      shape:tool.value as Mark["shape"],x,y,width:0,height:0,seed:Math.floor(Math.random()*2147483646)+1,
      color: color.value,
      points: [[x, y]],
    };
    marks.value.push(active);
    active = marks.value.at(-1);
  }
  changed();
}
function move(e: PointerEvent) {
  if (!svg.value?.hasPointerCapture(e.pointerId)) return;
  if (tool.value === "eraser") erase(e);
  else if(active?.kind==="shape"){const [x,y]=point(e);active.width=x-active.x!;active.height=y-active.y!;}
  else if (active && active.points!.length < 4000)
    active.points!.push(point(e));
  changed();
}
function end(e: PointerEvent) {
  active = undefined;
  if (svg.value?.hasPointerCapture(e.pointerId))
    svg.value.releasePointerCapture(e.pointerId);
  void save();
}
function addText(x = 70, y = 90, remember = true) {
  if (!label.value.trim() || marks.value.length >= 300) return;
  if (remember) checkpoint();
  marks.value.push({
    id: crypto.randomUUID(),
    kind: "text",
    color: color.value,
    text: label.value.slice(0, 200),
    x,
    y,
  });
  label.value = "";
  changed();
}
function undoStep() {
  if (!undo.value.length) return;
  redo.value.push(snapshot());
  marks.value = undo.value.pop()!;
  changed();
}
function redoStep() {
  if (!redo.value.length) return;
  undo.value.push(snapshot());
  marks.value = redo.value.pop()!;
  changed();
}
function template(){if(marks.value.length>294)return;checkpoint();marks.value.push(...probabilityTemplate().map(m=>({...m,id:crypto.randomUUID()})));changed();}
function addShape(){if(marks.value.length>=300)return;checkpoint();marks.value.push({id:crypto.randomUUID(),kind:'shape',shape:['rectangle','ellipse','arrow'].includes(tool.value)?tool.value as Mark['shape']:'rectangle',x:80,y:80,width:240,height:140,seed:Math.floor(Math.random()*2147483646)+1,color:color.value});changed();}
async function scene() {
  if (marks.value.length >= 300) {
    status.value = "本页对象已达 300 个，请先导出或清理。";
    return;
  }
  const state = await getLearning<MontyHallSession | undefined>(
    "lab:monty-hall",
    undefined,
  );
  if (!state) {
    status.value = "先完成一次选门，再插入状态图。";
    return;
  }
  checkpoint();
  marks.value.push({
    id: crypto.randomUUID(),
    kind: "scene",
    color: "#D9B873",
    scene: state,
  });
  changed();
}
async function png() {
  await save();
  const source = new XMLSerializer().serializeToString(svg.value!);
  const url = URL.createObjectURL(
    new Blob([source], { type: "image/svg+xml" }),
  );
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 960;
    canvas.getContext("2d")!.drawImage(image, 0, 0, 1600, 960);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "PLEX-板书-" + props.sectionId.replaceAll("/", "-") + ".png";
    a.click();
  } catch (e) {
    status.value = "导出失败：" + String(e);
  } finally {
    URL.revokeObjectURL(url);
  }
}
onMounted(async () => {
  const doc = await getLearning<BlackboardDocument | undefined>(key, undefined);
  if (disposed) return;
  if ((doc?.version === 1 || doc?.version===2) && Array.isArray(doc.marks)) marks.value = doc.marks;
  loaded.value = true;
});
let disposed = false;
const unregisterFlush = registerLearningFlush(save);
onBeforeUnmount(() => {
  disposed = true;
  unregisterFlush();
});
onBeforeUnmount(() => void save());
</script>
<template>
  <section class="blackboard-panel">
    <p class="unit-muted">本页板书 · 支持鼠标、触笔与触屏</p>
    <div class="unit-actions">
      <label
        >工具<select v-model="tool" aria-label="工具">
          <option value="pen">画笔</option><option value="rectangle">矩形</option><option value="ellipse">圆圈</option><option value="arrow">箭头</option>
          <option value="eraser">橡皮</option>
          <option value="text">点击放置文字</option>
        </select></label
      ><label>颜色<input v-model="color" type="color" /></label
      ><button :disabled="!undo.length" @click="undoStep">撤销</button
      ><button :disabled="!redo.length" @click="redoStep">重做</button
      ><button
        @click="
          checkpoint();
          marks = [];
          changed();
        "
      >
        清空（可撤销）
      </button>
    </div>
    <div class="unit-actions">
      <input
        v-model="label"
        maxlength="200"
        aria-label="板书文字"
        placeholder="输入解释，再点击添加或在黑板中定位"
        @keydown.enter="addText()"
      /><button @click="addText()">添加文字</button
      ><button @click="addShape">添加所选图形</button><button @click="template">插入概率分组模板</button><button @click="scene">插入三门状态图</button
      ><button @click="png">导出 PNG</button>
    </div>
    <svg
      ref="svg"
      class="blackboard-canvas"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 600"
      role="img"
      aria-label="本页小黑板；可使用文字输入和插入状态图按钮"
      @pointerdown="start"
      @pointermove="move"
      @pointerup="end"
      @pointercancel="end"
    >
      <rect width="1000" height="600" fill="#242723" />
      <g v-for="m in marks" :key="m.id" :data-mark="m.id">
        <RoughMark v-if="m.kind==='shape'" :mark="m"/>
        <polyline
          v-if="m.kind === 'stroke'"
          :points="m.points?.map((p) => p.join(',')).join(' ')"
          :stroke="m.color"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
        <text
          v-if="m.kind === 'text'"
          :x="m.x"
          :y="m.y"
          :fill="m.color"
          font-family="sans-serif"
          font-size="28"
        >
          {{ m.text }}
        </text>
        <g
          v-if="m.kind === 'scene' && m.scene"
          font-family="sans-serif"
          text-anchor="middle"
        >
          <g v-for="d in [0, 1, 2]" :key="d">
            <rect
              :x="90 + d * 300"
              y="200"
              width="220"
              height="230"
              rx="15"
              fill="#131315"
              :stroke="m.scene.first === d ? '#D9B873' : '#4F8D86'"
              stroke-width="4"
            />
            <text :x="200 + d * 300" y="270" fill="#F7EEDB" font-size="26">
              {{ d + 1 }} 号舱门
            </text>
            <text :x="200 + d * 300" y="350" fill="#D9B873" font-size="28">
              {{
                m.scene.step === 3 && m.scene.prize === d
                  ? "能源核心"
                  : m.scene.step >= 2 && m.scene.opened === d
                    ? "空舱"
                    : "尚未揭晓"
              }}
            </text>
            <text :x="200 + d * 300" y="470" fill="#F7EEDB" font-size="22">
              {{ m.scene.first === d ? "初选" : "" }}
              {{ m.scene.step === 3 && m.scene.final === d ? "最终选择" : "" }}
            </text>
          </g>
        </g>
      </g>
    </svg>
    <p role="status">{{ status }}</p>
    <details>
      <summary>查看板书文字描述</summary>
      <ul>
        <li v-for="m in marks" :key="m.id">
          {{
            m.kind === "text"
              ? m.text
              : m.kind === "scene"
                ? `三门状态：初选 ${m.scene?.first !== undefined ? m.scene.first + 1 : "尚未选择"} 号；${m.scene?.step! >= 2 ? "打开 " + (m.scene!.opened! + 1) + " 号空门" : "尚未开门"}；${m.scene?.step === 3 ? "核心在 " + (m.scene.prize + 1) + " 号，最终选择 " + (m.scene.final! + 1) + " 号" : "核心位置尚未揭晓"}`
                : m.kind==="shape" ? ({rectangle:"矩形",ellipse:"圆圈",arrow:"箭头"}[m.shape!]) : "手绘笔画"
          }}
        </li>
      </ul>
    </details>
  </section>
</template>
