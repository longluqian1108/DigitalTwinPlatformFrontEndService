<script setup lang="ts">
import { NButton, NInput, NTag } from 'naive-ui'
import { computed, ref } from 'vue'
import { useCommandStore } from '@/stores/commandStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
const commands = useCommandStore(), runtime = useRuntimeStore(), tab = ref<'activity' | 'query'>('activity')
const domainAllowed = computed(() => ['RUNNING', 'PAUSED'].includes(runtime.state))
const queryOperations = new Set(['TIME', 'POS', 'SHOW_TASK', 'SHOW_ROUTE', 'LIST_TASKS', 'LIST_WARNINGS', 'HELP', 'AXLS', 'RSRC'])
const draftOperation = computed(() => commands.draft.trim().split(/\s+/)[0]?.toUpperCase() ?? '')
const canSubmit = computed(() => Boolean(commands.draft.trim()) && (domainAllowed.value || queryOperations.has(draftOperation.value)))
function keydown(event: KeyboardEvent) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (canSubmit.value) void commands.submit() } }
</script>
<template>
  <section class="dock panel">
    <div class="cli">
      <header class="panel-title">CLI / Command</header>
      <div class="prompt"><span class="mono">LBS›</span><NInput v-model:value="commands.draft" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" :input-props="{ 'aria-label': 'Command line input' }" placeholder="TIME, HELP, or a domain command…" @keydown="keydown" /></div>
      <div class="cli-foot"><span :class="domainAllowed ? 'ready' : ''">{{ domainAllowed ? 'DOMAIN COMMANDS ENABLED' : 'QUERIES ONLY IN THIS STATE' }}</span><NButton size="small" type="primary" :loading="commands.pending" :disabled="!canSubmit" @click="commands.submit">Submit</NButton></div>
    </div>
    <div class="results">
      <nav><button :class="{ active: tab === 'activity' }" @click="tab = 'activity'">COMMAND ACTIVITY <b>{{ commands.activities.length }}</b></button><button :class="{ active: tab === 'query' }" @click="tab = 'query'">QUERY RESULT</button></nav>
      <div v-if="tab === 'activity'" class="activity scroll">
        <article v-for="item in commands.activities" :key="item.id">
          <div class="activity-head"><code>{{ item.input }}</code><NTag v-if="item.error" size="tiny" type="error">GATEWAY ERROR</NTag><NTag v-else-if="item.status" size="tiny" :type="item.status.status === 'ACCEPTED' ? 'success' : item.status.status === 'UNABLE' ? 'error' : 'warning'">{{ item.status.status }}</NTag><NTag v-else size="tiny">DRAFT</NTag></div>
          <div class="activity-meta mono"><span>{{ new Date(item.submittedAt).toLocaleTimeString() }}</span><span v-if="item.status">{{ item.status.operation }} · #{{ item.status.canonical_ingress_sequence }}</span></div>
          <p v-if="item.error" class="error-text">{{ item.error.error.code }} — {{ item.error.error.message }}</p><p v-else-if="item.status?.message">{{ item.status.reason_code }} — {{ item.status.message }}</p>
        </article>
        <div v-if="!commands.activities.length" class="empty-state">Submitted mutations and controls appear here.</div>
      </div>
      <div v-else class="query scroll"><template v-if="commands.queryResult"><div class="watermark mono">EPOCH {{ commands.queryResult.epoch_id.slice(0,8) }} · GEN {{ commands.queryResult.generation }} · TICK {{ commands.queryResult.tick_index }} · T+{{ commands.queryResult.t_s.toFixed(1) }}</div><pre>{{ JSON.stringify(commands.queryResult.data, null, 2) }}</pre></template><div v-else class="empty-state">Run TIME, HELP, LIST_TASKS or another query.</div></div>
    </div>
  </section>
</template>
<style scoped>
.dock { display: grid; grid-template-columns: minmax(360px, .72fr) 1.28fr; width: 100%; height: 100%; min-height: 0; overflow: hidden; border-radius: 4px; }.cli { display: grid; grid-template-rows: auto minmax(0,1fr) auto; min-height: 0; overflow: hidden; border-right: 1px solid var(--line); }.prompt { display: grid; grid-template-columns: 45px 1fr; min-height: 0; gap: 6px; padding: 10px; overflow: auto; }.prompt>span { padding-top: 8px; color: var(--cyan); font-weight: 700; }.prompt :deep(textarea) { font-family: "SFMono-Regular", Consolas, monospace; }.cli-foot { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-top: 1px solid var(--line); }.cli-foot span { color: var(--muted); font-size: 8px; letter-spacing: .1em; }.cli-foot .ready { color: var(--green); }
.results { display: grid; grid-template-rows: 35px minmax(0,1fr); min-width: 0; }.results nav { display: flex; border-bottom: 1px solid var(--line); }.results nav button { padding: 0 18px; color: var(--muted); background: transparent; border: 0; border-bottom: 2px solid transparent; font-size: 9px; font-weight: 700; letter-spacing: .1em; cursor: pointer; }.results nav button.active { color: var(--cyan); border-color: var(--cyan); }.results nav b { margin-left: 5px; }.activity { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); align-content: start; gap: 7px; padding: 8px; }.activity article { min-width: 0; padding: 9px; background: #0a1724; border: 1px solid var(--line); }.activity-head,.activity-meta { display: flex; justify-content: space-between; gap: 8px; }.activity-head code { overflow: hidden; color: #d8ebf6; text-overflow: ellipsis; white-space: nowrap; }.activity-meta { margin-top: 6px; color: var(--muted); font-size: 8px; }.activity p { margin: 7px 0 0; font-size: 10px; }.query { padding: 9px; }.watermark { padding: 7px; color: var(--cyan); background: #07131f; font-size: 9px; }.query pre { margin: 8px 0; color: #bcd1df; font-size: 10px; white-space: pre-wrap; }
</style>
