import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ControlEventEnvelope, LocalBoundaryEntry, Severity } from '@/contracts'

// A-02/A-12: the store holds wire ControlEventEnvelope entries (unwrapped from
// the `{type:'event', event:{...}}` envelope) plus local boundary markers that
// are synthesized on connection loss and never come from the network.
type EventItem = (ControlEventEnvelope & { read: boolean }) | LocalBoundaryEntry
export type { EventItem }

export const useEventStore = defineStore('events', () => {
  const items = ref<EventItem[]>([]),
    severity = ref<Severity | 'all'>('all')
  function isBoundary(event: EventItem): event is LocalBoundaryEntry {
    return (event as LocalBoundaryEntry).kind === 'boundary'
  }
  const visible = computed(() =>
    severity.value === 'all'
      ? items.value
      : items.value.filter((event) => !isBoundary(event) && event.severity === severity.value),
  )
  function add(event: ControlEventEnvelope) {
    items.value.unshift({ ...event, read: false })
    if (items.value.length > 500) items.value.length = 500
  }
  function boundary(epochId: string, message: string) {
    items.value.unshift({ kind: 'boundary', epoch_id: epochId, message, read: true })
  }
  function markRead(sequence: number) {
    const found = items.value.find((event) => !isBoundary(event) && event.sequence === sequence)
    if (found) found.read = true
  }
  return { items, severity, visible, add, boundary, markRead }
})
