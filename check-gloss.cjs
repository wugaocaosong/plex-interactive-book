const { chromium } = require('playwright');
const fs = require('fs');

const pages = [
  'chapter_graph/graph',
  'chapter_graph/graph_traversal',
  'chapter_graph/graph_operations',
  'chapter_searching/searching_algorithm_revisited',
  'chapter_searching/binary_search',
  'chapter_searching/binary_search_edge',
  'chapter_searching/binary_search_insertion',
  'chapter_sorting/sorting_algorithm',
  'chapter_sorting/selection_sort',
  'chapter_sorting/bubble_sort',
  'chapter_sorting/insertion_sort',
  'chapter_sorting/quick_sort',
  'chapter_sorting/merge_sort',
  'chapter_sorting/heap_sort',
  'chapter_sorting/bucket_sort',
  'chapter_sorting/counting_sort',
  'chapter_sorting/radix_sort',
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const lines = [];
  for (const p of pages) {
    try {
      await page.goto(`http://127.0.0.1:5190/read/${p}.html`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1500);
      const data = await page.evaluate(() => {
        const els = [...document.querySelectorAll('.glossary-term')];
        const terms = els.map((e) => (e.dataset.term || e.textContent || '').trim());
        const count = {};
        terms.forEach((t) => (count[t] = (count[t] || 0) + 1));
        return { total: terms.length, terms, dup: Object.entries(count).filter(([, v]) => v > 1) };
      });
      lines.push(`${p}\ttotal=${data.total}\tdup=${JSON.stringify(data.dup)}\n   ${data.terms.join(' / ')}`);
    } catch (e) {
      lines.push(`${p}\tERROR ${e.message.split('\n')[0]}`);
    }
  }
  fs.writeFileSync('E:/数字教材/.gloss_pages.txt', lines.join('\n'), 'utf8');
  await browser.close();
})();
