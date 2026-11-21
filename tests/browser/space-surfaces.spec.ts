import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('web/public/space/surfaces/manifest.json','utf8'));

for(const width of [390,820,1440])test(`local surface maps and shader programs render in both scenes at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors:string[]=[],external:string[]=[],maps=new Set<string>();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|texture/i.test(m.text()))errors.push(m.text());});
 page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
 page.on('response',r=>{if(/\/space\/surfaces\/2k_/.test(r.url())){if(r.status()!==200)errors.push(`${r.status()} ${r.url()}`);maps.add(r.url().split('/').pop()!);}});
 await page.goto('/');await expect(page.locator('.galaxy-canvas')).toHaveAttribute('data-surfaces','ready');
 await expect(page.locator('.galaxy-canvas')).toHaveAttribute('data-texture-count','10');
 await page.waitForTimeout(1200);await page.screenshot({path:`output/validation/surfaces-home-${width}.png`});
 expect([...maps].sort()).toEqual(manifest.assets.map((a:{file:string})=>a.file).filter((file:string)=>file!=='2k_mercury.jpg').sort());
 await page.locator('.planet-0').click();await expect(page.locator('.enter-book')).toBeEnabled();await expect(page.locator('.galaxy-canvas')).toHaveAttribute('data-particles','0');await page.locator('.enter-book').click();
 await expect(page.locator('.entry-veil')).toHaveCount(0,{timeout:25000});await expect(page.locator('.solar-stage canvas')).toHaveAttribute('data-surfaces','ready');
 await expect(page.locator('.solar-stage canvas')).toHaveAttribute('data-texture-count','10');
 await page.waitForTimeout(600);await page.screenshot({path:`output/validation/surfaces-solar-${width}.png`});
 expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('missing surface fails visibly into usable navigation instead of empty spheres',async({page})=>{
 await page.route('**/space/surfaces/2k_mars.jpg',r=>r.fulfill({status:503,body:'unavailable'}));
 await page.goto('/');await expect(page.locator('.galaxy-static')).toBeVisible();await expect(page.locator('.galaxy-notice')).toBeVisible();
 await page.locator('.planet-0').click();await expect(page.locator('.enter-book')).toBeEnabled();await page.locator('.enter-book').click();
 await expect(page.locator('.solar-stage')).toBeHidden();await expect(page.locator('.solar-chapter-list button')).toHaveCount(16);
 await page.locator('.solar-chapter-list button').nth(11).click();await expect(page).toHaveURL(/chapter_divide_and_conquer/);
});

test('texture loading finished after leaving does not resurrect a renderer',async({page})=>{
 let release!:()=>void;const waiting=new Promise<void>(r=>release=r);
 await page.route('**/space/surfaces/2k_earth_daymap.jpg',async route=>{await waiting;await route.continue();});
 await page.goto('/');await expect(page.locator('.galaxy-canvas')).toBeVisible();await page.getByRole('button',{name:'简化显示',exact:true}).click();
 release();await page.waitForTimeout(500);await expect(page.locator('.galaxy-canvas')).toHaveCount(0);await expect(page.locator('.galaxy-static')).toBeVisible();
 await page.getByRole('button',{name:'开启三维',exact:true}).click();await expect(page.locator('.galaxy-canvas')).toHaveAttribute('data-surfaces','ready');await expect(page.locator('.galaxy-canvas')).toHaveCount(1);
});

test('textured planet itself remains clickable after its number is moved aside',async({page})=>{
 await page.goto('/library/plex-programming/contents');await expect(page.locator('.solar-stage canvas')).toHaveAttribute('data-surfaces','ready');
 await page.getByRole('button',{name:'暂停公转',exact:true}).click();
 const point=await page.locator('.solar-stage').evaluate(stage=>{
  const bounds=stage.getBoundingClientRect();
  for(const line of stage.querySelectorAll('line')){
   const x=bounds.x+Number(line.getAttribute('x1'))*bounds.width/100,y=bounds.y+Number(line.getAttribute('y1'))*bounds.height/100;
   if(document.elementFromPoint(x,y)?.tagName==='CANVAS')return {x,y};
  }throw Error('No unobstructed textured planet');
 });
 await page.mouse.click(point.x,point.y);await expect(page).toHaveURL(/\/read\/chapter_/);
});
