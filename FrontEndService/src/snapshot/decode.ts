import type { SnapshotFrame } from '@/contracts'
import { crc32c } from './crc32c'
import { bytesToUuid } from './uuid'

export const SNAPSHOT_HEADER_BYTES = 72
export const SNAPSHOT_DIRECTORY_ENTRY_BYTES = 16
export const SNAPSHOT_SECTION_ALIGNMENT_BYTES = 64

const MAGIC = 0x5653424c
const PROTOCOL_MAJOR = 1
const PROTOCOL_MINOR = 0
const CRC_OFFSET = 68
const REQUIRED_CODES = [
  0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x000a, 0x000b,
] as const
const RESERVED_CODE = 0x0009

interface SectionDefinition {
  type: number
  components: number
  width: number
}

const REQUIRED: Readonly<Record<number, SectionDefinition>> = {
  0x0001: { type: 3, components: 1, width: 4 },
  0x0002: { type: 4, components: 1, width: 4 },
  0x0003: { type: 5, components: 3, width: 4 },
  0x0004: { type: 5, components: 3, width: 4 },
  0x0005: { type: 5, components: 1, width: 4 },
  0x0006: { type: 5, components: 1, width: 4 },
  0x0007: { type: 5, components: 1, width: 4 },
  0x0008: { type: 1, components: 1, width: 1 },
  0x000a: { type: 2, components: 1, width: 2 },
  0x000b: { type: 3, components: 1, width: 4 },
}

interface Section {
  code: number
  type: number
  components: number
  offset: number
  count: number
  byteLength: number
}

type SnapshotArray = Uint8Array | Uint16Array | Uint32Array | Int32Array | Float32Array

function sectionView<T extends SnapshotArray>(
  buffer: ArrayBuffer,
  section: Section,
  ctor: { new (buffer: ArrayBuffer, byteOffset: number, length: number): T },
): T {
  return new ctor(buffer, section.offset, section.count * section.components)
}

function assertZero(bytes: Uint8Array, start: number, end: number): void {
  for (let index = start; index < end; index += 1) {
    if (bytes[index] !== 0) throw new Error('Snapshot alignment padding must be zero')
  }
}

