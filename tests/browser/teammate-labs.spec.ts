import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const lab='/read/unit/lab/';
async function mode(page:Page,mode:'flip'|'study'){
 await page.addInitScript(mode=>localStorage.setItem('plex:preferences',JSON.stringify({mode,fontSize:18,lineHeight:1.8,theme:'light',width:'standard',split:40})),mode);
}
async function ready(page:Page,mode:'flip'|'study'){
 if(mode==='flip')await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
 else await expect(page.locator('.study-reader')).toBeVisible();
}
async function records(page:Page){return page.evaluate(()=>new Promise<any[]>((resolve,reject)=>{const r=indexedDB.open('plex-learning',1);r.onsuccess=()=>{const d=r.result,q=d.transaction('records').objectStore('records').getAll();q.onsuccess=()=>{resolve(q.result);d.close()};q.onerror=()=>reject(q.error)};r.onerror=()=>reject(r.error)}));}
async function seed(page:Page,id:string,value:unknown){await page.evaluate(({id,value})=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open('plex-learning',1);r.onsuccess=()=>{const d=r.result,t=d.transaction('records','readwrite');t.objectStore('records').put({id,value,updatedAt:new Date().toISOString()});t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>reject(t.error)}}),{id,value});}
async function openCard(page:Page,slug:string,key:string){
 await page.goto(lab+slug);await ready(page,'study');
 await page.locator(`.study-reader [data-lab-key="${key}"]`).getByRole('button',{name:'动手写代码'}).click();
 await expect(page.getByLabel('完整示例代码')).toBeVisible();
}
for(const width of [390,820,1440])for(const reading of ['flip','study'] as const)test(`teammate lab levels and editor ${width} ${reading}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await mode(page,reading);await page.goto(lab+'graph');await ready(page,reading);
 const root=page.locator(reading==='flip'?'.book-host':'.study-reader');
 await root.locator('[data-lab-level="advanced"]:visible').first().click();
 const source=page.locator(reading==='flip'?'.source-stage':'.study-article').first();
 await expect(source.locator('[data-level="basic"]')).toHaveCount(0);await expect(source.locator('[data-level="advanced"]')).not.toHaveCount(0);
 await root.locator('[data-lab-level="basic"]:visible').first().click();
 if(reading==='flip'){await page.evaluate(()=>location.hash='blk-lab-graph-008@0');}
 await root.locator('[data-lab-key="lab-graph-b1"]:visible').getByRole('button',{name:'动手写代码'}).click();
 await page.getByLabel('完整示例代码').fill('print("saved draft")');
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await root.locator('[data-lab-key="lab-graph-b1"]:visible').getByRole('button',{name:'动手写代码'}).click();
 await expect(page.getByLabel('完整示例代码')).toHaveText('print("saved draft")');
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.screenshot({path:`output/teammate/lab-${width}-${reading}.png`});
});

test('all basic cards run in actual Pyodide; errors, reset, stop and timeout persist honestly',async({page})=>{
 test.setTimeout(300000);await mode(page,'study');
 const cards=[['graph','lab-graph-b1','总站'],['graph','lab-graph-b2','边数 = 10'],['traversal','lab-traversal-b1','4 跳'],['sort-search','lab-sort-b1','12, 9, 8'],['sort-search','lab-sort-b2','应为 -1'],['dispatch','lab-dispatch-b1','0, 4, 2, 7'],['report','lab-report-full','配送顺序建议']];
 for(const [slug,key,text] of cards){await openCard(page,slug,key);await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.locator('.code-panel .code-output')).toContainText(text,{timeout:100000});await expect(page.getByRole('button',{name:'停止运行',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(page.locator(`.study-reader [data-lab-result="${key}"]`)).toContainText('最近运行完成');}
 await openCard(page,'graph','lab-graph-b1');await page.getByLabel('完整示例代码').fill('raise ValueError("LAB_ERROR")');await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.locator('.code-panel .code-output')).toContainText('LAB_ERROR',{timeout:100000});
 await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(page.locator('.study-reader [data-lab-result="lab-graph-b1"]')).toContainText('运行出错');
 await openCard(page,'graph','lab-graph-b1');await page.getByLabel('完整示例代码').fill('while True: pass');await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.locator('.code-panel')).toContainText('执行超过 10 秒',{timeout:100000});
 await page.getByRole('button',{name:'运行 Python',exact:true}).click();await page.getByRole('button',{name:'停止运行',exact:true}).click();await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(page.locator('.study-reader [data-lab-result="lab-graph-b1"]')).toContainText('未计为完成');
 await page.reload();await ready(page,'study');await expect(page.locator('.study-reader [data-lab-result="lab-graph-b1"]')).toContainText('未计为完成');
});

test('legacy lab draft migrates, backup restores it and accounts remain isolated',async({page,browser})=>{
 await mode(page,'study');await page.goto(lab+'graph');await ready(page,'study');
 await seed(page,'draft:lab-editor:lab-graph-b1',{code:'print("legacy teammate draft")'});
 await openCard(page,'graph','lab-graph-b1');await expect(page.getByLabel('完整示例代码')).toHaveText('print("legacy teammate draft")');await page.getByRole('button',{name:'关闭',exact:true}).click();
 await seed(page,'lab-run:lab-graph-b1',{key:'lab-graph-b1',state:'done',codeVersion:'test',updatedAt:new Date().toISOString()});
 await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'学习笔记',exact:true}).click();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'导出全部学习备份'}).click();const buffer=readFileSync((await (await downloaded).path())!);const backup=JSON.parse(buffer.toString());expect(backup.records.some((r:any)=>r.id==='draft:lab-editor:lab-graph-b1')).toBeTruthy();expect(backup.records.some((r:any)=>r.id==='lab-run:lab-graph-b1')).toBeTruthy();
 const context=await browser.newContext();const restored=await context.newPage();await mode(restored,'study');await restored.goto(new URL(lab+'graph',page.url()).href);await ready(restored,'study');await restored.getByRole('button',{name:'更多阅读工具'}).click();await restored.getByRole('button',{name:'学习笔记',exact:true}).click();await restored.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer});await restored.getByRole('button',{name:'确认导入',exact:true}).click();await expect(restored.locator('.notebook')).toContainText('已合并备份');await restored.reload();await ready(restored,'study');await expect(restored.locator('.study-reader [data-lab-result="lab-graph-b1"]')).toContainText('最近运行完成');await context.close();
 await page.evaluate(()=>{sessionStorage.setItem('plex-account',JSON.stringify({id:936}));localStorage.setItem('plex:user:936:preferences',JSON.stringify({mode:'study'}));});await openCard(page,'graph','lab-graph-b1');await expect(page.getByLabel('完整示例代码')).not.toContainText('legacy teammate draft');await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(page.locator('.study-reader [data-lab-result="lab-graph-b1"]')).toHaveText('尚未运行');
 await page.evaluate(()=>sessionStorage.removeItem('plex-account'));await openCard(page,'graph','lab-graph-b1');await expect(page.getByLabel('完整示例代码')).toHaveText('print("legacy teammate draft")');
});

test('reader preferences, explorer entry and supplementary glossary retain the current UI',async({page})=>{
 await mode(page,'study');await page.goto('/read/chapter_graph/graph');await ready(page,'study');await expect(page.locator('.study-reader .explorer-card')).toContainText('关系网');await page.locator('.study-reader .explorer-go').click();await expect(page).toHaveURL(/graph_operations/);
 await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'阅读设置',exact:true}).click();await page.getByLabel('正文字体').selectOption('serif');await page.getByLabel('沉浸阅读', {exact:false}).check();await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(page.locator('.bottom-navigation')).toBeHidden();await expect(page.getByRole('button',{name:'退出沉浸阅读',exact:true})).toBeVisible();await page.reload();await ready(page,'study');await expect(page.locator('.reader')).toHaveAttribute('data-font','serif');await page.getByRole('button',{name:'退出沉浸阅读',exact:true}).click();await expect(page.locator('.bottom-navigation')).toBeVisible();
 await page.goto(lab+'graph');await ready(page,'study');const axe=await new AxeBuilder({page}).include('.study-reader').analyze();expect(axe.violations).toEqual([]);
});
