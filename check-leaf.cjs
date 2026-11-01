const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5190/read/chapter_graph/graph.html', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);
  const leaves = await page.evaluate(() =>
    [...document.querySelectorAll('.stf__item')].map((el, i) => {
      const t = [...el.querySelectorAll('.glossary-term')].map((e) => e.dataset.term || e.textContent);
      const c = {};
      t.forEach((x) => (c[x] = (c[x] || 0) + 1));
      return {
        i,
        visible: !!(el.offsetWidth || el.offsetHeight),
        n: t.length,
        terms: t,
        dupInLeaf: Object.entries(c).filter(([, v]) => v > 1),
      };
    }),
  );
  fs.writeFileSync('E:/数字教材/.leaf.txt', JSON.stringify(leaves, null, 1), 'utf8');
  await browser.close();
})();
