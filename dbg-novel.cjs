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
    await page.screenshot({ path: 'E:/数字教材/.shot-novel-1.png' });
    // 翻到后面一页看标题+代码块混排
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'E:/数字教材/.shot-novel-2.png' });
    // 学习模式看长文排版
    await page.keyboard.press('Escape');
    await page.click('.toolbar-type');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /学习模式/ }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'E:/数字教材/.shot-novel-3.png' });
    out.push('ok');
  } catch (e) {
    out.push('ERROR ' + e.message.split('\n')[0]);
  }
  fs.writeFileSync('E:/数字教材/.novel.txt', out.join('\n'), 'utf8');
  await browser.close();
})();
