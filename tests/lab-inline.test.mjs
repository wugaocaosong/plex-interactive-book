import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function runtime(draft={}) {
 const writes=[],workers=[];
 class Worker {
  constructor(){workers.push(this);this.sent=[];this.terminated=false;}
  postMessage(message){this.sent.push(message);}
  terminate(){this.terminated=true;}
  emit(type,extra={}){this.onmessage({data:{type,runId:this.sent[0].runId,...extra}});}
 }
 const context={Worker,setTimeout,clearTimeout,getLearning:async()=>draft,putLearning:async(...args)=>writes.push(args),learningScope:'',exports:{}};
 const source=readFileSync('web/.vitepress/theme/lab-inline.ts','utf8').replace(/^import .*;\r?\n/gm,'');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const area={value:'print(1)',defaultValue:'print(1)',textContent:'print(1)'},out={textContent:'',scrollHeight:0},status={textContent:''},run={disabled:false};
 const nodes={'.lab-editor-code':area,'.lab-editor-out':out,'.lab-editor-status':status,'[data-action="lab-run"]':run};
 const card={dataset:{labKey:'test',codePrefix:'def helper(): return 1'},querySelector:s=>nodes[s]};
 const root={querySelectorAll:()=>[card]};
 const act=name=>context.exports.labEditorAction({dataset:{action:name},closest:()=>card});
 return {api:context.exports,root,card,area,out,status,run,workers,writes,act};
}
test('inline editor restores drafts, runs current code in place and resets to authored code',async()=>{
 const r=runtime({code:'print(42)'});r.api.hydrateLabEditors(r.root);await Promise.resolve();await Promise.resolve();
 assert.equal(r.area.value,'print(42)');assert.equal(r.act('lab-run'),true);
 const worker=r.workers[0];worker.emit('ready');
 assert.match(worker.sent[1].code,/def helper/);assert.match(worker.sent[1].code,/print\(42\)/);
 assert.equal(worker.sent[1].echoLastExpression,true);
 worker.emit('stdout',{text:'42'});worker.emit('done');
 assert.equal(r.out.textContent,'42\n');assert.equal(r.run.disabled,false);assert.equal(worker.terminated,true);
 r.act('lab-reset');assert.equal(r.area.value,'print(1)');assert.equal(r.writes.at(-1)[1].code,'print(1)');
});
test('stop and Python errors terminate the worker and allow another run',()=>{
 const r=runtime();r.act('lab-run');r.workers[0].emit('ready');r.act('lab-stop');
 assert.equal(r.workers[0].terminated,true);assert.equal(r.status.textContent,'已停止');
 r.act('lab-run');r.workers[1].emit('ready');r.workers[1].emit('error',{text:'ValueError: test'});
 assert.match(r.out.textContent,/ValueError: test/);assert.equal(r.workers[1].terminated,true);assert.equal(r.run.disabled,false);
});
