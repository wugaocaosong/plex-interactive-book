const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto('http://127.0.0.1:5190/read/chapter_graph/graph.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2600);
    await page.keyboard.press('Escape');
    await page.click('.toolbar-type');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /学习模式/ }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'E:/数字教材/.shot-novel-4.png' });
  } catch (e) {
    console.log('ERROR', e.message.split('\n')[0]);
  }
  await browser.close();
})();
