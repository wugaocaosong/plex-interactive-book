import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import './audit-space.mjs';
const root = resolve(import.meta.dirname, '..');
const publicDir = resolve(root, 'web/public');
const h5pLock=JSON.parse(await readFile(resolve(root,'content/h5p/runtime-lock.json'),'utf8'));
for(const [name,library] of Object.entries(h5pLock.libraries)){
  for(const [file,expected] of Object.entries(library.files)){
    const actual=createHash('sha256').update(await readFile(resolve(root,'content/h5p/binary-search',name,file))).digest('hex');
    if(actual!==expected)throw Error(`H5P runtime integrity mismatch: ${name}/${file}`);
  }
}
await mkdir(resolve(publicDir, 'vendor'), {recursive: true});
await cp(resolve(root, 'node_modules/h5p-standalone/dist'), resolve(publicDir, 'vendor/h5p'), {recursive: true});
await mkdir(resolve(publicDir, 'vendor/pyodide'), {recursive: true});
for (const file of ['pyodide.mjs','pyodide.asm.mjs','pyodide.asm.wasm','pyodide-lock.json','python_stdlib.zip']) {
  await cp(resolve(root, 'node_modules/pyodide',file),resolve(publicDir, 'vendor/pyodide',file));
}
const binarySearchOutput=resolve(publicDir,'h5p/binary-search');
const sharedMontyLibraries=resolve(publicDir,'h5p/monty-hall');
await cp(resolve(root, 'content/h5p/binary-search'),binarySearchOutput,{recursive:true});
await mkdir(sharedMontyLibraries,{recursive:true});
for(const entry of await readdir(resolve(root,'content/h5p/binary-search'),{withFileTypes:true})){
 if(entry.name==='content'||entry.name==='h5p.json')continue;
 await cp(resolve(root,'content/h5p/binary-search',entry.name),resolve(sharedMontyLibraries,entry.name),{recursive:true});
}
await cp(resolve(root, 'content/h5p/monty-hall'),sharedMontyLibraries,{recursive:true});
await mkdir(resolve(publicDir, 'images'), {recursive:true});
await cp(resolve(root,'assets/references/cover.png'),resolve(publicDir,'images/cover.png'));
await cp(resolve(root,'assets/references/logo.png'),resolve(publicDir,'images/logo.png'));
const modelRoot=resolve(root,'content/input-models');
const inputModels=JSON.parse(await readFile(resolve(modelRoot,'manifest.json'),'utf8'));
for(const asset of inputModels.assets){
 const file=resolve(modelRoot,asset.file);if(createHash('sha256').update(await readFile(file)).digest('hex')!==asset.sha256)throw Error('Input model integrity mismatch: '+asset.file);
}
await cp(modelRoot,resolve(publicDir,'input-models'),{recursive:true});
await cp(resolve(root,'node_modules/@mediapipe/tasks-vision/wasm'),resolve(publicDir,'vendor/mediapipe'),{recursive:true});
await cp(resolve(root,'node_modules/@mediapipe/tasks-vision/vision_bundle.cjs'),resolve(publicDir,'vendor/mediapipe/vision-bundle.js'));
const notices = [];
for(const name of ['three.quarks','quarks.core','@huggingface/transformers','@orama/orama','onnxruntime-web','@tresjs/core','three','@pmndrs/pointer-events','radashi','@mediapipe/tasks-vision','vosk-browser','uuid','vitepress','vue','page-flip','h5p-standalone','pyodide','katex','lucide-vue-next','codemirror','@codemirror/state','@codemirror/view','@codemirror/lang-python','@codemirror/language','@codemirror/merge','@codemirror/lint','shiki','motion-v','motion-dom','motion-utils','@vueuse/core','@vueuse/shared','echarts','zrender','vue-echarts','roughjs','hachure-fill','path-data-parser','points-on-curve','points-on-path','@axe-core/playwright','axe-core','@fontsource/noto-serif-sc','@fontsource/noto-sans-sc','@fontsource/jetbrains-mono']) {
  const dir=resolve(root,'node_modules',name);const pkg=JSON.parse(await readFile(resolve(dir,'package.json'),'utf8'));
  notices.push(`${name} ${pkg.version}: ${pkg.license}`);
  for(const entry of await readdir(dir,{withFileTypes:true})) if(entry.isFile()&&/^(license|licence|ofl|copyright)/i.test(entry.name)) {
    const file=entry.name;
    await mkdir(resolve(root,'licenses/dependencies'),{recursive:true});
    await writeFile(resolve(root,'licenses/dependencies',name.replaceAll('/','-')+'-'+file),await readFile(resolve(dir,file)));
  }
}
await writeFile(resolve(root,'licenses/dependencies.txt'),notices.join('\n')+'\n');
await cp(resolve(root,'licenses'),resolve(publicDir,'licenses'),{recursive:true});
await cp(resolve(root,'web/.vitepress/theme/vendor/webgl-noise/LICENSE'),resolve(publicDir,'licenses/webgl-noise-MIT.txt'));
await cp(resolve(root,'THIRD_PARTY_NOTICES.md'),resolve(publicDir,'licenses/THIRD_PARTY_NOTICES.md'));
console.log('Prepared local H5P, Python runtime, cover and dependency licenses.');
