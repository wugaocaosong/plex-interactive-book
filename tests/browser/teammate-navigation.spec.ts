import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const pageData=JSON.parse(readFileSync('web/public/book/pages/unit/lab/graph.json','utf8'));
const advanced=pageData.html.match(/data-block="([^"]+)"[^>]*data-lab-key="lab-graph-a1"/)![1];
for(const mode of ['flip','study'])test(`lab deep links reveal the right level and survive refresh in ${mode}`,async({page})=>{
 await page.addInitScript(mode=>localStorage.setItem('plex:preferences',JSON.stringify({mode,labLevel:'basic'})),mode);
 await page.goto('/read/unit/lab/graph#'+advanced+'@0');
 const root=page.locator(mode==='flip'?'.book-host':'.study-reader');
 await expect(root.locator('[data-lab-key="lab-graph-a1"]:visible')).toBeVisible();
 await page.reload();await expect(root.locator('[data-lab-key="lab-graph-a1"]:visible')).toBeVisible();
 await page.evaluate(()=>location.hash='blk-lab-graph-008@0');await expect(root.locator('[data-lab-key="lab-graph-b1"]:visible')).toBeVisible();
 await page.goBack();await expect(root.locator('[data-lab-key="lab-graph-a1"]:visible')).toBeVisible();
});

test('lab draft save failure is visible and reset is undoable',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('plex:preferences',JSON.stringify({mode:'study'})));
 await page.goto('/read/unit/lab/graph');await page.locator('.study-reader [data-lab-key="lab-graph-b1"]').getByRole('button',{name:'动手写代码'}).click();
 const editor=page.getByLabel('完整示例代码');await expect(editor).toContainText('STATIONS');
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).restoreLabIDB=()=>IDBDatabase.prototype.transaction=original;IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('test quota','QuotaExceededError');return (original as any).apply(this,args)} as any;});
 await editor.fill('print("unsaved draft")');await expect(page.locator('.storage-notice')).toContainText('未能保存');await expect(editor).toHaveText('print("unsaved draft")');
 await page.evaluate(()=>(window as any).restoreLabIDB());await editor.fill('print("recoverable")');await page.getByRole('button',{name:'重置',exact:true}).click();await expect(editor).toContainText('STATIONS');await page.getByRole('button',{name:'撤销重置',exact:true}).click();await expect(editor).toHaveText('print("recoverable")');
 await page.getByRole('button',{name:'关闭',exact:true}).click();await page.locator('.study-reader [data-lab-key="lab-graph-b1"]').getByRole('button',{name:'动手写代码'}).click();await expect(editor).toHaveText('print("recoverable")');
});

test('switching lab level never orphans annotations in hidden teaching blocks',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('plex:preferences',JSON.stringify({mode:'study',labLevel:'advanced'})));
 await page.goto('/read/unit/lab/graph');await expect(page.locator('.study-reader')).toBeVisible();
 const paragraph=page.locator('.study-article').first().locator('p[data-level="advanced"]').first();
 await paragraph.scrollIntoViewIfNeeded();
 await paragraph.evaluate(el=>{const r=document.createRange();const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const n=w.nextNode()!;r.selectNodeContents(n);getSelection()!.removeAllRanges();getSelection()!.addRange(r);el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
 await page.getByLabel('批注内容').fill('进阶内容的笔记');await page.getByRole('button',{name:'保存批注',exact:true}).click();
 await page.locator('.study-reader [data-lab-level="basic"]').first().click();
 await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'学习笔记',exact:true}).click();await expect(page.getByLabel('编辑笔记')).toHaveValue('进阶内容的笔记');await expect(page.locator('.notebook')).not.toContainText('待重新定位');
 await page.getByRole('button',{name:'关闭',exact:true}).click();await page.locator('.study-reader [data-lab-level="advanced"]').first().click();await expect(page.locator('.study-reader .annotation-note')).toBeVisible();
});
