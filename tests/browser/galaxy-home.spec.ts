import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function book(page:any){await page.goto('/');await expect(page.locator('.planet-0')).toBeEnabled();await page.locator('.planet-0').click();await expect(page.locator('.enter-book')).toBeEnabled();}
for(const width of [390,820,1440])test(`manga galaxy and physical book at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[],external:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
 await page.goto('/');await expect(page.locator('.planet-0')).toBeEnabled();await expect(page.locator('.galaxy-canvas')).toBeVisible();await page.locator('.library-index summary').click();await expect(page.locator('.library-index button:disabled')).toHaveCount(6);await page.locator('.library-index summary').click();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`output/validation/galaxy-home-${width}.png`});
 await page.locator('.planet-0').click();await expect(page.locator('.enter-book')).toBeEnabled();const canvas=page.locator('canvas');const initial=await canvas.getAttribute('data-rotation');const box=(await canvas.boundingBox())!;
 await page.mouse.move(box.width*.5,box.height*.5);await page.mouse.down();await page.mouse.move(box.width*.5+80,box.height*.5+25,{steps:12});await page.mouse.up();await expect(canvas).not.toHaveAttribute('data-rotation',initial!);await expect(page.locator('main')).toHaveAttribute('data-phase','book');await expect(page).toHaveURL(/\/$/);
 await page.getByRole('button',{name:'↻ 回正',exact:true}).click();await expect(canvas).toHaveAttribute('data-rotation',initial!);await page.screenshot({path:`output/validation/galaxy-book-${width}.png`});
 await page.locator('.enter-book').click();await expect(page.locator('main')).toHaveAttribute('data-phase','opening');await expect(page.locator('.entry-veil')).toBeVisible();await expect(page).toHaveURL(/\/read\/title/);await expect(page.locator('.entry-veil')).toHaveCount(0,{timeout:25000});await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);await expect(page.locator('.galaxy-canvas')).toHaveCount(0);expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('back cover does not open and front cover raycast does',async({page})=>{
 await book(page);const canvas=page.locator('canvas');await canvas.focus();for(let i=0;i<21;i++)await canvas.press('ArrowRight');const box=(await canvas.boundingBox())!;await page.mouse.click(box.width/2,box.height/2);await expect(page.locator('main')).toHaveAttribute('data-phase','book');await canvas.press('Home');await page.mouse.click(box.width/2,box.height/2);await expect(page).toHaveURL(/\/read\/title/);await expect(page.locator('.entry-veil')).toHaveCount(0,{timeout:25000});
});

test('return restores galaxy, repeated selection and skip stay single navigation',async({page})=>{
 await book(page);await page.getByRole('button',{name:'返回银河',exact:true}).click();await expect(page.locator('main')).toHaveAttribute('data-phase','galaxy');await page.locator('.planet-0').dblclick();await page.getByRole('button',{name:'跳过动画',exact:true}).click();await expect(page.locator('.enter-book')).toBeEnabled();await page.locator('.enter-book').click();await page.getByRole('button',{name:'跳过动画',exact:true}).first().click();await expect(page).toHaveURL(/\/read\/title/);await expect(page.locator('.entry-veil')).toHaveCount(0,{timeout:25000});await page.goBack();await expect(page.locator('main')).toHaveClass(/galaxy-library/);
});

test('reduced motion defaults to static and keyboard can enter',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.galaxy-static')).toBeVisible();await page.locator('.planet-0').focus();await page.keyboard.press('Enter');await expect(page.locator('main')).toHaveAttribute('data-phase','book');await page.locator('.enter-book').press('Enter');await expect(page).toHaveURL(/\/read\/title/);await expect(page.locator('.entry-veil')).toHaveCount(0,{timeout:25000});
});

test('WebGL unavailable falls back without trapping the reader',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){if(String(type).includes('webgl'))return null;return (original as any).call(this,type,...args);} as any;});await book(page);await expect(page.locator('.galaxy-static')).toBeVisible();await page.locator('.enter-book').click();await expect(page).toHaveURL(/\/read\/title/);await expect(page.locator('.entry-veil')).toHaveCount(0,{timeout:25000});
});

test('manga navigation passes automated accessibility in static mode',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.planet-0')).toBeEnabled();await page.locator('.library-index summary').click();const audit=await new AxeBuilder({page}).include('.manga-library').analyze();expect(audit.violations).toEqual([]);
});

test('failed reading load offers retry and galaxy return',async({page})=>{
 await page.route('**/book/pages/title.json',route=>route.fulfill({status:503,body:'unavailable'}));await book(page);await page.locator('.enter-book').click();await expect(page.locator('.entry-error')).toBeVisible({timeout:35000});await expect(page.locator('.entry-error').getByRole('button',{name:'重新加载',exact:true})).toBeVisible();await page.locator('.entry-error').getByRole('button',{name:'返回银河'}).click();await expect(page.locator('.entry-veil')).toHaveCount(0);await expect(page.locator('.planet-0')).toBeVisible();
});


test('retry after transient content error really reloads and opens book',async({page})=>{
 let attempts=0;await page.route('**/book/pages/title.json',route=>{attempts++;if(attempts===1)return route.fulfill({status:503,body:'unavailable'});return route.continue();});await book(page);await page.locator('.enter-book').click();await expect(page.locator('.entry-error')).toBeVisible({timeout:35000});await page.locator('.entry-error').getByRole('button',{name:'重新加载'}).click();await expect(page.locator('.entry-veil')).toHaveCount(0,{timeout:25000});await expect(page.locator('.book-holder')).toBeVisible();expect(attempts).toBeGreaterThan(1);
});

test('continue exploration returns directly to the saved section',async({page})=>{
 const route='/read/chapter_divide_and_conquer/divide_and_conquer';await page.goto(route);await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);await page.waitForTimeout(500);await page.goto('/');const resume=page.getByRole('link',{name:/继续探索/});await expect(resume).toHaveAttribute('href',new RegExp(route));await resume.click();await expect(page).toHaveURL(new RegExp(route));await expect(page.locator('.entry-veil')).toHaveCount(0);await expect(page.locator('.galaxy-canvas')).toHaveCount(0);
});
