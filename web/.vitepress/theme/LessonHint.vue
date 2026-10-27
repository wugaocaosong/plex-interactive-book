<script setup lang="ts">
import {ref} from 'vue';
import type {LessonPage} from './unit-types';
defineProps<{lesson:LessonPage}>();
const emit=defineEmits<{hint:[level:number];coach:[]}>();
const level=ref(0);
</script>
<template><details class="lesson-hint"><summary>小E · 教学提示（离线可用）</summary><p>{{lesson.prompt}}</p><ol><li v-for="hint in lesson.hints.slice(0,level)" :key="hint">{{hint}}</li></ol><div class="unit-actions"><button :disabled="level>=lesson.hints.length" @click="level++;emit('hint',level)">再给一点提示</button><button @click="emit('coach')">向在线小E提问</button></div><small>以上为预设教学提示。在线辅导只在你主动发送后调用。</small></details></template>
