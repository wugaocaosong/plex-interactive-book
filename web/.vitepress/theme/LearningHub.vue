<script setup lang="ts">
import {onMounted,ref,computed} from 'vue'
import type {ExerciseDefinition} from './types'
import {labGroups} from './algorithm-labs'
import AlgorithmLab from './AlgorithmLab.vue'
import CodePanel from './CodePanel.vue'
const props=defineProps<{sectionId:string}>()
const mode=ref<'labs'|'exercises'>('labs'),exercises=ref<ExerciseDefinition[]>([]),selected=ref<ExerciseDefinition>(),error=ref('')
const group=computed(()=>props.sectionId.includes('array_and_linkedlist')?0:props.sectionId.includes('stack_and_queue')?1:props.sectionId.includes('searching')?2:props.sectionId.includes('sorting')?3:/chapter_(tree|graph)/.test(props.sectionId)?4:props.sectionId.includes('complexity')?5:2)
onMounted(async()=>{try{const response=await fetch('/learning/exercises.json');if(!response.ok)throw Error('练习资源加载失败');exercises.value=await response.json()}catch(e){error.value=String(e)}})
</script><template><div class="learning-hub"><div class="view-tabs"><button :class="{active:mode==='labs'}" @click="mode='labs'">算法实验</button><button :class="{active:mode==='exercises'}" @click="mode='exercises'">编程练习 · 24 题</button></div><p v-if="error" role="alert">{{error}}</p><AlgorithmLab v-if="mode==='labs'" :initial-group="group"/><template v-else><template v-if="selected"><button class="back-exercises" @click="selected=undefined">← 返回练习目录</button><CodePanel :key="selected.id" :exercise="selected"/></template><div v-else class="exercise-catalog"><section v-for="label in labGroups" :key="label"><h3>{{label}}</h3><button v-for="exercise in exercises.filter(e=>e.group===label)" :key="exercise.id" @click="selected=exercise"><small>{{exercise.kind}}</small>{{exercise.title}}<span>→</span></button></section></div></template></div></template>
