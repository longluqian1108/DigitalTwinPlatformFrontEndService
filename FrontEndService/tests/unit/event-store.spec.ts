import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ControlEventEnvelope } from '@/contracts'
import { useEventStore, type EventItem } from '@/stores/eventStore'

// A-02/A-12: wire envelope unwrap, severity filter incl. critical, sequence-keyed
// markRead, and the local-only boundary marker.
function envelope(sequence: number, severity: ControlEventEnvelope['severity']): ControlEventEnvelope {
  return {
    event_id: `evt-${sequence}`, epoch_id: 'e-1', sequence, tick_index: sequence, t_s: sequence * 0.1,
    event_name: 'task_started', severity, contract_version: '1.0.0', reason_code: 'NONE', payload: {}
  }
}
function isEnvelope(event: EventItem): event is ControlEventEnvelope & { read: boolean } { return !('kind' in event) }

describe('event store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('unwraps wire envelopes and keys markRead by event sequence', () => {
    const store = useEventStore()
    store.add(envelope(1, 'info'))
    store.add(envelope(2, 'info'))
    expect(store.items.find(isEnvelope)?.sequence).toBe(2)
    store.markRead(2)
    const envelopes = store.items.filter(isEnvelope)
    expect(envelopes.find((event) => event.sequence === 2)?.read).toBe(true)
    expect(envelopes.find((event) => event.sequence === 1)?.read).toBe(false)
  })

  it('keeps critical events visible through the severity filter', () => {
    const store = useEventStore()
    store.add(envelope(1, 'info'))
    store.add(envelope(2, 'critical'))
    store.severity = 'critical'
    expect(store.visible).toHaveLength(1)
    expect(store.visible[0]).toMatchObject({ severity: 'critical', sequence: 2 })
  })

  it('stores the connection boundary as a local marker, not a wire envelope', () => {
    const store = useEventStore()
    store.boundary('e-1', 'Control connection lost.')
    const entry = store.items[0]!
    expect(entry).toMatchObject({ kind: 'boundary', epoch_id: 'e-1', read: true })
    expect('event_id' in entry).toBe(false)
  })
})
