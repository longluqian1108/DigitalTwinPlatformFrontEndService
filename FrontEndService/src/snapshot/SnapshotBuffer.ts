import type { SnapshotFrame } from '@/contracts'

export class SnapshotBuffer extends EventTarget {
  previous?: SnapshotFrame
  current?: SnapshotFrame
  push(frame: SnapshotFrame) {
    if (this.current && (frame.epochId !== this.current.epochId || frame.sequence <= this.current.sequence)) this.clear()
    this.previous = this.current; this.current = frame; this.dispatchEvent(new Event('frame'))
  }
  clear() { this.previous = undefined; this.current = undefined; this.dispatchEvent(new Event('frame')) }
}

export const snapshotBuffer = new SnapshotBuffer()
