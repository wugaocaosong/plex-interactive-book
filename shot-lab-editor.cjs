const { chromium } = require("playwright-core");
const click = async (page, sel) => {
  await page.waitForSelector(sel, { state: "attached", timeout: 40000 });
  await page.$eval(sel, (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};
(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Users/lenovo/.agent-browser/browsers/chrome-156.0.8078.47/chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  await page.goto("http://127.0.0.1:5190/read/unit/lab/graph", { waitUntil: "networkidle" });
  await page.waitForSelector(".lab-editor", { state: "attached", timeout: 40000 });
  // 切学习模式（通过设置面板）
  await page.locator(".toolbar-actions button").first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("学习模式")').first().click();
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  // 滚到 b1 编辑器并运行
  await page.$eval('.lab-editor[data-lab-key="lab-graph-b1"]', (el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "E:/数字教材/.workbuddy/shot-editor-basic.png" });
  await click(page, '.lab-editor[data-lab-key="lab-graph-b1"] [data-action="lab-run"]');
  await page.waitForFunction(() => [...document.querySelectorAll(".lab-editor-out")].some((el) => el.textContent.includes("总站 →")), null, { timeout: 90000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "E:/数字教材/.workbuddy/shot-editor-run.png" });
  // 墨夜主题
  await page.locator(".toolbar-actions button").first().click();
  await page.waitForTimeout(600);
  await page.locator('button:has-text("墨夜")').first().click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await page.$eval('.lab-editor[data-lab-key="lab-graph-b1"]', (el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "E:/数字教材/.workbuddy/shot-editor-dark.png" });
  console.log("shots done");
  await browser.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
