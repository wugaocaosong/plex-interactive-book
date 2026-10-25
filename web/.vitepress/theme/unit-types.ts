export interface LearningUnitDefinition {
  id: string;
  version: string;
  minutes: number;
  title: string;
  goals: string[];
  pages: { id: string; title: string; mode: string }[];
  exercises: { id: string; serverRef: string }[];
  activityId: string;
  requiredQuizQuestion: number;
  minimumScore: number;
}
export interface UnitProgress {
  version: 1;
  visited: string[];
  assessment: string[];
  reflection: string;
  updatedAt: string;
}
