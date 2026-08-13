import { describe, expect, it } from 'vitest'
import { createMockSnapshot } from '@/snapshot/mockFrame'
import { decodeSnapshot } from '@/snapshot/decode'

const epochId = '0198a2c2-0000-7000-8000-000000000001'
describe('ViewerSnapshot v1 decoder', () => {
  it('returns zero-object TypedArray views for the required hot sections', () => {
    const frame = decodeSnapshot(createMockSnapshot({ epochId, sequence: 4, tick: 3, tS: 0.3, count: 6 }), new Set([1, 2, 3, 4, 5, 6]))
    expect(frame.epochId).toBe(epochId)
    expect(frame.sequence).toBe(4n)
    expect(frame.aircraftIds).toBeInstanceOf(Uint32Array)
    expect(frame.positions).toBeInstanceOf(Float32Array)
    expect(frame.positions).toHaveLength(18)
  })

  it('rejects CRC corruption and unknown static IDs', () => {
    const corrupted = createMockSnapshot({ epochId, sequence: 1, tick: 1, tS: 0.1, count: 1 })
    const bytes = new Uint8Array(corrupted), last = corrupted.byteLength - 1
    bytes[last] = (bytes[last] ?? 0) ^ 0xff
    expect(() => decodeSnapshot(corrupted)).toThrow('CRC32C')
    expect(() => decodeSnapshot(createMockSnapshot({ epochId, sequence: 1, tick: 1, tS: 0.1, count: 2 }), new Set([1]))).toThrow('Unknown aircraft')
  })
})
