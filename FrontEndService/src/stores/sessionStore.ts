import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  DocumentKind,
  DocumentSlot,
  FullState,
  SessionState,
  StagedPreview,
} from '@/contracts'
import { gatewayTransport } from '@/services/transport'

const order: DocumentKind[] = ['environment', 'resource', 'task']
const blank = (kind: DocumentKind): DocumentSlot => ({ kind, state: 'EMPTY', slotRevision: 0 })

export const useSessionStore = defineStore('session', () => {
  const scenarioId = ref('')
  const sessionState = ref<SessionState>('EMPTY')
  const epochId = ref('')
  const preview = ref<StagedPreview>()
  const slots = reactive<Record<DocumentKind, DocumentSlot>>({
    environment: blank('environment'),
    resource: blank('resource'),
    task: blank('task'),
  })
  const busy = ref(false),
    error = ref('')
  const buildEligible = computed(() => order.every((kind) => slots[kind].state === 'CONFIRMED'))

  async function initialize() {
    busy.value = true
    error.value = ''
    try {
      const summary = await gatewayTransport.createScenario()
      scenarioId.value = summary.scenarioId
      sessionState.value = summary.sessionState
      epochId.value = summary.epochId ?? ''
      preview.value = summary.preview
    } catch (cause) {
      error.value = messageOf(cause)
    } finally {
      busy.value = false
    }
  }

  async function upload(kind: DocumentKind, file: File) {
    busy.value = true
    error.value = ''
    try {
      const report = await gatewayTransport.uploadDocument(scenarioId.value, kind, file)
      Object.assign(slots[kind], {
        state: report.valid ? 'VALID' : 'INVALID',
        fileName: file.name,
        bytes: file.size,
        slotRevision: report.slot_revision_u64,
        schemaVersion: report.schema_version,
        report,
      })
      const downstream =
        kind === 'environment'
          ? (['resource', 'task'] as const)
          : kind === 'resource'
            ? (['task'] as const)
            : []
      for (const child of downstream) Object.assign(slots[child], blank(child))
      sessionState.value = 'STAGED'
    } catch (cause) {
      error.value = messageOf(cause)
    } finally {
      busy.value = false
    }
  }

  async function confirm(kind: DocumentKind) {
    busy.value = true
    error.value = ''
    try {
      const upstream: Partial<Record<DocumentKind, number>> = {}
      if (kind !== 'environment') upstream.environment = slots.environment.slotRevision
      if (kind === 'task') upstream.resource = slots.resource.slotRevision
      preview.value = await gatewayTransport.confirmDocument(
        scenarioId.value,
        kind,
        slots[kind].slotRevision,
        upstream,
      )
      slots[kind].state = 'CONFIRMED'
    } catch (cause) {
      error.value = messageOf(cause)
    } finally {
      busy.value = false
    }
  }

  async function build(): Promise<FullState | undefined> {
    busy.value = true
    error.value = ''
    sessionState.value = 'BUILDING'
    try {
      const state = await gatewayTransport.build(scenarioId.value)
      sessionState.value = state.runtime.session_state
      epochId.value = state.runtime.epoch_id
      return state
    } catch (cause) {
      sessionState.value = 'BUILD_FAILED'
      error.value = messageOf(cause)
      return undefined
    } finally {
      busy.value = false
    }
  }

  function syncRuntime(state: SessionState, epoch: string) {
    sessionState.value = state
    epochId.value = epoch
  }
  return {
    scenarioId,
    sessionState,
    epochId,
    preview,
    slots,
    busy,
    error,
    buildEligible,
    initialize,
    upload,
    confirm,
    build,
    syncRuntime,
  }
})

function messageOf(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Unexpected gateway failure'
}
