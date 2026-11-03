import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../web/public/space/surfaces');
const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
const required=['sun','mercury','venus_surface','earth_daymap','earth_clouds','mars','jupiter','saturn','neptune','moon'].map(n=>`2k_${n}.jpg`).concat('2k_saturn_ring_alpha.png');
if(manifest.license!=='CC-BY-4.0'||!manifest.author)throw Error('Missing space asset attribution');
if(required.length!==manifest.assets.length||!required.every(name=>manifest.assets.some(a=>a.file===name)))throw Error('Incomplete planet texture manifest');
let bytes=0;
for(const asset of manifest.assets){
 if(!required.includes(asset.file))throw Error('Unexpected surface path');
 const data=await readFile(resolve(root,asset.file));
 if(data.length!==asset.bytes||createHash('sha256').update(data).digest('hex')!==asset.sha256)throw Error(`Space asset integrity mismatch: ${asset.file}`);
 if(!(data[0]===0xff&&data[1]===0xd8)&&data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid image: '+asset.file);
 bytes+=data.length;
}
const images=(await readdir(root)).filter(name=>/\.(jpg|png)$/.test(name));
if(images.some(name=>!required.includes(name)))throw Error('Unattributed space texture');
console.log(`Space surfaces: ${required.length} local images, ${(bytes/1024/1024).toFixed(2)} MiB, SHA-256 verified.`);
