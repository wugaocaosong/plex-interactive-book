import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const chapters=JSON.parse(readFileSync('web/.vitepress/theme/chapter-learning.json','utf8'));

test('mixed tests grade choice, judgment, fill and ordering; restore and reset correctly',async({page})=>{
  await page.goto('/read/chapter_searching/exercises#quiz-chapter_searching');
  await page.locator('.book-host .chapter-quiz-entry:visible').getByRole('button',{name:'开始测试'}).click();
  const quiz=page.locator('.chapter-quiz');await expect(quiz.locator('.quiz-question')).toHaveCount(4);
  await quiz.locator('[data-question-type=single] .quiz-option').nth(1).click();
  await expect(quiz.locator('[data-question-type=single] .quiz-feedback')).toContainText('回答有误');
  await quiz.locator('[data-question-type=judge] .quiz-option').nth(1).click();
  await quiz.getByLabel('你的答案',{exact:true}).fill('−１');
  await quiz.getByLabel('你的答案',{exact:true}).press('Enter');
  await expect(quiz.locator('[data-question-type=fill] .quiz-feedback')).toContainText('回答正确');
  const order=quiz.locator('[data-question-type=order]');
  await order.locator('li').last().getByRole('button',{name:/上移/}).click();
  await order.locator('li').nth(1).getByRole('button',{name:/上移/}).click();
  await order.getByRole('button',{name:'检查顺序',exact:true}).click();
  await expect(order.locator('.quiz-feedback')).toContainText('回答正确');
  await expect(quiz.locator('.quiz-progress')).toContainText('已答 4/4 · 答对 3 题');
  await page.reload();
  await page.locator('.book-host .chapter-quiz-entry:visible').getByRole('button',{name:'开始测试'}).click();
  await expect(quiz.locator('.quiz-progress')).toContainText('答对 3 题');
  await quiz.getByRole('button',{name:'重新作答本章',exact:true}).click();
  await expect(quiz.locator('.quiz-progress')).toContainText('已答 0/4');
  await expect(quiz.getByLabel('你的答案',{exact:true})).toHaveValue('');
});

test('multiselect waits for submit and identifies missing and extra options',async({page})=>{
  await page.goto('/read/chapter_computational_complexity/exercises#quiz-chapter_computational_complexity');
  await page.locator('.book-host .chapter-quiz-entry:visible').getByRole('button',{name:'开始测试'}).click();
  const multi=page.locator('[data-question-type=multiple]');
  await multi.locator('.quiz-option').nth(0).click();await multi.locator('.quiz-option').nth(2).click();
  await expect(multi.locator('.quiz-feedback')).toBeEmpty();
  await multi.getByRole('button',{name:'检查答案',exact:true}).click();
  await expect(multi.locator('.quiz-feedback')).toContainText('漏选 B');
  await expect(multi.locator('.quiz-feedback')).toContainText('多选 C');
});

test('all chapter targets exist and front matter has no quiz',async({page})=>{
  const manifest=await(await page.request.get('/book/manifest.json')).json();
  const ids=new Set(manifest.pages.map((p:{id:string})=>p.id));
  expect(chapters).toHaveLength(16);
  for(const c of chapters){
    expect(c.id).not.toBe('chapter_preface');expect(c.questions).toHaveLength(4);
    expect(new Set(c.questions.map((q:{type:string})=>q.type)).size).toBe(4);
    for(const id of [c.intro,c.target,c.end,c.review])expect(ids.has(id)).toBe(true);
  }
});
