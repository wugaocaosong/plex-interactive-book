import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeSteps,hanoiSteps,moveRing,initialTowers} from '../web/.vitepress/theme/chapter12-model.ts';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
test('chapter overlay retains 118 pages, unique first terms, five separate tasks and source frames',()=>{
 const manifest=json('web/public/book/manifest.json');assert.equal(manifest.pages.filter(p=>p.sourcePath).length,118);
 const pages=manifest.pages.filter(p=>p.id.startsWith('chapter_divide_and_conquer/')).map(p=>json(`web/public/book/pages/${p.id}.json`));
 assert.equal(pages.length,7);const terms=pages.flatMap(p=>[...p.html.matchAll(/data-term="([^"]+)"/g)].map(m=>m[1]));assert.equal(new Set(terms).size,terms.length);assert.ok(terms.includes('分治'));
 assert.equal(pages.filter(p=>p.html.includes('开始探险！')).length,1);
 assert.equal(json('web/public/chapter12/tasks.json').length,5);assert.equal(json('web/public/learning/exercises.json').length,27);
 assert.ok(pages.find(p=>p.id.endsWith('hanota_problem')).animations.length>0);
 assert.ok(pages[0].html.includes('导入视频后可播放'));
});
test('merge teaching steps are deterministic and preserve duplicate and negative numbers',()=>{
 for(const a of [[6,3,8,2,5,1],[2,2],[-3,1,-3,0],[8,7,6,5,4,3,2,1]]){
  assert.deepEqual(mergeSteps(a).at(-1).values,[...a].sort((x,y)=>x-y));assert.deepEqual(mergeSteps(a),mergeSteps(a));
 }
 for(const a of [[],[1],Array(9).fill(1),[1,NaN],[1,1.5]])assert.throws(()=>mergeSteps(a));
});
test('hanoi states obey every rule with 2^n-1 moves; invalid manual moves never mutate state',()=>{
 for(let n=1;n<=5;n++){
  const states=hanoiSteps(n);assert.equal(states.length,2**n);assert.deepEqual(states.at(-1).towers,[[],[],initialTowers(n)[0]]);
  for(const s of states)for(const tower of s.towers)for(let i=1;i<tower.length;i++)assert.ok(tower[i-1]>tower[i]);
 }
 const start=initialTowers(3), first=moveRing(start,0,2);
 assert.throws(()=>moveRing(first,0,2));assert.throws(()=>moveRing(first,1,2));assert.throws(()=>moveRing(first,0,0));assert.deepEqual(start,[[3,2,1],[],[]]);
});
