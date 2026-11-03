import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chapterWorlds,EffectGate,petAppearance,nextIdle,clampPet} from '../web/.vitepress/theme/space-model.ts';
test('stellar directory covers exactly the sixteen canonical chapters including appendix',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../web/public/book/manifest.json',import.meta.url),'utf8'));
 const chapters=chapterWorlds(manifest.pages);
 assert.deepEqual(chapters.map(c=>c.number),Array.from({length:16},(_,i)=>i+1));
 assert.equal(chapters[15].section.id,'chapter_appendix/index');
 assert.equal(new Set(chapters.map(c=>c.section.route)).size,16);
});
test('particle gate rejects repeated clicks and saturated effects then recovers',()=>{
 const gate=new EffectGate();assert.equal(gate.accept(0,0),true);assert.equal(gate.accept(179,1),false);assert.equal(gate.accept(200,4),false);assert.equal(gate.accept(210,3),true);assert.equal(gate.accept(390,0),true);
});
test('pet preferences migrate safely and clamp at narrow viewport boundaries',()=>{
 assert.deepEqual(petAppearance(),{version:1,scale:1,visible:true,idleMotion:true});assert.equal(petAppearance({scale:NaN}).scale,1);assert.equal(petAppearance({scale:99}).scale,2);assert.equal(petAppearance({scale:0}).scale,.7);
 const p=clampPet(1400,900,2,390,820);assert.ok(p.x+216<=390);assert.ok(p.y+280+148<=820);assert.deepEqual(clampPet(-20,-100,1,390,820),{x:8,y:8});
 for(const name of ['peek','wave','stretch','antenna','tablet'])for(const n of [0,.3,.99,1])assert.notEqual(nextIdle(name,n),name);
});
