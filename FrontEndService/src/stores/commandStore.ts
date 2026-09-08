import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ActivityStatus, FreshRuntimeReadModelResponse } from '@/contracts'
import type { RuntimeControlOperation } from '@/services/GatewayTransport'
import { gatewayTransport } from '@/services/transport'
import { useSessionStore } from './sessionStore'

export interface Activity {
  id: string
  input: string
  submittedAt: string
  error?: { code: string; message: string }
  status?: ActivityStatus
}

// A-03/A-07 + P-06 interim: the CLI text box becomes a command palette that only
// issues enumerated registry operations with JSON args (no cli_text on the wire).
export const useCommandStore = defineStore('commands', () => {
  const draft = ref(''),
    activities = ref<Activity[]>([]),
    stateResult = ref<FreshRuntimeReadModelResponse>(),
    pending = ref(false)

  async function submit(operation: RuntimeControlOperation | string, argsText: string) {
    const session = useSessionStore()
    let args: unknown
    try {
      args = JSON.parse(argsText.trim() || '{}')
    } catch {
      activities.value.unshift({
        id: crypto.randomUUID(),
        input: `${operation} ${argsText}`.trim(),
        submittedAt: new Date().toISOString(),
        error: { code: 'INVALID_JSON', message: 'Command arguments are not valid JSON.' },
      })
      return
    }
    const activity: Activity = {
      id: crypto.randomUUID(),
      input: `${operation} ${argsText.trim()}`.trim(),
      submittedAt: new Date().toISOString(),
    }
    activities.value.unshift(activity)
    pending.value = true
    try {
      // 202 CommandReceipt; the final ACCEPTED/UNABLE view arrives on the control WS.
      activity.status = await gatewayTransport.control(session.scenarioId, session.epochId, {
        operation: operation as RuntimeControlOperation,
        args: args as Record<string, unknown>,
      })
    } catch (cause) {
      activity.error = {
        code: (cause as unknown as { code?: string }).code ?? 'TRANSPORT_ERROR',
        message: cause instanceof Error ? cause.message : 'Command transport failed',
      }
    } finally {
      pending.value = false
    }
  }

  // A-10: refresh the read model via GET /state (stale banner when WORKER_FAILED).
  async function refreshState() {
    const session = useSessionStore()
    try {
      stateResult.value = await gatewayTransport.state(session.scenarioId)
    } catch (cause) {
      stateResult.value = undefined
      throw cause
    }
  }

  // A-03: unpack the {type:'command_status', status, control_sequence} envelope.
  function update(message: { status: ActivityStatus }) {
    const status = message.status
    const activity = activities.value.find((item) => item.status?.command_id === status.command_id)
    if (activity) activity.status = status
    else
      activities.value.unshift({
        id: status.command_id,
        input: status.operation,
        submittedAt: new Date().toISOString(),
        status,
      })
  }
  function fillDraft(value: string) {
    draft.value = value
  }
  return { draft, activities, stateResult, pending, submit, refreshState, update, fillDraft }
})
