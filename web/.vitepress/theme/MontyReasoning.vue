<script setup lang="ts">
import {computed,ref,watch,onMounted,onBeforeUnmount,nextTick} from 'vue';
import {motion} from 'motion-v';
import MontyScene from './MontyScene.vue';
import {doors,eligibleDoors,remainingDoor,type Door} from './monty-hall';
import {getLearning,putLearning} from './learning-store';
import {registerLearningFlush} from './learning-flush';
const props=defineProps<{mode:'rules'|'cases'|'explain'}>();
const emit=defineEmits<{completed:[]}>();
const first=ref<Door>(0), prize=ref<Door>(0), selected=ref<Door[]>([]),checked=ref(false),step=ref(0),loaded=ref(false),error=ref('');
const allowed=computed(()=>eligibleDoors(prize.value,first.value));
const correct=computed(()=>selected.value.length===allowed.value.length&&allowed.value.every(d=>selected.value.includes(d)));
const key='lesson:monty-'+props.mode;
async function save(){if(loaded.value)await putLearning(key,{first:first.value,prize:prize.value,selected:selected.value,checked:checked.value,step:step.value}).catch(()=>{error.value='保存失败，请保留当前页面并重试。';});}
let disposed=false;
onMounted(async()=>{const old=await getLearning<any>(key,undefined);if(disposed)return;if(old){if(doors.includes(old.first))first.value=old.first;if(doors.includes(old.prize))prize.value=old.prize;selected.value=(old.selected||[]).filter((d:Door)=>doors.includes(d));checked.value=!!old.checked;step.value=Math.min(2,Math.max(0,old.step||0));}await nextTick();if(!disposed)loaded.value=true;});
watch([first,prize],()=>{if(!loaded.value)return;checked.value=false;selected.value=[];});
watch([first,prize,selected,checked,step],()=>void save(),{deep:true});
const unregister=registerLearningFlush(save);onBeforeUnmount(()=>{disposed=true;unregister();void save();});
function check(){checked.value=true;if(correct.value)emit('completed');}
</script>
<template>
  <section>
    <span class="unit-eyebrow">教学演示 · 与随机故事独立</span>
    <h3>{{mode==='rules'?'小E可以打开哪些门？':mode==='cases'?'三个等可能的核心位置':'从初选情况解释换门'}}</h3>
    <div class="unit-actions"><label>固定初选门<select v-model.number="first"><option v-for="d in doors" :value="d">{{d+1}} 号门</option></select></label><label v-if="mode!=='explain'">核心位置<select v-model.number="prize"><option v-for="d in doors" :value="d">{{d+1}} 号门</option></select></label></div>
    <template v-if="mode==='rules'">
      <p>这里公开核心位置供你检查规则。请选择所有合法空门，然后核对。</p>
      <fieldset><legend>小E可以打开（可多选）</legend><label v-for="d in doors" :key="d" class="rule-choice"><input type="checkbox" v-model="selected" :value="d"/>{{d+1}} 号门</label></fieldset>
      <button class="primary" @click="check">检查开门规则</button>
      <div v-if="checked" role="status"><strong>{{correct?'判断正确':'再检查两个排除条件'}}</strong><ul><li v-for="d in doors" :key="d">{{d+1}} 号门：{{d===first?'不能打开，是初选门。':d===prize?'不能打开，里面有核心。':'可以打开，既不是初选门，也没有核心。'}}</li></ul><p v-if="allowed.length===2">两扇都合法，小E等概率选择其中一扇，且始终提供换门机会。</p></div>
    </template>
    <template v-else-if="mode==='cases'">
      <MontyScene :step="3" :prize="prize" :first="first" :opened="allowed[0]" :final="remainingDoor(first,allowed[0])" />
      <table class="unit-table"><caption>每一行代表一个核心位置，概率均为 1/3。</caption><thead><tr><th>核心位置</th><th>可开空门</th><th>不换门</th><th>换门</th></tr></thead><tbody><tr v-for="p in doors" :key="p" :class="{selected:p===prize}"><th><button @click="prize=p">{{p+1}} 号门</button></th><td>{{eligibleDoors(p,first).map(d=>`${d+1}号`).join(' 或 ')}}</td><td>{{p===first?'获奖':'未获奖'}}</td><td>{{p!==first?'获奖':'未获奖'}}</td></tr></tbody></table>
      <p>初选正确的那一行有两种开门方式：每条路径的概率是 1/3 × 1/2 = 1/6。它们仍属于同一个核心位置，不能把它们与另外两行算成四种等可能情况。</p>
      <button @click="emit('completed')">我已对照三种情况</button>
    </template>
    <template v-else>
      <p>固定初选 {{first+1}} 号门。核心仍然等概率出现在三个位置。</p>
      <div class="probability-groups"><motion.div :animate="{opacity:1}" class="correct-group"><strong>初选正确 · 1/3</strong><p v-if="step>=1">小E打开一扇空门，剩下的另一扇也没有核心。</p><b v-if="step>=2">不换获奖，换门未获奖</b></motion.div><motion.div :animate="{opacity:1}" class="wrong-group"><strong>初选错误 · 2/3</strong><p v-if="step>=1">小E必须排除另一扇空门，剩下的未开门就是核心。</p><b v-if="step>=2">不换未获奖，换门获奖</b></motion.div></div>
      <div class="unit-actions"><button :disabled="step===0" @click="step--">上一步解释</button><button :disabled="step===2" @click="step++;if(step===2)emit('completed')">{{step===0?'加入主持人条件':'比较策略结果'}}</button><button @click="step=0">重新推演</button></div>
      <p v-if="step===2" role="status">换门获奖恰好对应初选错误，所以理论概率为 2/3；不换门为 1/3。这依赖于既定主持人规则。</p>
    </template>
    <p v-if="error" role="alert">{{error}}</p>
  </section>
</template>
<style scoped>.rule-choice{display:inline-flex;align-items:center;padding:12px;gap:6px}.probability-groups{display:flex;gap:12px;margin:20px 0}.probability-groups>div{padding:16px;border:2px solid #d9b873;border-radius:12px;flex:1}.probability-groups>.wrong-group{flex:2;border-color:#4f8d86}.selected{background:#4f8d8622}@media(max-width:500px){.probability-groups{display:block}.probability-groups>div{margin-bottom:12px}}</style>
