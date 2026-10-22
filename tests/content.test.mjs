import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const json=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const manifest=json('web/public/book/manifest.json');
test('complete book order preserves all 118 upstream pages',()=>{
 assert.equal(manifest.pages.filter(p=>p.sourcePath).length,118);
 assert.deepEqual(manifest.pages.slice(0,5).map(p=>p.id),['cover','title','copyright','dedication','editor-preface']);
 const ids=manifest.pages.map(p=>p.id);
 assert.ok(ids.indexOf('contents')<ids.indexOf('chapter_introduction/index'));
 assert.ok(ids.indexOf('afterword')>ids.indexOf('chapter_greedy/summary'));
 assert.ok(ids.indexOf('acknowledgements')<ids.indexOf('chapter_appendix/index'));
 assert.equal(ids.at(-1),'back-cover');
});
test('binary search preserves both functions, all diagram frames and runnable driver',()=>{
 const page=json('web/public/book/pages/chapter_searching/binary_search.json');
 assert.equal(page.codeExamples.length,2);assert.equal(page.animations[0].length,7);
 for(const example of page.codeExamples){assert.equal(example.variants[0].language,'python');assert.ok(example.variants[0].fullSource.includes('__main__'));assert.ok(example.variants[0].snippet.includes(example.functionName));}
 assert.equal(page.activityId,'binary-search');
});
test('H5P exercise contains three scored single-answer questions, each with a unique correct answer',()=>{
 const book=json('content/h5p/binary-search/content/content.json');
 const questions=book.chapters.flatMap(c=>c.params.content).map(c=>c.content).filter(c=>c.library.startsWith('H5P.MultiChoice'));
 assert.equal(questions.length,3);for(const q of questions){assert.equal(q.params.answers.filter(a=>a.correct).length,1);assert.equal(q.params.behaviour.enableRetry,true)}
});
