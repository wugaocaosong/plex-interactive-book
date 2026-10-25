import type { UnitProgress } from './unit-types';

export function upgradeProgress(value: UnitProgress): UnitProgress {
  return {...value,version:2,visited:[...new Set(value.visited)],completed:{...value.completed},hintUsage:{...value.hintUsage}};
}
export function blankProgress(): UnitProgress {
  return {version:2,visited:[],assessment:[],reflection:'',updatedAt:'',completed:{},hintUsage:{}};
}
export function completeActivity(value: UnitProgress, id: string, at: string): UnitProgress {
  const next=upgradeProgress(value);
  next.completed![id] ??= at;
  next.updatedAt=at;
  return next;
}
