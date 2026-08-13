/// <reference lib="webworker" />
import { decodeSnapshot } from '@/snapshot/decode'

let knownIds = new Set<number>()
self.onmessage = (event: MessageEvent<{ type: 'static'; ids: number[] } | { type: 'frame'; buffer: ArrayBuffer }>) => {
  if (event.data.type === 'static') { knownIds = new Set(event.data.ids); return }
  try {
    const frame = decodeSnapshot(event.data.buffer, knownIds)
    self.postMessage({ type: 'frame', frame }, { transfer: [event.data.buffer] })
  } catch (cause) {
    self.postMessage({ type: 'error', message: cause instanceof Error ? cause.message : 'Snapshot decode failed' })
  }
}
