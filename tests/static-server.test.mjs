import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../scripts/serve-dist.mjs';

test('standalone preview serves clean routes and runtime MIME types without exposing other files',async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'plex-static-test-'));
  const root=join(temporary,'site');await mkdir(join(root,'read'),{recursive:true});
  await writeFile(join(root,'index.html'),'<h1>PLEX</h1>');await writeFile(join(root,'read/title.html'),'<h1>Title</h1>');
  await writeFile(join(root,'runtime.wasm'),new Uint8Array([0,97,115,109]));await writeFile(join(root,'worker.mjs'),'export const ready=true');
  await writeFile(join(temporary,'outside.txt'),'outside');
  const server=createStaticServer(root);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.match(await (await fetch(base+'/')).text(),/PLEX/);
    assert.match(await (await fetch(base+'/read/title')).text(),/Title/);
    const wasm=await fetch(base+'/runtime.wasm');assert.equal(wasm.headers.get('content-type'),'application/wasm');
    const module=await fetch(base+'/worker.mjs',{method:'HEAD'});assert.match(module.headers.get('content-type'),/javascript/);assert.equal(await module.text(),'');
    assert.equal((await fetch(base+'/missing')).status,404);
    assert.equal((await fetch(base+'/..%2foutside.txt')).status,403);
    assert.equal((await fetch(base+'/%broken')).status,400);
  }finally{await new Promise(resolve=>server.close(resolve));await rm(temporary,{recursive:true,force:true})}
});
