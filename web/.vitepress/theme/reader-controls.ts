export type TurnDirection = 'previous' | 'next';
export interface PageTurnCommand { direction: TurnDirection; source: 'keyboard' | 'gesture' | 'voice'; session: number; event: number }
export interface ReaderControlPreferences { previous: string; next: string; fullscreen: string; sensitivity: 'low' | 'standard' | 'high'; reverse: boolean }
export const defaultControls: ReaderControlPreferences = { previous: 'PageUp', next: 'PageDown', fullscreen: '', sensitivity: 'standard', reverse: false };
export function sanitizeControls(value: Partial<ReaderControlPreferences> = {}): ReaderControlPreferences {
  const p = { ...defaultControls, ...value };
  if (!validKey(p.previous) || !validKey(p.next) || p.previous === p.next) { p.previous = 'PageUp'; p.next = 'PageDown'; }
  if (!validKey(p.fullscreen) || keyDirection(p.fullscreen,p)) p.fullscreen = '';
  if (!['low','standard','high'].includes(p.sensitivity)) p.sensitivity = 'standard';
  p.reverse = p.reverse === true; return p;
}
export function mappingConflict(code:string,action:'previous'|'next'|'fullscreen',prefs:ReaderControlPreferences){
 if(!validKey(code))return true;
 if(action==='fullscreen')return !!keyDirection(code,prefs);
 return code===prefs.fullscreen||code===prefs[action==='next'?'previous':'next']||(action==='next'&&['ArrowLeft','PageUp'].includes(code))||(action==='previous'&&['ArrowRight','PageDown'].includes(code));
}
export function validKey(code: string) { return typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Page(Up|Down)|Space|Enter|F([1-9]|1[0-2]))$/.test(code); }
export function keyDirection(code: string, p: ReaderControlPreferences): TurnDirection | undefined {
  if (code === p.previous) return 'previous'; if (code === p.next) return 'next';
  if (code === 'ArrowLeft' || code === 'PageUp') return 'previous';
  if (code === 'ArrowRight' || code === 'PageDown') return 'next';
}
const prev = ['上','前','上一页','前一页','往前','向前','向前翻','往前翻','向上翻','向前翻页','往前翻页','往上翻','上一页吧'];
const next = ['下','后','翻页','下一页','后一页','往后','向后','向后翻','往后翻','向下翻','向后翻页','往后翻页','往下翻','下一页吧'];
export function voiceDirection(raw: string): TurnDirection | 'conflict' | undefined {
  const text = raw.replace(/[\s\p{P}]/gu,'').replace(/^(请|帮我|麻烦|请帮我)+/u,'');
  if (prev.includes(text)) return 'previous'; if (next.includes(text)) return 'next';
  if ((/(上一页|前一页|往前|向前)/.test(text) && /(下一页|后一页|往后|向后)/.test(text)) || /^(上|前)(还是|或者|或|和|然后|再)?(下|后)$|^(下|后)(还是|或者|或|和|然后|再)?(上|前)$/.test(text)) return 'conflict';
}
export class CommandGate {
  private seen = new Map<string, number>(); private until = 0;
  accept(command: PageTurnCommand, now: number, blocked: boolean) {
    const key = command.source + ':' + command.session;
    if (command.event <= (this.seen.get(key) ?? -1)) return false;
    this.seen.set(key, command.event);
    if (this.seen.size > 32) this.seen.delete(this.seen.keys().next().value!);
    if (blocked || now < this.until) return false;
    this.until = now + (command.source === 'keyboard' ? 500 : 900); return true;
  }
}
export interface HandPoint { x: number; y: number; z?: number }
export function openPalm(points: HandPoint[]) {
  if (points.length !== 21) return false;
  const distance=(a:number,b:number)=>Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y);
  return [8,12,16,20].filter(tip => distance(tip,0)>distance(tip-2,0)*1.18).length === 4;
}
export class SwipeTracker {
  private anchor?: {x:number;y:number;t:number}; private armed = false; private cooldown = 0;
  reset() { this.anchor=undefined; this.armed=false; }
  update(hands: HandPoint[][], now: number, prefs: ReaderControlPreferences): TurnDirection | undefined {
    if (hands.length !== 1 || !openPalm(hands[0])) { this.reset(); return; }
    const hand=hands[0]; const x=1-(hand[0].x+hand[5].x+hand[9].x+hand[17].x)/4;
    const y=(hand[0].y+hand[5].y+hand[9].y+hand[17].y)/4;
    if(now<this.cooldown){this.reset();return;}
    if(!this.anchor){this.anchor={x,y,t:now};return;}
    const dx=x-this.anchor.x,dy=y-this.anchor.y,elapsed=now-this.anchor.t;
    if(!this.armed){
      if(Math.hypot(dx,dy)>.04){this.anchor={x,y,t:now};return;}
      if(elapsed>=200){this.armed=true;this.anchor={x,y,t:now};}return;
    }
    // A steady hand stays armed; measure the swipe window from movement, not from initial arming.
    if(Math.hypot(dx,dy)<.03){this.anchor={x,y,t:now};return;}
    if(elapsed>900){this.reset();return;}
    const threshold={low:.28,standard:.2,high:.14}[prefs.sensitivity];
    if(elapsed>=150 && Math.abs(dx)>=threshold && Math.abs(dx)>Math.abs(dy)*2){
      this.cooldown=now+900;this.reset();
      return (dx>0)!==prefs.reverse?'previous':'next';
    }
  }
}
