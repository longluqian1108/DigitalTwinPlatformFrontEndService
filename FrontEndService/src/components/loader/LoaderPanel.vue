<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NModal, NProgress, NSpin } from 'naive-ui'
import type { DocumentKind } from '@/contracts'
import DocumentStep from './DocumentStep.vue'
import PreviewSummary from './PreviewSummary.vue'
import ValidationIssueList from './ValidationIssueList.vue'
import { useSessionStore } from '@/stores/sessionStore'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; build: [] }>()
const session = useSessionStore(), order: DocumentKind[] = ['environment', 'resource', 'task']
const progress = computed(() => Object.values(session.slots).filter((slot) => slot.state === 'CONFIRMED').length / 3 * 100)
function enabled(kind: DocumentKind) { const index = order.indexOf(kind); return index === 0 || session.slots[order[index - 1]!].state === 'CONFIRMED' }
</script>

<template>
  <NModal :show="open" :mask-closable="session.sessionState === 'READY'" @update:show="emit('update:open', $event)">
    <div class="loader" role="dialog" aria-label="Scenario loader">
      <header><div><span class="eyebrow">SCENARIO INITIALIZATION</span><h1>Build a simulation basis</h1><p>Upload and confirm the three authoritative documents in dependency order.</p><div class="samples">Sample files: <a href="/mock-data/environment.json" download>environment</a><a href="/mock-data/resource.json" download>resource</a><a href="/mock-data/task.json" download>task</a></div></div><NButton v-if="session.sessionState === 'READY'" quaternary @click="emit('update:open', false)">Close</NButton></header>
      <NProgress type="line" aria-label="Scenario document confirmation progress" :percentage="progress" :show-indicator="false" :height="3" color="#49c6e5" rail-color="#1d3447" />
      <PreviewSummary />
      <NSpin :show="session.busy && session.sessionState !== 'BUILDING'">
        <div class="steps"><DocumentStep v-for="kind in order" :key="kind" :kind="kind" :slot="session.slots[kind]" :enabled="enabled(kind)" :frozen="session.sessionState === 'BUILDING'" @upload="session.upload(kind, $event)" @confirm="session.confirm(kind)" /></div>
      </NSpin>
      <ValidationIssueList />
      <footer>
        <div><strong>{{ session.sessionState }}</strong><span class="mono">{{ session.scenarioId || 'Creating scenario…' }}</span></div>
        <NButton size="large" type="primary" :loading="session.sessionState === 'BUILDING'" :disabled="!session.buildEligible || session.sessionState === 'BUILDING'" @click="emit('build')">{{ session.sessionState === 'BUILDING' ? 'Building authoritative state…' : 'Build simulation' }}</NButton>
      </footer>
    </div>
  </NModal>
</template>

<style scoped>
.loader { display: grid; grid-template-rows: auto auto auto auto minmax(90px,1fr) auto; gap: 14px; width: min(1120px, 94vw); max-height: 94vh; padding: 24px; overflow: auto; background: linear-gradient(155deg, #102437, #08131f 60%); border: 1px solid #35516a; border-radius: 7px; box-shadow: 0 30px 100px #000a; }
header { display: flex; justify-content: space-between; align-items: start; }h1 { margin: 5px 0 3px; font-size: 24px; letter-spacing: -.02em; }header p { margin: 0; color: var(--muted); }.eyebrow { color: var(--cyan); font-size: 9px; font-weight: 700; letter-spacing: .18em; }
.samples { display: flex; gap: 10px; margin-top: 9px; color: var(--muted); font-size: 10px; }.samples a { color: var(--cyan); text-decoration: none; }.samples a:hover { text-decoration: underline; }
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }.loader>footer { display: flex; align-items: center; justify-content: space-between; padding-top: 4px; }.loader>footer div { display: grid; gap: 3px; }.loader>footer strong { color: var(--cyan); }.loader>footer span { color: var(--muted); font-size: 10px; }
@media (max-width: 900px) { .steps { grid-template-columns: 1fr; } }
</style>
