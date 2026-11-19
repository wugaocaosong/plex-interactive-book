<script setup lang="ts">
import {computed,ref} from 'vue';
import {adjacency,traversalFrames,binaryFrames,insertionIndex,hashInsert,inversions,partitionValues,conceptTitles,type ConceptId} from './concept-activities';
const props=defineProps<{concept:ConceptId}>();
const names=['A','B','C','D','E'];
const edges=ref<[number,number][]>([[0,1],[0,2],[1,3],[2,3],[3,4]]);
const matrix=computed(()=>adjacency(5,edges.value));
const pairs=Array.from({length:5},(_,a)=>Array.from({length:5-a-1},(_,i)=>[a,a+i+1] as [number,number])).flat();
function toggle(a:number,b:number){const i=edges.value.findIndex(([x,y])=>x===a&&y===b||x===b&&y===a);if(i>=0)edges.value.splice(i,1);else edges.value.push([a,b]);step.value=0;}
const kind=ref<'bfs'|'dfs'>('bfs'),start=ref(0),step=ref(0);
const traversal=computed(()=>traversalFrames(5,edges.value,start.value,kind.value));
const walk=computed(()=>traversal.value[Math.min(step.value,traversal.value.length-1)]);
const array=[1,3,3,5,7,9,11,13],target=ref(7),side=ref(false),inserted=ref(false);
const binary=computed(()=>binaryFrames(array,target.value));
const search=computed(()=>binary.value[Math.min(step.value,binary.value.length-1)]);
const position=computed(()=>insertionIndex(array,target.value,side.value));
const slots=ref<(number|null)[]>(Array(7).fill(null)),capacity=ref(7),hashPath=ref<number[]>([]),hashMessage=ref('点击一个编号，把它放入哈希表。');
function resetHash(){slots.value=Array(capacity.value).fill(null);hashPath.value=[];hashMessage.value='点击一个编号，把它放入哈希表。';}
function addKey(key:number){if(slots.value.includes(key)){hashMessage.value='这个编号已在表中。';return;}const result=hashInsert(slots.value,key);slots.value=result.slots;hashPath.value=result.path;hashMessage.value=result.inserted?`${key} % ${capacity.value} = ${key%capacity.value}；探测槽位：${result.path.join(' → ')}`:'表已满，没有空槽位。';}
const tokenIds=ref([0,1,2,3,4]);
const values=ref([7,3,5,3,1]),swaps=ref(0),dragged=ref<number>(),selected=ref<number>(),pivot=ref(5),prefix=ref(1),insertMessage=ref('左侧第一个元素构成有序区。');
function swapAt(i:number){if(i<0||i>=values.value.length-1)return;[values.value[i],values.value[i+1]]=[values.value[i+1],values.value[i]];[tokenIds.value[i],tokenIds.value[i+1]]=[tokenIds.value[i+1],tokenIds.value[i]];swaps.value++;}
function dropAt(i:number){if(dragged.value!==undefined&&dragged.value!==i){const [v]=values.value.splice(dragged.value,1);values.value.splice(i,0,v);const [id]=tokenIds.value.splice(dragged.value,1);tokenIds.value.splice(i,0,id);swaps.value++;}dragged.value=undefined;}
function insertNext(){if(prefix.value>=values.value.length)return;const v=values.value[prefix.value],at=insertionIndex(values.value.slice(0,prefix.value),v,true),distance=prefix.value-at;values.value.splice(prefix.value,1);values.value.splice(at,0,v);const [id]=tokenIds.value.splice(prefix.value,1);tokenIds.value.splice(at,0,id);prefix.value++;insertMessage.value=`拿起 ${v}，将 ${distance} 个元素右移后，插入第 ${at+1} 个位置。`;}
function chooseToken(i:number){
 if(props.concept==='partition'){pivot.value=values.value[i];return;}
 if(props.concept!=='swap')return;
 if(selected.value===undefined){selected.value=i;return;}
 dragged.value=selected.value;dropAt(i);selected.value=undefined;
}
function reset(){tokenIds.value=[0,1,2,3,4];values.value=[7,3,5,3,1];swaps.value=0;prefix.value=1;selected.value=undefined;insertMessage.value='左侧第一个元素构成有序区。';}
const groups=computed(()=>partitionValues(values.value,pivot.value));
const points=[{x:90,y:50},{x:30,y:150},{x:150,y:150},{x:90,y:245},{x:225,y:245}];
</script>
<template>
<section class="concept-playground" :aria-label="conceptTitles[concept]">
 <header><small>PLEX · CONCEPT PLAYGROUND</small><h3>{{conceptTitles[concept]}}</h3><p>自由尝试，观察变化；没有分数，也不影响继续阅读。</p></header>
 <template v-if="concept==='graph'||concept==='traversal'">
  <div class="concept-graph-row"><svg viewBox="0 0 270 295" role="img" aria-label="五个顶点的无向图"><line v-for="[a,b] in edges" :key="a+'-'+b" :x1="points[a].x" :y1="points[a].y" :x2="points[b].x" :y2="points[b].y"/><g v-for="(p,i) in points" :key="i" :class="{visited:concept==='traversal'&&walk.order.includes(i),current:concept==='traversal'&&walk.current===i}"><circle :cx="p.x" :cy="p.y" r="20"/><text :x="p.x" :y="p.y+5" text-anchor="middle">{{names[i]}}</text></g></svg>
   <div v-if="concept==='graph'" class="concept-pairs"><p>点击航线按钮添加或删除无向边：</p><button v-for="[a,b] in pairs" :key="a+'-'+b" :aria-pressed="!!matrix[a][b]" @click="toggle(a,b)">{{names[a]}} ↔ {{names[b]}}</button><p>当前 {{edges.length}} 条边 · 邻接矩阵对称，主对角线为 0。</p></div>
   <div v-else><label>遍历方式 <select v-model="kind" @change="step=0"><option value="bfs">BFS · 队列，先到先访问</option><option value="dfs">DFS · 栈，后进先访问</option></select></label><label>起点 <select v-model.number="start" @change="step=0"><option v-for="(name,i) in names" :key="i" :value="i">{{name}}</option></select></label><p>邻居按字母顺序安排；DFS 入栈时反向压入，保证 A 的 B 分支先被访问。</p><p>已访问：{{walk.order.map(i=>names[i]).join(' → ')||'尚未出发'}}</p><p>{{kind==='bfs'?'队列（左侧先出）':'栈（右侧先出）'}}：{{walk.pending.map(i=>names[i]).join(' · ')||'空'}}</p><button :disabled="step===0" @click="step--">退一步</button><button :disabled="step>=traversal.length-1" @click="step++">访问下一个顶点</button><button @click="step=0">重新出发</button></div>
  </div>
  <div v-if="concept==='graph'" class="concept-representations"><table><caption>邻接矩阵</caption><thead><tr><th></th><th v-for="n in names" :key="n">{{n}}</th></tr></thead><tbody><tr v-for="(row,a) in matrix" :key="a"><th>{{names[a]}}</th><td v-for="(v,b) in row" :key="b" :class="{filled:v}">{{v}}</td></tr></tbody></table><div><h4>邻接表</h4><p v-for="(row,a) in matrix" :key="a">{{names[a]}} → {{row.flatMap((v,i)=>v?[names[i]]:[]).join('、')||'空'}}</p></div></div>
 </template>
 <template v-else-if="concept==='binary'||concept==='insertion'">
  <label>目标值 {{target}}<input v-model.number="target" aria-label="目标值" type="range" min="0" max="14" @input="step=0;inserted=false"/></label>
  <div v-if="concept==='binary'" class="concept-tokens"><span v-for="(v,i) in array" :key="i" :class="{discarded:i<search.left||i>search.right,current:i===search.mid}"><small>{{i}}</small>{{v}}</span></div>
  <template v-if="concept==='binary'"><p role="status">{{search.found>=0?`找到目标：索引 ${search.found}`:search.mid<0?'区间为空，目标不在数组中。':`当前区间 [${search.left}, ${search.right}]，中点 ${search.mid} 的值是 ${array[search.mid]}。`}}</p><button :disabled="step===0" @click="step--">上一次比较</button><button :disabled="step>=binary.length-1" @click="step++">比较并缩小区间</button><p>换一个不在数组中的目标值，观察区间何时变成空集。</p></template>
  <template v-else><label><input v-model="side" type="checkbox" @change="inserted=false"/> 放到相同元素的右侧（关闭时放到左侧）</label><div class="concept-tokens"><template v-for="(v,i) in array" :key="i"><span v-if="i===position" class="insertion-marker">{{inserted?target:'↓'}}</span><span>{{v}}</span></template><span v-if="position===array.length" class="insertion-marker">{{inserted?target:'↓'}}</span></div><p>插入下标 {{position}}。对比目标为 3 时，两种边界的区别。</p><button @click="inserted=!inserted">{{inserted?'收回新元素':'放入新元素'}}</button></template>
 </template>
 <template v-else-if="concept==='hash'">
  <label>槽位数 {{capacity}}<input v-model.number="capacity" type="range" min="5" max="11" aria-label="槽位数" @input="resetHash"/></label><div class="concept-pairs"><button v-for="key in [12,19,26,33,7,14,21]" :key="key" :disabled="slots.includes(key)" @click="addKey(key)">投放 {{key}}</button></div><div class="concept-tokens"><span v-for="(v,i) in slots" :key="i" :class="{current:hashPath.includes(i)}"><small>槽 {{i}}</small>{{v??'空'}}</span></div><p role="status">{{hashMessage}}</p><p>这是开放寻址中的线性探测。改变槽位数会清空表，方便比较同一组编号的碰撞情况。</p><button @click="resetHash">清空哈希表</button>
 </template>
 <template v-else>
  <p v-if="concept==='swap'">拖动数字调整顺序、依次点击两个位置移动元素，或使用下面的相邻交换按钮。它是自由排序沙盘；只有交换相邻逆序元素时才对应冒泡的一次有效交换。</p><p v-else-if="concept==='insert-sort'">绿色区域是已经排好的前缀；每次拿起后面的一个元素，再插入到前缀中。相等元素保持原先先后关系。</p><p v-else>点击数字选择基准，只观察本轮划分，不把这一步当成整个快速排序。</p>
  <div class="concept-tokens"><button v-for="(v,i) in values" :key="i" :draggable="concept==='swap'" :class="{current:(concept==='partition'&&v===pivot)||(concept==='swap'&&selected===i),visited:concept==='insert-sort'&&i<prefix}" :aria-label="`第 ${i+1} 个元素 ${v}`" @dragstart="dragged=i" @dragover.prevent @drop.prevent="dropAt(i)" @click="chooseToken(i)"><small>位置 {{i}} · #{{tokenIds[i]+1}}</small>{{v}}</button></div>
  <template v-if="concept==='swap'"><div class="concept-pairs"><button v-for="i in values.length-1" :key="i" @click="swapAt(i-1)">交换 {{i-1}} ↔ {{i}}</button></div><p role="status">当前逆序对 {{inversions(values)}} · 已操作 {{swaps}} 次</p><p>逆序对为 0 时，序列已经非递减。也可以尝试把它重新打乱。</p></template>
  <template v-else-if="concept==='insert-sort'"><button :disabled="prefix===values.length" @click="insertNext">拿起下一个元素并插入</button><p role="status">{{insertMessage}}</p><p>有序前缀长度 {{prefix}} / {{values.length}}</p></template>
  <div v-else class="partition-groups"><section v-for="(group,i) in groups" :key="i"><h4>{{['小于','等于','大于'][i]}} {{pivot}}</h4><p>{{group.join(' · ')||'空'}}</p><small>{{group.length}} 个元素</small></section><p>这里采用保留所有元素的三路分组示意；分区内的顺序不代表原地快速排序的最终顺序。</p></div>
  <button @click="reset">恢复原始序列</button>
 </template>
