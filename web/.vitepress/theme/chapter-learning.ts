import chapters from './chapter-learning.json';
import { quizTypeLabel, type QuizQuestion } from './chapter-quiz-model';
interface ChapterLearning {
  id: string; title: string; intro: string; review: string; target: string; end: string;
  questions: QuizQuestion[];
}
export const chapterLearning = chapters as ChapterLearning[];

/** Appended before measurement, so both reading modes include the chapter-end entry. */
export function injectChapterQuiz(root: HTMLElement) {
  const id = root.dataset.section;
  const chapter = chapterLearning.find(c => c.end === id);
  if (!chapter || root.querySelector('.chapter-quiz-entry')) return;
  const card = document.createElement('aside');
  card.className = 'explorer-card chapter-quiz-entry';
  card.dataset.block = `quiz-${chapter.id}`;
  const title = document.createElement('h3');
  title.textContent = '章末即时测试';
  const text = document.createElement('p');
  const types = [...new Set(chapter.questions.map(q => quizTypeLabel[q.type]))].join('、');
  text.textContent = `${chapter.title} · ${chapter.questions.length} 道题，包含${types}。提交后立即查看反馈与解析，进度自动保存在本设备。`;
  const button = document.createElement('button');
  button.className = 'explorer-go';
  button.dataset.action = 'chapter-quiz';
  button.dataset.chapter = chapter.id;
  button.textContent = '开始测试 →';
  card.append(title, text, button);
  const labs: Record<string, string> = {
    chapter_graph: 'unit/lab/graph',
    chapter_searching: 'unit/lab/sort-search',
    chapter_sorting: 'unit/lab/sort-search',
  };
  if (labs[chapter.id]) {
    const lab = document.createElement('button');
    lab.className = 'explorer-go';
    lab.dataset.action = 'explorer';
    lab.dataset.target = labs[chapter.id];
    lab.textContent = '进入综合实验舱 →';
    card.append(lab);
  }
  root.append(card);
}
