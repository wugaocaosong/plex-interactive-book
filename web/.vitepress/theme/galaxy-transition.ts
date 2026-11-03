import {reactive} from 'vue';

export const entryTransition=reactive({phase:'idle' as 'idle'|'closing'|'loading'|'revealing'|'error',error:''});
let generation=0;
let skipRequested=false;
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
export function skipEntryAnimation(){skipRequested=true;}
export function cancelEntryTransition(){generation++;entryTransition.phase='idle';entryTransition.error='';}
export async function revealReader(navigate:()=>Promise<unknown>,reduced=false){
 if(!['idle','error'].includes(entryTransition.phase))return;
 const run=++generation;skipRequested=false;entryTransition.error='';entryTransition.phase='closing';
 try{
  if(!reduced)await delay(250);if(run!==generation)return;
  entryTransition.phase='loading';
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{await Promise.race([navigate(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('阅读页面加载超时')),15000);})]);}finally{clearTimeout(timeout);}
  const start=performance.now();
  while(run===generation){
   const failure=document.querySelector('.reader-error');
   if(failure?.textContent?.trim())throw new Error('书页尚未准备完成');
   if(document.querySelector('.book-holder:not(.loading), .study-reader, .solar-directory[data-ready=true]'))break;
   if(performance.now()-start>15000)throw new Error('书页加载超时');
   await delay(50);
  }
  if(run!==generation)return;
  if(!reduced&&!skipRequested)await delay(200);
  if(run!==generation)return;
  entryTransition.phase='revealing';
  if(!reduced&&!skipRequested)await delay(1200);
  if(run!==generation)return;
  entryTransition.phase='idle';
  (document.querySelector('.reader button, .solar-directory button') as HTMLElement|null)?.focus({preventScroll:true});
 }catch(error){if(run!==generation)return;entryTransition.error=String(error instanceof Error?error.message:error);entryTransition.phase='error';}
}
