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
    await page.goto('http://127.0.0.1:5190/read/unit/lab/route-planner.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2800);
    out.push('title: ' + await page.title());
    await page.screenshot({ path: 'E:/数字教材/.shot-lab-1.png' });
    // 翻到第二页看代码窗口
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    await page.screenshot({ path: 'E:/数字教材/.shot-lab-2.png' });
    // 打开代码面板
    const btn = page.locator('button:has-text("查看 / 运行")').first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'E:/数字教材/.shot-lab-3.png' });
      out.push('code panel opened');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    // 搜索能命中
    await page.keyboard.press('Escape');
    await page.click('button[aria-label="搜索全书"], .more-tools button:has-text("搜索"), .bottom-navigation button[aria-label="更多阅读工具"]').catch(() => {});
    await page.waitForTimeout(400);
    out.push('done');
  } catch (e) {
    out.push('ERROR ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'E:/数字教材/.shot-lab-err.png' }).catch(() => {});
  }
  fs.writeFileSync('E:/数字教材/.lab.txt', out.join('\n'), 'utf8');
  await browser.close();
})();
