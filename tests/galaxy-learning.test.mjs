import test from 'node:test';
import assert from 'node:assert/strict';
import {teachingSteps,sceneDefinitions} from '../web/.vitepress/theme/teaching-models.ts';
import {organizeBookmarks,removeGroup,removeLevel} from '../web/.vitepress/theme/bookmark-model.ts';
import {formulaSource} from '../web/.vitepress/theme/formula-copy.ts';
test('all seventeen deterministic scenes and boundary results',()=>{
 assert.deepEqual(Object.keys(sceneDefinitions).sort(), ['merge','binary','tree','hanoi','permutations','queens','stairs','knapsack','fractional','capacity','workflow','stack','queue','deque','hash','traversal','heap'].sort());
 for(const [id,d] of Object.entries(sceneDefinitions)){assert.deepEqual(teachingSteps(id,d.input),teachingSteps(id,d.input));assert.ok(teachingSteps(id,d.input).length>0);}
 assert.equal(teachingSteps('binary',{array:[],target:3}).at(-1).result,-1);
 assert.equal(teachingSteps('binary',{array:[1,1,2],target:2}).at(-1).result,2);
 assert.throws(()=>teachingSteps('binary',{array:[2,1],target:1}));
 assert.deepEqual(teachingSteps('tree',{preorder:[],inorder:[]}).at(-1).result,null);
 assert.throws(()=>teachingSteps('tree',{preorder:[1,2,3],inorder:[3,1,2]}));
 assert.equal(teachingSteps('permutations',[1,1,2]).at(-1).result.length,3);
 for(let n=4;n<=8;n++){const q=teachingSteps('queens',n).at(-1).result;assert.equal(q.length,n);for(let r=0;r<n;r++)for(let k=0;k<r;k++){assert.notEqual(q[r],q[k]);assert.notEqual(Math.abs(q[r]-q[k]),r-k);}}
 assert.equal(teachingSteps('stairs',0).at(-1).result,1);
 assert.equal(teachingSteps('stairs',6).at(-1).result,13);
 assert.equal(teachingSteps('knapsack',{weights:[2,3,4],values:[3,4,5],capacity:6}).at(-1).result,8);
 assert.equal(teachingSteps('knapsack',{weights:[],values:[],capacity:0}).at(-1).result,0);
 assert.equal(teachingSteps('fractional',{weights:[10,20,30],values:[60,100,120],capacity:20}).at(-1).result,110);
 assert.equal(teachingSteps('capacity',[1,8,6,2,5,4,8,3,7]).at(-1).result,49);
 assert.equal(teachingSteps('capacity',[0,0]).at(-1).result,0);
});
test('bookmarks migrate idempotently and keep locators during metadata deletion',()=>{
 const old=[{sectionId:'test',blockId:'blk-123',offset:8,title:'note'}],rows=organizeBookmarks(old);
 assert.deepEqual(organizeBookmarks(rows),rows);assert.equal(rows[0].createdAt,'');
 rows[0].groupId='g';rows[0].importance='review';assert.equal(removeGroup(rows,'g')[0].groupId,'');assert.equal(removeLevel(rows,'review')[0].importance,'normal');assert.equal(removeLevel(rows,'review')[0].offset,8);
});
test('copy complete original formula including multiline TeX',()=>{
 for(const source of ['\\frac{n}{2}','x_{i}^{2}','\\begin{aligned}a&=b\\\\c&=d\\end{aligned}']){assert.equal(formulaSource('\\['+source+'\\]'),source);assert.equal(formulaSource('\\['+source+'\\]',true),'$$\n'+source+'\n$$');assert.equal(formulaSource('\\('+source+'\\)',true),'$'+source+'$');}
});
