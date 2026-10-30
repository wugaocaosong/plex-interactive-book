import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = (file: string) =>
  readFileSync("web/.vitepress/theme/" + file, "utf8").replace(
    /^import[\s\S]*?from\s*["'][^"']+["'];?\s*/gm,
    "",
  );
const annotations = ts.transpileModule(
  source("text-coordinates.ts") + "\n" + source("annotations.ts"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
const store = ts.transpileModule(
  source("learning-scope.ts") +
    "\n" +
    source("monty-hall.ts") + "\n" + source("lesson-state.ts") + "\n" + source("blackboard-model.ts") +
    "\n" +
    source("learning-store.ts"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;

test("legacy bookmarks migrate and notebook backups round-trip through the UI", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "plex:bookmarks",
      JSON.stringify([
        { sectionId: "title", blockId: "b1", offset: 0, title: "旧版书签" },
      ]),
    ),
  );
  await page.goto("/read/title");
  await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
  await page.getByRole("button", { name: "更多阅读工具" }).click();
  await page.getByRole("button", { name: "查看书签" }).click();
  await expect(page.locator(".bookmark-list")).toContainText("旧版书签");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "本段笔记" }).click();
  await page.getByLabel("批注内容").fill("备份往返测试");
  await page.getByRole("button", { name: "保存批注", exact: true }).click();
  await page.getByRole("button", { name: "更多阅读工具" }).click();
  await page.getByRole("button", { name: "学习笔记", exact: true }).click();
  await expect(page.getByLabel("编辑笔记")).toHaveValue("备份往返测试");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部学习备份" }).click();
  const backup = readFileSync((await (await downloadEvent).path())!);
  const context = await browser.newContext();
  const restored = await context.newPage();
  await restored.goto(new URL("/read/title", page.url()).href);
  await expect(restored.locator(".book-holder")).not.toHaveClass(/loading/);
  await restored.getByRole("button", { name: "更多阅读工具" }).click();
  await restored.getByRole("button", { name: "学习笔记", exact: true }).click();
  await restored.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await expect(restored.locator(".backup-preview")).toContainText("即将导入");
  await restored.getByRole("button", { name: "确认导入" }).click();
  await expect(restored.getByLabel("编辑笔记")).toHaveValue("备份往返测试");
  await context.close();
});

test("quote anchors recover uniquely, refuse ambiguous or removed text and preserve formula offsets", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async (code) => {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/javascript" }),
    );
    const api = await import(url);
    URL.revokeObjectURL(url);
    const root = document.createElement("div");
    root.innerHTML =
      '<p data-block="new">插入段落</p><p data-block="original">前文引用文本后文</p>';
    const now = new Date().toISOString();
    const note = {
      id: "one",
      sectionId: "chapter",
      kind: "highlight",
      start: { sectionId: "chapter", blockId: "old", offset: 2 },
      end: { sectionId: "chapter", blockId: "old", offset: 6 },
      exact: "引用文本",
      prefix: "前文",
      suffix: "后文",
      note: "笔记",
      createdAt: now,
      updatedAt: now,
      status: "located",
    };
    const unique = api.reanchor(note, root);
    root.innerHTML += '<p data-block="copy">前文引用文本后文</p>';
    const ambiguous = api.reanchor(note, root);
    root.innerHTML = '<p data-block="other">原文已经删除</p>';
    const removed = api.reanchor(note, root);
    root.innerHTML =
      '<p data-block="math">左<span class="arithmatex" data-tex="\\(x\\)"><span class="katex">xx</span></span>右侧文字</p>';
    const block = root.firstElementChild;
    api.markRange(block, 6, 10, "highlight", "math-note");
    return {
      unique,
      ambiguous,
      removed,
      canonical: api.canonicalText(block),
      marked: block.querySelector("mark")?.textContent,
      search: api.searchText("之前\n  目标\n\t词语  后文", "目标 词语"),
    };
  }, annotations);
  expect(result.unique.status).toBe("located");
  expect(result.unique.start.blockId).toBe("original");
  expect(result.ambiguous.status).toBe("orphan");
  expect(result.removed.status).toBe("orphan");
  expect(result.marked).toBe("右侧文字");
  expect(result.canonical).toBe("左\\(x\\)右侧文字");
  expect(result.search.offset).toBe(5);
});

test("legacy migration, complete backups, conflict preservation and storage failure reporting", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async (code) => {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/javascript" }),
    );
    const api = await import(url);
    URL.revokeObjectURL(url);
    localStorage.setItem("plex:h5p:test:v1", JSON.stringify({ score: 2 }));
    await api.putLearning("draft:fixture", { code: "print(1)" });
    await api.putLearning("annotation:fixture", {
      id: "fixture",
      sectionId: "title",
      kind: "note",
      start: { sectionId: "title", blockId: "fixture", offset: 0 },
      end: { sectionId: "title", blockId: "fixture", offset: 2 },
      status: "located",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      prefix: "",
      suffix: "",
      exact: "引用",
      note: "笔记",
    });
    const backup = await api.exportBackup();
    await api.putLearning("draft:fixture", { code: "print(2)" });
    await api.importBackup(backup);
    const records = await api.allLearning();
    let invalid = false;
    try {
      api.validateBackup({ format: "other" });
    } catch {
      invalid = true;
    }
    let notice = "";
    window.addEventListener(
      "plex-storage-error",
      (e: any) => (notice = e.detail),
      { once: true },
    );
    api.storageError(Error("quota"));
    return {
      current: await api.getLearning("draft:fixture", null),
      conflict: records.some(
        (r: any) =>
          r.id.startsWith("conflict:draft:fixture:") &&
          (r.value as any).code === "print(1)",
      ),
      h5p: backup.records.some((r: any) => r.id === "h5p:test:v1"),
      invalid,
      notice,
    };
  }, store);
  expect(result.current.code).toBe("print(2)");
  expect(result.conflict).toBe(true);
  expect(result.h5p).toBe(true);
  expect(result.invalid).toBe(true);
  expect(result.notice).toContain("未能保存");
});

