import test from 'node:test';import assert from 'node:assert/strict';
import {buildLab,stationDefaults} from '../web/.vitepress/theme/starship-model.ts';
import {readFileSync} from 'node:fs';import {gradeQuick} from '../web/.vitepress/theme/starship-quiz.ts';
test('20 authored questions grade all solutions and reject distractors',()=>{const qs=JSON.parse(readFileSync('content/chapter12/quizzes.json','utf8'));assert.equal(qs.length,20);assert.equal(new Set(qs.map(q=>q.id)).size,20);for(const q of qs){assert.equal(q.options.length,q.feedback.length);assert.ok(gradeQuick(q,q.answer));assert.ok(!gradeQuick(q,[]));assert.ok(!gradeQuick(q,q.kind==='order'?[...q.answer].reverse():[q.options.length-1]));}});
test('five station models are deterministic and exact at boundaries',()=>{
 for(const id of ['merge','search','tree','hanoi','power']){const input=stationDefaults(id);assert.deepEqual(buildLab(id,input),buildLab(id,input));assert.equal(buildLab(id,input).at(-1).phase,'完成');}
 for(const values of [[2,2],[-1,0,-1],[8,7,6,5,4,3,2,1]])assert.deepEqual(buildLab('merge',{...stationDefaults('merge'),values}).at(-1).values,[...values].sort((a,b)=>a-b));
 for(const values of [[],[1,3,5],[2,2,2]])assert.equal(buildLab('search',{...stationDefaults('search'),values,target:9}).at(-1).variables.结果,-1);
 assert.throws(()=>buildLab('search',{...stationDefaults('search'),values:[3,1]}));
 assert.throws(()=>buildLab('tree',{...stationDefaults('tree'),values:[1,2,3],inorder:[3,1,2]}));
 assert.equal(buildLab('tree',{...stationDefaults('tree'),values:[],inorder:[]}).at(-1).variables.节点数,0);
 for(let rings=1;rings<=5;rings++)assert.equal(buildLab('hanoi',{...stationDefaults('hanoi'),rings}).at(-1).variables.移动次数,2**rings-1);
 for(let exponent=0;exponent<=64;exponent++)assert.equal(buildLab('power',{...stationDefaults('power'),base:-3,exponent}).at(-1).variables.结果,String((-3n)**BigInt(exponent)));
});
