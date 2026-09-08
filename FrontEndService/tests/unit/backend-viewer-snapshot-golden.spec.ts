/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { decodeSnapshot } from '@/snapshot/decode'

interface GoldenSection {
  section_code_u16: number
  values: number[]
}

interface BackendGoldenFixture {
  binary_abi: {
    epoch_id: string
    viewer_snapshot_frame: {
      bytes_hex: string
      decoded: {
        sequence_u64: number
        tick_index_u64: number
        t_s_f64: number
        aircraft_count_u32: number
        sections: GoldenSection[]
      }
    }
  }
}

const backendRoot = process.env.LIGHTBLUESKY_BACKEND_ROOT
const backendGolden = backendRoot ? describe : describe.skip

function bytesFromHex(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) throw new Error('Backend golden hex length must be even')
  const buffer = new ArrayBuffer(hex.length / 2)
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return buffer
}

backendGolden('backend ViewerSnapshot canonical golden', () => {
  it('decodes the tracked backend frame byte-for-byte with frontend production code', () => {
    const fixture = JSON.parse(readFileSync(resolve(
      backendRoot!,
      'generated/golden/stage0/committed-build-fixture.json'
    ), 'utf8')) as BackendGoldenFixture
    const golden = fixture.binary_abi.viewer_snapshot_frame
    const sections = new Map(golden.decoded.sections.map((section) => [section.section_code_u16, section.values]))

    const frame = decodeSnapshot(bytesFromHex(golden.bytes_hex), new Set([1, 2]))

    expect(golden.bytes_hex.length / 2).toBe(840)
    expect(frame.epochId).toBe(fixture.binary_abi.epoch_id)
    expect(frame.sequence).toBe(BigInt(golden.decoded.sequence_u64))
    expect(frame.tickIndex).toBe(BigInt(golden.decoded.tick_index_u64))
    expect(frame.tS).toBe(golden.decoded.t_s_f64)
    expect(frame.aircraftCount).toBe(golden.decoded.aircraft_count_u32)
    expect(Array.from(frame.aircraftIds)).toEqual(sections.get(0x0001))
    expect(Array.from(frame.taskIds)).toEqual(sections.get(0x0002))
    expect(Array.from(frame.positions)).toEqual(sections.get(0x0003))
    expect(Array.from(frame.velocities)).toEqual(sections.get(0x0004))
    expect(Array.from(frame.headings)).toEqual(sections.get(0x0005))
    expect(Array.from(frame.horizontalSpeeds)).toEqual(sections.get(0x0006))
    expect(Array.from(frame.verticalSpeeds)).toEqual(sections.get(0x0007))
    expect(Array.from(frame.aircraftExecutionStates)).toEqual(sections.get(0x0008))
    expect(Array.from(frame.flags)).toEqual(sections.get(0x000a))
    expect(Array.from(frame.ownerWorkcellIds)).toEqual(sections.get(0x000b))
  })
})
