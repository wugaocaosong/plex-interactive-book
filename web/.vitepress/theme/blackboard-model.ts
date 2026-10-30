import type {MontyHallSession} from './monty-hall';
export interface BlackboardMark {
  id:string;kind:'stroke'|'text'|'scene'|'shape'|'image';color:string;points?:number[][];
  text?:string;x?:number;y?:number;scene?:MontyHallSession;
  shape?:'rectangle'|'ellipse'|'arrow';width?:number;height?:number;seed?:number;
  strokeWidth?:number;fontSize?:number;src?:string;dx?:number;dy?:number;
}
export interface BlackboardDocument {version:1|2;sectionId:string;marks:BlackboardMark[];updatedAt:string}
export interface DrawingBoard {id:string;name:string;marks:BlackboardMark[];width:number;height:number;background:string}
export interface BlackboardWorkspace {version:3;sectionId:string;boards:DrawingBoard[];activeId:string;updatedAt:string}
export const MAX_BOARDS=10;
export function createBoard(name='小黑板 1'):DrawingBoard{return {id:crypto.randomUUID(),name,marks:[],width:1000,height:600,background:'#242723'};}
export function boardWorkspace(sectionId:string,doc?:BlackboardWorkspace|BlackboardDocument):BlackboardWorkspace{
 if(doc?.version===3)return JSON.parse(JSON.stringify(doc));
 const first=createBoard();if(doc)first.marks=JSON.parse(JSON.stringify(doc.marks));
 return {version:3,sectionId,boards:[first],activeId:first.id,updatedAt:doc?.updatedAt||''};
}
export function validMark(m:any):boolean{
 const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=20000;
 if(!m||typeof m.id!=='string'||!/^#[a-f0-9]{6}$/i.test(m.color)||!['stroke','text','scene','shape','image'].includes(m.kind))return false;
 if(['dx','dy'].some(k=>m[k]!==undefined&&!num(m[k])))return false;
 if(m.strokeWidth!==undefined&&(!num(m.strokeWidth)||m.strokeWidth<1||m.strokeWidth>40))return false;
 if(m.fontSize!==undefined&&(!num(m.fontSize)||m.fontSize<12||m.fontSize>120))return false;
 if(m.kind==='text')return typeof m.text==='string'&&m.text.length<=2000&&num(m.x)&&num(m.y);
 if(m.kind==='stroke')return Array.isArray(m.points)&&m.points.length<=4000&&m.points.every((p:any)=>Array.isArray(p)&&p.length===2&&p.every(num));
 if(m.kind==='shape')return ['rectangle','ellipse','arrow'].includes(m.shape)&&Number.isInteger(m.seed)&&m.seed>=1&&[m.x,m.y,m.width,m.height].every(num);
 if(m.kind==='image')return typeof m.src==='string'&&m.src.length<=8_000_000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(m.src)&&[m.x,m.y,m.width,m.height].every(num)&&m.width>0&&m.height>0;
 return !!m.scene&&[1,2].includes(m.scene.version);
}
export function validBoardDocument(doc:any):boolean{
 if(!doc||typeof doc.sectionId!=='string')return false;
 const marks=(v:any)=>Array.isArray(v)&&v.length<=300&&v.every(validMark);
 if([1,2].includes(doc.version))return marks(doc.marks);
 return doc.version===3&&Array.isArray(doc.boards)&&doc.boards.length>=1&&doc.boards.length<=MAX_BOARDS&&new Set(doc.boards.map((b:any)=>b.id)).size===doc.boards.length&&doc.boards.some((b:any)=>b.id===doc.activeId)&&doc.boards.every((b:any)=>b&&typeof b.id==='string'&&typeof b.name==='string'&&b.name.trim().length>0&&b.name.length<=40&&Number.isInteger(b.width)&&b.width>=320&&b.width<=2400&&Number.isInteger(b.height)&&b.height>=240&&b.height<=1800&&/^#[a-f0-9]{6}$/i.test(b.background)&&marks(b.marks));
}
export function upgradeBoard(doc:BlackboardDocument):BlackboardDocument{return {...doc,version:2};}
export function probabilityTemplate():BlackboardMark[]{
  return [
    {id:'probability-correct',kind:'shape',shape:'rectangle',x:70,y:140,width:260,height:280,color:'#D9B873',seed:31},
    {id:'probability-incorrect',kind:'shape',shape:'rectangle',x:370,y:140,width:550,height:280,color:'#70bbb0',seed:32},
    {id:'probability-correct-text',kind:'text',x:95,y:210,text:'初选正确 1/3',color:'#F7EEDB'},
    {id:'probability-incorrect-text',kind:'text',x:410,y:210,text:'初选错误 2/3',color:'#F7EEDB'},
    {id:'probability-correct-result',kind:'text',x:95,y:330,text:'保留初选获奖',color:'#F7EEDB'},
    {id:'probability-incorrect-result',kind:'text',x:410,y:330,text:'换门获奖',color:'#F7EEDB'},
  ];
}
