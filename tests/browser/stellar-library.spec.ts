import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
const contents='/library/plex-programming/contents';
const chapter='/read/chapter_divide_and_conquer/index';

test('bounded click particles recycle; dragging does not enter; unavailable system responds',async({page})=>{
 await page.goto('/');const canvas=page.locator('.galaxy-canvas');await expect(canvas).toHaveAttribute('data-particles',/\d+/);
 await page.mouse.move(2,2);await canvas.click({position:{x:80,y:500}});await expect.poll(async()=>Number(await canvas.getAttribute('data-particles'))).toBeGreaterThan(100);
 await page.waitForTimeout(2300);expect(Number(await canvas.getAttribute('data-particles'))).toBeLessThan(200);
 await page.mouse.move(100,500);await page.mouse.down();await page.mouse.move(220,530,{steps:12});await page.mouse.up();await expect(page.locator('main')).toHaveAttribute('data-phase','galaxy');
 await page.getByRole('button',{name:'待上架书籍 1',exact:true}).click();await expect(page.locator('.galaxy-notice')).toContainText('尚未上架');await expect(page.locator('main')).toHaveAttribute('data-phase','galaxy');
 for(let i=0;i<12;i++)await page.mouse.click(80,500);expect(Number(await canvas.getAttribute('data-particles'))).toBeLessThanOrEqual(2600);
});

