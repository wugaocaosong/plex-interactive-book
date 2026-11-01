const { chromium } = require('playwright');
const fs = require('fs');

const targets = [
  ['chapter_graph/graph', 1],
  ['chapter_graph/graph_traversal', 1],
  ['chapter_graph/graph_operations', 1],
  ['chapter_searching/binary_search', 1],
  ['chapter_sorting/bubble_sort', 1],
  ['chapter_sorting/quick_sort', 1],
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const out = [];
  for (const [p] of targets) {
    await page.goto(`http://127.0.0.1:5190/read/${p}.html`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2200);
    const leaves = await page.evaluate(() =>
      [...document.querySelectorAll('.stf__item')].map((el, i) => ({
        sec: el.dataset.section,
        n: el.querySelectorAll('.glossary-term').length,
        terms: [...el.querySelectorAll('.glossary-term')].map((e) => e.dataset.term),
      })),
    );
    const total = leaves.reduce((a, b) => a + b.n, 0);
    out.push(`${p}\ttotal=${total}\t${leaves.filter((l) => l.n).map((l) => `${l.sec}:${l.terms.join('/')}`).join(' | ')}`);
  }
  fs.writeFileSync('E:/数字教材/.gloss2.txt', out.join('\n'), 'utf8');
  await page.goto('http://127.0.0.1:5190/read/chapter_graph/graph.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'E:/数字教材/.shot_gloss2.png' });
  await browser.close();
})();
