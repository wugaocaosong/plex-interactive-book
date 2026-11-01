const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const log = [];
  try {
    await page.goto('http://127.0.0.1:5190/read/chapter_graph/graph.html', { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2500);

    // 阅读设置面板
    await page.click('.toolbar-type');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'E:/数字教材/.shot-settings.png' });
    log.push('settings ok');

    // 切衬线字体 + 宽松行距 + 深色
    await page.click('.segmented button:has-text("衬线")');
    await page.waitForTimeout(600);
    await page.click('.segmented button:has-text("宽松")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'E:/数字教材/.shot-settings-serif.png' });
    log.push('serif ok');

    const styleAfter = await page.evaluate(() => {
      const el = document.querySelector('.leaf-content');
      return el ? getComputedStyle(el).fontFamily + ' / ' + getComputedStyle(el).lineHeight : 'none';
    });
    log.push('leaf font: ' + styleAfter);

    // 关闭弹层，看更多菜单
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.click('.bottom-navigation button[aria-label="更多阅读工具"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'E:/数字教材/.shot-more.png' });
    log.push('more ok');

    // 沉浸模式
    await page.click('.immersion-entry');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'E:/数字教材/.shot-immersion.png' });
    const imm = await page.evaluate(() => {
      const r = document.querySelector('.reader');
      return {
        cls: r ? r.className : '',
        toolbar: !!document.querySelector('.reader-toolbar') && getComputedStyle(document.querySelector('.reader-toolbar')).display,
        nav: document.querySelector('.bottom-navigation') ? getComputedStyle(document.querySelector('.bottom-navigation')).display : 'missing',
        exit: !!document.querySelector('.immersion-exit'),
      };
    });
    log.push('immersion: ' + JSON.stringify(imm));

    // Esc 退出
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
    const back = await page.evaluate(() => {
      const r = document.querySelector('.reader');
      return r ? r.className : '';
    });
    log.push('after esc: ' + back);
    await page.screenshot({ path: 'E:/数字教材/.shot-after-esc.png' });
  } catch (e) {
    log.push('ERROR ' + e.message.split('\n')[0]);
    await page.screenshot({ path: 'E:/数字教材/.shot-error.png' }).catch(() => {});
  }
  require('fs').writeFileSync('E:/数字教材/.ui-log.txt', log.join('\n'), 'utf8');
  await browser.close();
})();
