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

import {createLessonReport,reportHtml,reportMarkdown} from '../web/.vitepress/theme/lesson-report.ts';
test('report derives grades, remediates each topic, and whitelists export evidence',()=>{
 const exercises=JSON.parse(readFileSync('web/public/learning/exercises.json','utf8')).filter(e=>e.id.startsWith('monty-'));
 const progress={...blankProgress(),reflection:'<script>bad()</script>',token:'SECRET',username:'PRIVATE'};
 const base={progress,exercises,attempts:[],quiz:{score:4,questionScores:[0,1,1,1]},story:{firstPrediction:{choice:'两者一样',reason:'先前理由'}}};
 const r=createLessonReport(base);assert.equal(r.achieved,false);assert.ok(r.suggestions.some(s=>s.link.endsWith('/rules')));assert.equal(r.prediction,'两者一样');
 const html=reportHtml(r,'http://localhost:5190');assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('SECRET'));assert.ok(!html.includes('PRIVATE'));assert.ok(!reportMarkdown(r,'http://localhost:5190').includes('SECRET'));
 const attempts=exercises.map(e=>({exerciseId:e.id,results:e.tests.map(()=>({passed:true})),hints:0}));
 assert.equal(createLessonReport({...base,attempts,quiz:{questionScores:[1,1,1,0]}}).achieved,true);
 assert.equal(createLessonReport({...base,attempts}).achieved,false);
});
