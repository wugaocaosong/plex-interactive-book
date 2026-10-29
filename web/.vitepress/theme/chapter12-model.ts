export interface MergeStep { values: number[]; path: string; phase: string; explanation: string }
export function mergeSteps(input: number[]): MergeStep[] {
  if (input.length < 2 || input.length > 8 || input.some(n => !Number.isSafeInteger(n))) throw Error('请输入 2—8 个安全范围内的整数，用逗号分隔。');
  const steps: MergeStep[] = [];
  function sort(values: number[], path: string): number[] {
    if (values.length === 1) {
      steps.push({values: [...values], path, phase: '最小任务', explanation: '只剩一个模块，已经有序，不再拆分。'});
      return [...values];
    }
    const mid = Math.floor(values.length / 2);
    steps.push({values: [...values], path, phase: '拆分', explanation: `把 ${values.join('、')} 拆成 ${mid} 个与 ${values.length-mid} 个模块，分别求解。`});
    const left = sort(values.slice(0, mid), path + ' → 左');
    const right = sort(values.slice(mid), path + ' → 右');
    const result: number[] = []; let i=0, j=0;
    while (i<left.length || j<right.length) {
      if (j>=right.length || (i<left.length && left[i]<=right[j])) result.push(left[i++]);
      else result.push(right[j++]);
      steps.push({values: [...result], path, phase: '合并', explanation: `比较两组未取出的最前项，取较小项。已合并 ${result.length}/${values.length} 个；剩余左组 [${left.slice(i)}]，右组 [${right.slice(j)}]。`});
    }
    return result;
  }
  sort(input, '完整任务'); return steps;
}
export type Towers = number[][];
export function initialTowers(n: number): Towers {
  if (!Number.isInteger(n) || n<1 || n>5) throw Error('能源环数量必须是 1—5。');
  return [Array.from({length:n},(_,i)=>n-i),[],[]];
}
export function moveRing(towers: Towers, from: number, to: number): Towers {
  if (![from,to].every(n=>Number.isInteger(n)&&n>=0&&n<3)) throw Error('请选择 A、B 或 C 柱。');
  if (from===to) throw Error('源柱和目标柱不能相同。');
  const ring=towers[from].at(-1), top=towers[to].at(-1);
  if (ring===undefined) throw Error('这根柱子没有能源环，请选择另一根源柱。');
  if (top!==undefined && ring>top) throw Error('大环不能放在小环上面。');
  const next=towers.map(t=>[...t]); next[from].pop();next[to].push(ring);return next;
}
export function hanoiSteps(n: number) {
  const states=[{towers:initialTowers(n), explanation:'把所有环从 A 搬到 C。每次只能移动顶部的一环。'}];
  function move(count: number, from: number, buffer: number, to: number) {
    if (!count) return;
    move(count-1,from,to,buffer);
    states.push({towers:moveRing(states.at(-1)!.towers,from,to),explanation:`移动 ${count} 号环：${'ABC'[from]} → ${'ABC'[to]}。`});
    move(count-1,buffer,from,to);
  }
  move(n,0,1,2);return states;
}
