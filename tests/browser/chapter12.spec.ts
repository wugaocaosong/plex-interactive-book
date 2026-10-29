import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const base='/read/chapter_divide_and_conquer/';
async function mode(page:Page,value:'flip'|'study'){
 await page.addInitScript(v=>localStorage.setItem('plex:preferences',JSON.stringify({mode:v,fontSize:18,lineHeight:1.8,theme:'light',width:'standard',split:.4})),value);
}
async function openActivity(page:Page,section:string,activity:string,reading:'flip'|'study'){
 await page.goto(base+section);
 if(reading==='flip'){
  await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
  const id=await page.locator(`.source-stage [data-mode="${activity}"]`).first().evaluate(el=>el.closest('[data-block]')!.getAttribute('data-block'));
  await page.evaluate(id=>location.hash=id!,id);
 }else await expect(page.locator('.study-reader')).toBeVisible();
 await page.locator(`${reading==='flip'?'.book-host':'.study-reader'} [data-mode="${activity}"]:visible`).first().click();
 await expect(page.locator('.chapter12-panel')).toBeVisible();
}
for(const width of [390,820,1440])for(const reading of ['flip','study'] as const)test(`chapter12 route and experiments ${width} ${reading}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await mode(page,reading);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await openActivity(page,'divide_and_conquer','route',reading);
 await expect(page.locator('.ch12-route li')).toHaveCount(5);
 await page.getByRole('button',{name:'前往理解拆分'}).click();
 await page.getByLabel('模块编号',{exact:true}).fill('8,2,2,-1');await page.getByRole('button',{name:'应用输入并重置'}).click();
 await page.getByRole('button',{name:'下一步',exact:true}).last().click();
 const before=await page.locator('.ch12-lab').innerText();
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await openActivity(page,'divide_and_conquer','merge',reading);
 await expect(page.getByLabel('模块编号',{exact:true})).toHaveValue('8,2,2,-1');await expect(page.locator('.ch12-lab')).toHaveText(before,{useInnerText:true});
 const axe=await new AxeBuilder({page}).include('.chapter12-panel').analyze();expect(axe.violations).toEqual([]);
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await openActivity(page,'hanota_problem','hanoi',reading);
 await page.getByRole('button',{name:'选择 A 柱'}).click();await page.getByRole('button',{name:'选择 C 柱'}).click();
 await page.getByRole('button',{name:'选择 A 柱'}).click();await page.getByRole('button',{name:'选择 C 柱'}).click();await expect(page.getByRole('alert')).toContainText('大环不能');
 await page.getByRole('button',{name:'查看标准解'}).click();
 for(let i=0;i<7;i++)await page.getByRole('button',{name:'下一步',exact:true}).last().click();
 await expect(page.locator('.chapter12-panel')).toContainText('已完成搬运');
 const hanoiAxe=await new AxeBuilder({page}).include('.chapter12-panel').analyze();expect(hanoiAxe.violations).toEqual([]);
 const pole=await page.locator('.ch12-pole').last().boundingBox();const ring=await page.locator('.ch12-ring').first().boundingBox();expect(pole!.width).toBeGreaterThan(60);expect(ring!.width).toBeGreaterThan(20);
 await page.screenshot({path:`output/playwright/ch12-${width}-${reading}.png`});
 expect(errors).toEqual([]);
});

test('chapter experiments round-trip in learning backup and stay isolated from another account',async({page,browser})=>{
 await mode(page,'study');await openActivity(page,'divide_and_conquer','merge','study');
 await page.getByLabel('模块编号',{exact:true}).fill('9,4,1');await page.getByRole('button',{name:'应用输入并重置'}).click();
 await page.getByRole('button',{name:'下一步',exact:true}).last().click();
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'学习笔记',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出全部学习备份'}).click();const backup=readFileSync((await (await download).path())!);
 const data=JSON.parse(backup.toString());expect(data.records.some((r:any)=>r.id==='chapter12:lab:merge')).toBeTruthy();expect(data.records.some((r:any)=>/^(auth|token|session):/.test(r.id))).toBeFalsy();
 const context=await browser.newContext({baseURL:new URL(page.url()).origin});const fresh=await context.newPage();await mode(fresh,'study');await fresh.goto(base+'divide_and_conquer');
 await fresh.getByRole('button',{name:'更多阅读工具'}).click();await fresh.getByRole('button',{name:'学习笔记',exact:true}).click();
 await fresh.locator('input[type=file]').setInputFiles({name:'chapter.json',mimeType:'application/json',buffer:backup});await fresh.getByRole('button',{name:'确认导入'}).click();await fresh.getByRole('button',{name:'关闭',exact:true}).click();
 await openActivity(fresh,'divide_and_conquer','merge','study');await expect(fresh.getByLabel('模块编号',{exact:true})).toHaveValue('9,4,1');
 await fresh.evaluate(()=>sessionStorage.setItem('plex-account',JSON.stringify({id:999998})));await fresh.reload();
 await openActivity(fresh,'divide_and_conquer','merge','flip');await expect(fresh.getByLabel('模块编号',{exact:true})).toHaveValue('6,3,8,2,5,1');await context.close();
});

test('first term follows chapter order; anchored note, shortcut, draft and saved annotation survive refresh',async({page})=>{
 await mode(page,'study');await page.goto(base+'divide_and_conquer');
 const term=page.locator('.study-reader .ch12-term[data-term="分治"]');await expect(term).toHaveCount(1);await term.hover();await expect(page.locator('.ch12-term-note')).toBeVisible();
 await term.click();await page.locator('.ch12-term-note').getByRole('button',{name:'记一笔'}).click();
 await page.locator('.ch12-annotation textarea').fill('拆成相同的小任务');await page.keyboard.press('Escape');await expect(page.locator('.ch12-annotation')).toHaveCount(0);
 await term.click();await page.locator('.ch12-term-note').getByRole('button',{name:'记一笔'}).click();await expect(page.locator('.ch12-annotation textarea')).toHaveValue('拆成相同的小任务');
 await page.locator('.ch12-annotation').getByRole('button',{name:'保存批注'}).click();await expect(page.locator('.ch12-annotation')).toHaveCount(0);
 await page.reload();await expect(page.locator('.study-reader .annotation-note')).toBeVisible();
 await page.locator('.study-reader .annotation-note').click();await expect(page.locator('.ch12-annotation textarea')).toHaveValue('拆成相同的小任务');await page.keyboard.press('Escape');
 await page.locator('.study-reader .ch12-intro').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection()!.removeAllRanges();getSelection()!.addRange(r);});
 await page.keyboard.press('Control+Alt+m');await expect(page.locator('.ch12-annotation')).toBeVisible();await page.locator('.ch12-annotation textarea').fill('快捷键笔记');await page.keyboard.press('Control+Enter');await expect(page.locator('.ch12-annotation')).toHaveCount(0);
 await page.goto(base+'binary_search_recur');await expect(page.locator('.study-reader')).toBeVisible();await expect(page.locator('.study-article').first().locator('.ch12-term[data-term="分治"]')).toHaveCount(0);
});

test('all five chapter tasks execute in real Python; source headers fold without deleting code',async({page})=>{
 test.setTimeout(300000);await mode(page,'study');
 const tasks=JSON.parse(readFileSync('web/public/chapter12/tasks.json','utf8'));
 for(const task of tasks){
  await openActivity(page,task.sectionId.split('/')[1],'code-'+task.id.slice(5),'study');
  await page.getByLabel('完整示例代码').fill(task.solution);await page.getByRole('button',{name:'检查答案',exact:true}).click();
  await expect(page.locator('.test-results')).toContainText(`通过 ${task.tests.length} / ${task.tests.length} 个用例`,{timeout:100000});
  await page.getByRole('button',{name:'关闭',exact:true}).click();
 }
 await page.goto(base+'binary_search_recur');await page.locator('.study-reader').getByRole('button',{name:'查看 / 运行'}).first().click();
 await expect(page.getByRole('button',{name:'源码信息（展开）'})).toBeVisible();await page.getByRole('button',{name:'源码信息（展开）'}).click();await expect(page.getByLabel('完整示例代码')).toContainText('Author: krahets');
});

test('mobile term stays inside viewport and failed annotation save keeps the text for retry',async({page})=>{
 await page.setViewportSize({width:390,height:844});await mode(page,'study');await page.goto(base+'divide_and_conquer');
 const term=page.locator('.study-reader .ch12-term[data-term="分治"]');await term.click();
 const tip=page.locator('.ch12-term-note');await expect(tip).toBeVisible();const bounds=await tip.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);
 await tip.getByRole('button',{name:'记一笔'}).click();await page.locator('.ch12-annotation textarea').fill('即使保存失败也不能丢失');
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).restoreIDB=()=>IDBDatabase.prototype.transaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('测试存储失败','QuotaExceededError');return (original as any).apply(this,args);} as any;});
 await page.locator('.ch12-annotation').getByRole('button',{name:'保存批注'}).click();await expect(page.locator('.ch12-annotation textarea')).toHaveValue('即使保存失败也不能丢失');await expect(page.locator('.ch12-annotation [role=alert]')).toContainText('保存');
 await page.evaluate(()=>(window as any).restoreIDB());await page.locator('.ch12-annotation').getByRole('button',{name:'保存批注'}).click();await expect(page.locator('.ch12-annotation')).toHaveCount(0);
 await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'切换阅读模式'}).click();await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
 await page.reload();await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);await expect(page.locator('.book-host .annotation-note:visible').first()).toBeVisible();
});