for(const width of [390,820,1440])test(`solar chapters, keyboard, persistent pet and fallback at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[],external:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
 await page.goto(contents);await expect(page.locator('.solar-directory')).toHaveAttribute('data-ready','true');await expect(page.locator('.solar-chapter-list button')).toHaveCount(16);await expect(page.locator('.ebook-pet')).toHaveCount(1);
 const distances=await page.locator('.solar-labels button').evaluateAll(els=>{const boxes=els.filter(e=>getComputedStyle(e).visibility!=='hidden').map(e=>e.getBoundingClientRect());return boxes.flatMap((a,i)=>boxes.slice(i+1).map(b=>Math.hypot(a.x-b.x,a.y-b.y)));});expect(Math.min(...distances)).toBeGreaterThan(43);
 const star=page.locator('.solar-labels button').first();const initial=await star.getAttribute('style');await expect.poll(()=>star.getAttribute('style')).not.toBe(initial);
 await page.getByRole('button',{name:'暂停公转',exact:true}).click();await page.waitForTimeout(150);const stopped=await star.getAttribute('style');await page.waitForTimeout(350);expect(await star.getAttribute('style')).toBe(stopped);
 await page.getByRole('button',{name:'继续公转',exact:true}).click();await star.focus();await page.waitForTimeout(150);const focused=await star.getAttribute('style');await page.waitForTimeout(350);expect(await star.getAttribute('style')).toBe(focused);
 await page.locator('.pet-character').click();await page.getByLabel('发消息给小艺').fill('跨页面保留的问题');await page.getByRole('button',{name:'关闭聊天气泡'}).click();
 await page.evaluate(()=>{(document.querySelector('.ebook-pet') as HTMLElement).dataset.instance='same-host';});
 const twelfth=page.locator('.solar-chapter-list button').nth(11);await twelfth.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/chapter_divide_and_conquer\/(index)?/);await expect(page.locator('.ebook-pet')).toHaveAttribute('data-instance','same-host');await expect(page.locator('.solar-stage canvas')).toHaveCount(0);
 await page.locator('.pet-character').click();await expect(page.getByLabel('发消息给小艺')).toHaveValue('跨页面保留的问题');await page.getByRole('button',{name:'关闭聊天气泡'}).click();
 await page.goto(contents);await page.locator('.solar-stage canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('.solar-stage')).toBeHidden();await expect(page.locator('.solar-chapter-list button')).toHaveCount(16);
 await page.locator('.solar-chapter-list button').last().click();await expect(page).toHaveURL(/chapter_appendix\/(index)?/);expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('pet size, hidden state, draft, account isolation and keyboard resizing persist',async({page})=>{
 await page.goto(contents);await page.locator('.pet-character').hover();await page.getByRole('button',{name:'小E外观设置',exact:true}).click();await page.getByLabel('小E缩放比例').fill('2');await page.getByRole('button',{name:'完成',exact:true}).click();
 await expect(page.locator('.robot-rig')).toHaveCSS('height','280px');await page.locator('.pet-character').click();await page.getByLabel('发消息给小艺').fill('隐藏前的草稿');await page.getByRole('button',{name:'关闭聊天气泡'}).click();await page.locator('.pet-character').hover();await page.getByRole('button',{name:'隐藏小E',exact:true}).click();await expect(page.locator('.ebook-pet')).toBeHidden();await page.reload();await expect(page.locator('.solar-directory')).toHaveAttribute('data-ready','true');await expect(page.locator('.ebook-pet')).toBeHidden();
 await page.getByRole('button',{name:'显示小E',exact:true}).click();await expect(page.locator('.robot-rig')).toHaveCSS('height','280px');await page.locator('.pet-character').click();await expect(page.getByLabel('发消息给小艺')).toHaveValue('隐藏前的草稿');await page.getByRole('button',{name:'关闭聊天气泡'}).click();
 await page.setViewportSize({width:390,height:900});const rect=(await page.locator('.pet-character').boundingBox())!;expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(390);expect(rect.y+rect.height).toBeLessThan(900);await page.getByRole('slider',{name:'调整小E大小',exact:true}).press('Home');await expect(page.locator('.robot-rig')).toHaveCSS('height','140px');
 await page.waitForTimeout(600);await page.evaluate(()=>sessionStorage.setItem('plex-account',JSON.stringify({id:919})));await page.reload();await page.locator('.pet-character').click();await expect(page.getByLabel('发消息给小艺')).toHaveValue('');await expect(page.locator('.robot-rig')).toHaveCSS('height','140px');
 await page.evaluate(()=>sessionStorage.removeItem('plex-account'));await page.reload();await page.locator('.pet-character').click();await expect(page.getByLabel('发消息给小艺')).toHaveValue('隐藏前的草稿');
});

test('idle poses do not repeat, reduced motion stops them; solar and settings pass axe',async({page})=>{
 await page.goto(contents);await expect(page.locator('.pet-character')).toBeVisible();await page.clock.install();await page.evaluate(()=>{Math.random=()=>.5;});await page.locator('.pet-character').click();await page.getByRole('button',{name:'关闭聊天气泡'}).click();await page.clock.runFor(17510);const first=await page.locator('.robot-rig').getAttribute('data-idle');
 expect(first).not.toBe('none');await page.clock.runFor(20700);expect(await page.locator('.robot-rig').getAttribute('data-idle')).not.toBe(first);await expect(page.locator('.robot-rig')).not.toHaveAttribute('data-idle','none');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.solar-stage')).toBeHidden();await page.clock.runFor(30000);await expect(page.locator('.robot-rig')).toHaveAttribute('data-idle','none');
 await page.locator('.pet-character').hover();await page.getByRole('button',{name:'小E外观设置',exact:true}).click();const axe=await new AxeBuilder({page}).include('.solar-directory').include('.pet-settings').analyze();expect(axe.violations).toEqual([]);
});

test('global pet login from directory reaches a ready profile panel',async({page})=>{
 await page.goto(contents);await page.locator('.pet-character').click();await page.getByLabel('发消息给小艺').fill('请解释');await page.getByRole('button',{name:'发送',exact:true}).click();await page.getByRole('button',{name:/登录 PLEX/}).click();await expect(page).toHaveURL(/\/read\/unit\/monty\/start/);await expect(page.locator('.unit-panel')).toBeVisible();
});

test('pet appearance is flushed into backup and restored in a separate account',async({page})=>{
 await page.goto(chapter);await page.locator('.pet-character').hover();await page.getByRole('button',{name:'小E外观设置',exact:true}).click();await page.getByLabel('小E缩放比例').fill('1.6');await page.getByRole('button',{name:'完成',exact:true}).click();
 const notes=async()=>{await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'学习笔记',exact:true}).click();};await notes();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出全部学习备份'}).click();const buffer=readFileSync((await(await download).path())!);const backup=JSON.parse(buffer.toString());expect(backup.records.find((r:any)=>r.id==='pet:appearance').value).toEqual({version:1,scale:1.6,visible:true,idleMotion:true});
 await page.evaluate(()=>sessionStorage.setItem('plex-account',JSON.stringify({id:920})));await page.reload();await expect(page.locator('.robot-rig')).toHaveCSS('height','140px');await notes();await page.locator('input[type=file]').setInputFiles({name:'learning.json',mimeType:'application/json',buffer});await page.getByRole('button',{name:'确认导入',exact:true}).click();await expect(page.locator('.backup-preview')).toHaveCount(0);await page.reload();await expect(page.locator('.robot-rig')).toHaveCSS('height','224px');
});

test('reply while held keeps grabbed pose then shows answer; hidden request is cancelled',async({page})=>{
 await page.addInitScript(()=>{sessionStorage.setItem('plex-account',JSON.stringify({id:77}));sessionStorage.setItem('plex-session',JSON.stringify({access_token:'test-only'}));});let release:()=>void=()=>{};
 await page.route('**/api/v1/student/messenger/chat',async r=>{await new Promise<void>(resolve=>release=resolve);await r.fulfill({json:{code:0,data:{reply:'模型答复',source:'llm'}}}).catch(()=>{});});
 await page.goto(contents);await page.locator('.pet-character').click();await page.getByLabel('发消息给小艺').fill('试一下动作');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.robot-rig')).toHaveAttribute('data-state','thinking');
 const r=(await page.locator('.pet-character').boundingBox())!;await page.mouse.move(r.x+35,r.y+60);await page.mouse.down();await page.mouse.move(r.x-60,r.y+30,{steps:8});await expect(page.locator('.robot-rig')).toHaveAttribute('data-state','grabbed');release();await expect(page.locator('.pet-messages')).toContainText('模型答复');await expect(page.locator('.robot-rig')).toHaveAttribute('data-state','grabbed');await page.mouse.up();await expect(page.locator('.robot-rig')).toHaveAttribute('data-state','answer');
 await page.getByLabel('发消息给小艺').fill('隐藏时取消');await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.robot-rig')).toHaveAttribute('data-state','thinking');await page.locator('.pet-character').hover();await page.getByRole('button',{name:'隐藏小E',exact:true}).click();release();await page.getByRole('button',{name:'显示小E',exact:true}).click();await page.locator('.pet-character').click();await expect(page.getByLabel('发消息给小艺')).toHaveValue('隐藏时取消');await expect(page.locator('.pet-messages article.assistant')).toHaveCount(1);
});
