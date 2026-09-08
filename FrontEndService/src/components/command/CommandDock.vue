<script setup lang="ts">
import { NButton, NInput, NSelect, NTag } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import type { RuntimeControlOperation } from '@/services/GatewayTransport'
import { useCommandStore } from '@/stores/commandStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useSessionStore } from '@/stores/sessionStore'

// A-07/P-06 interim: the free-text CLI becomes a command palette that only
// issues enumerated registry operations with JSON args (no cli_text on the wire).
const commands = useCommandStore(), runtime = useRuntimeStore(), session = useSessionStore(), tab = ref<'activity' | 'query'>('activity')

// Stage 1 exposes exactly the six operations admitted by the backend gateway.
const OPERATIONS: Array<{ label: string; value: string; args: Record<string, unknown> }> = [
  { label: 'start', value: 'start', args: {} },
  { label: 'stop', value: 'stop', args: {} },
  { label: 'hold_task', value: 'hold_task', args: { task_id: '' } },
  { label: 'cancel_task', value: 'cancel_task', args: { task_id: '' } },
  { label: 'takeoff', value: 'takeoff', args: { aircraft_id: '' } },
  { label: 'land', value: 'land', args: { aircraft_id: '' } }
]
const operation = ref<string>('start')
const argsText = ref('{}')
const operationOptions = OPERATIONS.map(({ label, value }) => ({ label, value }))

watch(operation, (value) => {
  const template = OPERATIONS.find((entry) => entry.value === value)
  argsText.value = JSON.stringify(template?.args ?? {})
})
// "Use draft" from the map pane prefills the palette.
watch(() => commands.draft, (value) => {
  if (!value) return
  const head = value.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  if (OPERATIONS.some((entry) => entry.value === head)) { operation.value = head; commands.fillDraft('') }
})

const domainAllowed = computed(() => ['RUNNING', 'PAUSED'].includes(session.sessionState))
const canSubmit = computed(() => {
  const state = session.sessionState
  const allowed = operation.value === 'start'
    ? state === 'READY'
    : operation.value === 'stop'
      ? state === 'RUNNING' || state === 'PAUSED'
      : domainAllowed.value
  return allowed && !commands.pending
})
function submit() { void commands.submit(operation.value, argsText.value) }

