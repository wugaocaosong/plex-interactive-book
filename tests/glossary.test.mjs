import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {glossaryName} from '../web/.vitepress/theme/glossary-name.mjs';

test('explicit book terms all resolve to authored definitions', () => {
  const entries=JSON.parse(readFileSync('web/public/learning/glossary.json','utf8'));
  const known=new Map(entries.map(e=>[e.term,e]));
  assert.equal(known.size,entries.length);
  const walk=path=>readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(path,e.name)):[join(path,e.name)]);
  let count=0;
  for(const path of walk('web/public/book/pages').filter(p=>p.endsWith('.json'))){
    const page=JSON.parse(readFileSync(path,'utf8'));
    for(const match of (page.html||'').matchAll(/<u\b[^>]*>([\s\S]*?)<\/u>/g)){
      const name=glossaryName(match[1].replace(/<[^>]+>/g,''));
      assert.ok(known.get(name)?.definition,`${page.id}: ${name}`);count++;
    }
  }
  // Latest upstream revises some original underlines; validate every remaining
  // explicit label and keep all authored definitions, including earlier terms.
  assert.ok(count >= 87, `Unexpected loss of explicit term labels: ${count}`);
  assert.equal(known.size, 150);
  assert.equal(glossaryName('大 \\(O\\) 记号（big-\\(O\\) notation）'),'大 O 记号');
  for(const term of ['二分查找','满二叉树','Unicode','dp 表','缓冲柱'])assert.ok(known.get(term)?.definition);
});
