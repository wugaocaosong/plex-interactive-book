const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = [];
  try {
    await page.goto('http://127.0.0.1:5190/read/chapter_graph/graph.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // 深色模式（沿用上次保存的偏好：衬线 + 墨夜）
    await page.screenshot({ path: 'E:/数字教材/.shot-dark-read.png' });
    out.push('dark ok');
    // 沉浸模式
    await page.click('button[title="沉浸阅读"]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'E:/数字教材/.shot-imm2.png' });
    out.push('immersion ok');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    // 学习模式切换（底部导航）
    const navBtns = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.bottom-navigation button')).map((b) => b.getAttribute('aria-label')),
    );
    out.push('nav: ' + JSON.stringify(navBtns));
    const modeBtn = page.locator('.bottom-navigation button[aria-label*="模式"]');
    if (await modeBtn.count()) {
      await modeBtn.first().click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'E:/数字教材/.shot-study.png' });
      out.push('study ok');
    } else {
      out.push('no mode btn in nav');
    }
  } catch (e) {
    out.push('ERROR ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'E:/数字教材/.shot-err2.png' }).catch(() => {});
  }
  fs.writeFileSync('E:/数字教材/.dbg2.txt', out.join('\n'), 'utf8');
  await browser.close();
})();
