<script setup lang="ts">
import { ref } from 'vue'
import TaskBoard from './TaskBoard.vue'
import ResourceBoard from './ResourceBoard.vue'
const tab = ref<'tasks' | 'resources'>('tasks')
</script>
<template><section class="entity panel"><header class="panel-title">Task / Resources board</header><nav><button :class="{ active: tab === 'tasks' }" @click="tab = 'tasks'">TASKS</button><button :class="{ active: tab === 'resources' }" @click="tab = 'resources'">RESOURCES</button></nav><div class="body"><TaskBoard v-if="tab === 'tasks'" /><ResourceBoard v-else /></div></section></template>
<style scoped>.entity { display: grid; grid-template-rows: auto 36px minmax(0,1fr); height: 100%; border-radius: 4px; }.entity>nav { display: flex; border-bottom: 1px solid var(--line); }.entity>nav button { flex: 1; color: var(--muted); background: #091622; border: 0; border-bottom: 2px solid transparent; font-size: 10px; font-weight: 700; letter-spacing: .1em; cursor: pointer; }.entity>nav button.active { color: var(--cyan); border-color: var(--cyan); }.body { min-height: 0; }</style>