function statusTagType(status: 'QUEUED' | 'ACCEPTED' | 'UNABLE') { return status === 'ACCEPTED' ? 'success' : status === 'UNABLE' ? 'error' : 'warning' }
function isFinal(status: unknown): status is { status: 'ACCEPTED' | 'UNABLE'; reason_code: string; message: string; final_generation: number; final_tick_index: number } {
  return typeof status === 'object' && status !== null && 'final_generation' in status
}
</script>
<template>
  <section class="dock panel">
    <div class="cli">
      <header class="panel-title">Command palette</header>
      <div class="prompt">
        <NSelect v-model:value="operation" size="small" :options="operationOptions" filterable aria-label="Command operation" />
        <NInput v-model:value="argsText" type="textarea" :autosize="{ minRows: 2, maxRows: 3 }" :input-props="{ 'aria-label': 'Command arguments (JSON)' }" placeholder='{ "task_id": "…" }' @keydown.enter.prevent="canSubmit && submit()" />
      </div>
      <div class="cli-foot"><span :class="domainAllowed ? 'ready' : ''">{{ domainAllowed ? 'DOMAIN COMMANDS ENABLED' : 'QUERIES ONLY IN THIS STATE' }}</span><NButton size="small" type="primary" :loading="commands.pending" :disabled="!canSubmit" @click="submit">Submit</NButton></div>
    </div>
    <div class="results">
      <nav><button :class="{ active: tab === 'activity' }" @click="tab = 'activity'">COMMAND ACTIVITY <b>{{ commands.activities.length }}</b></button><button :class="{ active: tab === 'query' }" @click="tab = 'query'; commands.refreshState().catch(() => undefined)">STATE / QUERY RESULT</button></nav>
      <div v-if="tab === 'activity'" class="activity scroll">
        <article v-for="item in commands.activities" :key="item.id">
          <div class="activity-head"><code>{{ item.input }}</code><NTag v-if="item.error" size="tiny" type="error">GATEWAY ERROR</NTag><NTag v-else-if="item.status" size="tiny" :type="statusTagType(item.status.status)">{{ item.status.status }}</NTag><NTag v-else size="tiny">DRAFT</NTag></div>
          <div class="activity-meta mono"><span>{{ new Date(item.submittedAt).toLocaleTimeString() }}</span><span v-if="item.status">{{ item.status.operation }} · #{{ item.status.canonical_ingress_sequence }}</span></div>
          <p v-if="item.error" class="error-text">{{ item.error.code }} — {{ item.error.message }}</p>
          <p v-else-if="item.status && isFinal(item.status)">{{ item.status.reason_code }} — {{ item.status.message }} <span class="mono">gen {{ item.status.final_generation }} tick {{ item.status.final_tick_index }}</span></p>
        </article>
        <div v-if="!commands.activities.length" class="empty-state">Submitted mutations and controls appear here.</div>
      </div>
      <div v-else class="query scroll">
        <template v-if="commands.stateResult">
          <div v-if="'stale' in commands.stateResult && commands.stateResult.stale" class="stale-banner">STALE — {{ commands.stateResult.stale_reason }} (cached last committed state)</div>
          <div class="watermark mono">EPOCH {{ commands.stateResult.epoch_id.slice(0,8) }} · GEN {{ commands.stateResult.source_generation }} · TICK {{ commands.stateResult.source_tick_index }} · T+{{ commands.stateResult.source_t_s.toFixed(1) }}</div>
          <pre>{{ JSON.stringify(commands.stateResult.data, null, 2) }}</pre>
        </template>
        <div v-else class="empty-state">Open this tab to fetch GET /state (fresh or stale WORKER_FAILED cache).</div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.dock { display: grid; grid-template-columns: minmax(360px, .72fr) 1.28fr; width: 100%; height: 100%; min-height: 0; overflow: hidden; border-radius: 4px; }.cli { display: grid; grid-template-rows: auto minmax(0,1fr) auto; min-height: 0; overflow: hidden; border-right: 1px solid var(--line); }.prompt { display: grid; grid-template-rows: auto minmax(0,1fr); min-height: 0; gap: 6px; padding: 10px; overflow: auto; }.prompt :deep(textarea) { font-family: "SFMono-Regular", Consolas, monospace; }.cli-foot { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-top: 1px solid var(--line); }.cli-foot span { color: var(--muted); font-size: 8px; letter-spacing: .1em; }.cli-foot .ready { color: var(--green); }
.results { display: grid; grid-template-rows: 35px minmax(0,1fr); min-width: 0; }.results nav { display: flex; border-bottom: 1px solid var(--line); }.results nav button { padding: 0 18px; color: var(--muted); background: transparent; border: 0; border-bottom: 2px solid transparent; font-size: 9px; font-weight: 700; letter-spacing: .1em; cursor: pointer; }.results nav button.active { color: var(--cyan); border-color: var(--cyan); }.results nav b { margin-left: 5px; }.activity { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); align-content: start; gap: 7px; padding: 8px; }.activity article { min-width: 0; padding: 9px; background: #0a1724; border: 1px solid var(--line); }.activity-head,.activity-meta { display: flex; justify-content: space-between; gap: 8px; }.activity-head code { overflow: hidden; color: #d8ebf6; text-overflow: ellipsis; white-space: nowrap; }.activity-meta { margin-top: 6px; color: var(--muted); font-size: 8px; }.activity p { margin: 7px 0 0; font-size: 10px; }.query { padding: 9px; }.watermark { padding: 7px; color: var(--cyan); background: #07131f; font-size: 9px; }.stale-banner { margin-bottom: 7px; padding: 7px; color: #ffd6dc; background: rgb(72 17 28 / 95%); border: 1px solid #9f3548; font-size: 9px; }.query pre { margin: 8px 0; color: #bcd1df; font-size: 10px; white-space: pre-wrap; }
</style>
