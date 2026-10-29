<script setup lang="ts">
import {nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue';
const props=defineProps<{context:string}>();
const emit=defineEmits<{note:[element:HTMLElement]}>();
const anchor=ref<HTMLElement>(), pinned=ref(false),x=ref(0),y=ref(0),box=ref<HTMLElement>();
let delay:ReturnType<typeof setTimeout>|undefined;
let restoringFocus=false;
const label=ref(''),explanation=ref('');
function close(){anchor.value=undefined;pinned.value=false;clearTimeout(delay);}
function keep(){clearTimeout(delay);}
async function show(el:HTMLElement,fixed=false){
 clearTimeout(delay);
 if(el.closest('.measurement-area')||!el.getBoundingClientRect().width)return;
 if(pinned.value&&anchor.value!==el&&!fixed)return;
 anchor.value=el;label.value=el.dataset.term||'';explanation.value=el.dataset.definition||'';pinned.value=fixed;
 await nextTick();const rect=el.getBoundingClientRect(),bounds=box.value?.getBoundingClientRect();
 x.value=Math.min(Math.max(12,rect.left),Math.max(12,window.innerWidth-(bounds?.width||300)-12));
 y.value=rect.bottom+8;
 if(y.value+(bounds?.height||120)>window.innerHeight-16)y.value=Math.max(12,rect.top-(bounds?.height||120)-8);
}
function enter(e:Event){if(restoringFocus)return;const t=(e.target as HTMLElement).closest?.<HTMLElement>('.ch12-term');if(t)void show(t,pinned.value&&anchor.value===t);}
function leave(e:Event){
 const to=(e as MouseEvent).relatedTarget as Node|null;
 if(pinned.value||box.value?.contains(to)||anchor.value?.contains(to))return;
 delay=setTimeout(close,220);
}
function click(e:MouseEvent){
 if((e.target as HTMLElement).closest?.('[data-annotation]')){close();return;}
 const t=(e.target as HTMLElement).closest?.<HTMLElement>('.ch12-term');
 if(t){e.preventDefault();e.stopPropagation();if(anchor.value===t&&pinned.value)close();else void show(t,true);}
 else if(!box.value?.contains(e.target as Node))close();
}
function key(e:KeyboardEvent){
 const t=(e.target as HTMLElement).closest?.<HTMLElement>('.ch12-term');
 if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();void show(t,true);}
 if(anchor.value&&e.key==='Escape'){e.preventDefault();e.stopPropagation();const previous=anchor.value;close();restoringFocus=true;previous.focus();queueMicrotask(()=>restoringFocus=false);}
}
function note(){if(anchor.value)emit('note',anchor.value);close();}
function trackAnchor(){
 const el=anchor.value;if(!el)return;
 const rect=el.getBoundingClientRect();
 const viewport=el.closest('.study-reader')?.getBoundingClientRect();
 const top=Math.max(0,viewport?.top||0),bottom=Math.min(window.innerHeight,viewport?.bottom||window.innerHeight);
 if(!el.isConnected||!rect.width||rect.bottom<=top||rect.top>=bottom||rect.right<=0||rect.left>=window.innerWidth){close();return;}
 void show(el,pinned.value);
}
watch(()=>props.context,close);
onMounted(()=>{document.addEventListener('pointerover',enter);document.addEventListener('focusin',enter);document.addEventListener('pointerout',leave);document.addEventListener('focusout',leave);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);window.addEventListener('scroll',trackAnchor,true);window.addEventListener('resize',close);});
onBeforeUnmount(()=>{close();document.removeEventListener('pointerover',enter);document.removeEventListener('focusin',enter);document.removeEventListener('pointerout',leave);document.removeEventListener('focusout',leave);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);window.removeEventListener('scroll',trackAnchor,true);window.removeEventListener('resize',close);});
</script>
<template><Teleport to="body"><div v-if="anchor" ref="box" class="ch12-term-note" role="note" :aria-label="label+'解释'" :style="{left:x+'px',top:y+'px'}" @pointerenter="keep" @pointerleave="leave">
 <strong>{{label}}</strong><span>{{explanation}}</span><button @click="note">记一笔</button><button v-if="pinned" aria-label="收起术语解释" @click="close">收起</button>
</div></Teleport></template>
