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
    await page.waitForTimeout(2800);
    out.load = await page.evaluate(() => {
      const r = document.querySelector('.reader');
      const leaf = document.querySelector('.book-leaf');
      return {
        cls: r?.className,
        paper: getComputedStyle(r).getPropertyValue('--paper'),
        leafBg: leaf ? getComputedStyle(leaf).backgroundColor : null,
        leafClass: leaf ? leaf.className : null,
      };
    });
    // 手动点墨夜再截一张
    await page.click('.toolbar-type');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '墨夜' }).click();
    await page.waitForTimeout(1000);
    out.dark = await page.evaluate(() => {
      const r = document.querySelector('.reader');
      const leaf = document.querySelector('.book-leaf');
      return {
        cls: r?.className,
        paper: getComputedStyle(r).getPropertyValue('--paper'),
        leafBg: leaf ? getComputedStyle(leaf).backgroundColor : null,
      };
    });
    await page.screenshot({ path: 'E:/数字教材/.shot-dark2.png' });
  } catch (e) {
    out.error = e.message.split('\n')[0];
  }
  fs.writeFileSync('E:/数字教材/.dbg3.txt', JSON.stringify(out, null, 1), 'utf8');
  await browser.close();
})();
