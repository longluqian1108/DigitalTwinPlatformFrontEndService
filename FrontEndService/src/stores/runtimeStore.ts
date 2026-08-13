import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RuntimeReadModel, SessionState, SubmitResult } from '@/contracts'
import { gatewayTransport } from '@/services/transport'
import { useSessionStore } from './sessionStore'

const initial: RuntimeReadModel = { epoch_id: '', generation: 0, tick_index: 0, t_s: 0, session_state: 'EMPTY', time_scale: 1, backend: 'MOCK', snapshot_publish_hz: 10 }

export const useRuntimeStore = defineStore('runtime', () => {
  const model = ref<RuntimeReadModel>({ ...initial }), pending = ref(false), error = ref('')
  const state = computed(() => model.value.session_state)
  function apply(next: RuntimeReadModel) { model.value = structuredClone(next); useSessionStore().syncRuntime(next.session_state, next.epoch_id) }
  async function control(operation: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET' | 'RATE', args?: Record<string, unknown>): Promise<SubmitResult | undefined> {
    const session = useSessionStore(); pending.value = true; error.value = ''
    try { return await gatewayTransport.control(session.scenarioId, session.epochId, operation, args) }
    catch (cause) { error.value = cause instanceof Error ? cause.message : 'Control request failed'; return undefined }
    finally { pending.value = false }
  }
  function isAllowed(operation: string, current: SessionState = state.value) {
    const allowed: Record<string, SessionState[]> = { START: ['READY'], PAUSE: ['RUNNING'], RESUME: ['PAUSED'], RATE: ['RUNNING'], STOP: ['RUNNING', 'PAUSED'], RESET: ['STOPPED'] }
    return allowed[operation]?.includes(current) ?? false
  }
  return { model, state, pending, error, apply, control, isAllowed }
})
