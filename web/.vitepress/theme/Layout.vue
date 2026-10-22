<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, useRouter } from 'vitepress'
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, ChevronLeft, ChevronRight, Compass, List, Search, X, Expand, RotateCcw } from 'lucide-vue-next'
import renderMathInElement from 'katex/contrib/auto-render'
import type { PageFlip } from 'page-flip'
import type { BookManifest, BookPage, ReadingLocator, SavedBookmark, SearchEntry } from './types'
import { paginate, locateLeaf, type Leaf } from './pagination'
import { readStore, saveStore } from './storage'
import { bindPageDrag } from './page-drag'
import StarMap from './StarMap.vue'
import CodePanel from './CodePanel.vue'
import H5PPanel from './H5PPanel.vue'

const { frontmatter }=useData(); const router=useRouter()
const manifest=ref<BookManifest>(); const current=ref<BookPage>(); const ready=ref(false); const loading=ref(true); const error=ref('')
const sectionId=computed(()=>String(frontmatter.value.bookId||'cover'))
const sections=computed(()=>manifest.value?.pages||[])
const sectionIndex=computed(()=>sections.value.findIndex(p=>p.id===sectionId.value))
const cover=computed(()=>current.value?.kind==='cover');const backCover=computed(()=>current.value?.kind==='back-cover')
const menu=ref<'contents'|'search'|'bookmarks'|null>(null);const mapView=ref(true); const query=ref('');const index=ref<SearchEntry[]>([])
const bookmarks=ref<SavedBookmark[]>([]);const resume=ref<ReadingLocator>();const saved=ref(false)
const host=ref<HTMLElement>();const stage=ref<HTMLElement>();const measure=ref<HTMLElement>();const pageIndex=ref(0);const leaves=ref<Leaf[]>([])
const panel=ref<'code'|'activity'|'image'|'expanded'|null>(null);const codeIndex=ref(0);const imageUrl=ref('');const imageAlt=ref('');const expandedHtml=ref('')
const pageWidth=ref(510);const pageHeight=ref(670);const desktop=ref(true)
const coverElement=ref<HTMLElement>();let disposeDrag:(()=>void)|undefined
const searchResults=computed(()=>{const term=query.value.trim().toLocaleLowerCase();return term?index.value.filter(e=>(e.title+' '+e.text).toLocaleLowerCase().includes(term)).slice(0,60):[]})
const groups=computed(()=>{const map=new Map<string,typeof sections.value>();for(const item of sections.value){if(item.kind==='cover'||item.kind==='back-cover')continue;const label=item.group||'卷首';map.set(label,[...(map.get(label)||[]),item])}return [...map]})
const progress=computed(()=>sections.value.length?Math.round(Math.max(0,sectionIndex.value)/(sections.value.length-1)*100):0)
let flip:PageFlip|undefined;let resizeTimer:ReturnType<typeof setTimeout>|undefined;let animationTimer:ReturnType<typeof setInterval>|undefined
let serial=0;let rendering=false;let pendingLocator:ReadingLocator|undefined;let lastFocus:HTMLElement|null=null;let mounted=false
const cache=new Map<string,Promise<BookPage>>()
function getPage(id:string) {
  if(!cache.has(id))cache.set(id,fetch(`/book/pages/${id}.json`).then(r=>{if(!r.ok)throw Error('这一节暂时无法加载。');return r.json()}).catch(e=>{cache.delete(id);throw e}))
  return cache.get(id)!
}
function locator():ReadingLocator {const leaf=leaves.value[pageIndex.value];return {sectionId:sectionId.value,blockId:leaf?.blockId||'b0',offset:leaf?.offset||0}}
function parseHash():ReadingLocator|undefined {if(!location.hash)return;const [block,offset]=decodeURIComponent(location.hash.slice(1)).split('@');return {sectionId:sectionId.value,blockId:block,offset:Number(offset||0)}}
function remember(){if(rendering||!current.value)return;const place=locator();saveStore('reading',place);if(!cover.value){resume.value=place;history.replaceState(history.state||{},'',`${location.pathname}#${place.blockId}@${place.offset}`)}}
async function navigate(id:string,place?:ReadingLocator) {
  menu.value=null;panel.value=null;pendingLocator=place;stopAnimation()
  const route=id==='cover'?'/':sections.value.find(p=>p.id===id)?.route
  if(!route)return
  if(id===sectionId.value){if(place)flip?.turnToPage(locateLeaf(leaves.value,place.blockId,place.offset));return}
  await router.go(route+(place?`#${place.blockId}@${place.offset}`:''))
}
function previous(){stopAnimation();if(pageIndex.value>0){flip?.flipPrev();return}const entry=sections.value[sectionIndex.value-1];if(entry)navigate(entry.id,{sectionId:entry.id,blockId:'__last',offset:0})}
function next(){stopAnimation();const step=desktop.value?2:1;if(!cover.value&&pageIndex.value+step<leaves.value.length){flip?.flipNext();return}const entry=sections.value[sectionIndex.value+1];if(entry)navigate(entry.id)}
function addBookmark(){const place=locator();const existing=bookmarks.value.findIndex(b=>b.sectionId===place.sectionId&&b.blockId===place.blockId&&b.offset===place.offset);if(existing<0)bookmarks.value.push({...place,title:current.value?.title||'书签'});saveStore('bookmarks',bookmarks.value);saved.value=true;setTimeout(()=>saved.value=false,1500)}
async function openMenu(type:typeof menu.value){lastFocus=document.activeElement as HTMLElement;menu.value=type;if(type==='search'&&!index.value.length)index.value=await fetch('/book/search.json').then(r=>r.json());await nextTick();document.querySelector<HTMLInputElement>('.search-input')?.focus()}
function goSearch(entry:SearchEntry){const block=entry.blocks.find(item=>item.text.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()));navigate(entry.id,{sectionId:entry.id,blockId:block?.blockId||'b0',offset:0})}
function closeOverlay(){menu.value=null;panel.value=null;lastFocus?.focus()}
function openPanel(type:typeof panel.value){lastFocus=document.activeElement as HTMLElement;stopAnimation();panel.value=type;nextTick(()=>document.querySelector<HTMLButtonElement>('.dialog-close')?.focus())}
function stopAnimation(){clearInterval(animationTimer);animationTimer=undefined;host.value?.querySelectorAll('[data-action="step-play"]').forEach(b=>b.textContent='播放')}
function stepFigure(figure:HTMLElement,delta:number){const n=Number(figure.dataset.animation);const frames=current.value?.animations[n];if(!frames?.length)return;const next=((Number(figure.dataset.frame||0)+delta)%frames.length+frames.length)%frames.length;figure.dataset.frame=String(next);const img=figure.querySelector('img')!;img.src=frames[next].src;img.alt=frames[next].alt;figure.querySelector('[data-step-label]')!.textContent=`${next+1} / ${frames.length}`}
function clickBook(event:MouseEvent) {
  const target=event.target as HTMLElement;const action=target.closest<HTMLElement>('[data-action]');const anchor=target.closest<HTMLAnchorElement>('a[href]')
  if(action){event.preventDefault();event.stopPropagation();const value=action.dataset.action
    if(value==='code'){codeIndex.value=Number(action.dataset.code);openPanel('code')}
    if(value==='activity')openPanel('activity')
    if(value==='image'){imageUrl.value=(action as HTMLImageElement).src;imageAlt.value=(action as HTMLImageElement).alt;openPanel('image')}
    if(value==='expand'){const original=stage.value?.querySelector(`[data-block="${action.dataset.block}"]`);expandedHtml.value=original?.outerHTML||'';openPanel('expanded')}
    if(value?.startsWith('step-')){const figure=action.closest<HTMLElement>('.step-player')!;if(value==='step-next')stepFigure(figure,1);if(value==='step-prev')stepFigure(figure,-1);if(value==='step-play'){if(animationTimer){stopAnimation()}else{action.textContent='暂停';animationTimer=setInterval(()=>stepFigure(figure,1),1000)}}}
    return
  }
  if(anchor&&anchor.getAttribute('href')?.startsWith('/read/')){event.preventDefault();const url=new URL(anchor.href);const id=url.pathname.replace('/read/','').replace(/\.html$/,'');navigate(id,url.hash?{sectionId:id,blockId:decodeURIComponent(url.hash.slice(1)),offset:0}:undefined)}
  else if(anchor?.getAttribute('href')?.startsWith('#')){event.preventDefault();const id=decodeURIComponent(anchor.hash.slice(1));flip?.turnToPage(locateLeaf(leaves.value,id))}
}
async function layout(place?:ReadingLocator) {
  if(!current.value||!host.value||!measure.value||!stage.value)return
  const own=++serial;rendering=true;loading.value=true;stopAnimation()
  desktop.value=window.innerWidth>=1024
  pageHeight.value=Math.max(300,Math.min(window.innerHeight-166,850))
  pageWidth.value=desktop.value?Math.min(570,Math.floor((window.innerWidth-160)/2)):Math.min(600,window.innerWidth-24)
  await nextTick()
  stage.value.innerHTML=current.value.html
  stage.value.querySelectorAll('details').forEach(el=>el.open=true)
  renderMathInElement(stage.value,{throwOnError:false,delimiters:[{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}]})
  stage.value.querySelectorAll<HTMLImageElement>('img').forEach(img=>img.loading='eager')
  await Promise.all([document.fonts.ready,...Array.from(stage.value.querySelectorAll<HTMLImageElement>('img')).map(img=>img.decode().catch(()=>undefined))])
  if(own!==serial)return
  stage.value.querySelectorAll<HTMLImageElement>('.step-player img').forEach(img=>img.style.height=img.getBoundingClientRect().height+'px')
  // PageFlip owns these nodes; no Vue stateful component is mounted inside its cloneable pages.
  disposeDrag?.();disposeDrag=undefined
  if(flip){flip.destroy();flip=undefined}
  const node=document.createElement('div');host.value.replaceChildren(node)
  leaves.value=paginate(stage.value,measure.value,pageHeight.value-(desktop.value?112:92))
  if(current.value.kind==='contents')leaves.value=[{html:'<div class="contents-leaf"><p class="chapter-kicker">知识地图</p><h1>星域目录</h1><p>每一颗行星，都是一段新的旅程。</p><img src="/upstream/assets/hero/astronaut.png" alt="正在探索的宇航员"/><button data-action="star-map">打开星域目录</button></div>',blockId:'b0',offset:0}]
  const elements=leaves.value.map((leaf,i)=>{
    const el=document.createElement('div');el.className='book-leaf'
    const head=document.createElement('div');head.className='leaf-header';head.textContent=current.value!.group+' / '+current.value!.title
    const content=document.createElement('div');content.className='leaf-content';content.innerHTML=leaf.html
    const foot=document.createElement('div');foot.className='leaf-footer';foot.textContent=`${i+1} / ${leaves.value.length}　·　PLEX 星轨编程`
    el.append(head,content,foot);node.append(el);return el
  })
  // The blank verso is explicitly blank, never a duplicate of the previous leaf.
  if(desktop.value&&elements.length%2){const blank=document.createElement('div');blank.className='book-leaf blank-verso';blank.innerHTML='<span>PLEX</span>';node.append(blank);elements.push(blank)}
  const {PageFlip}=await import('page-flip');if(own!==serial)return
  const target=place?.blockId==='__last'?Math.max(0,leaves.value.length-1):place?locateLeaf(leaves.value,place.blockId,place.offset):0
  flip=new PageFlip(node,{width:pageWidth.value,height:pageHeight.value,size:'fixed',usePortrait:!desktop.value,autoSize:true,showCover:false,startPage:target,
    drawShadow:true,maxShadowOpacity:0.22,flippingTime:matchMedia('(prefers-reduced-motion: reduce)').matches?1:480,useMouseEvents:false,mobileScrollSupport:false,disableFlipByClick:true})
  flip.on('flip',(event)=>{pageIndex.value=Math.min(Number(event.data),leaves.value.length-1);remember()})
  flip.loadFromHTML(elements);pageIndex.value=Math.min(flip.getCurrentPageIndex(),leaves.value.length-1)
  disposeDrag=bindPageDrag(host.value,{
    flip,
    canTurn:direction=>!loading.value&&!menu.value&&!panel.value&&(direction==='previous'?pageIndex.value>0||sectionIndex.value>0:pageIndex.value+(desktop.value?2:1)<leaves.value.length||sectionIndex.value<sections.value.length-1),
    atBoundary:direction=>direction==='previous'?pageIndex.value===0:pageIndex.value+(desktop.value?2:1)>=leaves.value.length,
    turn:direction=>direction==='previous'?previous():next(),onStart:stopAnimation
  })
  rendering=false;loading.value=false;remember()
}
async function loadCurrent(){
  if(!mounted)return
  const id=sectionId.value;error.value='';loading.value=true;panel.value=null
  disposeDrag?.();disposeDrag=undefined
  try{
    const data=await getPage(id);if(id!==sectionId.value)return
    current.value=data;await nextTick()
    const place=pendingLocator||parseHash();pendingLocator=undefined
    if(cover.value){++serial;flip?.destroy();flip=undefined;leaves.value=[];pageIndex.value=0;loading.value=false;rendering=false
      if(coverElement.value)disposeDrag=bindPageDrag(coverElement.value,{cover:true,canTurn:()=>!menu.value,atBoundary:()=>true,turn:next,onStart:stopAnimation})
    }
    else await layout(place)
    for(const adjacent of [sections.value[sectionIndex.value-1],sections.value[sectionIndex.value+1]])if(adjacent)getPage(adjacent.id).catch(()=>{})
  }catch(e){error.value=String(e);loading.value=false}
}
function resize(){desktop.value=window.innerWidth>=1024;if(cover.value)return;const place=locator();clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>layout(place),200)}
function keydown(event:KeyboardEvent){
  if(event.key==='Escape'){closeOverlay();return}
  if(menu.value||panel.value){if(event.key==='Tab'){const box=document.querySelector<HTMLElement>('[role="dialog"]');const focusable=[...box?.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,a[href],iframe')||[]].filter(e=>e.offsetParent!==null);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}return}
  if((event.target as HTMLElement).matches('input,textarea,select,[contenteditable]'))return
  if(event.key==='ArrowRight'){event.preventDefault();next()}
  if(event.key==='ArrowLeft'){event.preventDefault();previous()}
}
function hashchange(){const place=parseHash();if(place)flip?.turnToPage(locateLeaf(leaves.value,place.blockId,place.offset))}
watch(sectionId,loadCurrent)
onMounted(async()=>{mounted=true;desktop.value=window.innerWidth>=1024;ready.value=true;bookmarks.value=readStore('bookmarks',[]);resume.value=readStore<ReadingLocator|undefined>('reading',undefined);try{manifest.value=await fetch('/book/manifest.json').then(r=>r.json());await loadCurrent()}catch(e){error.value=String(e);loading.value=false}window.addEventListener('resize',resize);window.addEventListener('keydown',keydown);window.addEventListener('hashchange',hashchange)})
onBeforeUnmount(()=>{++serial;disposeDrag?.();flip?.destroy();stopAnimation();clearTimeout(resizeTimer);window.removeEventListener('resize',resize);window.removeEventListener('keydown',keydown);window.removeEventListener('hashchange',hashchange)})
</script>

<template>
  <div class="reader" :data-section="current?.id" :class="{'is-cover':cover,'is-back-cover':backCover}" :style="{'--page-width':pageWidth+'px','--page-height':pageHeight+'px','--content-height':(pageHeight-(desktop?112:92))+'px'}">
    <header class="reader-toolbar">
      <button class="brand" aria-label="返回封面" @click="navigate('cover')">PLEX<span>星轨编程</span></button>
      <div class="toolbar-actions">
        <button aria-label="打开目录" @click="openMenu('contents')"><Compass :size="19"/><span>目录</span></button>
        <button aria-label="搜索全书" @click="openMenu('search')"><Search :size="18"/><span>搜索</span></button>
        <button aria-label="查看书签" @click="openMenu('bookmarks')"><Bookmark :size="18"/><span>书签</span><small v-if="bookmarks.length">{{bookmarks.length}}</small></button>
      </div>
    </header>
    <main class="reading-main">
      <div v-if="error" class="reader-error" role="alert"><h1>暂时无法打开这一页</h1><p>{{error}}</p><button @click="loadCurrent">重新加载</button><button @click="navigate('cover')">返回封面</button></div>
      <div v-else-if="cover" class="cover-scene">
        <button ref="coverElement" class="cover-book" aria-label="打开星轨编程，进入扉页" title="点击打开，或按住封面向左拖动" @click="next"><img src="/images/cover.png" alt="PLEX 星轨编程：Python 与算法的探索之旅。宇航员坐在月牙上读书。" fetchpriority="high" draggable="false"/></button>
        <div class="cover-controls"><button class="open-book" @click="next">翻开这本书 <ArrowRight :size="18"/></button><button v-if="resume&&resume.sectionId!=='cover'" class="resume-button" @click="navigate(resume.sectionId,resume)"><BookOpen :size="15"/>继续上次阅读</button></div>
      </div>
      <section v-else class="open-book-scene" aria-label="电子书阅读区" :aria-busy="loading">
        <div class="section-heading"><span>{{current?.group}}</span><h1>{{current?.title||'星轨编程'}}</h1><button class="bookmark-page" :aria-label="saved?'已加入书签':'收藏当前页'" @click="addBookmark"><Check v-if="saved" :size="17"/><Bookmark v-else :size="17"/></button></div>
        <div class="book-holder" :class="{loading}" @click="($event.target as HTMLElement).closest('[data-action=star-map]')?openMenu('contents'):clickBook($event)">
          <button class="edge-nav edge-prev" aria-label="上一页" :disabled="sectionIndex<=0&&pageIndex===0" @click.stop="previous"><ChevronLeft :size="24"/></button>
          <div ref="host" class="book-host vp-raw" title="按住书页左右边缘，拖动翻页"/>
          <button class="edge-nav edge-next" aria-label="下一页" :disabled="sectionIndex===sections.length-1&&pageIndex+(desktop?2:1)>=leaves.length" @click.stop="next"><ChevronRight :size="24"/></button>
        </div>
        <div v-if="loading" class="loading-label" role="status">正在排版这一节…</div>
        <div class="page-navigation"><button aria-label="上一节" :disabled="sectionIndex<=0" @click="navigate(sections[sectionIndex-1].id)"><ArrowLeft :size="14"/>上一节</button><span>第 {{pageIndex+1}}{{desktop&&pageIndex+1<leaves.length?'–'+(pageIndex+2):''}} 页 / {{leaves.length}} 页</span><button aria-label="下一节" :disabled="sectionIndex>=sections.length-1" @click="navigate(sections[sectionIndex+1].id)">下一节<ArrowRight :size="14"/></button></div>
        <p class="drag-hint">按住页边向内拖动翻书 · 拖回可取消</p>
      </section>
      <div v-if="!ready" class="loading-label">正在打开星轨编程…</div>
    </main>
    <footer class="reader-footer"><span>Python 与算法的探索之旅</span><span v-if="!cover">全书进度 {{progress}}%</span><span v-else>一本可以动手探索的书</span></footer>
    <div class="measurement-area" aria-hidden="true"><div ref="stage" class="leaf-content source-stage"/><div ref="measure" class="leaf-content page-measure"/></div>

    <div v-if="menu" class="overlay" @click.self="closeOverlay">
      <section class="navigation-dialog" role="dialog" aria-modal="true" :aria-label="menu==='search'?'搜索全书':menu==='bookmarks'?'我的书签':'星域目录'">
        <div class="dialog-header"><div><span class="dialog-eyebrow">星轨编程</span><h2>{{menu==='search'?'寻找一束灵感':menu==='bookmarks'?'留下的坐标':'你的算法星图'}}</h2></div><button class="dialog-close" aria-label="关闭" @click="closeOverlay"><X :size="22"/></button></div>
        <template v-if="menu==='contents'">
          <div class="view-tabs"><button :class="{active:mapView}" @click="mapView=true"><Compass :size="16"/>星域导航</button><button :class="{active:!mapView}" @click="mapView=false"><List :size="16"/>全部章节</button></div>
          <div class="contents-scroll"><StarMap v-if="mapView" :sections="sections" @navigate="navigate"/><div v-if="!mapView||!desktop" class="chapter-directory"><section v-for="[group,items] in groups" :key="group"><h3>{{group}}</h3><button v-for="entry in items" :key="entry.id" :class="{current:entry.id===sectionId}" @click="navigate(entry.id)">{{entry.title}}<ChevronRight :size="15"/></button></section></div></div>
        </template>
        <template v-if="menu==='search'"><div class="search-box"><Search :size="20"/><input v-model="query" class="search-input" aria-label="搜索关键词" placeholder="试试「二分查找」或「链表」"/></div><div class="search-results"><p v-if="!query" class="empty-note">搜索全书的章节、术语和代码。</p><p v-else-if="!searchResults.length" class="empty-note">没有找到相关内容，换个关键词试试。</p><button v-for="entry in searchResults" :key="entry.id" @click="goSearch(entry)"><small>{{entry.group}}</small><strong>{{entry.title}}</strong><p>{{entry.text.slice(Math.max(0,entry.text.toLowerCase().indexOf(query.toLowerCase())-35),Math.max(0,entry.text.toLowerCase().indexOf(query.toLowerCase())-35)+130)}}…</p></button></div></template>
        <div v-if="menu==='bookmarks'" class="bookmark-list"><p v-if="!bookmarks.length" class="empty-note">阅读时点击页顶的书签图标，把值得重读的一页留在这里。</p><div v-for="(mark,i) in bookmarks" :key="mark.sectionId+mark.blockId+mark.offset"><button @click="navigate(mark.sectionId,mark)"><Bookmark :size="16"/>{{mark.title}}</button><button aria-label="删除书签" @click="bookmarks.splice(i,1);saveStore('bookmarks',bookmarks)"><X :size="16"/></button></div></div>
      </section>
    </div>
    <div v-if="panel" class="overlay" @click.self="closeOverlay">
      <section class="content-dialog" :class="{'image-dialog':panel==='image'}" role="dialog" aria-modal="true" :aria-label="panel==='code'?'代码实验室':panel==='activity'?'星轨试炼':panel==='image'?'查看图解':'展开阅读'">
        <div class="dialog-header"><div><span class="dialog-eyebrow">{{current?.title}}</span><h2>{{panel==='code'?'代码实验室':panel==='activity'?'二分查找 · 星轨试炼':panel==='image'?'图解':'展开阅读'}}</h2></div><button class="dialog-close" aria-label="关闭" @click="closeOverlay"><X :size="22"/></button></div>
        <CodePanel v-if="panel==='code'&&current?.codeExamples[codeIndex]" :example="current.codeExamples[codeIndex]"/>
        <H5PPanel v-if="panel==='activity'"/>
        <div v-if="panel==='image'" class="image-viewer"><img :src="imageUrl" :alt="imageAlt"/><p>{{imageAlt}}</p></div>
        <div v-if="panel==='expanded'" class="expanded-viewer leaf-content vp-raw" v-html="expandedHtml" @click="clickBook"/>
      </section>
    </div>
  </div>
</template>
