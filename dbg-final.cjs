const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = {};
  try {
    await page.goto('http://127.0.0.1:5190/read/chapter_graph/graph.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.click('.toolbar-type');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'E:/数字教材/.shot-final-1.png' });
    // 切学习模式
    await page.getByRole('button', { name: /学习模式/ }).click();
    await page.waitForTimeout(1500);
    out.mode = await page.evaluate(() => document.querySelector('.reader')?.getAttribute('data-mode'));
    await page.screenshot({ path: 'E:/数字教材/.shot-final-2.png' });
    // 切回翻书
    await page.click('.toolbar-type');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /翻书模式/ }).click();
    await page.waitForTimeout(1200);
    out.modeBack = await page.evaluate(() => document.querySelector('.reader')?.getAttribute('data-mode'));
  } catch (e) {
    out.error = e.message.split('\n')[0];
    await page.screenshot({ path: 'E:/数字教材/.shot-final-err.png' }).catch(() => {});
  }
  fs.writeFileSync('E:/数字教材/.dbg4.txt', JSON.stringify(out, null, 1), 'utf8');
  await browser.close();
})();
