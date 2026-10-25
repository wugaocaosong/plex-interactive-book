import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {upgradeProgress,blankProgress,completeActivity} from '../web/.vitepress/theme/lesson-state.ts';
import {probabilityTemplate,upgradeBoard} from '../web/.vitepress/theme/blackboard-model.ts';
test('14 lesson pages preserve order, seven stages sum to 45 minutes, every next target exists',()=>{
 const unit=JSON.parse(readFileSync('web/public/learning/monty-unit.json','utf8'));
 assert.equal(unit.pages.length,14);assert.equal(unit.stages.reduce((n,s)=>n+s.minutes,0),45);
 unit.pages.forEach((p,i)=>{assert.equal(p.nextId,unit.pages[i+1]?.id||null);assert.ok(p.goal&&p.prompt&&p.hints.length);});
 assert.equal(new Set(unit.pages.map(p=>p.mode)).size,11);
});
test('migration is idempotent and does not manufacture completion or timestamps',()=>{
 const old={version:1,visited:['unit/monty/start'],assessment:[],reflection:'旧反思',updatedAt:''};
 const value=upgradeProgress(old);assert.deepEqual(upgradeProgress(value),value);assert.deepEqual(value.completed,{});assert.equal(value.updatedAt,'');
 const complete=completeActivity(blankProgress(),'rules','first');assert.equal(completeActivity(complete,'rules','later').completed.rules,'first');
 const board={version:1,sectionId:'s',marks:[],updatedAt:'old'};assert.deepEqual(upgradeBoard(upgradeBoard(board)),upgradeBoard(board));assert.deepEqual(probabilityTemplate(),probabilityTemplate());
});
