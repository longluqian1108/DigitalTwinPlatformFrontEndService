import { describe, expect, it } from 'vitest'
import { decodeSnapshot } from '@/snapshot/decode'
import { createMockSnapshot } from '@/snapshot/mockFrame'

describe('20k aircraft snapshot baseline', () => {
  it('keeps decode p95 within the browser worker target on this host', () => {
    const epochId = '0198a2c2-0000-7000-8000-000000000001',
      count = 20_000
    const known = new Set(Array.from({ length: count }, (_, index) => index + 1)),
      times: number[] = []
    for (let warmup = 0; warmup < 3; warmup += 1)
      decodeSnapshot(
        createMockSnapshot({
          epochId,
          sequence: warmup + 1,
          tick: warmup + 1,
          tS: warmup / 10,
          count,
        }),
        known,
      )
    for (let sample = 0; sample < 30; sample += 1) {
      const buffer = createMockSnapshot({
        epochId,
        sequence: sample + 1,
        tick: sample + 1,
        tS: sample / 10,
        count,
      })
      const started = performance.now()
      decodeSnapshot(buffer, known)
      times.push(performance.now() - started)
    }
    times.sort((a, b) => a - b)
    const p95 = times[Math.ceil(times.length * 0.95) - 1]!
    console.info(`20k snapshot decode p95: ${p95.toFixed(2)} ms`)
    expect(p95).toBeLessThan(8)
  })
})
