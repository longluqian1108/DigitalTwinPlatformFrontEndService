import { describe, expect, it } from 'vitest'
import { createMockSnapshot } from '@/snapshot/mockFrame'
import { decodeSnapshot } from '@/snapshot/decode'

const epochId = '0198a2c2-0000-7000-8000-000000000001'
const HEADER_BYTES = 72
const ENTRY_BYTES = 16
const DIRECTORY_END = HEADER_BYTES + 10 * ENTRY_BYTES
const entryOffset = (index: number) => HEADER_BYTES + index * ENTRY_BYTES

function malformedFrame(mutator: (view: DataView, bytes: Uint8Array) => void): ArrayBuffer {
  const buffer = createMockSnapshot({ epochId, sequence: 4, tick: 3, tS: 0.3, count: 2 })
  mutator(new DataView(buffer), new Uint8Array(buffer))
  return buffer
}

describe('ViewerSnapshot v1 decoder', () => {
  it('decodes the canonical ten-section frame into hot arrays and typed views', () => {
    const buffer = createMockSnapshot({ epochId, sequence: 4, tick: 3, tS: 0.3, count: 6 })
    const view = new DataView(buffer)
    const expected = [
      [0x0001, 3, 1, 4],
      [0x0002, 4, 1, 4],
      [0x0003, 5, 3, 12],
      [0x0004, 5, 3, 12],
      [0x0005, 5, 1, 4],
      [0x0006, 5, 1, 4],
      [0x0007, 5, 1, 4],
      [0x0008, 1, 1, 1],
      [0x000a, 2, 1, 2],
      [0x000b, 3, 1, 4],
    ] as const
    expect(view.getUint32(0, true)).toBe(0x5653424c)
    expect(view.getUint16(4, true)).toBe(1)
    expect(view.getUint16(6, true)).toBe(0)
    expect(view.getUint16(8, true)).toBe(HEADER_BYTES)
    expect(view.getUint16(60, true)).toBe(expected.length)
    expect(view.getUint16(62, true)).toBe(ENTRY_BYTES)
    expected.forEach(([code, type, components, byteLength], index) => {
      const base = entryOffset(index)
      expect(view.getUint16(base, true)).toBe(code)
      expect(view.getUint8(base + 2)).toBe(type)
      expect(view.getUint8(base + 3)).toBe(components)
      expect(view.getUint32(base + 4, true) % 64).toBe(0)
      expect(view.getUint32(base + 8, true)).toBe(6)
      expect(view.getUint32(base + 12, true)).toBe(6 * byteLength)
    })

    const frame = decodeSnapshot(buffer, new Set([1, 2, 3, 4, 5, 6]))
    expect(frame.epochId).toBe(epochId)
    expect(frame.sequence).toBe(4n)
    expect(frame.aircraftIds).toBeInstanceOf(Uint32Array)
    expect(frame.taskIds).toBeInstanceOf(Int32Array)
    expect(frame.positions).toBeInstanceOf(Float32Array)
    expect(frame.positions).toHaveLength(18)
    expect(frame.aircraftExecutionStates).toBeInstanceOf(Uint8Array)
    expect(frame.flags).toBeInstanceOf(Uint16Array)
    expect(frame.ownerWorkcellIds).toBeInstanceOf(Uint32Array)
    expect(Array.from(frame.aircraftExecutionStates)).toEqual([1, 2, 3, 4, 1, 2])
    expect(Array.from(frame.flags)).toEqual([0, 1, 2, 3, 4, 5])
    expect(Array.from(frame.ownerWorkcellIds)).toEqual([100, 101, 102, 103, 104, 105])
  })

  it('rejects CRC corruption and unknown static IDs', () => {
    const corrupted = createMockSnapshot({ epochId, sequence: 1, tick: 1, tS: 0.1, count: 1 })
    const bytes = new Uint8Array(corrupted)
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 0xff
    expect(() => decodeSnapshot(corrupted)).toThrow('CRC32C')
    expect(() =>
      decodeSnapshot(
        createMockSnapshot({ epochId, sequence: 1, tick: 1, tS: 0.1, count: 2 }),
        new Set([1]),
      ),
    ).toThrow('Unknown aircraft')
  })

  it('rejects missing, reserved, and unknown section codes', () => {
    expect(() => decodeSnapshot(malformedFrame((view) => view.setUint16(60, 9, true)))).toThrow()
    expect(() =>
      decodeSnapshot(malformedFrame((view) => view.setUint16(entryOffset(8), 0x0009, true))),
    ).toThrow()
    expect(() =>
      decodeSnapshot(malformedFrame((view) => view.setUint16(entryOffset(9), 0x000c, true))),
    ).toThrow()
  })

  it('rejects wrong type, components, order, count, and byte length', () => {
    expect(() =>
      decodeSnapshot(malformedFrame((view) => view.setUint8(entryOffset(7) + 2, 5))),
    ).toThrow()
    expect(() =>
      decodeSnapshot(malformedFrame((view) => view.setUint8(entryOffset(2) + 3, 2))),
    ).toThrow()
    expect(() =>
      decodeSnapshot(malformedFrame((view) => view.setUint16(entryOffset(1), 0x0003, true))),
    ).toThrow()
    expect(() => decodeSnapshot(malformedFrame((view) => view.setUint32(56, 1, true)))).toThrow()
    expect(() =>
      decodeSnapshot(malformedFrame((view) => view.setUint32(entryOffset(0) + 12, 12, true))),
    ).toThrow()
  })

  it('rejects misaligned, overlapping, and non-zero padding intervals', () => {
    expect(() =>
      decodeSnapshot(
        malformedFrame((view) => {
          const base = entryOffset(0)
          view.setUint32(base + 4, view.getUint32(base + 4, true) + 1, true)
        }),
      ),
    ).toThrow()
    expect(() =>
      decodeSnapshot(
        malformedFrame((view) => {
          view.setUint32(entryOffset(1) + 4, view.getUint32(entryOffset(0) + 4, true), true)
        }),
      ),
    ).toThrow()
    expect(() =>
      decodeSnapshot(
        malformedFrame((_view, bytes) => {
          bytes[DIRECTORY_END] = 1
        }),
      ),
    ).toThrow()
  })
})
