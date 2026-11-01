const { chromium } = require("playwright-core");
const click = async (page, sel) => {
  await page.waitForSelector(sel, { state: "attached", timeout: 40000 });
  await page.$eval(sel, (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};
(async () => {
  // A. 翻书模式：编辑器是否被分页截断
  const browser = await chromium.launch({ executablePath: "C:/Users/lenovo/.agent-browser/browsers/chrome-156.0.8078.47/chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  await page.goto("http://127.0.0.1:5190/read/unit/lab/graph", { waitUntil: "networkidle" });
  await page.waitForSelector(".lab-editor", { state: "attached", timeout: 40000 });
  const truncated = await page.evaluate(() => document.querySelectorAll(".expanded-block .lab-editor").length);
  console.log("flip truncated editors:", truncated);
  const inLeaf = await page.evaluate(() => document.querySelectorAll(".book-leaf .leaf-content .lab-editor").length);
  console.log("flip leaf editors:", inLeaf);
  // 翻到含编辑器的页并截图
  const idx = await page.evaluate(() => {
    const leaves = [...document.querySelectorAll(".book-leaf .leaf-content")];
    return leaves.findIndex((l) => l.querySelector('.lab-editor[data-lab-key="lab-graph-b1"]'));
  });
  if (idx >= 0) {
    const info = await page.evaluate((i) => {
      const leaf = document.querySelectorAll(".book-leaf")[i];
      const card = leaf.querySelector(".lab-editor");
      const a = card.getBoundingClientRect(), b = leaf.getBoundingClientRect();
      return { cardH: Math.round(a.height), leafH: Math.round(b.height), overflow: Math.round(b.bottom - a.bottom) };
    }, idx);
    console.log("editor card fits:", JSON.stringify(info));
    await page.evaluate((i) => { window.scrollTo(0, 0); }, 0);
    // 直接把那一页滚进视口（PageFlip 翻页难模拟，用截图代替：截那一页元素）
  }
  await browser.close();

  // B. 草稿持久化：persistent profile
  const ctx = await chromium.launchPersistentContext("E:/数字教材/.workbuddy/lab-profile", {
    executablePath: "C:/Users/lenovo/.agent-browser/browsers/chrome-156.0.8078.47/chrome.exe",
    headless: true, viewport: { width: 1400, height: 950 },
  });
  const p1 = ctx.pages()[0] || await ctx.newPage();
  await p1.goto("http://127.0.0.1:5190/read/unit/lab/graph", { waitUntil: "networkidle" });
  await p1.waitForSelector(".lab-editor", { state: "attached", timeout: 40000 });
  await p1.$eval('.lab-editor[data-lab-key="lab-graph-b1"] .lab-editor-code', (el) => {
    el.value = "# 我改过的草稿\nprint('hello 星航')";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await p1.waitForTimeout(1200); // 等防抖保存
  await p1.reload({ waitUntil: "networkidle" });
  await p1.waitForSelector(".lab-editor", { state: "attached", timeout: 40000 });
  await p1.waitForTimeout(1500); // 等 IndexedDB 草稿回填
  const restored = await p1.$eval('.lab-editor[data-lab-key="lab-graph-b1"] .lab-editor-code', (el) => el.value);
  console.log("draft restored:", restored.startsWith("# 我改过的草稿"));
  await ctx.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
