import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const contents='/library/plex-programming/contents';

test('generated Little E loads locally, survives display toggles, and chapters remain searchable',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(contents);
 const canvas=page.locator('.solar-stage canvas');
 await expect(canvas).toHaveAttribute('data-model','ready');
 await expect(page.locator('.solar-center img')).toHaveCount(0);
 await expect(page.locator('.solar-catalog')).toBeVisible();
 await page.getByLabel('查找章节').fill('分治');
 await expect(page.locator('.solar-chapter-list button:visible')).toHaveCount(1);
 await page.getByRole('button',{name:'简化显示',exact:true}).click();
 await expect(page.locator('.solar-stage')).toBeHidden();
 await page.getByRole('button',{name:'开启三维',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-model','ready');
 await page.locator('.solar-chapter-list button:visible').click();
 await expect(page).toHaveURL(/chapter_divide_and_conquer/);
 expect(errors).toEqual([]);
});

test('unavailable model leaves a truthful notice and fully usable chapters',async({page})=>{
 await page.route('**/brand/little-e-3d/model.glb',r=>r.fulfill({status:503,body:'unavailable'}));
 await page.goto(contents);
 await expect(page.locator('.solar-stage canvas')).toHaveAttribute('data-model','failed');
 await expect(page.locator('.solar-model-status')).toContainText('章节仍可正常阅读');
 await page.locator('.solar-chapter-list button').last().click();
 await expect(page).toHaveURL(/chapter_appendix/);
});

test('desktop rails open the real notebook and bookmarks without obscuring the book',async({page})=>{
 await page.goto('/read/chapter_divide_and_conquer/index');
 await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
 const left=await page.locator('.reader-rail-left').boundingBox(),right=await page.locator('.reader-rail-right').boundingBox(),book=await page.locator('.book-holder').boundingBox();
 expect(left!.x+left!.width).toBeLessThan(book!.x);expect(right!.x).toBeGreaterThan(book!.x+book!.width);
 await page.getByRole('button',{name:'我的笔记',exact:true}).click();
 await expect(page.getByRole('button',{name:'导出全部学习备份'})).toBeVisible();
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.getByRole('button',{name:'我的书签',exact:true}).click();
 await expect(page.locator('[role=dialog]')).toContainText('书签');
});

for(const width of [390,1440])test(`chapter layout has no horizontal overflow and passes axe at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(contents);
 await expect(page.locator('.solar-stage canvas')).toHaveAttribute('data-model','ready');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 const clipped=await page.locator('.solar-labels button').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).visibility!=='hidden').some(n=>{const r=n.getBoundingClientRect(),parent=n.closest('.solar-stage')!.getBoundingClientRect();return r.left<parent.left||r.right>parent.right;}));expect(clipped).toBe(false);
 const audit=await new AxeBuilder({page}).include('.solar-directory').analyze();expect(audit.violations).toEqual([]);
});

for(const width of [1000,1100,1200])test(`rails leave room for page edges at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/read/chapter_divide_and_conquer/index');
 await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);
 const left=(await page.locator('.reader-rail-left').boundingBox())!,right=(await page.locator('.reader-rail-right').boundingBox())!,book=(await page.locator('.book-holder').boundingBox())!;
 expect(book.x-left.x-left.width).toBeGreaterThanOrEqual(42);
 expect(right.x-book.x-book.width).toBeGreaterThanOrEqual(42);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
