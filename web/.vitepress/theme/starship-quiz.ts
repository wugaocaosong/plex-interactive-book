export interface QuickQuestion {id:string;station:string;kind:'single'|'multiple'|'order';prompt:string;options:string[];answer:number[];feedback:string[];hint:string}
export interface QuickAttempt {answer:number[];passed:boolean;at:string}
export interface QuickRecord {version:1;first?:QuickAttempt;latest?:QuickAttempt;hintUsed:boolean;completedAt?:string}
export function gradeQuick(q:QuickQuestion,answer:number[]){
 if(new Set(answer).size!==answer.length||answer.some(x=>!Number.isInteger(x)||x<0||x>=q.options.length))return false;
 return JSON.stringify(q.kind==='order'?answer:[...answer].sort())===JSON.stringify(q.kind==='order'?q.answer:[...q.answer].sort());
}
