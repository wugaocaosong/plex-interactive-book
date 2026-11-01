import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
const entry=async(page:any)=>{await page.getByTestId('lesson-entry').click();await expect(page.locator('.unit-panel')).toBeVisible();};
const activity=async(page:any,name:string)=>{const details=page.locator('.all-activities');if(!await details.evaluate((el:HTMLElement)=>el.hasAttribute('open')))await details.locator('summary').click();await page.getByRole('navigation',{name:'三门学习活动'}).getByRole('button',{name,exact:true}).click();};
for(const width of [390,820,1440])test(`v04 page-specific lesson, geometry and report ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/read/unit/monty/rules');await entry(page);
  await expect(page.getByRole('heading',{name:'小E可以打开哪些门？'})).toBeVisible();
  await page.getByLabel('2 号门',{exact:true}).check();await page.getByLabel('3 号门',{exact:true}).check();await page.getByRole('button',{name:'检查开门规则'}).click();await expect(page.getByText('判断正确',{exact:true})).toBeVisible();
  const axe=await new AxeBuilder({page}).include('.unit-panel').analyze();await info.attach('axe-rules.json',{body:JSON.stringify(axe.violations,null,2),contentType:'application/json'});expect(axe.violations).toEqual([]);
  await activity(page,'三种情况');await expect(page.locator('.unit-table tbody tr')).toHaveCount(3);await page.getByLabel('固定初选门').selectOption('2');await expect(page.locator('.unit-table')).toContainText('1号 或 2号');
  await activity(page,'小黑板');await page.getByRole('button',{name:'插入概率分组模板'}).click();await expect(page.locator('.blackboard-canvas [data-mark]')).toHaveCount(6);
  await page.locator('.blackboard-panel select').selectOption('arrow');await page.getByRole('button',{name:'添加所选图形'}).click();const before=await page.locator('.blackboard-canvas path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));expect(before.length).toBeGreaterThan(3);
  await activity(page,'三门挑战');await activity(page,'小黑板');await expect.poll(()=>page.locator('.blackboard-canvas path').evaluateAll(es=>es.map(e=>e.getAttribute('d')))).toEqual(before);
  await activity(page,'学习回顾');await page.getByLabel('用自己的话解释，为什么换门更有利？').fill('初选错误占三种情况中的两种。<script>never()</script>');await page.getByRole('button',{name:'预览最新学习报告'}).click();const frame=page.frameLocator('iframe[title="学习报告预览"]');await expect(frame.locator('blockquote').last()).toContainText('<script>never()</script>');
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'下载独立 HTML 报告'}).click();const file=await downloaded;const body=readFileSync((await file.path())!,'utf8');expect(body).toContain('&lt;script&gt;');expect(body).not.toContain('<script>');expect(body).not.toMatch(/<script[^>]+src=|<link[^>]+href=/);
  await page.screenshot({path:`output/playwright/v04-report-${width}.png`});
  const reportAxe=await new AxeBuilder({page}).include('iframe[title="学习报告预览"]').analyze();expect(reportAxe.violations).toEqual([]);
  await page.getByRole('button',{name:'关闭',exact:true}).click();await page.getByRole('button',{name:'更多阅读工具'}).click();await page.getByRole('button',{name:'切换阅读模式'}).click();await page.locator('.study-reader > .study-load').last().click();await expect(page.locator('.study-article[data-section="unit/monty/choose"]')).toHaveCount(1);await entry(page);await expect(page.getByRole('heading',{name:'小E可以打开哪些门？'})).toBeVisible();
  await page.locator('.lesson-next').getByRole('button').click();await expect(page).toHaveURL(/monty\/choose/);await page.waitForTimeout(500);await expect(page).toHaveURL(/monty\/choose/);await expect(page.getByRole('button',{name:'选择1号舱门',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('micro examples and single Python trial produce actual results; chart uses validated data',async({page})=>{
  await page.goto('/read/unit/monty/variables');await entry(page);await expect(page.getByText('不计分学习活动。修改并运行，观察程序输出。')).toBeVisible();
  await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.locator('.code-output')).toContainText('是否获奖： True',{timeout:90000});
  await activity(page,'一次试验');await page.getByRole('button',{name:'运行一次',exact:true}).click();await expect(page.locator('.monty-simulation .unit-status')).toContainText('1 次真实 Python',{timeout:90000});await expect(page.locator('.frequency-chart svg')).toBeVisible();await expect(page.locator('.unit-table')).toContainText('/ 1');
  await page.getByLabel('查看前几次的精确累计值').fill('1');await expect(page.locator('.frequency-chart')).toContainText('前 1 次');
  await activity(page,'批量实验');await page.getByLabel('试验次数').selectOption('10');await page.getByRole('button',{name:'运行 Python 试验'}).click();await expect(page.locator('.monty-simulation .unit-status')).toContainText('10 次真实 Python',{timeout:90000});const axes=await new AxeBuilder({page}).include('.unit-panel').analyze();expect(axes.violations).toEqual([]);
});

test('closing the floating activity preserves it across book turns',async({page})=>{
 await page.goto('/read/unit/monty/choose');await entry(page);await page.getByRole('button',{name:'选择1号舱门',exact:true}).focus();await page.keyboard.press('Enter');await page.getByLabel('我的预测').selectOption('两者一样');await page.getByLabel('理由（可选）').fill('最初的直觉');
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 for(let i=0;i<12&&!page.url().includes('/predict');i++){await page.getByRole('button',{name:'下一页',exact:true}).click();await page.waitForTimeout(700);}
 await expect(page).toHaveURL(/monty\/predict/);await entry(page);await expect(page.getByLabel('理由（可选）')).toHaveValue('最初的直觉');await page.getByRole('button',{name:'提交预测，打开空门'}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'换到另一扇门',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('.unit-explanation')).toContainText('一次输赢');await page.keyboard.press('Escape');await expect(page.locator('.unit-panel')).toHaveCount(0);
});
