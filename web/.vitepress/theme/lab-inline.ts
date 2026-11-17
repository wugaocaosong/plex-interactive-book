import { getLearning, putLearning } from './learning-store';
import { learningScope } from './learning-scope';
const hydrated = new WeakSet<HTMLElement>();
const starters = new Map<string,string>();
const drafts = new Map<string,ReturnType<typeof setTimeout>>();
let active: {card:HTMLElement; worker:Worker; timer:ReturnType<typeof setTimeout>; id:number} | undefined;
let sequence = 0;
const areaOf = (card:HTMLElement) => card.querySelector<HTMLTextAreaElement>('.lab-editor-code');
function status(card:HTMLElement,text:string) {
  const el=card.querySelector<HTMLElement>('.lab-editor-status'); if(el)el.textContent=text;
}
function output(card:HTMLElement,text:string,append=false) {
  const el=card.querySelector<HTMLElement>('.lab-editor-out');
  if(el){el.textContent=((append?el.textContent||'':'')+text).slice(-8000);el.scrollTop=el.scrollHeight;}
}
function save(card:HTMLElement) {
  const area=areaOf(card), key=card.dataset.labKey;
  if(!area||!key)return;
  const timerKey=learningScope+':'+key;
  const timer=drafts.get(timerKey);if(timer)clearTimeout(timer);
  drafts.delete(timerKey);
  area.textContent=area.value;
  void putLearning('draft:lab-editor:'+key,{code:area.value}).catch(()=>status(card,'草稿保存失败，请先复制代码'));
}
export function hydrateLabEditors(root:HTMLElement) {
  root.querySelectorAll<HTMLElement>('.lab-editor').forEach(card=>{
    const area=areaOf(card),key=card.dataset.labKey;
    if(!area||!key||hydrated.has(card))return;
    hydrated.add(card);
    if(!starters.has(key))starters.set(key,area.defaultValue);
    const before=area.value, scope=learningScope;
    void getLearning<{code?:string}>('draft:lab-editor:'+key,{}).then(draft=>{
      if(scope!==learningScope||area.value!==before)return;
      if(typeof draft.code==='string'){area.value=draft.code;area.textContent=draft.code;}
    }).catch(()=>{});
  });
}
if(typeof document!=='undefined') {
  document.addEventListener('input',event=>{
    const area=(event.target as HTMLElement)?.closest<HTMLTextAreaElement>('.lab-editor-code');
    const card=area?.closest<HTMLElement>('.lab-editor');if(!card)return;
    const key=learningScope+':'+card.dataset.labKey;
    const old=drafts.get(key);if(old)clearTimeout(old);
    drafts.set(key,setTimeout(()=>save(card),400));
  });
  document.addEventListener('focusout',event=>{
    const card=(event.target as HTMLElement)?.closest<HTMLElement>('.lab-editor');if(card)save(card);
  });
  document.addEventListener('keydown',event=>{
    const area=(event.target as HTMLElement)?.closest<HTMLTextAreaElement>('.lab-editor-code');
    if(!area||event.key!=='Tab')return;
    event.preventDefault();event.stopPropagation();
    area.setRangeText('    ',area.selectionStart,area.selectionEnd,'end');
    area.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
function finish(card:HTMLElement,text:string) {
  if(active?.card===card){clearTimeout(active.timer);active.worker.terminate();active=undefined;}
  const run=card.querySelector<HTMLButtonElement>('[data-action="lab-run"]');if(run)run.disabled=false;
  status(card,text);
}
export function labEditorAction(action:HTMLElement):boolean {
  const value=action.dataset.action;
  if(!['lab-run','lab-stop','lab-reset'].includes(value||''))return false;
  const card=action.closest<HTMLElement>('.lab-editor');if(!card)return false;
  const area=areaOf(card);if(!area)return true;
  if(value==='lab-stop') {
    if(active?.card===card){output(card,'\n已停止。',true);finish(card,'已停止');}
    return true;
  }
  if(value==='lab-reset') {
    if(active?.card===card)finish(card,'已停止');
    area.value=starters.get(card.dataset.labKey||'')??area.defaultValue;
    save(card);output(card,'输出会显示在这里。');status(card,'已恢复初始代码');return true;
  }
  if(active){status(card,'另一实验台正在运行，请先停止或等待完成');return true;}
  if(!area.value.trim()){status(card,'请先输入代码');return true;}
  save(card);output(card,'');
  const id=++sequence;
  let worker:Worker;
  try{worker=new Worker('/python-worker.js',{type:'module'});}catch(error){output(card,String(error));status(card,'Python 环境启动失败');return true;}
  const run=card.querySelector<HTMLButtonElement>('[data-action="lab-run"]');if(run)run.disabled=true;
  const code=(card.dataset.codePrefix||'')+'\n\n'+area.value;
  active={card,worker,id,timer:setTimeout(()=>{if(active?.id!==id)return;output(card,'Python 环境加载超时，请重试。');finish(card,'启动超时');},90000)};
  status(card,'正在加载 Python 环境…');
  worker.onmessage=({data})=>{
    if(active?.id!==id||data.runId!==id)return;
    if(data.type==='ready'){
      clearTimeout(active.timer);status(card,'运行中…');
      active.timer=setTimeout(()=>{if(active?.id!==id)return;output(card,'\n运行超过 15 秒，已停止。',true);finish(card,'超时停止');},15000);
      worker.postMessage({type:'run',path:'chapter_lab/inline_editor.py',code,stdin:'',requestId:id,runId:id,echoLastExpression:true});
    } else if(data.type==='stdout'||data.type==='stderr')output(card,(data.text||'')+'\n',true);
    else if(data.type==='done')finish(card,'运行完成');
    else if(data.type==='error'){output(card,data.text||'运行失败',true);finish(card,'运行出错，请修改后再试');}
  };
  worker.onerror=event=>{if(active?.id!==id)return;output(card,event.message||'Python 环境启动失败');finish(card,'运行失败');};
  worker.postMessage({type:'init',requestId:id,runId:id});
  return true;
}

