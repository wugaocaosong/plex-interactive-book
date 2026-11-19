export type ConceptId='graph'|'traversal'|'binary'|'insertion'|'hash'|'swap'|'insert-sort'|'partition';
export const conceptTitles:Record<ConceptId,string>={graph:'连一条边，两张表一起变化',traversal:'换一种走法，观察访问顺序',binary:'亲手缩小二分区间',insertion:'把新元素放到合适的位置',hash:'让关键词找到自己的槽位',swap:'交换相邻元素，观察逆序减少','insert-sort':'拿起一张牌，插入有序区',partition:'换一个基准，重新分组'};
export const conceptEntries:{section:string;anchor:string;id:ConceptId;hint:string}[]=[
 {section:'chapter_graph/graph_operations',anchor:'blk-06ac7089f482e497',id:'graph',hint:'点选航线，邻接矩阵和邻接表同时更新。'},
 {section:'chapter_graph/graph_traversal',anchor:'blk-f864cd9ba0a1aa0e',id:'traversal',hint:'切换 BFS / DFS，逐步查看待访问列表与已访问节点。'},
 {section:'chapter_searching/binary_search',anchor:'blk-f95d2a40c15463ed',id:'binary',hint:'拖动目标值，观察每次比较后哪些位置被排除。'},
 {section:'chapter_searching/binary_search_insertion',anchor:'blk-ec76944f5efe6930',id:'insertion',hint:'在含重复值的数组里，对比左侧插入与右侧插入。'},
 {section:'chapter_searching/replace_linear_by_hashing',anchor:'blk-adf63deeec945f91',id:'hash',hint:'逐个投放编号，观察取模定位与线性探测。'},
 {section:'chapter_sorting/bubble_sort',anchor:'blk-89aed8ac35a4c469',id:'swap',hint:'拖动数字或点相邻交换，看看逆序对数量怎样变化。'},
 {section:'chapter_sorting/insertion_sort',anchor:'blk-3c58dcba9b887056',id:'insert-sort',hint:'逐次拿起待排序元素，观察前面元素如何移动。'},
 {section:'chapter_sorting/quick_sort',anchor:'blk-c75986506714dbb4',id:'partition',hint:'点击不同基准，对比小于、等于、大于三组的规模。'},
];
export function adjacency(n:number,edges:[number,number][]){const matrix=Array.from({length:n},()=>Array(n).fill(0) as number[]);for(const [a,b] of edges){matrix[a][b]=matrix[b][a]=1;}return matrix;}
export function traversalFrames(n:number,edges:[number,number][],start:number,kind:'bfs'|'dfs'){
 const matrix=adjacency(n,edges),pending=[start],seen=new Set<number>(),order:number[]=[],frames=[{pending:[start],order:[] as number[],current:-1}];
 while(pending.length){const node=kind==='bfs'?pending.shift()!:pending.pop()!;if(seen.has(node))continue;seen.add(node);order.push(node);const next=matrix[node].flatMap((v,i)=>v&&!seen.has(i)?[i]:[]);if(kind==='dfs')next.reverse();for(const v of next){if(kind==='dfs'){const at=pending.indexOf(v);if(at>=0)pending.splice(at,1);pending.push(v);}else if(!pending.includes(v))pending.push(v);}frames.push({pending:[...pending],order:[...order],current:node});}
 return frames;
}
export function binaryFrames(array:number[],target:number){let left=0,right=array.length-1;const frames:{left:number;right:number;mid:number;found:number}[]=[];while(left<=right){const mid=Math.floor((left+right)/2);frames.push({left,right,mid,found:array[mid]===target?mid:-1});if(array[mid]===target)return frames;if(array[mid]<target)left=mid+1;else right=mid-1;}frames.push({left,right,mid:-1,found:-1});return frames;}
export function insertionIndex(array:number[],value:number,right=false){const i=array.findIndex(v=>right?v>value:v>=value);return i<0?array.length:i;}
export function hashInsert(slots:(number|null)[],key:number){const result=[...slots],path:number[]=[];for(let step=0;step<slots.length;step++){const i=((key%slots.length)+slots.length)%slots.length;const at=(i+step)%slots.length;path.push(at);if(result[at]===null){result[at]=key;return {slots:result,path,inserted:true};}}return {slots:result,path,inserted:false};}
export function inversions(values:number[]){let count=0;for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++)if(values[i]>values[j])count++;return count;}
export function partitionValues(values:number[],pivot:number){return [values.filter(v=>v<pivot),values.filter(v=>v===pivot),values.filter(v=>v>pivot)];}
export function injectConceptActivities(root:HTMLElement){
 for(const entry of conceptEntries.filter(e=>e.section===root.dataset.section)){
  if(root.querySelector(`[data-concept="${entry.id}"]`))continue;
  const anchor=root.querySelector<HTMLElement>(`[data-block="${entry.anchor}"]`);if(!anchor)continue;
  const card=document.createElement('aside');card.className='concept-entry';card.dataset.block='concept-'+entry.section.replaceAll('/','-')+'-'+entry.id;
  const label=document.createElement('small');label.textContent='动手观察 · 不计分';const title=document.createElement('h3');title.textContent=conceptTitles[entry.id];const hint=document.createElement('p');hint.textContent=entry.hint;const button=document.createElement('button');button.dataset.action='concept';button.dataset.concept=entry.id;button.textContent='打开小互动 →';card.append(label,title,hint,button);
  let next=anchor.nextElementSibling;while(next&&!/^H[1-6]$/.test(next.tagName))next=next.nextElementSibling;
  if(next)next.before(card);else root.append(card);
 }
}
