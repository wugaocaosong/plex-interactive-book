import {initialTowers,moveRing,hanoiSteps} from './chapter12-model.ts';
export type Station='merge'|'search'|'tree'|'hanoi'|'power';
export interface LabInput { values:number[]; target:number; inorder:number[]; rings:number; base:number; exponent:number }
export interface LabStep { phase:string; text:string; values:number[]; variables:Record<string,unknown>; line:number; question:string; choices:string[]; answer:string; towers?:number[][]; edges?:[number,number|null][] }
export const defaults:LabInput={values:[6,3,8,2,5,1],target:7,inorder:[2,1,3],rings:3,base:2,exponent:10};
export const stationDefaults=(id:Station):LabInput=>({...defaults,values:id==='search'?[1,3,5,7,9,11]:id==='tree'?[1,2,3]:[...defaults.values],inorder:[...defaults.inorder]});
export const stationTitles:Record<Station,string>={merge:'能源补给线',search:'失联信号定位',tree:'空间站结构重建',hanoi:'能源环搬运',power:'能源倍增计算'};
export const sections:Record<Station,string>={merge:'divide_and_conquer',search:'binary_search_recur',tree:'build_binary_tree_problem',hanoi:'hanota_problem',power:'exercises'};
export const pseudo:Record<Station,string[]>={merge:['若只剩一个模块，返回','拆分左右两组并分别排序','比较两组队首，取较小者','接上剩余模块，返回有序组'],search:['区间为空：未找到','取中点，比较目标','命中则返回索引','递归进入仍可能命中的半区'],tree:['区间为空：返回空树','前序首项作为根','在中序中划分左右子树','递归重建并连接'],hanoi:['若只剩一个环，直接移动','将 n−1 个环移到缓冲柱','将最大环移到目标柱','将 n−1 个环移到目标柱'],power:['指数为 0：返回 1','递归求 floor(n/2) 次幂','将子结果平方','若 n 为奇数，再乘底数']};
function integers(a:number[],max:number,min=0){if(a.length<min||a.length>max||a.some(x=>!Number.isSafeInteger(x)))throw Error(`请输入 ${min}—${max} 个安全整数。`);}
export function buildLab(id:Station,input:LabInput):LabStep[]{
 const steps:LabStep[]=[];
 const emit=(s:Partial<LabStep>&{text:string})=>steps.push(JSON.parse(JSON.stringify({phase:'操作',values:[],variables:{},line:1,question:'下一步应当做什么？',choices:['继续'],answer:'继续',...s})));
 if(id==='merge'){
  integers(input.values,8,2);let comparisons=0;
  function sort(a:number[],depth:number):number[]{
   if(a.length===1){emit({phase:'最小子问题',text:'单个模块已经有序，开始返回。',values:a,variables:{层级:depth,比较次数:comparisons},line:1,choices:['返回模块','继续拆分'],answer:'返回模块'});return a;}
   const m=Math.floor(a.length/2);emit({phase:'拆分',text:`拆成 [${a.slice(0,m)}] 与 [${a.slice(m)}] 两组，分别求解。`,values:a,variables:{层级:depth,比较次数:comparisons},line:2,choices:['拆成两组','直接按原顺序连接'],answer:'拆成两组'});
   const left=sort(a.slice(0,m),depth+1),right=sort(a.slice(m),depth+1),result:number[]=[];let i=0,j=0;
   while(i<left.length||j<right.length){const both=i<left.length&&j<right.length;const side=j>=right.length||(i<left.length&&left[i]<=right[j])?'取左组':'取右组';
    emit({phase:'有序合并',text:both?'比较队首，取较小者；相等时先取左组，保持稳定。':'一组已空，将另一组余项依次接入。',values:[...result],variables:{层级:depth,左组:left.slice(i),右组:right.slice(j),比较次数:comparisons},line:both?3:4,choices:['取左组','取右组'],answer:side});
    if(both)comparisons++;result.push(side==='取左组'?left[i++]:right[j++]);
   }return result;
  }const result=sort([...input.values],0);emit({phase:'完成',text:'所有子问题已经返回，能源补给线排序完成。',values:result,variables:{比较次数:comparisons},line:4});
 }else if(id==='search'){
  integers(input.values,12);if(!Number.isSafeInteger(input.target))throw Error('目标必须是安全整数。');if(input.values.some((x,i,a)=>i>0&&x<a[i-1]))throw Error('二分查找需要升序数组，请先修正输入。');
  let l=0,r=input.values.length-1;while(l<=r){const m=Math.floor((l+r)/2),answer=input.values[m]===input.target?'返回中点':input.values[m]<input.target?'进入右半区':'进入左半区';emit({phase:'搜索区间',text:`中点索引 ${m}，值为 ${input.values[m]}，目标为 ${input.target}。根据比较排除不可能的范围。`,values:input.values,variables:{左边界:l,右边界:r,中点:m,目标:input.target},line:2,choices:['进入左半区','返回中点','进入右半区'],answer});if(answer==='返回中点'){emit({phase:'完成',text:`找到信号，返回索引 ${m}。`,values:input.values,variables:{结果:m},line:3});return steps;}if(answer==='进入右半区')l=m+1;else r=m-1;}
  emit({phase:'完成',text:'候选区间为空，返回 -1；目标不存在。',values:input.values,variables:{左边界:l,右边界:r,结果:-1},line:1});
 }else if(id==='tree'){
  integers(input.values,15);integers(input.inorder,15);if(input.values.length!==input.inorder.length||new Set(input.values).size!==input.values.length||input.values.some(x=>!input.inorder.includes(x)))throw Error('两份遍历必须包含相同的互异节点。');
  const edges:[number,number|null][]=[];
  function build(pre:number[],ino:number[],parent:number|null,depth:number){if(!pre.length)return;const root=pre[0],k=ino.indexOf(root);if(k<0)throw Error('前序和中序区间不一致，无法构建同一棵树。');
   emit({phase:'选择根节点',text:'前序首先访问根：选择当前前序的首项。',values:pre,variables:{前序:pre,中序:ino,层级:depth},edges:[...edges],line:2,choices:pre.map(String),answer:String(root)});
   emit({phase:'划分子树',text:`以 ${root} 为根，中序左侧 [${ino.slice(0,k)}]、右侧 [${ino.slice(k+1)}] 分别属于左右子树。`,values:ino,variables:{根:root,左子树:ino.slice(0,k),右子树:ino.slice(k+1)},edges:[...edges],line:3,choices:Array.from({length:ino.length},(_,i)=>`左侧 ${i} 个节点`),answer:`左侧 ${k} 个节点`});
   edges.push([root,parent]);build(pre.slice(1,k+1),ino.slice(0,k),root,depth+1);build(pre.slice(k+1),ino.slice(k+1),root,depth+1);
  }build(input.values,input.inorder,null,0);emit({phase:'完成',text:edges.length?'结构重建完成，每个节点与父节点连接如下。':'空遍历对应空树。',edges,variables:{节点数:edges.length},line:4});
 }else if(id==='hanoi'){
  const states=hanoiSteps(input.rings);for(let i=0;i<states.length-1;i++){const a=states[i].towers,b=states[i+1].towers,from=a.findIndex((x,k)=>x.length>b[k].length),to=a.findIndex((x,k)=>x.length<b[k].length);emit({phase:'搬运能源环',text:states[i+1].explanation,towers:a,variables:{已移动:i,最优步数:2**input.rings-1},line:3,choices:['A → B','A → C','B → A','B → C','C → A','C → B'],answer:`${'ABC'[from]} → ${'ABC'[to]}`});}emit({phase:'完成',text:'能源环全部到达 C 柱。标准递归方案用了最少移动次数。',towers:states.at(-1)!.towers,variables:{移动次数:states.length-1},line:4});
 }else if(id==='power'){
  if(!Number.isInteger(input.exponent)||input.exponent<0||input.exponent>64||!Number.isSafeInteger(input.base)||Math.abs(input.base)>1000000)throw Error('指数应为 0—64，底数为绝对值不超过一百万的整数。');let multiplies=0;
  function power(n:number,depth:number):bigint{if(n===0){emit({phase:'停止条件',text:'指数为零，返回 1。此算法约定包括底数为零的情形。',variables:{指数:n,层级:depth},line:1,choices:['返回 0','返回 1'],answer:'返回 1'});return 1n;}emit({phase:'指数折半',text:`先求 ${Math.floor(n/2)} 次幂，只递归计算一次。`,variables:{指数:n,层级:depth},line:2,choices:[`递归指数 ${Math.floor(n/2)}`,`递归指数 ${n}`],answer:`递归指数 ${Math.floor(n/2)}`});const half=power(Math.floor(n/2),depth+1);let value=half*half;multiplies++;emit({phase:'返回合并',text:n%2?'奇数指数：平方后还需要乘一次底数。':'偶数指数：子结果平方即可。',variables:{指数:n,子结果:String(half),平方:String(value),乘法次数:multiplies},line:n%2?4:3,choices:['平方后返回','平方后再乘底数'],answer:n%2?'平方后再乘底数':'平方后返回'});if(n%2){value*=BigInt(input.base);multiplies++;}return value;}
  const result=power(input.exponent,0);emit({phase:'完成',text:'倍增计算结束。大整数结果精确显示。',variables:{结果:String(result),乘法次数:multiplies},line:4});
 }else throw Error('未知实验');return steps;
}
export {initialTowers,moveRing};
