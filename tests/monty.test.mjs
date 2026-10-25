import test from 'node:test';
import assert from 'node:assert/strict';
import {doors,eligibleDoors,remainingDoor,newSession,chooseFirst,revealHost,finishRound,nextRound,validateSimulation} from '../web/.vitepress/theme/monty-hall.ts';
test('all weighted Monty outcomes yield exact 1/3 stay and 2/3 switch',()=>{
 let stay=0,change=0;
 for(const prize of doors)for(const first of doors){
  const allowed=eligibleDoors(prize,first);
  for(const opened of allowed){const weight=1/9/allowed.length;stay+=+(first===prize)*weight;change+=+(remainingDoor(first,opened)===prize)*weight;}
 }
 assert.ok(Math.abs(stay-1/3)<1e-12);assert.ok(Math.abs(change-2/3)<1e-12);
});
test('story seeds, predictions and history are deterministic without duplicate records',()=>{
 const a=revealHost(chooseFirst(newSession(45),1),'switch');
 assert.deepEqual(a,revealHost(chooseFirst(newSession(45),1),'switch'));
 assert.ok(eligibleDoors(a.prize,1).includes(a.opened));
 const end=finishRound(a,true);assert.equal(end.step,3);assert.equal(nextRound(end).history.length,1);
 assert.throws(()=>revealHost(newSession(),''));assert.throws(()=>newSession(-1));assert.throws(()=>remainingDoor(1,1));
});
test('simulation validation rejects fabricated statistics and illegal host moves',()=>{
 const trials=Array.from({length:10},()=>({prize:0,first:0,opened:1,stay:0,switch:2,stayWon:true,switchWon:false}));
 const value={count:10,seed:0,stayWins:10,switchWins:0,trials};
 assert.equal(validateSimulation(value),value);
 assert.throws(()=>validateSimulation({...value,stayWins:9}));
 assert.throws(()=>validateSimulation({...value,trials:trials.map(t=>({...t,opened:0}))}));
});
