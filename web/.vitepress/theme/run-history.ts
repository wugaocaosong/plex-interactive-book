import {getLearning,updateLearning} from './learning-store';
import type {Diagnostic,TestResult} from './types';
export interface RunSnapshot {id:string;reference:string;file:string;language:string;version:string;code:string;stdin:string;kind:'run'|'test';state:'running'|'done'|'error'|'stopped'|'timeout';at:string;endedAt?:string;output:string;diagnostics:Diagnostic[];results:TestResult[]}
export const historyKey=(reference:string)=>'code-history:'+reference;
export const readHistory=(reference:string)=>getLearning<RunSnapshot[]>(historyKey(reference),[]);
export function saveRun(run:RunSnapshot){const snapshot=JSON.parse(JSON.stringify(run));return updateLearning<RunSnapshot[]>(historyKey(run.reference),[],rows=>[snapshot,...rows.filter(r=>r.id!==run.id)].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,50));}
export function deleteRun(reference:string,id:string){return updateLearning<RunSnapshot[]>(historyKey(reference),[],rows=>rows.filter(r=>r.id!==id));}
export function exportRuns(rows:RunSnapshot[]){const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,records:rows},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='plex-code-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
