export type Door = 0 | 1 | 2;
export const doors: Door[] = [0, 1, 2];
export interface PredictionRecord { choice: string; reason: string; round: number; at?: string }
export interface MontyTrial { prize: Door; first: Door; opened: Door; final: Door; won: boolean; prediction?: string; reason?: string }
export interface MontyHallSession {
  version: 1 | 2; seed: number; round: number; step: number; prediction?: string; reason?: string;
  prize: Door; first?: Door; opened?: Door; final?: Door; history: MontyTrial[];
  firstPrediction?: PredictionRecord; revisions?: PredictionRecord[];
}
export interface SimulationResult {
  count: number; seed: number; stayWins: number; switchWins: number;
  trials: { prize: Door; first: Door; opened: Door; stay: Door; switch: Door; stayWon: boolean; switchWon: boolean }[];
}
export function randomAt(seed: number, index: number) {
  let state = (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  state = Math.imul(state ^ (state >>> 16), 0x21f0aaad);
  state = Math.imul(state ^ (state >>> 15), 0x735a2d97);
  return ((state ^ (state >>> 15)) >>> 0) / 4294967296;
}
export function eligibleDoors(prize: Door, first: Door): Door[] {
  if (!doors.includes(prize) || !doors.includes(first)) throw Error('门编号必须为 0、1 或 2');
  return doors.filter(d => d !== prize && d !== first);
}
export function remainingDoor(first: Door, opened: Door): Door {
  if (!doors.includes(first) || !doors.includes(opened) || first === opened) throw Error('主持人不能打开初选门');
  return doors.find(d => d !== first && d !== opened)!;
}
export function newSession(seed = 2026, round = 0, history: MontyTrial[] = []): MontyHallSession {
  if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) throw Error('种子应为 0–2147483647 的整数');
  return { version: 2, seed, round, step: 0, prize: Math.floor(randomAt(seed, round * 2) * 3) as Door, history, revisions: [] };
}
export function upgradeSession(s: MontyHallSession): MontyHallSession {
  return {...s,version:2,revisions:s.revisions || []};
}
export function chooseFirst(s: MontyHallSession, first: Door): MontyHallSession {
  if (!doors.includes(first)) throw Error('请选择一扇门');
  if (s.step!==0) return s;
  return { ...s, first, opened: undefined, final: undefined, prediction: undefined, reason:undefined, step: 1 };
}
export function revealHost(s: MontyHallSession, prediction: string, reason='', at?:string): MontyHallSession {
  if (s.first === undefined) throw Error('请先选择舱门');
  if(s.step!==1)return s;
  if(!prediction.trim())throw Error('请提交预测或明确选择跳过');
  const allowed = eligibleDoors(s.prize, s.first);
  const entry={choice:prediction,reason:reason.slice(0,2000),round:s.round,...(at?{at}:{})};
  return { ...s, version:2, prediction, reason:entry.reason,
    firstPrediction:s.firstPrediction || entry,
    revisions:s.firstPrediction?[...(s.revisions||[]),entry].slice(-200):(s.revisions||[]),
    opened: allowed[Math.floor(randomAt(s.seed, s.round * 2 + 1) * allowed.length)], step: 2 };
}
export function revisePrediction(s:MontyHallSession,choice:string,reason:string,at?:string):MontyHallSession {
  if(!choice.trim()||!s.firstPrediction)throw Error('请先提交首次预测');
  return {...s,revisions:[...(s.revisions||[]),{choice,reason:reason.slice(0,2000),round:s.round,...(at?{at}:{})}].slice(-200)};
}
export function finishRound(s: MontyHallSession, change: boolean): MontyHallSession {
  if (s.first === undefined || s.opened === undefined) throw Error('请先让小E打开一扇空门');
  if(s.step!==2)return s;
  const final = change ? remainingDoor(s.first, s.opened) : s.first;
  return { ...s, final, step: 3 };
}
export function nextRound(s: MontyHallSession): MontyHallSession {
  if(s.step!==3||s.final===undefined)return s;
  const history = [...s.history, { prize: s.prize, first: s.first!, opened: s.opened!, final: s.final, won: s.final === s.prize, prediction:s.prediction,reason:s.reason }];
  return {...newSession(s.seed, s.round + 1, history.slice(-200)),firstPrediction:s.firstPrediction,revisions:s.revisions};
}
export function validateSimulation(value: SimulationResult): SimulationResult {
  if (!value || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 2147483647) throw Error('Python 返回的种子无效');
  if (!value || ![1, 10, 100, 1000, 10000].includes(value.count) || value.trials?.length !== value.count) throw Error('Python 返回的试验次数不完整');
  let stay = 0, change = 0;
  for (const t of value.trials) {
    if (!eligibleDoors(t.prize, t.first).includes(t.opened) || t.stay !== t.first || t.switch !== remainingDoor(t.first, t.opened) || t.stayWon !== (t.stay === t.prize) || t.switchWon !== (t.switch === t.prize)) throw Error('Python 返回的记录不符合本实验规则，请恢复参考程序或检查修改');
    stay += +t.stayWon; change += +t.switchWon;
  }
  if (stay !== value.stayWins || change !== value.switchWins) throw Error('统计值与实际记录不一致');
  return value;
}
