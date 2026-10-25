import type {MontyHallSession} from './monty-hall';
export interface BlackboardMark {
  id:string;kind:'stroke'|'text'|'scene'|'shape';color:string;points?:number[][];
  text?:string;x?:number;y?:number;scene?:MontyHallSession;
  shape?:'rectangle'|'ellipse'|'arrow';width?:number;height?:number;seed?:number;
}
export interface BlackboardDocument {version:1|2;sectionId:string;marks:BlackboardMark[];updatedAt:string}
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
