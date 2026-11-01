import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for(const width of [390,820,1440]) {
  test(`graphic cover, navigation and muted local wallpaper ${width}`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    await page.goto('/');
    await expect(page.locator('.cover-book img')).toBeVisible();
    await page.locator('.cover-book img').evaluate((img:HTMLImageElement)=>img.decode());
    const background=await page.locator('.reader').evaluate(el=>getComputedStyle(el,'::before').backgroundImage);
    expect(background).toContain('cyan-exploration.png');expect(background).toContain('linear-gradient');
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:`output/playwright/graphic-cover-${width}.png`});
    await page.getByRole('button',{name:'打开目录',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'星域目录'})).toHaveAttribute('aria-modal','true');
    await expect(page.locator('.dialog-close')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'打开目录',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'更多阅读工具'}).click();
    await page.locator('.navigation-dialog').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
    const axe=await new AxeBuilder({page}).include('.navigation-dialog').analyze();expect(axe.violations).toEqual([]);
    await page.getByRole('button',{name:'学习笔记',exact:true}).click();
    await expect(page.locator('.overlay')).toHaveAttribute('data-window','notes');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'更多阅读工具'})).toBeFocused();
  });
  for(const mode of ['flip','study'] as const) test(`floating workspace preserves page and focus ${width} ${mode}`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(mode=>localStorage.setItem('plex:preferences',JSON.stringify({mode,fontSize:18,lineHeight:1.8,theme:'light',width:'standard',split:40})),mode);
    await page.goto('/read/chapter_divide_and_conquer/divide_and_conquer');
    if(mode==='flip') {
      await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
      const id=await page.locator('.source-stage [data-mode=merge]').evaluate(el=>el.closest('[data-block]')!.getAttribute('data-block'));
      await page.evaluate(id=>location.hash=id!,id);
    }
    const root=page.locator(mode==='flip'?'.book-host':'.study-reader');
    const entry=root.locator('[data-mode=merge]:visible').first();await entry.scrollIntoViewIfNeeded();
    if(mode==='study') await expect.poll(()=>new URL(page.url()).hash).toMatch(/^#blk-/);
    const before={url:page.url(),box:await root.boundingBox(),scroll:await root.evaluate(el=>el.scrollTop)};
    await entry.click();
    const dialog=page.getByRole('dialog',{name:'分治 · 探险工作台'});await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal','true');await expect(page.locator('.study-panel')).toHaveCount(0);
    await expect(page.locator('#reading-content')).toHaveAttribute('inert','');
    const bounds=await dialog.boundingBox();expect(bounds!.x).toBeGreaterThan(5);expect(Math.abs(bounds!.x+bounds!.width/2-width/2)).toBeLessThan(3);
    expect(bounds!.y).toBeGreaterThan(4);expect(bounds!.y+bounds!.height).toBeLessThan(1000);
    const after=await root.boundingBox();expect(after!.width).toBe(before.box!.width);expect(page.url()).toBe(before.url);
    await page.getByLabel('模块编号',{exact:true}).fill('7,2,2,1');await page.getByRole('button',{name:'应用输入并重置'}).click();
    await page.getByRole('button',{name:'放大窗口'}).click();await page.getByRole('button',{name:'还原窗口'}).click();
    await expect(page.getByLabel('模块编号',{exact:true})).toHaveValue('7,2,2,1');
    const axe=await new AxeBuilder({page}).include('.content-dialog').analyze();expect(axe.violations).toEqual([]);
    await page.screenshot({path:`output/playwright/graphic-lab-${width}-${mode}.png`});
    await page.getByRole('button',{name:'关闭',exact:true}).focus();await page.keyboard.press('Tab');
    expect(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'))).toBeTruthy();
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(entry).toBeFocused();
    expect(page.url()).toBe(before.url);expect(await root.evaluate(el=>el.scrollTop)).toBe(before.scroll);
    await page.screenshot({path:`output/playwright/graphic-reading-${width}-${mode}.png`});
  });
}
