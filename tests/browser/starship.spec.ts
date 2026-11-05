import {test,expect,type Page} from '@playwright/test';import {readFileSync} from 'node:fs';import AxeBuilder from '@axe-core/playwright';
const base='/read/chapter_divide_and_conquer/';
async function open(page:Page,section:string,activity:string,mode='study'){
 await page.goto(base+section);await expect(page.locator(mode==='study'?'.study-reader':'.book-host')).toBeVisible();
 if(mode==='flip'){await expect(page.locator('.book-holder')).not.toHaveClass(/loading/);const id=await page.locator(`.source-stage [data-mode="${activity}"]`).first().evaluate(el=>el.closest('[data-block]')!.getAttribute('data-block'));await page.evaluate(id=>location.hash=id!,id);}
 await page.locator(`${mode==='study'?'.study-reader':'.book-host'} [data-mode="${activity}"]:visible`).first().click();
}
for(const width of [390,820,1440])for(const mode of ['study','flip'])test(`starship workflow ${width} ${mode}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(mode=>localStorage.setItem('plex:preferences',JSON.stringify({mode})),mode);
 await open(page,'divide_and_conquer','lab-merge',mode);const lab=page.locator('.starship-workbench');
 await expect(lab).toContainText('能源补给线');await lab.getByRole('button',{name:'直接按原顺序连接',exact:true}).click();await expect(lab.getByRole('status')).toContainText('再想');await expect(lab.getByRole('button',{name:'下一步',exact:true})).toBeDisabled();
 await lab.getByRole('button',{name:'拆成两组',exact:true}).click();await lab.getByRole('button',{name:'下一步',exact:true}).click();await lab.getByRole('button',{name:'播放流程',exact:true}).click();await expect(lab.getByRole('button',{name:'暂停',exact:true})).toBeVisible();await lab.getByRole('button',{name:'暂停',exact:true}).click();
 const axe=await new AxeBuilder({page}).include('.starship-workbench').analyze();expect(axe.violations).toEqual([]);
 await page.getByRole('button',{name:'关闭',exact:true}).click();await open(page,'divide_and_conquer','quiz-merge',mode);
 await page.getByRole('button',{name:'只把任务切开，不必求解',exact:true}).click();await page.getByRole('button',{name:'提交答案',exact:true}).click();await expect(page.locator('.starship-workbench [role=status]')).toContainText('暂未答对');
 await page.getByRole('button',{name:'重新作答'}).click();await page.getByRole('button',{name:'拆成同类子问题，再组合结果',exact:true}).click();await page.getByRole('button',{name:'提交答案',exact:true}).click();await expect(page.locator('.starship-workbench [role=status]')).toContainText('判断正确');
 await page.screenshot({path:`output/starship-${width}-${mode}.png`});
});
test('five labs and all twenty questions are usable',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('plex:preferences',JSON.stringify({mode:'study'})));
 for(const [section,station] of [['binary_search_recur','search'],['build_binary_tree_problem','tree'],['hanota_problem','hanoi'],['exercises','power']]){
  await open(page,section,'lab-'+station);const lab=page.locator('.starship-workbench');await expect(lab).toBeVisible();
  if(station==='search'){await lab.getByLabel('实验数组').fill('5,1');await lab.getByRole('button',{name:'应用输入并重置'}).click();await expect(lab.getByRole('alert')).toContainText('升序');}
  if(station==='tree'){await lab.getByRole('button',{name:'1',exact:true}).click();await lab.getByRole('button',{name:'下一步',exact:true}).click();await expect(lab).toContainText('划分子树');}
  if(station==='hanoi'){for(let i=0;i<2;i++){await lab.getByRole('button',{name:'选择 A 柱',exact:true}).click();await lab.getByRole('button',{name:'选择 C 柱',exact:true}).click();}await expect(lab.getByRole('status')).toContainText('大环不能');}
  if(station==='power'){await lab.getByLabel('指数',{exact:true}).fill('0');await lab.getByRole('button',{name:'应用输入并重置'}).click();await lab.getByRole('button',{name:'返回 1',exact:true}).click();await lab.getByRole('button',{name:'下一步',exact:true}).click();await expect(lab).toContainText('实验完成');}
 }
 const qs=JSON.parse(readFileSync('content/chapter12/quizzes.json','utf8'));const sections:Record<string,string>={merge:'divide_and_conquer',search:'binary_search_recur',tree:'build_binary_tree_problem',hanoi:'hanota_problem',power:'exercises',summary:'summary'};
 for(const station of Object.keys(sections)){await open(page,sections[station],'quiz-'+station);for(const [i,q] of qs.filter((q:any)=>q.station===station).entries()){
  if(i)await page.getByRole('button',{name:'下一题',exact:true}).click();
  if(q.kind==='order'){for(let target=0;target<q.answer.length;target++){const label=q.options[q.answer[target]];for(let j=0;j<q.answer.length-1-target;j++)await page.getByRole('button',{name:'上移 '+label,exact:true}).click();}}
  else for(const a of q.answer)await page.getByRole('button',{name:q.options[a],exact:true}).click();
  await page.getByRole('button',{name:'提交答案',exact:true}).click();await expect(page.locator('.starship-workbench [role=status]')).toContainText('判断正确');
 }}
});
test('real Python history restores versions, distinguishes errors and timeout',async({page})=>{
 test.setTimeout(180000);await page.addInitScript(()=>localStorage.setItem('plex:preferences',JSON.stringify({mode:'study'})));await open(page,'divide_and_conquer','code-merge');
 const editor=page.getByLabel('完整示例代码');await expect(editor).toContainText('solve');await editor.fill('print("flight ok")');await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.getByLabel('运行结果')).toContainText('flight ok',{timeout:90000});await expect(page.getByRole('button',{name:'停止运行'})).toHaveCount(0);
 await page.getByRole('button',{name:'运行与测试历史',exact:true}).click();await expect(page.locator('.run-history article')).toHaveCount(1);await editor.fill('print("draft")');await page.getByRole('button',{name:'恢复到编辑器',exact:true}).click();await expect(editor).toHaveText('print("flight ok")');await page.getByRole('button',{name:'撤销重置',exact:true}).click();await expect(editor).toHaveText('print("draft")');
 await editor.fill('raise ValueError("boom")');await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.locator('.run-history')).toContainText('error');
 await editor.fill('while True: pass');await page.getByRole('button',{name:'运行 Python',exact:true}).click();await expect(page.locator('.run-history')).toContainText('timeout',{timeout:20000});await page.getByRole('button',{name:'小E复查此版本'}).last().click();await expect(page.locator('.pet-bubble')).toBeVisible();await expect(page.getByLabel('发消息给小艺')).toHaveValue(/复查/);
});
test('frame reading previews actual page and sends only on explicit request',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('plex:preferences',JSON.stringify({mode:'study'}));localStorage.setItem('plex:user:99881:preferences',JSON.stringify({mode:'study'}));sessionStorage.setItem('plex-account',JSON.stringify({id:99881,username:'frame-test'}));sessionStorage.setItem('plex-session',JSON.stringify({access_token:'test'}));});
 let payload:any;await page.route('**/api/v1/student/messenger/chat',async route=>{payload=route.request().postDataJSON();await route.fulfill({json:{code:0,data:{reply:'已分析选区',source:'llm',reading_context_version:payload.reading_context.version,reading_text_used:true,reading_image_used:!!payload.reading_context.image}}});});
 await page.goto(base+'divide_and_conquer');await expect(page.locator('.study-reader')).toBeVisible();await page.getByRole('button',{name:'小艺阅读助手，点击聊天，拖动移动'}).click();await page.getByRole('button',{name:'框框阅读',exact:true}).click();await page.getByRole('button',{name:'选择当前段落',exact:true}).click();await page.getByRole('button',{name:'预览选区',exact:true}).click();await expect(page.locator('.reading-preview img')).toBeVisible({timeout:30000});expect(payload).toBeUndefined();await page.getByRole('button',{name:'使用图文选区',exact:true}).click();await expect(page.locator('.pet-bubble')).toBeVisible();await page.locator('.pet-code-preview summary').click();await page.getByRole('button',{name:'解释这里',exact:true}).click();await page.getByRole('button',{name:'发送',exact:true}).click();await expect(page.locator('.pet-messages')).toContainText('已分析选区');expect(payload.reading_context.image).toMatch(/^data:image\//);expect(payload.code_context).toBeUndefined();
});
test('QA offline input survives reopen and publication requires confirmation',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('plex:preferences',JSON.stringify({mode:'study'}));localStorage.setItem('plex:user:99882:preferences',JSON.stringify({mode:'study'}));sessionStorage.setItem('plex-account',JSON.stringify({id:99882,username:'qa-test'}));sessionStorage.setItem('plex-session',JSON.stringify({access_token:'test'}));});await page.route('**/api/v1/ebook/qa**',r=>r.fulfill({status:503,json:{code:50001,message:'offline'}}));await open(page,'summary','qa');await page.getByLabel('提问或回复').fill('为什么要先判断停止条件？');await page.getByRole('button',{name:'确认发布到共享问答'}).click();await expect(page.locator('.ebook-qa [role=alert]')).toContainText('输入已保留');await page.getByRole('button',{name:'关闭',exact:true}).click();await open(page,'summary','qa');await expect(page.getByLabel('提问或回复')).toHaveValue('为什么要先判断停止条件？');
});

test('frame reading preserves visible formula LaTeX and illustration crops',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('plex:preferences',JSON.stringify({mode:'study'})));
 for(const [width,kind] of [[1440,'formula'],[390,'formula'],[1440,'image']] as const){
  await page.setViewportSize({width,height:1000});await page.goto(base+'divide_and_conquer');await expect(page.locator('.study-reader')).toBeVisible();
  const target=page.locator(kind==='formula'?'.study-reader [data-tex]':'.study-reader figure img').first();await target.scrollIntoViewIfNeeded();
  const rect=await target.boundingBox();expect(rect).not.toBeNull();const tex=kind==='formula'?await target.getAttribute('data-tex'):'';
  await page.getByRole('button',{name:'小艺阅读助手，点击聊天，拖动移动'}).click();await page.getByRole('button',{name:'框框阅读',exact:true}).click();
  const r=rect!;const left=Math.max(2,r.x),top=Math.max(70,r.y),right=Math.min(width-2,r.x+r.width),bottom=Math.min(700,r.y+r.height);
  await page.mouse.move(left,top);await page.mouse.down();await page.mouse.move(right,bottom,{steps:8});await page.mouse.up();await page.getByRole('button',{name:'预览选区',exact:true}).click();
  await expect(page.locator('.reading-preview img')).toBeVisible({timeout:30000});if(tex)await expect(page.locator('.reading-preview')).toContainText(tex);
  const opaque=await page.locator('.reading-preview img').evaluate(async(el)=>{const img=el as HTMLImageElement;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)n++;return n/(c.width*c.height);});expect(opaque).toBeGreaterThan(.3);
  await page.screenshot({path:`output/starship-frame-${kind}-${width}.png`});await page.getByRole('button',{name:'取消框选',exact:true}).click();
 }
});
