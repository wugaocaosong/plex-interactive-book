import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticServer } from '../scripts/serve-dist.mjs';
import {createServer} from 'node:http';

test('fixed API proxy carries auth and JSON, prevents target injection and fails offline',async()=>{
 const upstream=createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({path:req.url,auth:req.headers.authorization,body:JSON.parse(body||'{}')}));});
 await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
 const proxy=createStaticServer('.',`http://127.0.0.1:${upstream.address().port}`);await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${proxy.address().port}`;
 try{const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{Authorization:'Bearer test-only','Content-Type':'application/json'},body:JSON.stringify({username:'fixture'})});assert.deepEqual(await response.json(),{path:'/api/v1/auth/login',auth:'Bearer test-only',body:{username:'fixture'}});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await fetch(base+'/api/https://example.invalid')).status,404);await new Promise(resolve=>upstream.close(resolve));assert.equal((await fetch(base+'/api/v1/student/profile')).status,503);}finally{await new Promise(resolve=>proxy.close(resolve));upstream.close();}
});

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
