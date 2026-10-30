import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {defaultControls,voiceDirection,keyDirection,sanitizeControls,CommandGate,SwipeTracker} from '../web/.vitepress/theme/reader-controls.ts';
test('voice recognizes commands rather than arbitrary substrings',()=>{
 for(const s of ['上','前','请上一页','帮我向前翻','前 一 页'])assert.equal(voiceDirection(s),'previous');
 for(const s of ['下','后','翻页','下一页','请帮我向后翻页'])assert.equal(voiceDirection(s),'next');
 for(const s of ['上海','上下文','以后再说','翻页笔',''])assert.equal(voiceDirection(s),undefined);
 assert.equal(voiceDirection('上一页还是下一页'),'conflict');
 assert.equal(voiceDirection('上或下'),'conflict');
});
test('mapping validation and command deduplication',()=>{
 assert.equal(keyDirection('KeyN',{...defaultControls,next:'KeyN'}),'next');
 assert.deepEqual(sanitizeControls({previous:'Escape',next:'Escape'}),defaultControls);
 const g=new CommandGate(),c={source:'voice',session:1,event:1,direction:'next'};
 assert.equal(g.accept(c,0,false),true);assert.equal(g.accept(c,2000,false),false);
 assert.equal(g.accept({...c,event:2},2000,true),false);assert.equal(g.accept({...c,event:2},4000,false),false);
 assert.equal(g.accept({...c,event:3},4100,false),true);assert.equal(g.accept({...c,event:4},4200,false),false);
});
function hand(x){return Array.from({length:21},(_,i)=>({x,y:i===0?.8:[8,12,16,20].includes(i)?.2:.5}));}
test('swipes arm only after stable open hand, reject return, closed and double hands',()=>{
 const s=new SwipeTracker();s.update([hand(.5)],0,defaultControls);s.update([hand(.5)],220,defaultControls);
 assert.equal(s.update([hand(.75)],450,defaultControls),'next');
 assert.equal(s.update([hand(.5)],700,defaultControls),undefined);
 s.update([hand(.5)],1500,defaultControls);s.update([hand(.5)],1720,defaultControls);
 assert.equal(s.update([hand(.25)],1950,defaultControls),'previous');
 s.update([hand(.5),hand(.7)],3000,defaultControls);assert.equal(s.update([hand(.8)],3200,defaultControls),undefined);
 const jitter=new SwipeTracker();for(let t=0;t<2000;t+=100)assert.equal(jitter.update([hand(.5+(t%200)/10000)],t,defaultControls),undefined);
});
test('gesture direction reversal and no vertical or closed-hand turns',()=>{
 const s=new SwipeTracker(),prefs={...defaultControls,reverse:true};s.update([hand(.5)],0,prefs);s.update([hand(.5)],220,prefs);
 assert.equal(s.update([hand(.75)],450,prefs),'previous');
 const vertical=new SwipeTracker();vertical.update([hand(.5)],0,defaultControls);vertical.update([hand(.5)],220,defaultControls);
 assert.equal(vertical.update([hand(.75).map(p=>({...p,y:p.y+.3}))],450,defaultControls),undefined);
 const closed=new SwipeTracker();for(let t=0;t<1000;t+=100)assert.equal(closed.update([hand(.5+t/2000).map(p=>({...p,y:.5}))],t,defaultControls),undefined);
 const held=new SwipeTracker();for(let t=0;t<=3000;t+=100)held.update([hand(.5)],t,defaultControls);
 assert.equal(held.update([hand(.75)],3250,defaultControls),'next');
});
test('AudioWorklet resampling preserves phase across 128-sample buffers',()=>{
 for(const rate of [16000,44100,48000,96000]){
  let Processor;const messages=[];
  class Worklet {port={postMessage:value=>messages.push(value)};}
  vm.runInNewContext(readFileSync('web/public/input-runtime/voice-capture.js','utf8'),{sampleRate:rate,AudioWorkletProcessor:Worklet,registerProcessor:(_,value)=>Processor=value});
  const p=new Processor();
  for(let offset=0;offset<rate;offset+=128){const samples=new Float32Array(Math.min(128,rate-offset)).fill(.25);p.process([[samples]]);}
  const count=messages.reduce((n,m)=>n+m.samples.length,0)+p.chunk.length;
  assert.ok(Math.abs(count-16000)<=1,`${rate} produced ${count}`);
  assert.ok(messages.every(m=>Math.abs(m.level-.25)<1e-6));
 }
});
