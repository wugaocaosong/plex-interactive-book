import {upgradeProgress} from './lesson-state';
import {upgradeBoard} from './blackboard-model';
import type { ReaderPreferences } from "./types";
import { learningKey, learningScope, localLearningKey } from "./learning-scope";
import {
  validateSimulation,
  upgradeSession,
  eligibleDoors,
  remainingDoor,
  doors,
} from "./monty-hall";
export const defaultPreferences: ReaderPreferences = {
  mode: "flip",
  fontSize: 18,
  lineHeight: 1.8,
  theme: "light",
  width: "standard",
  split: 40,
  labLevel: "basic",
  font: "sans",
  immersion: false,
};
export function sanitizePreferences(
  value: Partial<ReaderPreferences> | undefined,
): ReaderPreferences {
  const result = { ...defaultPreferences, ...value };
  if (!["flip", "study"].includes(result.mode)) result.mode = "flip";
  if (!["light", "dark", "system"].includes(result.theme))
    result.theme = "light";
  if (!["narrow", "standard", "wide"].includes(result.width))
    result.width = "standard";
  if (!Number.isFinite(result.fontSize)) result.fontSize = 18;
  result.fontSize = Math.max(14, Math.min(26, result.fontSize));
  if (![1.5, 1.8, 2.1].includes(result.lineHeight)) result.lineHeight = 1.8;
  if (!Number.isFinite(result.split)) result.split = 40;
  result.split = Math.max(28, Math.min(55, result.split));
  if (!["basic", "advanced", "challenge"].includes(result.labLevel))
    result.labLevel = "basic";
  if (!["serif", "sans"].includes(result.font)) result.font = "sans";
  result.immersion = result.immersion === true;
  return result;
}
export interface LearningRecord {
  id: string;
  value: unknown;
  updatedAt: string;
}
export interface Backup {
  format: "plex-learning";
  version: 1 | 2 | 3;
  scope?: string;
  book: "plex-interactive-book";
  exportedAt: string;
  records: LearningRecord[];
}
let database: Promise<IDBDatabase> | undefined;
export function storageError(error: unknown) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("plex-storage-error", {
        detail: "学习记录未能保存：" + String(error) + "。请及时导出备份。",
      }),
    );
}
function db() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("plex-learning", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("records", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
  }));
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("records", mode);
    const request = action(tx.objectStore("records"));
    let result: T;
    request.onsuccess = () => (result = request.result);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error("保存中断"));
  });
}
export async function getLearning<T>(id: string, fallback: T): Promise<T> {
  try {
    return (
      ((
        (await transaction("readonly", (s) => s.get(learningKey(id)))) as
          | LearningRecord
          | undefined
      )?.value as T) ?? fallback
    );
  } catch (error) {
    storageError(error);
    return fallback;
  }
}
export async function putLearning(id: string, value: unknown) {
  try {
    const serializable = JSON.parse(JSON.stringify(value));
    await transaction("readwrite", (s) =>
      s.put({
        id: learningKey(id),
        value: serializable,
        updatedAt: new Date().toISOString(),
      }),
    );
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("plex-learning-changed", { detail: { id } }),
      );
  } catch (error) {
    storageError(error);
    throw error;
  }
}
export async function removeLearning(id: string) {
  try {
    await transaction("readwrite", (s) => s.delete(learningKey(id)));
  } catch (error) {
    storageError(error);
    throw error;
  }
}
// Read and merge in one transaction so a page visit cannot overwrite a reflection.
export async function updateLearning<T>(
  id: string,
  fallback: T,
  update: (value: T) => T,
): Promise<T> {
  try {
    const database = await db();
    const value = await new Promise<T>((resolve, reject) => {
      const tx = database.transaction("records", "readwrite");
      const store = tx.objectStore("records");
      const request = store.get(learningKey(id));
      let result: T;
      request.onsuccess = () => {
        try {
          result = JSON.parse(
            JSON.stringify(update(request.result?.value ?? fallback)),
          );
          store.put({
            id: learningKey(id),
            value: result,
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("保存中断"));
    });
    window.dispatchEvent(
      new CustomEvent("plex-learning-changed", { detail: { id } }),
    );
    return value;
  } catch (error) {
    storageError(error);
    throw error;
  }
}
export async function allLearning(): Promise<LearningRecord[]> {
  const records: LearningRecord[] = await transaction("readonly", (s) =>
    s.getAll(),
  );
  return records
    .filter((r) =>
      learningScope
        ? r.id.startsWith(learningScope)
        : !r.id.startsWith("user:"),
    )
    .map((r) => ({ ...r, id: r.id.slice(learningScope.length) }));
}
export async function copyGuestLearning() {
  if (!learningScope) return;
  const records: LearningRecord[] = await transaction("readonly", (s) =>
    s.getAll(),
  );
  await importBackup({
    format: "plex-learning",
    version: 3,
    book: "plex-interactive-book",
    exportedAt: new Date().toISOString(),
    records: records.filter((r) => !r.id.startsWith("user:")),
  });
}
export async function migrateLegacy() {
  if (learningScope) return;
  if (await getLearning("migration:v01", false)) return;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (!key.startsWith("plex:") || key.startsWith("plex:user:")) continue;
    try {
      const id = key.slice(5);
      if ((await getLearning(id, undefined)) === undefined)
        await putLearning(id, JSON.parse(localStorage.getItem(key)!));
    } catch (error) {
      storageError(error);
      throw error;
    }
  }
  await putLearning("migration:v01", true);
}
export async function migrateLessonData() {
  for (const record of await allLearning()) {
    const value=record.value as any;
    if(value?.version!==1) continue;
    const next=record.id==='unit:monty-hall'?upgradeProgress(value):record.id==='lab:monty-hall'?upgradeSession(value):record.id.startsWith('blackboard:')?upgradeBoard(value):value;
    if(next!==value)await putLearning(record.id,next);
  }
}
export function validateBackup(value: unknown): Backup {
  const data = value as Backup;
  if (
    !data ||
    data.format !== "plex-learning" ||
    ![1, 2, 3].includes(data.version) ||
    data.book !== "plex-interactive-book" ||
    !Array.isArray(data.records) ||
    data.records.length > 100000
  )
    throw Error("不是受支持的星轨学习备份");
  for (const record of data.records) {
    if (
      !record ||
      typeof record.id !== "string" ||
      !record.id ||
      /^(user:|auth:|token:|session:)/.test(record.id) ||
      typeof record.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(record.updatedAt)) ||
      !("value" in record)
    )
      throw Error("备份记录格式错误");
    const value = record.value as Record<string, unknown> | null;
    if (["simulation:monty-hall", "simulation:monty-single"].includes(record.id)) {
      const simulation = value as any;
      if (
        !simulation ||
        typeof simulation.code !== "string" ||
        ![1, 10, 100, 1000, 10000].includes(simulation.count) ||
        !Number.isInteger(simulation.seed) ||
        simulation.seed < 0 ||
        simulation.seed > 2147483647
      )
        throw Error("批量实验记录格式错误");
      if (simulation.result) validateSimulation(simulation.result);
    }
    if(record.id.startsWith('lesson:monty-')){
      const lesson=value as any;
      if(!lesson||!doors.includes(lesson.first)||!doors.includes(lesson.prize)||!Array.isArray(lesson.selected)||lesson.selected.some((d:any)=>!doors.includes(d))||![0,1,2].includes(lesson.step)||typeof lesson.checked!=='boolean')throw Error('教学演示记录格式错误');
    }
    if (record.id === "lab:monty-hall") {
      const story = value as any;
      const validPrediction=(p:any)=>p&&['换门更好','不换门更好','两者一样','跳过预测'].includes(p.choice)&&typeof p.reason==='string'&&p.reason.length<=2000&&Number.isInteger(p.round)&&p.round>=0&&(p.at===undefined||(typeof p.at==='string'&&Number.isFinite(Date.parse(p.at))));
      if(story?.firstPrediction&&!validPrediction(story.firstPrediction))throw Error('首次预测格式错误');
      if(story?.revisions!==undefined&&(!Array.isArray(story.revisions)||story.revisions.length>200||story.revisions.some((p:any)=>!validPrediction(p))))throw Error('预测修正格式错误');
      if (
        !story ||
        ![1, 2].includes(story.version) ||
        !Number.isInteger(story.seed) ||
        story.seed < 0 ||
        story.seed > 2147483647 ||
        !Number.isInteger(story.round) ||
        story.round < 0 ||
        ![0, 1, 2, 3].includes(story.step) ||
        !doors.includes(story.prize) ||
        !Array.isArray(story.history) ||
        story.history.length > 200 ||
        (story.step >= 1 && !doors.includes(story.first)) ||
        (story.step >= 2 &&
          !eligibleDoors(story.prize, story.first).includes(story.opened)) ||
        (story.step === 3 &&
          ![story.first, remainingDoor(story.first, story.opened)].includes(
            story.final,
          ))
      )
        throw Error("三门故事记录格式错误");
    }
    if (record.id.startsWith("blackboard:")) {
      const board = value as any;
      if (
        !board ||
        ![1, 2].includes(board.version) ||
        typeof board.sectionId !== "string" ||
        !Array.isArray(board.marks) ||
        board.marks.length > 300 ||
        board.marks.some(
          (m: any) =>
            !m ||
            typeof m.id !== "string" ||
            !["stroke", "text", "scene", "shape"].includes(m.kind) ||
            !/^#[a-f0-9]{6}$/i.test(m.color) ||
            (m.kind === "text" &&
              (typeof m.text !== "string" ||
                m.text.length > 200 ||
                !Number.isFinite(m.x) ||
                !Number.isFinite(m.y))) ||
            (m.kind === "stroke" &&
              (!Array.isArray(m.points) ||
                m.points.length > 4000 ||
                m.points.some(
                  (p: any) =>
                    !Array.isArray(p) ||
                    p.length !== 2 ||
                    !p.every(Number.isFinite),
                ))) ||
            (m.kind === "shape" && (!['rectangle','ellipse','arrow'].includes(m.shape) || !Number.isInteger(m.seed) || m.seed<1 || ![m.x,m.y,m.width,m.height].every((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1000))) ||
            (m.kind === "scene" && (!m.scene || ![1,2].includes(m.scene.version))),
        )
      )
        throw Error("小黑板记录格式错误");
    }
    if (record.id === "unit:monty-hall") {
      const unit = value as any;
      for(const key of ['completed','hintUsage'])if(unit?.[key]!==undefined){
        const map=unit[key];
        if(!map||typeof map!=='object'||Array.isArray(map)||Object.entries(map).some(([k,v])=>!k.startsWith('unit/monty/')||(key==='completed'?(typeof v!=='string'||!Number.isFinite(Date.parse(v))):(!Number.isInteger(v)||Number(v)<0||Number(v)>10))))throw Error('活动完成或提示记录格式错误');
      }
      if(unit?.locator&&(!unit.locator.sectionId?.startsWith('unit/monty/')||typeof unit.locator.activity!=='string'))throw Error('活动定位格式错误');
      if (
        !unit ||
        ![1, 2].includes(unit.version) ||
        !Array.isArray(unit.visited) ||
        unit.visited.some((id: any) => typeof id !== "string") ||
        !Array.isArray(unit.assessment) ||
        typeof unit.reflection !== "string"
      )
        throw Error("单元进度格式错误");
    }
    if (
      record.id.startsWith("draft:") &&
      (!value || typeof value.code !== "string")
    )
      throw Error("草稿记录格式错误");
    if (
      record.id.startsWith("annotation:") &&
      (!value ||
        typeof value.exact !== "string" ||
        typeof value.note !== "string" ||
        !value.start ||
        !value.end ||
        !["highlight", "underline", "note"].includes(String(value.kind)))
    )
      throw Error("批注记录格式错误");
  }
  return data;
}
export async function exportBackup(): Promise<Backup> {
  // H5P still persists its own runtime state in localStorage.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith(localLearningKey("h5p:")))
      await putLearning(
        key.slice(5 + learningScope.length),
        JSON.parse(localStorage.getItem(key)!),
      );
  }
  return {
    format: "plex-learning",
    version: 3,
    scope: learningScope || "guest",
    book: "plex-interactive-book",
    exportedAt: new Date().toISOString(),
    records: await allLearning(),
  };
}
export async function importBackup(value: unknown) {
  const backup = validateBackup(value);
  for (const record of backup.records) {
    const existing = await getLearning(record.id, undefined);
    if (
      existing !== undefined &&
      JSON.stringify(existing) !== JSON.stringify(record.value)
    ) {
      await putLearning(
        `conflict:${record.id}:${crypto.randomUUID()}`,
        record.value,
      );
      continue;
    }
    await putLearning(record.id, record.value);
    if (record.id.startsWith("h5p:"))
      localStorage.setItem(
        localLearningKey(record.id),
        JSON.stringify(record.value),
      );
  }
  await migrateLessonData();
}
export function download(
  name: string,
  body: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
