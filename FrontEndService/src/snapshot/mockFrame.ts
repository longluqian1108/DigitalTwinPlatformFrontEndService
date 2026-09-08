import { crc32c } from './crc32c'
import { uuidToBytes } from './uuid'

interface MockFrameInput {
  epochId: string
  sequence: number
  tick: number
  tS: number
  count: number
}
interface MockSection {
  code: number
  type: number
  components: number
  width: number
  offset: number
  byteLength: number
}

const HEADER_BYTES = 72
const ENTRY_BYTES = 16
const ALIGNMENT_BYTES = 64
const sections = [
  { code: 0x0001, type: 3, components: 1, width: 4 },
  { code: 0x0002, type: 4, components: 1, width: 4 },
  { code: 0x0003, type: 5, components: 3, width: 4 },
  { code: 0x0004, type: 5, components: 3, width: 4 },
  { code: 0x0005, type: 5, components: 1, width: 4 },
  { code: 0x0006, type: 5, components: 1, width: 4 },
  { code: 0x0007, type: 5, components: 1, width: 4 },
  { code: 0x0008, type: 1, components: 1, width: 1 },
  { code: 0x000a, type: 2, components: 1, width: 2 },
  { code: 0x000b, type: 3, components: 1, width: 4 },
]

function alignUp(value: number): number {
  return Math.ceil(value / ALIGNMENT_BYTES) * ALIGNMENT_BYTES
}

export function createMockSnapshot({
  epochId,
  sequence,
  tick,
  tS,
  count,
}: MockFrameInput): ArrayBuffer {
  const directoryBytes = sections.length * ENTRY_BYTES
  let offset = alignUp(HEADER_BYTES + directoryBytes)
  const layout: MockSection[] = sections.map((section) => {
    const byteLength = count * section.components * section.width
    offset = alignUp(offset)
    const result = { ...section, offset, byteLength }
    offset += byteLength
    return result
  })
  const buffer = new ArrayBuffer(offset)
  const view = new DataView(buffer)
  view.setUint32(0, 0x5653424c, true)
  view.setUint16(4, 1, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, HEADER_BYTES, true)
  view.setUint32(12, sequence, true)
  new Uint8Array(buffer, 16, 16).set(uuidToBytes(epochId))
  view.setBigUint64(32, BigInt(sequence), true)
  view.setBigUint64(40, BigInt(tick), true)
  view.setFloat64(48, tS, true)
  view.setUint32(56, count, true)
  view.setUint16(60, layout.length, true)
  view.setUint16(62, ENTRY_BYTES, true)
  view.setUint32(64, buffer.byteLength - HEADER_BYTES, true)

  for (let index = 0; index < layout.length; index += 1) {
    const section = layout[index]!
    const base = HEADER_BYTES + index * ENTRY_BYTES
    view.setUint16(base, section.code, true)
    view.setUint8(base + 2, section.type)
    view.setUint8(base + 3, section.components)
    view.setUint32(base + 4, section.offset, true)
    view.setUint32(base + 8, count, true)
    view.setUint32(base + 12, section.byteLength, true)
    if (section.code === 0x0001) {
      const values = new Uint32Array(buffer, section.offset, count)
      for (let i = 0; i < count; i += 1) values[i] = i + 1
    } else if (section.code === 0x0002) {
      const values = new Int32Array(buffer, section.offset, count)
      values.fill(-1)
      if (count) values[0] = 1
    } else if (section.code === 0x0008) {
      const values = new Uint8Array(buffer, section.offset, count)
      for (let i = 0; i < count; i += 1) values[i] = (i % 4) + 1
    } else if (section.code === 0x000a) {
      const values = new Uint16Array(buffer, section.offset, count)
      for (let i = 0; i < count; i += 1) values[i] = i
    } else if (section.code === 0x000b) {
      const values = new Uint32Array(buffer, section.offset, count)
      for (let i = 0; i < count; i += 1) values[i] = 100 + i
    } else {
      const values = new Float32Array(buffer, section.offset, count * section.components)
      for (let i = 0; i < count; i += 1) {
        const angle = tS * 0.15 + i * ((Math.PI * 2) / Math.max(count, 1))
        if (section.code === 0x0003) {
          values[i * 3] = Math.cos(angle) * (180 + i * 5)
          values[i * 3 + 1] = Math.sin(angle) * (180 + i * 5)
          values[i * 3 + 2] = 80 + i * 8
        }
        if (section.code === 0x0004) {
          values[i * 3] = -Math.sin(angle) * 27
          values[i * 3 + 1] = Math.cos(angle) * 27
          values[i * 3 + 2] = 0
        }
        if (section.code === 0x0005) values[i] = angle + Math.PI / 2
        if (section.code === 0x0006) values[i] = 27
        if (section.code === 0x0007) values[i] = 0
      }
    }
  }
  view.setUint32(68, crc32c(new Uint8Array(buffer), 68, 4), true)
  return buffer
}
