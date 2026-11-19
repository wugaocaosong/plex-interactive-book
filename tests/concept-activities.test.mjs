import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adjacency,traversalFrames,binaryFrames,insertionIndex,hashInsert,inversions,partitionValues,conceptEntries} from '../web/.vitepress/theme/concept-activities.ts';
test('concept entries anchor to existing authored explanations in chapters 9-11',()=>{
 assert.equal(conceptEntries.length,8);assert.equal(new Set(conceptEntries.map(e=>e.id)).size,8);
 for(const e of conceptEntries){const page=JSON.parse(readFileSync(`web/public/book/pages/${e.section}.json`,'utf8'));assert.ok(page.html.includes(`data-block="${e.anchor}"`),e.section);}
});
test('graph matrix is symmetric; BFS and DFS preserve real visit order with cycles',()=>{
 const edges=[[0,1],[0,2],[1,3],[2,3],[3,4]],m=adjacency(5,edges);
 for(let a=0;a<5;a++)for(let b=0;b<5;b++)assert.equal(m[a][b],m[b][a]);
 assert.deepEqual(traversalFrames(5,edges,0,'bfs').at(-1).order,[0,1,2,3,4]);
 assert.deepEqual(traversalFrames(5,edges,0,'dfs').at(-1).order,[0,1,3,2,4]);
 assert.deepEqual(traversalFrames(5,[],3,'dfs').at(-1).order,[3]);
});
test('binary search traces handle present, absent and boundary targets',()=>{
 const values=[1,3,3,5,7,9,11,13];
 for(let target=0;target<=14;target++){const trace=binaryFrames(values,target),last=trace.at(-1);if(values.includes(target))assert.equal(values[last.found],target);else{assert.equal(last.found,-1);assert.ok(last.left>last.right);}for(const f of trace)if(f.mid>=0)assert.ok(f.mid>=f.left&&f.mid<=f.right);}
 assert.equal(insertionIndex(values,3),1);assert.equal(insertionIndex(values,3,true),3);assert.equal(insertionIndex(values,99),8);
});
test('linear probing records collisions, wraps and terminates for a full table',()=>{
 let slots=Array(5).fill(null);
 for(const key of [4,9,14,19,24]){const r=hashInsert(slots,key);assert.ok(r.inserted);slots=r.slots;}
 assert.deepEqual(slots,[9,14,19,24,4]);const full=hashInsert(slots,29);assert.equal(full.inserted,false);assert.equal(full.path.length,5);assert.deepEqual(full.slots,slots);
});
test('sorting metrics count only strict inversions and partition preserves duplicates',()=>{
 assert.equal(inversions([3,3,1]),2);assert.equal(inversions([1,3,3]),0);
 const values=[7,3,5,3,1],groups=partitionValues(values,3);assert.deepEqual(groups,[[1],[3,3],[7,5]]);assert.deepEqual(groups.flat().sort((a,b)=>a-b),[...values].sort((a,b)=>a-b));
});
