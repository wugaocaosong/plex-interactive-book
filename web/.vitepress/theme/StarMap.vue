<script setup lang="ts">
import type { BookSection } from './types'
defineProps<{ sections: BookSection[] }>()
const emit = defineEmits<{ navigate: [id: string] }>()
const stars = [
  ['introduction','初识算法','astronaut',43,46,27],
  ['computational_complexity','复杂度分析','chapter_computational_complexity',38,45,9],
  ['array_and_linkedlist','数组与链表','chapter_array_and_linkedlist',84,65,18],
  ['stack_and_queue','栈与队列','chapter_stack_and_queue',68,88,12],
  ['hashing','哈希表','chapter_hashing',67,35,13],
  ['tree','树','chapter_tree',86,33,17],
  ['heap','堆','chapter_heap',81,14,9],
  ['graph','图','chapter_graph',61,14,22],
  ['searching','搜索','chapter_searching',25,25,14],
  ['sorting','排序','chapter_sorting',29,48,8],
  ['divide_and_conquer','分治','chapter_divide_and_conquer',43,12,18],
  ['backtracking','回溯','chapter_backtracking',12,43,20],
  ['dynamic_programming','动态规划','chapter_dynamic_programming',16,71,13],
  ['greedy','贪心','chapter_greedy',35,89,16]
] as const
</script>
<template>
  <div class="star-map" aria-label="星域章节导航">
    <img class="star-orbits" src="/upstream/assets/hero/links.png" alt="" />
    <img class="star-ground" src="/upstream/assets/hero/ground.png" alt="" />
    <button v-for="[chapter,title,asset,x,y,width] in stars" :key="chapter" class="planet"
      :style="{left:`${x}%`,top:`${y}%`,width:`${width}%`}" :aria-label="`进入${title}`" @click="emit('navigate',`chapter_${chapter}/index`)">
      <img :src="`/upstream/assets/hero/${asset}.png`" alt="" /><span>{{ title }}</span>
    </button>
    <button class="structure-link" @click="emit('navigate','chapter_data_structure/index')">数据结构 · 知识起点</button>
  </div>
</template>
