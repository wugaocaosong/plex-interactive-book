import type {BookSection} from './types';

export const contentsRoute='/library/plex-programming/contents';
export function chapterWorlds(sections:BookSection[]) {
  return sections.filter(s=>/^chapter_/.test(s.id)&&s.id.endsWith('/index')).map(section=>{
    const match=section.group.match(/第\s*(\d+)\s*章/);
    const number=match?Number(match[1]):section.id==='chapter_appendix/index'?16:0;
    return {section,number};
  }).filter(s=>s.number>=1&&s.number<=16).sort((a,b)=>a.number-b.number);
}
export class EffectGate {
  private last=-Infinity;
  accept(now:number,active:number,max=4){if(now-this.last<180||active>=max)return false;this.last=now;return true;}
}
export interface PetAppearance {version:1;scale:number;visible:boolean;idleMotion:boolean}
export function petAppearance(value?:Partial<PetAppearance>):PetAppearance {
  return {version:1,scale:Number.isFinite(value?.scale)?Math.max(.7,Math.min(2,value!.scale!)):1,visible:value?.visible!==false,idleMotion:value?.idleMotion!==false};
}
export const idleActions=['peek','wave','stretch','antenna','tablet'] as const;
export function nextIdle(previous:string,random:number){const choices=idleActions.filter(a=>a!==previous);return choices[Math.min(choices.length-1,Math.floor(Math.max(0,random)*choices.length))];}
export function clampPet(x:number,y:number,scale:number,width:number,height:number){
  return {x:Math.max(8,Math.min(x,width-108*scale-12)),y:Math.max(8,Math.min(y,height-140*scale-148))};
}
