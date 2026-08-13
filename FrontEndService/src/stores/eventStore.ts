import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { EventEnvelope, Severity } from '@/contracts'

export const useEventStore = defineStore('events', () => {
  const items = ref<Array<EventEnvelope & { read: boolean; boundary?: boolean }>>([]), severity = ref<Severity | 'all'>('all')
  const visible = computed(() => severity.value === 'all' ? items.value : items.value.filter((event) => event.severity === severity.value))
  function add(event: EventEnvelope) { items.value.unshift({ ...event, read: false }); if (items.value.length > 500) items.value.length = 500 }
  function boundary(epochId: string, message: string) { items.value.unshift({ type: 'event', protocol_version: '1.0.0', epoch_id: epochId, event_sequence: -Date.now(), event_name: 'CONNECTION_BOUNDARY', severity: 'warning', tick_index: 0, t_s: 0, primary_subject: { kind: 'connection', id: 'control' }, reason_code: 'EVENT_HISTORY_UNAVAILABLE', message, read: true, boundary: true }) }
  function markRead(sequence: number) { const found = items.value.find((event) => event.event_sequence === sequence); if (found) found.read = true }
  return { items, severity, visible, add, boundary, markRead }
})
