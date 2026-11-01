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
  page.on('console', (m) => { if (m.type() === 'error') out.push('console-err: ' + m.text().slice(0, 160)); });
  try {
    await page.goto('http://127.0.0.1:5190/read/unit/lab/route-planner.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await page.locator('button:has-text("查看 / 运行")').first().click();
    await page.waitForTimeout(6000);
    await page.screenshot({ path: 'E:/数字教材/.shot-lab-4.png' });
    out.push('panel after 6s');
    // 点运行
    const run = page.locator('.code-panel button:has-text("运行"), [class*=panel] button:has-text("运行")').first();
    if (await run.count()) {
      await run.click();
      await page.waitForTimeout(9000);
      await page.screenshot({ path: 'E:/数字教材/.shot-lab-5.png' });
      out.push('clicked run, waited 9s');
    } else {
      out.push('no run button');
    }
  } catch (e) {
    out.push('ERROR ' + e.message.split('\n')[0]);
  }
  fs.writeFileSync('E:/数字教材/.lab2.txt', out.join('\n'), 'utf8');
  await browser.close();
})();
