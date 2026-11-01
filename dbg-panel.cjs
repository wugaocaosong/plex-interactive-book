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
    await page.waitForTimeout(2600);
    await page.click('.toolbar-type');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'E:/数字教材/.shot-panel-1.png' });
    // 功能回归：切学习模式 + 墨夜 + 衬线
    await page.getByRole('button', { name: /学习模式/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '墨夜' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '衬线 · 书卷' }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'E:/数字教材/.shot-panel-2.png' });
    out.push('panel ok');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    out.push(await page.evaluate(() => document.querySelector('.reader')?.className));
    await page.screenshot({ path: 'E:/数字教材/.shot-panel-3.png' });
  } catch (e) {
    out.push('ERROR ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'E:/数字教材/.shot-panel-err.png' }).catch(() => {});
  }
  fs.writeFileSync('E:/数字教材/.panel.txt', out.join('\n'), 'utf8');
  await browser.close();
})();
