import { getLearning } from './learning-store';

export interface LabRunResult {
  key: string;
  state: 'done' | 'error' | 'stopped';
  codeVersion: string;
  updatedAt: string;
}

export function labResultText(result?: LabRunResult): string {
  if (!result) return '尚未运行';
  if (result.state === 'done') return '最近运行完成 · 请对照预期输出';
  if (result.state === 'error') return '最近运行出错 · 打开实验台查看并修正';
  return '最近运行已中止 · 未计为完成';
}

export async function readLabResults(keys: string[]) {
  return Object.fromEntries(await Promise.all([...new Set(keys)].map(async key =>
    [key, await getLearning<LabRunResult | undefined>('lab-run:' + key, undefined)] as const)));
}
