import {mergeSteps,hanoiSteps} from './chapter12-model.ts';
export type SceneId='merge'|'binary'|'tree'|'hanoi'|'permutations'|'queens'|'stairs'|'knapsack'|'fractional'|'capacity'|'workflow';
export interface TeachingStep {explanation:string;values?:number[];active?:number[];rows?:number[][];labels?:string[];variables:Record<string,unknown>;code?:string;line?:number;result?:unknown}
export const sceneDefinitions:Record<SceneId,{title:string;input:unknown;hint:string}>={
 merge:{title:'拆分合并',input:[6,3,8,2,5,1],hint:'2—8 个整数的 JSON 数组'},
 binary:{title:'递归二分查找',input:{array:[1,3,5,7,9,11],target:7},hint:'有序数组最多 12 项，target 为目标'},
 tree:{title:'前序／中序构建树',input:{preorder:[3,9,20,15,7],inorder:[9,3,15,20,7]},hint:'两种遍历包含相同的互异节点，最多 15 个'},
 hanoi:{title:'汉诺塔',input:3,hint:'能源环数量 1—5'},
 permutations:{title:'全排列搜索树',input:[1,2,3],hint:'1—5 个整数；重复值按位置区别，结果去重'},
 queens:{title:'N 皇后冲突检查与回退',input:4,hint:'棋盘尺寸 4—8，演示寻找第一组解'},
 stairs:{title:'爬楼梯状态转移',input:6,hint:'台阶数 0—12，一次可走 1 或 2 级'},
 knapsack:{title:'0-1 背包填表与选取',input:{weights:[2,3,4],values:[3,4,5],capacity:6},hint:'最多 6 件物品，正整数重量，非负价值，容量 0—20'},
 fractional:{title:'分数背包',input:{weights:[10,20,30],values:[60,100,120],capacity:20},hint:'最多 6 件物品，容量 0—20，物品可切分'},
 capacity:{title:'最大容量双指针',input:[1,8,6,2,5,4,8,3,7],hint:'2—12 个非负整数高度'},
 workflow:{title:'编辑 → 运行 → 定位错误 → 修正',input:null,hint:'预设教学流程，不实际安装软件或运行学生代码'}
};
function integer(n:unknown,min:number,max:number){if(typeof n!=='number'||!Number.isSafeInteger(n)||n<min||n>max)throw Error(`请输入 ${min}—${max} 的整数`);return n;}
function array(a:unknown,max=12,min=0){if(!Array.isArray(a)||a.length<min||a.length>max||a.some(v=>!Number.isSafeInteger(v)))throw Error(`数组应有 ${min}—${max} 个安全整数`);return a as number[];}
function object(v:unknown):Record<string,unknown>{if(!v||Array.isArray(v)||typeof v!=='object')throw Error('请输入 JSON 对象');return v as Record<string,unknown>;}
export function teachingSteps(id:SceneId,input:unknown):TeachingStep[]{
 const steps:TeachingStep[]=[];const emit=(s:TeachingStep)=>steps.push(structuredClone(s));
 if(id==='merge')return mergeSteps(array(input,8,2)).map(s=>({explanation:s.explanation,values:s.values,variables:{任务:s.path,阶段:s.phase}}));
 if(id==='hanoi')return hanoiSteps(integer(input,1,5)).map((s,i)=>({explanation:s.explanation,rows:s.towers,labels:['A 柱','B 柱','C 柱'],variables:{移动次数:i,最优次数:2**Number(input)-1}}));
 if(id==='binary'){
  const v=object(input),a=array(v.array),target=integer(v.target,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);if(a.some((n,i)=>i&&n<a[i-1]))throw Error('二分查找需要升序数组，请先排序');
  function search(l:number,r:number,depth:number):number{if(l>r){emit({explanation:'区间为空，未找到目标，返回 -1。',values:a,variables:{left:l,right:r,depth},result:-1});return -1;}const m=Math.floor((l+r)/2);emit({explanation:`查看中点 ${m}，值 ${a[m]} 与目标 ${target} 比较。`,values:a,active:[m],variables:{left:l,right:r,mid:m,target,depth},line:2});if(a[m]===target){emit({explanation:`找到目标，索引 ${m}。`,values:a,active:[m],variables:{depth},result:m});return m;}return a[m]<target?search(m+1,r,depth+1):search(l,m-1,depth+1);}search(0,a.length-1,0);
 }else if(id==='tree'){
  const v=object(input),pre=array(v.preorder,15),ino=array(v.inorder,15);if(pre.length!==ino.length||new Set(pre).size!==pre.length||pre.some(n=>!ino.includes(n)))throw Error('遍历必须包含相同且不重复的节点');const nodes:number[][]=[];
  function build(p:number[],i:number[],parent:number|null,side:string):unknown{if(!p.length)return null;const root=p[0],k=i.indexOf(root);if(k<0)throw Error('前序与中序的子树区间不一致');nodes.push([root,parent??root,side==='左子树'?-1:side==='右子树'?1:0]);emit({explanation:`${side}：前序首项 ${root} 是根；中序左区间 [${i.slice(0,k)}]，右区间 [${i.slice(k+1)}]。`,values:i,active:[k],rows:nodes,labels:nodes.map(n=>n[0]===n[1]?'根节点':'节点 → 父节点'),variables:{前序:p,中序:i,根:root,父:parent}});return {value:root,left:build(p.slice(1,k+1),i.slice(0,k),root,'左子树'),right:build(p.slice(k+1),i.slice(k+1),root,'右子树')};}const tree=build(pre,ino,null,'整树');emit({explanation:'递归区间全部完成，连接结果如下。',rows:nodes,variables:{节点数:pre.length},result:tree});
 }else if(id==='permutations'){
  const a=array(input,5,1),path:number[]=[],used=new Set<number>(),answers:number[][]=[];
  function visit(){if(path.length===a.length){answers.push([...path]);emit({explanation:'抵达叶子，记录一组完整排列。',values:[...path],variables:{解的数量:answers.length,used:[...used]},result:[...path]});return;}const seen=new Set<number>();for(let i=0;i<a.length;i++){if(used.has(i)||seen.has(a[i]))continue;seen.add(a[i]);used.add(i);path.push(a[i]);emit({explanation:`选择 ${a[i]}，进入搜索树第 ${path.length} 层。`,values:[...path],variables:{深度:path.length,已用位置:[...used]}});visit();path.pop();used.delete(i);emit({explanation:`撤销 ${a[i]}，回退后尝试下一个分支。`,values:[...path],variables:{深度:path.length,已用位置:[...used]}});}}visit();emit({explanation:'所有分支搜索完毕。',rows:answers,variables:{排列数:answers.length},result:answers});
 }else if(id==='queens'){
  const n=integer(input,4,8),queens:number[]=[];let checks=0;
  function board(candidate?:number){return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>queens[r]===c?1:r===queens.length&&candidate===c?2:0));}
  function solve(row:number):boolean{if(row===n)return true;for(let col=0;col<n;col++){checks++;const conflict=queens.some((c,r)=>c===col||Math.abs(c-col)===row-r);emit({explanation:conflict?`第 ${row+1} 行第 ${col+1} 列与已有皇后同列或同对角线，跳过。`:`第 ${row+1} 行第 ${col+1} 列无冲突，放置皇后。`,rows:board(col),variables:{row,col,冲突:conflict,检查次数:checks}});if(conflict)continue;queens.push(col);if(solve(row+1))return true;queens.pop();emit({explanation:'下一行没有合法位置，撤销当前皇后，回退。',rows:board(),variables:{row,col,检查次数:checks}});}return false;}solve(0);emit({explanation:'找到第一组合法解；每行、每列及两条对角线上无冲突。',rows:board(),variables:{检查次数:checks},result:queens});
 }else if(id==='stairs'){
  const n=integer(input,0,12),dp=[1,1];emit({explanation:'约定 dp[0]=1（什么也不走的一种方式），dp[1]=1。',values:dp.slice(0,n+1),variables:{n}});for(let i=2;i<=n;i++){dp[i]=dp[i-1]+dp[i-2];emit({explanation:`最后一步走 1 级或 2 级：dp[${i}] = ${dp[i-1]} + ${dp[i-2]} = ${dp[i]}。`,values:dp,active:[i-2,i-1,i],variables:{i},line:3});}emit({explanation:`到达 ${n} 级共有 ${dp[n]} 种方法。`,values:dp.slice(0,n+1),variables:{n},result:dp[n]});
 }else if(id==='knapsack'||id==='fractional'){
  const v=object(input),w=array(v.weights,6),values=array(v.values,6),cap=integer(v.capacity,0,20);if(w.length!==values.length||w.some(x=>x<=0)||values.some(x=>x<0))throw Error('重量应为正整数，价值非负，两数组长度相同');if(!Number.isSafeInteger(values.reduce((a,b)=>a+b,0)))throw Error('价值总和过大，请缩小输入以保证精确计算');
  if(id==='knapsack'){const dp=Array.from({length:w.length+1},()=>Array(cap+1).fill(0));for(let i=1;i<=w.length;i++)for(let c=0;c<=cap;c++){const skip=dp[i-1][c],take=c>=w[i-1]?dp[i-1][c-w[i-1]]+values[i-1]:-1;dp[i][c]=Math.max(skip,take);emit({explanation:`前 ${i} 件、容量 ${c}：不取价值 ${skip}，${take<0?'装不下当前物品':`取当前物品价值 ${take}`}，记录 ${dp[i][c]}。`,rows:dp,variables:{物品:i,容量:c,重量:w[i-1],价值:values[i-1]}});}let c=cap;const chosen:number[]=[];for(let i=w.length;i>0;i--){if(dp[i][c]!==dp[i-1][c]){chosen.push(i-1);c-=w[i-1];}}emit({explanation:`回溯表格：选中编号 [${chosen}]，最优价值 ${dp[w.length][cap]}。`,rows:dp,variables:{选中物品:chosen,剩余容量:c},result:dp[w.length][cap]});
  }else{const order=w.map((weight,i)=>({i,weight,value:values[i],ratio:values[i]/weight})).sort((a,b)=>b.ratio-a.ratio||a.i-b.i);let remaining=cap,total=0;const chosen:number[][]=[];emit({explanation:'先按单位重量价值从高到低排序。',rows:order.map(o=>[o.i,o.weight,o.value,o.ratio]),variables:{容量:cap}});for(const item of order){if(!remaining)break;const amount=Math.min(item.weight,remaining),fraction=amount/item.weight;remaining-=amount;total+=fraction*item.value;chosen.push([item.i,fraction]);emit({explanation:`物品 ${item.i} 取 ${(fraction*100).toFixed(1)}%，贡献价值 ${fraction*item.value}。`,rows:chosen,variables:{剩余容量:remaining,累计价值:total}});}emit({explanation:'容量用完或物品取完，分数背包选择完成。',rows:chosen,variables:{剩余容量:remaining},result:total});}
 }else if(id==='capacity'){
  const a=array(input,12,2);if(a.some(x=>x<0))throw Error('高度不能为负');if(a.some(x=>!Number.isSafeInteger(x*(a.length-1))))throw Error('高度过大，请缩小输入以保证容量精确计算');let l=0,r=a.length-1,best=0;while(l<r){const area=(r-l)*Math.min(a[l],a[r]);best=Math.max(best,area);emit({explanation:`容量 = 宽 ${r-l} × 短板 ${Math.min(a[l],a[r])} = ${area}。移动${a[l]<=a[r]?'左':'右'}侧短板，才有机会提高容量。`,values:a,active:[l,r],variables:{left:l,right:r,当前容量:area,最大容量:best}});a[l]<=a[r]?l++:r--;}emit({explanation:`两指针相遇，最大容量为 ${best}。`,values:a,variables:{left:l,right:r},result:best});
 }else if(id==='workflow'){
  const codes=['numbers = [1, 2, 3]\nprint(numbers[3])','numbers = [1, 2, 3]\nprint(numbers[3])','numbers = [1, 2, 3]\nprint(numbers[3])','numbers = [1, 2, 3]\nprint(numbers[2])','numbers = [1, 2, 3]\nprint(numbers[2])'];['编辑：列表含 3 项，索引从 0 开始。','运行预设示例：尝试读取索引 3。','定位错误：第 2 行 IndexError，合法索引为 0、1、2。','修正：把索引 3 改成 2，保留其余代码。','再次运行的预设结果为 3。可在真实编辑器中自行验证。'].forEach((explanation,i)=>emit({explanation,code:codes[i],line:i>0?2:1,variables:{阶段:i+1,演示:true},result:i===4?3:undefined}));
 }else throw Error('未知教学场景');
 return steps;
}
