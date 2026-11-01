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
  page.on('response', (r) => { if (r.status() >= 400) out.push('HTTP ' + r.status() + ' ' + r.url()); });
  try {
    await page.goto('http://127.0.0.1:5190/read/unit/lab/route-planner.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'E:/数字教材/.shot-lab-p13.png' });
    await page.locator('button:visible:has-text("查看 / 运行")').first().click();
    await page.waitForTimeout(7000);
    const info = await page.evaluate(() => {
      const panel = document.querySelector('.code-panel, [class*=code-panel]');
      const editor = document.querySelector('.code-editor textarea, .code-editor .cm-content, .code-editor');
      return {
        found: !!panel,
        cls: panel ? panel.className : null,
        htmlLen: panel ? panel.innerHTML.length : 0,
        text: panel ? panel.textContent.trim().slice(0, 160) : null,
        editorFound: !!editor,
      };
    });
    out.push('panel: ' + JSON.stringify(info));
    await page.screenshot({ path: 'E:/数字教材/.shot-lab-4.png' });
  } catch (e) {
    out.push('ERROR ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'E:/数字教材/.shot-lab-err.png' }).catch(() => {});
  }
  fs.writeFileSync('E:/数字教材/.lab4.txt', out.join('\n'), 'utf8');
  await browser.close();
})();
