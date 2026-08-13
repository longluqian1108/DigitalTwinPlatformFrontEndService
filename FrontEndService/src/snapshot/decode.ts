import type { SnapshotFrame } from '@/contracts'
import { crc32c } from './crc32c'
import { bytesToUuid } from './uuid'

const HEADER_BYTES = 72
const MAGIC = 0x5653424c
const TYPE_BYTES: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 4 }

interface Section { code: number; type: number; components: number; offset: number; bytes: number; count: number }

function sectionView<T extends Uint8Array | Uint16Array | Uint32Array | Int32Array | Float32Array>(
  buffer: ArrayBuffer,
  section: Section,
  ctor: { new(buffer: ArrayBuffer, byteOffset: number, length: number): T }
): T {
  return new ctor(buffer, section.offset, section.count * section.components)
}

export function decodeSnapshot(buffer: ArrayBuffer, knownIds?: ReadonlySet<number>): SnapshotFrame {
  if (buffer.byteLength < HEADER_BYTES) throw new Error('Snapshot header is truncated')
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== MAGIC) throw new Error('Snapshot magic mismatch')
  if (view.getUint16(4, true) !== 1) throw new Error('Unsupported snapshot major version')
  if (view.getUint16(8, true) !== HEADER_BYTES) throw new Error('Unexpected snapshot header size')
  const count = view.getUint32(56, true)
  const sectionCount = view.getUint16(60, true)
  const entryBytes = view.getUint16(62, true)
  const payloadBytes = view.getUint32(64, true)
  if (entryBytes !== 16) throw new Error('Unexpected directory entry size')
  if (HEADER_BYTES + payloadBytes !== buffer.byteLength) throw new Error('Snapshot payload length mismatch')

  const expectedCrc = view.getUint32(68, true)
  const payload = new Uint8Array(buffer, HEADER_BYTES, payloadBytes)
  if (expectedCrc !== 0 && crc32c(payload) !== expectedCrc) throw new Error('Snapshot CRC32C mismatch')

  const directoryBytes = sectionCount * entryBytes
  if (directoryBytes > payloadBytes) throw new Error('Snapshot directory is truncated')
  const sections = new Map<number, Section>()
  for (let i = 0; i < sectionCount; i += 1) {
    const base = HEADER_BYTES + i * entryBytes
    const section: Section = {
      code: view.getUint16(base, true), type: view.getUint8(base + 2), components: view.getUint8(base + 3),
      offset: view.getUint32(base + 4, true), bytes: view.getUint32(base + 8, true), count: view.getUint32(base + 12, true)
    }
    const width = TYPE_BYTES[section.type]
    if (!width || section.count !== count || section.bytes !== count * section.components * width) throw new Error(`Invalid section 0x${section.code.toString(16)}`)
    if (section.offset < HEADER_BYTES + directoryBytes || section.offset + section.bytes > buffer.byteLength) throw new Error('Section offset is outside frame')
    sections.set(section.code, section)
  }
  const requireSection = (code: number) => {
    const section = sections.get(code)
    if (!section) throw new Error(`Required section 0x${code.toString(16)} missing`)
    return section
  }
  const ids = sectionView(buffer, requireSection(0x0001), Uint32Array)
  if (knownIds) for (let index = 0; index < ids.length; index += 1) {
    if (!knownIds.has(ids[index]!)) throw new Error('Unknown aircraft integer ID; full-state resync required')
  }
  return {
    epochId: bytesToUuid(new Uint8Array(buffer, 16, 16)), sequence: view.getBigUint64(32, true),
    tickIndex: view.getBigUint64(40, true), tS: view.getFloat64(48, true), aircraftCount: count,
    aircraftIds: ids,
    taskIds: sectionView(buffer, requireSection(0x0002), Int32Array),
    positions: sectionView(buffer, requireSection(0x0003), Float32Array),
    velocities: sectionView(buffer, requireSection(0x0004), Float32Array),
    headings: sectionView(buffer, requireSection(0x0005), Float32Array),
    horizontalSpeeds: sectionView(buffer, requireSection(0x0006), Float32Array),
    verticalSpeeds: sectionView(buffer, requireSection(0x0007), Float32Array)
  }
}
