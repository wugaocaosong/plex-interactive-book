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
    await page.screenshot({ path: 'E:/数字教材/.shot-set-1.png' });
    await page.getByRole('button', { name: '衬线 · 书卷' }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'E:/数字教材/.shot-set-2.png' });
    out.after = await page.evaluate(() => {
      const r = document.querySelector('.reader');
      const leaf = document.querySelector('.leaf-content');
      return {
        varValue: r ? getComputedStyle(r).getPropertyValue('--reader-family') : null,
        leafFont: leaf ? getComputedStyle(leaf).fontFamily : null,
        activeBtn: Array.from(document.querySelectorAll('.segmented button.active')).map((b) => b.textContent.trim()),
      };
    });
    // 深色 + 沉浸
    await page.getByRole('button', { name: '墨夜' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'E:/数字教材/.shot-set-3.png' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    out.dark = await page.evaluate(() => document.querySelector('.reader')?.className);
  } catch (e) {
    out.error = e.message.split('\n')[0];
    await page.screenshot({ path: 'E:/数字教材/.shot-set-err.png' }).catch(() => {});
  }
  fs.writeFileSync('E:/数字教材/.dbg-font.txt', JSON.stringify(out, null, 1), 'utf8');
  await browser.close();
})();
