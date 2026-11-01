import test from 'node:test';
import assert from 'node:assert/strict';
import {doors,eligibleDoors,remainingDoor,newSession,chooseFirst,revealHost,finishRound,nextRound,validateSimulation,revisePrediction,upgradeSession} from '../web/.vitepress/theme/monty-hall.ts';
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

test('prediction stays empty initially, first reason survives revision and duplicate actions',()=>{
 const start=newSession(42);assert.equal(start.prediction,undefined);
 const first=chooseFirst(start,0);assert.equal(chooseFirst(first,1),first);
 const revealed=revealHost(first,'两者一样','剩下两扇门','2026-10-25');
 assert.equal(revealHost(revealed,'换门更好'),revealed);
 const revised=revisePrediction(revealed,'换门更好','初选错误更常见');
 assert.equal(revised.firstPrediction.reason,'剩下两扇门');assert.equal(revised.revisions.length,1);
 const done=finishRound(revised,true);assert.equal(finishRound(done,false),done);
 const next=nextRound(done);assert.equal(nextRound(next),next);assert.deepEqual(next.firstPrediction,revealed.firstPrediction);
 assert.equal(upgradeSession({...start,version:1}).firstPrediction,undefined);
});
