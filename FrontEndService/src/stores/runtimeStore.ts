import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RuntimeReadModel, SessionState } from '@/contracts'
import type { ControlCommandInput, RuntimeControlOperation } from '@/services/GatewayTransport'
import { gatewayTransport } from '@/services/transport'
import { useSessionStore } from './sessionStore'

// A-09: RuntimeReadModel is now the generated read model (wide, all-required).
const initial: RuntimeReadModel = {
  scenario_id: '',
  epoch_id: '',
  session_state: 'EMPTY',
  tick_index: 0,
  t_s: 0,
  dt_s: 0.1,
  time_scale: 1,
  resume_time_scale: 1,
  backend_requested: 'auto',
  backend_active: 'cpu',
  worker_status: '',
  committed_generation: 0,
  aircraft_total: 0,
  aircraft_active: 0,
  aircraft_placed: 0,
  aircraft_destroyed: 0,
  task_counts_by_lifecycle: { PLANNED: 0, RUNNING: 0, COMPLETED: 0, CANCELLED: 0, INTERRUPTED: 0 },
  task_counts_by_phase: { PRE_GROUND: 0, TAKEOFF: 0, NAV: 0, LANDING: 0, POST_GROUND: 0 },
  warning_count: 0,
  critical_count: 0,
  canonical_snapshot_sequence: 0,
  live_published_snapshot_sequence: 0,
  snapshot_lag_s: 0,
}

export const useRuntimeStore = defineStore('runtime', () => {
  const model = ref<RuntimeReadModel>({ ...initial }),
    pending = ref(false),
    error = ref('')
  const state = computed<SessionState>(() => model.value.session_state as SessionState)
  // The Stage-1 service creates its worker (and the control WS projection
  // revision) only when START is submitted, so the workbench listens here to
  // (re)connect the control WS right after a successful START 202.
  let startListener: (() => void) | undefined
  function onStartSubmitted(listener: () => void) {
    startListener = listener
  }
  function apply(next: RuntimeReadModel) {
    model.value = structuredClone(next)
    useSessionStore().syncRuntime(next.session_state as SessionState, next.epoch_id)
  }
  // A-07: wire canonical operation names; returns success of the 202 CommandReceipt
  // submission and records the GatewayHttpError code/message otherwise.
  async function control(command: ControlCommandInput): Promise<boolean> {
    const session = useSessionStore()
    pending.value = true
    error.value = ''
    try {
      await gatewayTransport.control(session.scenarioId, session.epochId, command)
      if (command.operation === 'start') startListener?.()
      return true
    } catch (cause) {
      const code = (cause as unknown as { code?: string }).code
      const message = cause instanceof Error ? cause.message : 'Control request failed'
      error.value = code ? `${code} — ${message}` : message
      return false
    } finally {
      pending.value = false
    }
  }
  // A-13 fix: the scenario session state (sessionStore) is the gate authority across
  // the build boundary - the runtime read model only exists after START creates the
  // worker, so gating START on the runtime store dead-locked the workbench at READY.
  // Stage 1 admits exactly six operations; the top-bar surface only issues start,
  // and the four domain operations ride the command palette. The legacy mock-only
  // controls (pause/resume/reset/set_time_scale) are never allowed in any state.
  function isAllowed(
    operation: RuntimeControlOperation,
    current: SessionState = useSessionStore().sessionState,
  ) {
    const allowed: Record<RuntimeControlOperation, SessionState[]> = {
      start: ['READY'],
      pause: [],
      resume: [],
      set_time_scale: [],
      stop: ['RUNNING'],
      reset: [],
    }
    return allowed[operation]?.includes(current) ?? false
  }
  return { model, state, pending, error, apply, control, isAllowed, onStartSubmitted }
})
