import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRuntimeStore } from '@/stores/runtimeStore'

describe('runtime control matrix', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it.each([
    ['READY', ['START']], ['RUNNING', ['PAUSE', 'RATE', 'STOP']], ['PAUSED', ['RESUME', 'STOP']], ['STOPPED', ['RESET']], ['WORKER_FAILED', []]
  ] as const)('enables only allowed controls in %s', (state, allowed) => {
    const store = useRuntimeStore()
    for (const operation of ['START', 'PAUSE', 'RESUME', 'RATE', 'STOP', 'RESET']) expect(store.isAllowed(operation, state)).toBe(allowed.includes(operation as never))
  })
})
