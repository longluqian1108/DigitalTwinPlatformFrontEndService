import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { CommandStatusView, FreshResponse, GatewayError, SubmitResult } from '@/contracts'
import { gatewayTransport } from '@/services/transport'
import { useSessionStore } from './sessionStore'

export interface Activity {
  id: string
  input: string
  submittedAt: string
  error?: GatewayError
  status?: CommandStatusView
}
export const useCommandStore = defineStore('commands', () => {
  const draft = ref(''),
    activities = ref<Activity[]>([]),
    queryResult = ref<FreshResponse>(),
    pending = ref(false)
  async function submit() {
    const text = draft.value.trim()
    if (!text) return
    const session = useSessionStore(),
      activity: Activity = {
        id: crypto.randomUUID(),
        input: text,
        submittedAt: new Date().toISOString(),
      }
    activities.value.unshift(activity)
    draft.value = ''
    pending.value = true
    try {
      applyResult(
        activity,
        await gatewayTransport.submit(session.scenarioId, text, session.epochId),
      )
    } catch (cause) {
      activity.error = {
        error: {
          code: 'TRANSPORT_ERROR',
          message: cause instanceof Error ? cause.message : 'Command transport failed',
        },
      }
    } finally {
      pending.value = false
    }
  }
  function applyResult(activity: Activity, result: SubmitResult) {
    if (result.kind === 'error') activity.error = result.error
    else if (result.kind === 'query') queryResult.value = result.response
    else activity.status = result.receipt
  }
  function update(status: CommandStatusView) {
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
  return { draft, activities, queryResult, pending, submit, update, fillDraft }
})