</section>
</template>
<style>
.concept-playground{padding:24px;color:#edf7f6;line-height:1.8}.concept-playground header small{color:#95cdc7;letter-spacing:2px}.concept-playground h3{font-size:24px;margin:12px 0}.concept-playground button,.concept-playground select{min-height:42px;border:1px solid #77a9a6;border-radius:9px;padding:8px 14px;background:#163d48;color:#edf7f6;margin:5px;cursor:pointer}.concept-playground button:disabled{opacity:.4;cursor:default}.concept-playground button[aria-pressed=true],.concept-playground .current{background:#956d28!important;outline:2px solid #edcd82}.concept-playground label{display:block;margin:12px 0}.concept-playground input[type=range]{display:block;width:min(100%,460px);accent-color:#70c4b6;margin:12px 0}.concept-graph-row{display:flex;gap:24px;align-items:center;flex-wrap:wrap}.concept-graph-row svg{width:260px;max-width:100%;flex-shrink:0}.concept-graph-row>div{flex:1;min-width:220px}.concept-graph-row line{stroke:#74a7ad;stroke-width:3}.concept-graph-row circle{fill:#143743;stroke:#8bc1c7;stroke-width:2}.concept-graph-row text{fill:white;font-size:18px}.concept-graph-row g.visited circle{fill:#3e8777}.concept-graph-row g.current circle{fill:#a47b31}.concept-representations{display:flex;gap:30px;flex-wrap:wrap}.concept-representations table{border-collapse:collapse}.concept-representations td,.concept-representations th{border:1px solid #6b9299;padding:8px 14px;text-align:center}.concept-representations .filled{background:#295f5e}.concept-representations p{margin:5px 0}.concept-tokens{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}.concept-tokens>span,.concept-tokens>button{display:flex;flex-direction:column;justify-content:center;align-items:center;min-width:54px;min-height:70px;padding:8px 12px;border:1px solid #83aaa7;border-radius:9px;background:#20434a;font-size:24px;margin:0}.concept-tokens small{display:block;font-size:11px;opacity:.7}.concept-tokens .discarded{opacity:.24;text-decoration:line-through}.concept-tokens .visited{background:#286653}.concept-tokens .insertion-marker{border:2px dashed #edcb80;background:#64522d}.partition-groups{display:flex;gap:14px;flex-wrap:wrap}.partition-groups section{flex:1;min-width:150px;padding:15px;border:1px solid #7aa8a2;border-radius:12px;background:#173842}.partition-groups>p{flex-basis:100%}.concept-playground :focus-visible{outline:3px solid #edcb80;outline-offset:3px}@media(max-width:600px){.concept-playground{padding:14px}.concept-tokens{gap:6px}.concept-tokens>span,.concept-tokens>button{min-width:40px;padding:6px}}
</style>
