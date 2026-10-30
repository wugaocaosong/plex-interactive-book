import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultControls,voiceDirection,keyDirection,sanitizeControls,CommandGate,SwipeTracker} from '../web/.vitepress/theme/reader-controls.ts';
test('voice recognizes commands rather than arbitrary substrings',()=>{
 for(const s of ['上','前','请上一页','帮我向前翻','前 一 页'])assert.equal(voiceDirection(s),'previous');
 for(const s of ['下','后','翻页','下一页','请帮我向后翻页'])assert.equal(voiceDirection(s),'next');
 for(const s of ['上海','上下文','以后再说','翻页笔',''])assert.equal(voiceDirection(s),undefined);
 assert.equal(voiceDirection('上一页还是下一页'),'conflict');
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