export function decodeSnapshot(buffer: ArrayBuffer, knownIds?: ReadonlySet<number>): SnapshotFrame {
  if (buffer.byteLength < SNAPSHOT_HEADER_BYTES) throw new Error('Snapshot header is truncated')
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== MAGIC) throw new Error('Snapshot magic mismatch')
  if (view.getUint16(4, true) !== PROTOCOL_MAJOR)
    throw new Error('Unsupported snapshot major version')
  if (view.getUint16(6, true) !== PROTOCOL_MINOR)
    throw new Error('Unsupported snapshot minor version')
  if (view.getUint16(8, true) !== SNAPSHOT_HEADER_BYTES)
    throw new Error('Unexpected snapshot header size')

  const epochBytes = new Uint8Array(buffer, 16, 16)
  if (epochBytes.every((byte) => byte === 0))
    throw new Error('Snapshot epoch UUID must not be all zero')

  const aircraftCount = view.getUint32(56, true)
  const sectionCount = view.getUint16(60, true)
  const entryBytes = view.getUint16(62, true)
  const payloadBytes = view.getUint32(64, true)
  if (entryBytes !== SNAPSHOT_DIRECTORY_ENTRY_BYTES)
    throw new Error('Unexpected directory entry size')
  if (sectionCount !== REQUIRED_CODES.length)
    throw new Error('Snapshot section count is not the v1 required set')
  if (SNAPSHOT_HEADER_BYTES + payloadBytes !== buffer.byteLength)
    throw new Error('Snapshot payload length mismatch')

  const directoryEnd = SNAPSHOT_HEADER_BYTES + sectionCount * entryBytes
  if (directoryEnd > buffer.byteLength) throw new Error('Snapshot directory is truncated')

  const bytes = new Uint8Array(buffer)
  const sections = new Map<number, Section>()
  const intervals: Array<[number, number]> = []
  let previousCode = 0
  for (let index = 0; index < sectionCount; index += 1) {
    const base = SNAPSHOT_HEADER_BYTES + index * entryBytes
    const section: Section = {
      code: view.getUint16(base, true),
      type: view.getUint8(base + 2),
      components: view.getUint8(base + 3),
      offset: view.getUint32(base + 4, true),
      count: view.getUint32(base + 8, true),
      byteLength: view.getUint32(base + 12, true),
    }
    if (section.code <= previousCode)
      throw new Error('Snapshot section codes must be strictly increasing and unique')
    previousCode = section.code
    if (section.code === RESERVED_CODE)
      throw new Error('Snapshot reserved section code is forbidden')
    const expected = REQUIRED[section.code]
    if (!expected) throw new Error('Snapshot unknown section code')
    if (section.type !== expected.type || section.components !== expected.components)
      throw new Error(`Invalid snapshot section 0x${section.code.toString(16)}`)
    if (section.count !== aircraftCount) throw new Error('Snapshot aircraft count mismatch')
    if (section.byteLength !== section.count * section.components * expected.width)
      throw new Error(`Invalid snapshot section 0x${section.code.toString(16)}`)
    if (section.offset % SNAPSHOT_SECTION_ALIGNMENT_BYTES !== 0)
      throw new Error('Snapshot section offset is not 64-byte aligned')
    if (section.offset < directoryEnd)
      throw new Error('Snapshot section overlaps the header or directory')
    if (section.offset + section.byteLength > buffer.byteLength)
      throw new Error('Snapshot section is outside the frame')
    if (section.byteLength > 0) {
      for (const [start, end] of intervals) {
        if (section.offset < end && start < section.offset + section.byteLength)
          throw new Error('Snapshot section intervals overlap')
      }
      intervals.push([section.offset, section.offset + section.byteLength])
    }
    sections.set(section.code, section)
  }

  for (const code of REQUIRED_CODES)
    if (!sections.has(code))
      throw new Error(`Required snapshot section 0x${code.toString(16)} missing`)

  intervals.sort(([left], [right]) => left - right)
  let cursor = directoryEnd
  for (const [start, end] of intervals) {
    assertZero(bytes, cursor, start)
    cursor = end
  }
  assertZero(bytes, cursor, buffer.byteLength)

  const expectedCrc = view.getUint32(CRC_OFFSET, true)
  if (crc32c(bytes, CRC_OFFSET, 4) !== expectedCrc) throw new Error('Snapshot CRC32C mismatch')

  const requireSection = (code: number) => {
    const section = sections.get(code)
    if (!section) throw new Error(`Required snapshot section 0x${code.toString(16)} missing`)
    return section
  }
  const ids = sectionView(buffer, requireSection(0x0001), Uint32Array)
  for (let index = 1; index < ids.length; index += 1) {
    if (ids[index]! <= ids[index - 1]!)
      throw new Error('Snapshot aircraft integer IDs must be strictly increasing')
  }
  if (knownIds)
    for (let index = 0; index < ids.length; index += 1) {
      if (!knownIds.has(ids[index]!))
        throw new Error('Unknown aircraft integer ID; full-state resync required')
    }

  return {
    epochId: bytesToUuid(epochBytes),
    sequence: view.getBigUint64(32, true),
    tickIndex: view.getBigUint64(40, true),
    tS: view.getFloat64(48, true),
    aircraftCount,
    aircraftIds: ids,
    taskIds: sectionView(buffer, requireSection(0x0002), Int32Array),
    positions: sectionView(buffer, requireSection(0x0003), Float32Array),
    velocities: sectionView(buffer, requireSection(0x0004), Float32Array),
    headings: sectionView(buffer, requireSection(0x0005), Float32Array),
    horizontalSpeeds: sectionView(buffer, requireSection(0x0006), Float32Array),
    verticalSpeeds: sectionView(buffer, requireSection(0x0007), Float32Array),
    aircraftExecutionStates: sectionView(buffer, requireSection(0x0008), Uint8Array),
    flags: sectionView(buffer, requireSection(0x000a), Uint16Array),
    ownerWorkcellIds: sectionView(buffer, requireSection(0x000b), Uint32Array),
  }
}