for (const width of [390, 820, 1440])
  test(`settings, exact search and keyboard navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/read/chapter_searching/binary_search#b1");
    await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
    await expect(page).toHaveURL(/#blk-/);
    await page.getByRole("button", { name: "更多阅读工具" }).click();
    await page.getByRole("button", { name: "阅读设置", exact: true }).click();
    await page.getByLabel("字号").fill("26");
    await page.getByLabel("字号").dispatchEvent("change");
    await page.getByLabel("行距").selectOption("2.1");
    await page.getByLabel("主题").selectOption("dark");
    await page.keyboard.press("Escape");
    await expect(page.locator(".reader")).toHaveClass(/theme-dark/);
    await expect(page.locator(".book-holder")).not.toHaveClass(/loading/);
    const overflow = await page
      .locator(".book-host .leaf-content")
      .evaluateAll(
        (nodes) =>
          nodes.filter(
            (n) =>
              n.scrollHeight > n.clientHeight + 2 ||
              n.scrollWidth > n.clientWidth + 2,
          ).length,
      );
    expect(overflow).toBe(0);
    await page.getByRole("button", { name: "更多阅读工具" }).click();
    await page.getByRole("button", { name: "搜索全书" }).click();
    await page.getByLabel("搜索关键词").fill("缩小一半搜索范围");
    await page.locator(".search-results>button").first().click();
    await expect(
      page.locator(".book-host .annotation-search:visible").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "更多阅读工具" }).click();
    await page.getByRole("button", { name: "切换阅读模式" }).click();
    await expect(page.getByLabel("连续正文")).toBeVisible();
    await page.screenshot({
      path: `output/playwright/v02-study-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "更多阅读工具" }).click();
    await page.getByRole("button", { name: "打开学习实验室" }).click();
    await expect(page.locator('.content-dialog')).toHaveAttribute('aria-modal','true');
    await expect(page.getByRole("separator")).toHaveCount(0);
    await page.getByRole('button',{name:'放大窗口'}).click();
    await expect(page.locator('.overlay')).toHaveClass(/window-expanded/);
    await page.getByRole('button',{name:'还原窗口'}).click();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("连续正文")).toBeVisible();
  });

test("concurrent unit visits merge atomically without losing reflection", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async (code) => {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/javascript" }),
    );
    const api = await import(url);
    URL.revokeObjectURL(url);
    const id = "unit:atomic-test";
    await api.putLearning(id, { visited: [], reflection: "我的解释" });
    await Promise.all(
      Array.from({ length: 14 }, (_, i) =>
        api.updateLearning(id, {}, (value: any) => ({
          ...value,
          visited: [...value.visited, i],
        })),
      ),
    );
    return api.getLearning(id, {});
  }, store);
  expect(result).toEqual({
    visited: Array.from({ length: 14 }, (_, i) => i),
    reflection: "我的解释",
  });
});

test('v04 migration is idempotent, backup v3 retains geometry and rejects invalid predictions',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async(code)=>{
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const s=await import(url);URL.revokeObjectURL(url);
  const now=new Date().toISOString();
  const old={format:'plex-learning',version:2,book:'plex-interactive-book',exportedAt:now,records:[{id:'unit:monty-hall',updatedAt:now,value:{version:1,visited:['unit/monty/start'],assessment:[],reflection:'旧反思',updatedAt:now}},{id:'lab:monty-hall',updatedAt:now,value:{version:1,seed:2026,round:0,step:0,prize:1,history:[]}},{id:'blackboard:unit/monty/start',updatedAt:now,value:{version:1,sectionId:'unit/monty/start',marks:[],updatedAt:now}}]};
  await s.importBackup(old);const first=await s.allLearning();await s.migrateLessonData();const second=await s.allLearning();
  const board=await s.getLearning('blackboard:unit/monty/start',null);board.marks=s.probabilityTemplate();await s.putLearning('blackboard:unit/monty/start',board);
  const backup=await s.exportBackup();s.validateBackup(backup);let invalid=false;try{s.validateBackup({...backup,records:[{id:'lab:monty-hall',updatedAt:now,value:{...await s.getLearning('lab:monty-hall',null),firstPrediction:{choice:'invented',reason:'',round:0}}}]});}catch{invalid=true;}
  return {same:JSON.stringify(first)===JSON.stringify(second),version:backup.version,unit:await s.getLearning('unit:monty-hall',null),story:await s.getLearning('lab:monty-hall',null),board,invalid};
 },store);
 expect(result.same).toBe(true);expect(result.version).toBe(3);expect(result.unit.completed).toEqual({});expect(result.story.firstPrediction).toBeUndefined();expect(result.board.version).toBe(2);expect(result.board.marks).toHaveLength(6);expect(result.invalid).toBe(true);
});
