const { chromium } = require("playwright-core");

(async () => {
  const exe = "C:\\Users\\lenovo\\.agent-browser\\browsers\\chrome-156.0.8078.47\\chrome.exe";
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const failed = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400) failed.push(r.status() + " " + r.url()); });

  await page.goto("http://127.0.0.1:5191/read/chapter_divide_and_conquer/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  // 逐页翻，找可见的「开始探险」按钮
  let clicked = false;
  for (let i = 0; i < 26 && !clicked; i++) {
    const btn = page.locator('[data-action="chapter12"]').first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      clicked = true;
      break;
    }
    const next = page.locator('text=下一页').first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click().catch(() => {});
    await page.waitForTimeout(900);
  }

  await page.waitForTimeout(3500);
  const body = await page.textContent("body");
  const panelOpened = /探险工作台/.test(body || "");
  await page.screenshot({ path: "E:/数字教材/ch12_panel.png" });

  console.log(JSON.stringify({
    clicked,
    panelOpened,
    failedRequests: failed.slice(0, 10),
    errors: errors.slice(0, 10),
  }, null, 2));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
