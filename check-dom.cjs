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
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('[data-section]')].map((el) => ({
      sec: el.dataset.section,
      cls: el.className,
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      terms: el.querySelectorAll('.glossary-term').length,
      parentCls: el.parentElement ? el.parentElement.className : '',
    }));
    const pages = [...document.querySelectorAll('.reader-page, .page, .stf__item')].map((el) => ({
      cls: el.className,
      sec: el.dataset.section || '',
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      terms: el.querySelectorAll('.glossary-term').length,
    }));
    return { secs, pages, title: document.title };
  });
  fs.writeFileSync('E:/数字教材/.dom.txt', JSON.stringify(info, null, 2), 'utf8');
  await browser.close();
})();
