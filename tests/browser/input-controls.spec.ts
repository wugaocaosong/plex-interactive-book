import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
async function settings(page:any){await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'翻页控制',exact:true}).click();await expect(page.getByRole('heading',{name:'USB 翻页笔 · 按键映射'})).toBeVisible();}
for(const width of [390,820,1440])test(`input mapping and protected modal ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/read/chapter_divide_and_conquer/divide_and_conquer');
 await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);await settings(page);
 await page.getByRole('button',{name:'录入下一页',exact:true}).click();await page.keyboard.press('n');await page.getByRole('button',{name:'确认映射',exact:true}).click();
 await expect(page.getByText('控制设置已保存',{exact:true})).toBeVisible();
 const url=page.url();await page.getByLabel('翻页笔按键测试区').focus();await page.keyboard.press('n');await expect(page.getByText('检测成功：下一页（测试区不翻动正文）')).toBeVisible();expect(page.url()).toBe(url);
 await page.locator('.navigation-dialog').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
 const axe=await new AxeBuilder({page}).include('.navigation-dialog').analyze();expect(axe.violations).toEqual([]);
 await page.screenshot({path:`output/playwright/input-controls-${width}.png`});
 await page.keyboard.press('Escape');await page.locator('#reading-content').focus();await page.keyboard.press('n');await expect(page.locator('.input-turn-notice')).toHaveText('下一页');
 await page.reload();await settings(page);await expect(page.locator('.input-buttons code').last()).toHaveText('KeyN');
 await expect(page.getByRole('button',{name:'开启摄像头',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'开启离线语音',exact:true})).toBeEnabled();
});
test('continuous input scrolls 85 percent and ignores repeated keys',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('plex:preferences',JSON.stringify({mode:'study',fontSize:18,lineHeight:1.8,theme:'light',width:'standard',split:40})));
 await page.goto('/read/chapter_divide_and_conquer/divide_and_conquer');const root=page.locator('.study-reader');await expect(root).toBeVisible();await root.focus();
 const height=await root.evaluate(el=>el.clientHeight);await page.keyboard.press('PageDown');await expect.poll(()=>root.evaluate(el=>el.scrollTop)).toBeGreaterThan(height*.7);
 await page.waitForTimeout(600);const before=await root.evaluate(el=>el.scrollTop);await root.dispatchEvent('keydown',{key:'PageDown',code:'PageDown',repeat:true});expect(await root.evaluate(el=>el.scrollTop)).toBe(before);
 await settings(page);const modalTop=await root.evaluate(el=>el.scrollTop);await page.keyboard.press('PageDown');expect(await root.evaluate(el=>el.scrollTop)).toBe(modalTop);
});
test('denied camera and microphone show recovery without breaking reading',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('测试拒绝权限','NotAllowedError');};});
 await page.goto('/read/chapter_divide_and_conquer/index');await settings(page);
 await page.getByRole('button',{name:'开启摄像头',exact:true}).click();await expect(page.getByRole('alert')).toContainText('摄像头未启动');
 await page.getByRole('button',{name:'开启离线语音',exact:true}).click();await expect(page.getByRole('alert')).toContainText('语音未启动');
 await expect(page.getByRole('button',{name:'开启离线语音',exact:true})).toBeEnabled();
});
test('control preferences round-trip in backup and remain account scoped',async({page})=>{
 await page.goto('/read/title');await settings(page);
 await page.getByRole('button',{name:'录入下一页',exact:true}).click();await page.keyboard.press('n');await page.getByRole('button',{name:'确认映射',exact:true}).click();await expect(page.getByText('控制设置已保存',{exact:true})).toBeVisible();
 await page.evaluate(()=>localStorage.setItem('plex-device-camera','PRIVATE-DEVICE-ID'));
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'学习笔记',exact:true}).click();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'导出全部学习备份'}).click();const buffer=readFileSync((await(await downloaded).path())!);const data=JSON.parse(buffer.toString());
 expect(data.records.find((r:any)=>r.id==='reader-controls').value.next).toBe('KeyN');expect(buffer.toString()).not.toContain('PRIVATE-DEVICE-ID');
 await page.evaluate(()=>sessionStorage.setItem('plex-account',JSON.stringify({id:404})));await page.reload();await settings(page);await expect(page.locator('.input-buttons code').last()).toHaveText('PageDown');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'学习笔记',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer});await page.getByRole('button',{name:'确认导入',exact:true}).click();await expect(page.locator('.backup-preview')).toHaveCount(0);
 await page.reload();await settings(page);await expect(page.locator('.input-buttons code').last()).toHaveText('KeyN');
});
for(const width of [390,820,1440])for(const mode of ['flip','study'])test(`chapter 12-16 input smoke ${width} ${mode}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(mode=>localStorage.setItem('plex:preferences',JSON.stringify({mode,fontSize:18,lineHeight:1.8,theme:'light',width:'standard',split:40})),mode);
 for(const chapter of ['divide_and_conquer','backtracking','dynamic_programming','greedy','appendix']){
  await page.goto(`/read/chapter_${chapter}/index`);
  if(mode==='flip')await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);else await expect(page.locator('.study-reader')).toBeVisible();
  await page.locator('#reading-content').focus();await page.keyboard.press('PageDown');await expect(page.locator('.input-turn-notice')).toContainText(mode==='flip'?'下一页':/已滚动一屏|已到阅读边界/);
  await page.waitForTimeout(650);
  // A boundary turn can start loading the next section after the animation.
  if(mode==='flip')await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
  await page.locator('#reading-content').focus();await page.keyboard.press('PageUp');await expect(page.locator('.input-turn-notice')).toContainText(mode==='flip'?'上一页':/已滚动一屏|已到阅读边界/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
