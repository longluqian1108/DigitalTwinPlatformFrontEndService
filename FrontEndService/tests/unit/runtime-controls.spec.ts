import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useSessionStore } from '@/stores/sessionStore'

// A-07 + r17 R17-E: Stage 1 admits exactly six operations. The runtime
// control gate only ever allows start (from the READY scenario state) and
// stop (while RUNNING); pause/resume/reset/set_time_scale are mock-era
// controls and must never be submittable in any session state.
describe('runtime control matrix', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it.each([
    ['READY', ['start']],
    ['RUNNING', ['stop']],
    ['LOADING', []],
    ['EMPTY', []],
    ['STOPPED', []],
    ['WORKER_FAILED', []],
  ] as const)('enables only allowed controls in %s', (state, allowed) => {
    const store = useRuntimeStore()
    for (const operation of [
      'start',
      'pause',
      'resume',
      'set_time_scale',
      'stop',
      'reset',
    ] as const)
      expect(store.isAllowed(operation, state)).toBe(
        (allowed as readonly string[]).includes(operation),
      )
  })

  it('enables start from the READY scenario state before a runtime read model exists', () => {
    useSessionStore().sessionState = 'READY'
    expect(useRuntimeStore().isAllowed('start')).toBe(true)
  })
})
