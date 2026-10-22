export interface ReadingLocator { sectionId: string; blockId: string; offset: number }
export interface BookSection {
  id: string; title: string; kind: string; group: string; route: string;
  sourcePath: string | null; sourceCommit: string | null; activityId?: string;
}
export interface BookManifest { title: string; subtitle: string; version: string; sourceCommit: string; pages: BookSection[] }
export interface CodeVariant { language: string; snippet: string; fullSource: string; sourcePath: string; sourceUrl: string; extraction: string; runnable: boolean }
export interface CodeExample { id: string; file: string; className: string; functionName: string; variants: CodeVariant[] }
export interface BookPage extends BookSection { html: string; codeExamples: CodeExample[]; animations: { src: string; alt: string }[][] }
export interface ActivityRecord { contentId: string; contentPath: string; version: string; state?: unknown; score?: number; maxScore?: number; completed?: boolean }
export interface SavedBookmark extends ReadingLocator { title: string }
export interface SearchEntry { id: string; title: string; group: string; text: string; blocks: {blockId:string;text:string}[] }
