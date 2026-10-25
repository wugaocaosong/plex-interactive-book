export interface ReadingLocator {
  sectionId: string;
  blockId: string;
  offset: number;
  contentVersion?: string;
}
export interface BookSection {
  id: string;
  title: string;
  kind: string;
  group: string;
  route: string;
  sourcePath: string | null;
  sourceCommit: string | null;
  activityId?: string;
}
export interface BookManifest {
  title: string;
  subtitle: string;
  version: string;
  sourceCommit: string;
  pages: BookSection[];
}
export interface CodeVariant {
  language: string;
  snippet: string;
  fullSource: string;
  sourcePath: string;
  sourceUrl: string;
  extraction: string;
  runnable: boolean;
}
export interface CodeExample {
  id: string;
  file: string;
  className: string;
  functionName: string;
  variants: CodeVariant[];
}
export interface BookPage extends BookSection {
  html: string;
  codeExamples: CodeExample[];
  animations: { src: string; alt: string }[][];
  blockAliases?: Record<string, string>;
  contentVersion?: string;
}
export interface ActivityRecord {
  questionScores?: number[];
  contentId: string;
  contentPath: string;
  version: string;
  state?: unknown;
  score?: number;
  maxScore?: number;
  completed?: boolean;
}
export interface SavedBookmark extends ReadingLocator {
  title: string;
}
export interface SearchEntry {
  id: string;
  title: string;
  group: string;
  text: string;
  blocks: { blockId: string; text: string }[];
}
export interface ReaderPreferences {
  mode: "flip" | "study";
  fontSize: number;
  lineHeight: number;
  theme: "light" | "dark" | "system";
  width: "narrow" | "standard" | "wide";
  split: number;
}
export interface AnnotationRecord {
  id: string;
  sectionId: string;
  kind: "highlight" | "underline" | "note";
  start: ReadingLocator;
  end: ReadingLocator;
  exact: string;
  prefix: string;
  suffix: string;
  note: string;
  status: "located" | "orphan";
  createdAt: string;
  updatedAt: string;
  blockNote?: boolean;
}
export interface ExerciseDefinition {
  serverRef?: string;
  id: string;
  group: string;
  title: string;
  kind: string;
  sectionId: string;
  description: string;
  starter: string;
  solution: string;
  hints: string[];
  tests: { args: unknown[]; expected: unknown }[];
}
export interface ExerciseAttempt {
  exerciseId: string;
  hints: number;
  results: TestResult[];
  updatedAt: string;
}
export interface TestResult {
  input: unknown;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  error?: string;
}
export interface Diagnostic {
  message: string;
  line?: number;
  column?: number;
  filename?: string;
}
