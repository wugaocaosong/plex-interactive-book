import {test,expect} from '@playwright/test';import ts from 'typescript';import {readFileSync} from 'node:fs';
const files=['learning-scope.ts','monty-hall.ts','lesson-state.ts','blackboard-model.ts','learning-store.ts','run-history.ts'];
const code=ts.transpileModule(files.map(file=>readFileSync('web/.vitepress/theme/'+file,'utf8').replace(/^import[\s\S]*?from\s*["'][^"']+["'];?\s*/gm,'')).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
test('starship records backup roundtrip, history cap and validation',async({page})=>{
 await page.goto('/read/title');const result=await page.evaluate(async source=>{const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));const api=await import(url);URL.revokeObjectURL(url);
 const row={reference:'ch12-merge',file:'merge.py',language:'python',version:'v1',code:'print(1)',stdin:'',kind:'run',state:'done',output:'1',diagnostics:[],results:[]};
 for(let i=0;i<51;i++)await api.saveRun({...row,id:String(i),at:new Date(2026,0,1,0,0,i).toISOString()});
 await api.putLearning('chapter12:quiz:merge-concept',{version:1,hintUsed:true,first:{answer:[1],passed:false,at:new Date().toISOString()},latest:{answer:[0],passed:true,at:new Date().toISOString()}});
 await api.putLearning('qa-draft:chapter_divide_and_conquer/summary',{text:'保留离线问题',ai:false,parent:null});
 const snapshot=await api.exportBackup();const rows=await api.readHistory('ch12-merge');await api.deleteRun('ch12-merge','50');await api.importBackup(snapshot);const imported=await api.allLearning();let rejected=false;
 const bad=structuredClone(snapshot);bad.records.find((r:any)=>r.id==='code-history:ch12-merge').value[0].state='fake-success';try{api.validateBackup(bad);}catch{rejected=true;}
 return {count:rows.length,oldest:rows.at(-1).id,conflict:imported.some((r:any)=>r.id.startsWith('conflict:code-history:')),question:(await api.getLearning('chapter12:quiz:merge-concept',null)),draft:await api.getLearning('qa-draft:chapter_divide_and_conquer/summary',null),rejected,credentials:snapshot.records.some((r:any)=>/token|session|reading_context/.test(r.id))};},code);
 expect(result.count).toBe(50);expect(result.oldest).toBe('1');expect(result.conflict).toBe(true);expect(result.question.first.passed).toBe(false);expect(result.question.latest.passed).toBe(true);expect(result.draft.text).toBe('保留离线问题');expect(result.rejected).toBe(true);expect(result.credentials).toBe(false);
});
test('new account starts with isolated history and quiz records',async({page})=>{
 await page.goto('/read/title');await page.evaluate(async source=>{const api=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));await api.putLearning('code-history:ch12-merge',[{id:'guest'}]);sessionStorage.setItem('plex-account',JSON.stringify({id:99201}));},code);await page.reload();const rows=await page.evaluate(async source=>{const api=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));return api.readHistory('ch12-merge');},code);expect(rows).toEqual([]);
});
