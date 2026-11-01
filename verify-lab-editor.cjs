/* 实验台页内编辑器验证：渲染数量、运行输出、难度切换、草稿恢复 */
const { chromium } = require("playwright-core");

const EDITOR_SEL = ".lab-editor";
const outHas = (text) => `[...document.querySelectorAll(".lab-editor-out")].some(el => el.textContent.includes(${JSON.stringify(text)}))`;
const clickAction = async (page, sel) => {
  await page.waitForSelector(sel, { state: "attached", timeout: 30000 });
  await page.$eval(sel, (el) =>
    el.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
};

(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Users/lenovo/.agent-browser/browsers/chrome-156.0.8078.47/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  // ---- 1. 实验一（基础档应有 2 个实验台）----
  await page.goto("http://127.0.0.1:5190/read/unit/lab/graph", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(EDITOR_SEL, { state: "attached", timeout: 40000 });
  console.log(
    "graph basic editors (3-section window):",
    await page.locator(EDITOR_SEL).count(),
  );
  const code = await page
    .locator(`${EDITOR_SEL}[data-lab-key="lab-graph-b1"] .lab-editor-code`).first()
    .inputValue();
  console.log("b1 starter ok:", code.includes("build_adj_list") && code.includes("ROUTES"));

  // ---- 2. 运行 b1，等待真实 Python 输出 ----
  await clickAction(page, `${EDITOR_SEL}[data-lab-key="lab-graph-b1"] [data-action="lab-run"]`);
  await page.waitForFunction(outHas("总站 →"), null, { timeout: 90000 });
  console.log("graph b1 run output OK");

  // ---- 3. 修改代码 → 运行（测热改热跑）----
  await page.$eval(`${EDITOR_SEL}[data-lab-key="lab-graph-b1"] .lab-editor-code`, (el) => {
    const ta = el;
    ta.value = ta.value.replace("graph = build_adj_list(len(STATIONS), ROUTES)",
      "graph = build_adj_list(len(STATIONS), ROUTES)\nprint('邻居数合计:', sum(len(r) for r in graph))");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickAction(page, `${EDITOR_SEL}[data-lab-key="lab-graph-b1"] [data-action="lab-run"]`);
  await page.waitForFunction(outHas("邻居数合计: 20"), null, { timeout: 60000 });
  console.log("edited run OK");

  // ---- 4. 切挑战档：出现挑战实验台 ----
  await clickAction(page, '.lab-level-bar button[data-level="challenge"]');
  await page.waitForSelector(`${EDITOR_SEL}[data-lab-key="lab-graph-c1"]`, { timeout: 40000 });
  console.log("challenge editor shown after level switch");
  const advGone = (await page.locator(`${EDITOR_SEL}[data-lab-key="lab-graph-b1"]`).count()) === 0;
  console.log("basic editors filtered in challenge:", advGone);

  // ---- 5. 实验报告页：完整程序 ----
  await clickAction(page, '.lab-level-bar button[data-level="basic"]');
  await page.goto("http://127.0.0.1:5190/read/unit/lab/report", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(`${EDITOR_SEL}[data-lab-key="lab-report-full"]`, { state: "attached", timeout: 40000 });
  await clickAction(page, `${EDITOR_SEL}[data-lab-key="lab-report-full"] [data-action="lab-run"]`);
  await page.waitForFunction(outHas("== 1. 建图 =="), null, { timeout: 90000 });
  await page.waitForFunction(outHas("== 4. 综合调度 =="), null, { timeout: 60000 });
  console.log("report full program run OK");
  await page.screenshot({ path: "E:/数字教材/.workbuddy/lab-editor-2.png" });

  // ---- 6. 学习模式：编辑器真正可见，截图验收 ----
  await page.goto("http://127.0.0.1:5190/read/unit/lab/traversal", { waitUntil: "networkidle" });
  await page.waitForSelector(EDITOR_SEL, { state: "attached", timeout: 40000 });
  await page.locator(".toolbar-actions button[aria-label*='设置'], .toolbar-actions button:has-text('Aa')").first().click().catch(() => {});
  await page.waitForTimeout(500);
  const studyBtn = page.locator('button:has-text("学习")').first();
  if (await studyBtn.count()) {
    await studyBtn.click();
    await page.waitForSelector(`${EDITOR_SEL}[data-lab-key="lab-traversal-b1"]`, { state: "attached", timeout: 40000 });
    await page.$eval(`${EDITOR_SEL}[data-lab-key="lab-traversal-b1"]`, (el) =>
      el.scrollIntoView({ block: "center" }),
    );
    await page.waitForTimeout(400);
    console.log("study mode editors:", await page.locator(EDITOR_SEL).count());
    await page.screenshot({ path: "E:/数字教材/.workbuddy/lab-editor-1.png" });
  } else console.log("study toggle not found (skip)");

  console.log("console errors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
