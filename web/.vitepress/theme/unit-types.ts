export interface LessonPage {
  id: string; title: string; mode: string; stage: string; goal: string;
  activityLabel: string; serverRef: string; prompt: string; hints: string[]; nextId: string | null;
}
export interface LearningUnitDefinition {
  id: string;
  version: string;
  minutes: number;
  title: string;
  goals: string[];
  pages: LessonPage[];
  stages: { id: string; title: string; minutes: number }[];
  exercises: { id: string; serverRef: string }[];
  activityId: string;
  requiredQuizQuestion: number;
  minimumScore: number;
}
export interface UnitProgress {
  version: 1 | 2;
  visited: string[];
  assessment: string[];
  reflection: string;
  updatedAt: string;
  completed?: Record<string, string>;
  locator?: { sectionId: string; activity: string };
  hintUsage?: Record<string, number>;
}
