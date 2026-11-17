import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {correctQuizAnswer, validQuizAnswer, canSubmitQuizAnswer, initialQuizAnswer, multiQuizFeedback, normalizeQuizText} from '../web/.vitepress/theme/chapter-quiz-model.ts';
const chapters=JSON.parse(readFileSync('web/.vitepress/theme/chapter-learning.json','utf8'));

test('all chapters have four questions and four interaction types, with complete reference answers',()=>{
  assert.equal(chapters.length,16);
  const counts={};const ids=new Set();
  for(const c of chapters){
    assert.equal(c.questions.length,4);assert.equal(new Set(c.questions.map(q=>q.type)).size,4);
    for(const q of c.questions){
      assert.ok(!ids.has(q.id));ids.add(q.id);counts[q.type]=(counts[q.type]||0)+1;
      assert.ok(q.explanation);assert.ok(correctQuizAnswer(q,q.answer),q.id);
      if(q.type==='fill')for(const alias of q.accepted)assert.ok(correctQuizAnswer(q,alias),`${q.id}: ${alias}`);
    }
  }
  assert.deepEqual(counts,{single:16,judge:16,fill:16,multiple:8,order:8});
});
test('multiselect requires the exact set but not selection order; feedback identifies missing and extra choices',()=>{
  const q=chapters[0].questions[3];
  assert.ok(correctQuizAnswer(q,[3,2,0]));
  for(const answer of [[],[0],[0,2],[0,1,2,3],[0,0,2,3],[4]])assert.equal(correctQuizAnswer(q,answer),false);
  assert.equal(canSubmitQuizAnswer(q,[]),false);
  const feedback=multiQuizFeedback(q,[0,1]);assert.match(feedback,/漏选 C、D/);assert.match(feedback,/多选 B/);
});
test('ordering starts unsolved and rejects missing, repeated, out-of-range and incorrectly ordered steps',()=>{
  for(const q of chapters.flatMap(c=>c.questions).filter(q=>q.type==='order')){
    const initial=initialQuizAnswer(q);assert.ok(validQuizAnswer(q,initial.value));assert.equal(initial.submitted,false);
    assert.equal(correctQuizAnswer(q,initial.value),false);
    assert.equal(correctQuizAnswer(q,[...q.answer].reverse()),false);
    assert.equal(validQuizAnswer(q,q.answer.slice(1)),false);
    assert.equal(validQuizAnswer(q,q.answer.map(()=>0)),false);
  }
});
test('fill checks accepted forms, Unicode width, spaces and minus signs without giving credit for unrelated text',()=>{
  const rounds=chapters[1].questions[2];assert.ok(correctQuizAnswer(rounds,' ４ '));assert.ok(correctQuizAnswer(rounds,'四次'));
  assert.equal(correctQuizAnswer(rounds,'14'),false);assert.equal(canSubmitQuizAnswer(rounds,'   '),false);
  assert.equal(correctQuizAnswer(rounds,'答案可能是4'),false);
  const queue=chapters[4].questions[2];assert.ok(correctQuizAnswer(queue,' c '));
  const search=chapters[9].questions[2];assert.ok(correctQuizAnswer(search,'−１'));
  assert.equal(normalizeQuizText(' Ｃ '),'c');
});
test('choice values are typed and in range; unanswered tasks cannot be submitted',()=>{
  const q=chapters[0].questions[0];
  for(const value of [-1,3,NaN,0.5,'0',null,{},[0]])assert.equal(validQuizAnswer(q,value),false);
  assert.equal(initialQuizAnswer(q),null);assert.equal(canSubmitQuizAnswer(q,undefined),false);
  const fill=chapters[0].questions[2];assert.equal(validQuizAnswer(fill,'a'.repeat(201)),false);
});
