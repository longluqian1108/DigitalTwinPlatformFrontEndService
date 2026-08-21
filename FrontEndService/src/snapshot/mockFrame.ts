import { crc32c } from './crc32c'
import { uuidToBytes } from './uuid'

interface MockFrameInput {
  epochId: string
  sequence: number
  tick: number
  tS: number
  count: number
}
const sections = [
  { code: 1, type: 3, components: 1, width: 4 },
  { code: 2, type: 4, components: 1, width: 4 },
  { code: 3, type: 4, components: 3, width: 4 },
  { code: 4, type: 4, components: 3, width: 4 },
  { code: 5, type: 4, components: 1, width: 4 },
  { code: 6, type: 4, components: 1, width: 4 },
  { code: 7, type: 4, components: 1, width: 4 },
]

export function createMockSnapshot({
  epochId,
  sequence,
  tick,
  tS,
  count,
}: MockFrameInput): ArrayBuffer {
  const directoryBytes = sections.length * 16
  const dataBytes = sections.reduce(
    (sum, section) => sum + count * section.components * section.width,
    0,
  )
  const buffer = new ArrayBuffer(72 + directoryBytes + dataBytes)
  const view = new DataView(buffer)
  view.setUint32(0, 0x5653424c, true)
  view.setUint16(4, 1, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, 72, true)
  view.setUint32(12, sequence, true)
  new Uint8Array(buffer, 16, 16).set(uuidToBytes(epochId))
  view.setBigUint64(32, BigInt(sequence), true)
  view.setBigUint64(40, BigInt(tick), true)
  view.setFloat64(48, tS, true)
  view.setUint32(56, count, true)
  view.setUint16(60, sections.length, true)
  view.setUint16(62, 16, true)
  view.setUint32(64, directoryBytes + dataBytes, true)
  let offset = 72 + directoryBytes
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index]!
    const base = 72 + index * 16
    const bytes = count * section.components * section.width
    view.setUint16(base, section.code, true)
    view.setUint8(base + 2, section.type)
    view.setUint8(base + 3, section.components)
    view.setUint32(base + 4, offset, true)
    view.setUint32(base + 8, bytes, true)
    view.setUint32(base + 12, count, true)
    if (section.code === 1) {
      const values = new Uint32Array(buffer, offset, count)
      for (let i = 0; i < count; i += 1) values[i] = i + 1
    } else if (section.code === 2) {
      const values = new Int32Array(buffer, offset, count)
      values.fill(-1)
      if (count) values[0] = 1
    } else {
      const values = new Float32Array(buffer, offset, count * section.components)
      for (let i = 0; i < count; i += 1) {
        const angle = tS * 0.15 + i * ((Math.PI * 2) / Math.max(count, 1))
        if (section.code === 3) {
          values[i * 3] = Math.cos(angle) * (180 + i * 5)
          values[i * 3 + 1] = Math.sin(angle) * (180 + i * 5)
          values[i * 3 + 2] = 80 + i * 8
        }
        if (section.code === 4) {
          values[i * 3] = -Math.sin(angle) * 27
          values[i * 3 + 1] = Math.cos(angle) * 27
          values[i * 3 + 2] = 0
        }
        if (section.code === 5) values[i] = angle + Math.PI / 2
        if (section.code === 6) values[i] = 27
        if (section.code === 7) values[i] = 0
      }
    }
    offset += bytes
  }
  view.setUint32(68, crc32c(new Uint8Array(buffer, 72)), true)
  return buffer
}
