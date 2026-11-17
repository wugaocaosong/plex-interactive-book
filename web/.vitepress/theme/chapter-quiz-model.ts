export type QuizKind = 'single' | 'judge' | 'multiple' | 'fill' | 'order';
export type QuizAnswer = number | string | number[];
export interface QuizQuestion {
  id: string;
  type: QuizKind;
  prompt: string;
  options: string[];
  answer: QuizAnswer;
  accepted: string[];
  placeholder?: string;
  explanation: string;
}
export interface QuizResponse { value: QuizAnswer; submitted: boolean }
export const quizTypeLabel: Record<QuizKind, string> = {
  single: '单选题', judge: '判断题', multiple: '多选题', fill: '填空题', order: '排序题',
};
export function normalizeQuizText(value: string): string {
  return value.normalize('NFKC').replace(/−/g, '-').replace(/\s+/g, '').toLowerCase();
}
export function validQuizAnswer(question: QuizQuestion, value: unknown): value is QuizAnswer {
  if (question.type === 'fill') return typeof value === 'string' && value.length <= 200;
  if (question.type === 'single' || question.type === 'judge')
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < question.options.length;
  if (!Array.isArray(value) || value.some(v => !Number.isInteger(v) || v < 0 || v >= question.options.length)) return false;
  if (new Set(value).size !== value.length) return false;
  return question.type !== 'order' || value.length === question.options.length;
}
export function correctQuizAnswer(question: QuizQuestion, value: unknown): boolean {
  if (!validQuizAnswer(question, value)) return false;
  if (question.type === 'fill') return [String(question.answer), ...question.accepted]
    .some(a => normalizeQuizText(a) === normalizeQuizText(String(value)));
  if (question.type === 'single' || question.type === 'judge') return value === question.answer;
  if (!Array.isArray(value) || !Array.isArray(question.answer)) return false;
  const answer = question.answer;
  if (question.type === 'order') return value.every((v, i) => v === answer[i]);
  return value.length === answer.length && answer.every(v => value.includes(v));
}
export function initialQuizAnswer(question: QuizQuestion): QuizResponse | null {
  if (question.type === 'fill') return { value: '', submitted: false };
  if (question.type === 'multiple') return { value: [], submitted: false };
  if (question.type === 'order') {
    // Rotate the authored correct order: never present a solved ordering task initially.
    const order = question.answer as number[];
    return { value: [...order.slice(1), order[0]], submitted: false };
  }
  return null;
}
export function canSubmitQuizAnswer(question: QuizQuestion, value: unknown): boolean {
  if (!validQuizAnswer(question, value)) return false;
  if (question.type === 'fill') return typeof value === 'string' && !!value.trim();
  return question.type !== 'multiple' || (Array.isArray(value) && value.length > 0);
}
export function quizAnswerLabel(question: QuizQuestion): string {
  if (question.type === 'fill') return String(question.answer);
  if (typeof question.answer === 'number') return question.options[question.answer];
  if (!Array.isArray(question.answer)) return '';
  return question.answer.map(i => question.options[i]).join(question.type === 'order' ? ' → ' : '；');
}
export function multiQuizFeedback(question: QuizQuestion, value: QuizAnswer): string {
  if (question.type !== 'multiple' || !Array.isArray(value) || !Array.isArray(question.answer)) return '';
  const missing = question.answer.filter(i => !value.includes(i));
  const extra = value.filter(i => !(question.answer as number[]).includes(i));
  return [missing.length ? `漏选 ${missing.map(i => String.fromCharCode(65+i)).join('、')}` : '',
    extra.length ? `多选 ${extra.map(i => String.fromCharCode(65+i)).join('、')}` : ''].filter(Boolean).join('；');
}
