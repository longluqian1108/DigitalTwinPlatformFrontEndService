import type { SnapshotFrame, SnapshotStaticEntry } from '@/contracts'
import { snapshotBuffer } from './SnapshotBuffer'

export class SnapshotPipeline {
  private readonly worker = new Worker(new URL('../workers/snapshot.worker.ts', import.meta.url), {
    type: 'module',
  })
  constructor(
    private readonly onFrame: () => void,
    private readonly onError: (message: string) => void,
  ) {
    this.worker.onmessage = (
      event: MessageEvent<
        { type: 'frame'; frame: SnapshotFrame } | { type: 'error'; message: string }
      >,
    ) => {
      if (event.data.type === 'frame') {
        snapshotBuffer.push(event.data.frame)
        this.onFrame()
      } else this.onError(event.data.message)
    }
    this.worker.onerror = () => this.onError('Snapshot Worker crashed')
  }
  setStaticTable(entries: SnapshotStaticEntry[]) {
    this.worker.postMessage({ type: 'static', ids: entries.map((entry) => entry.aircraft_int_u32) })
  }
  accept(buffer: ArrayBuffer) {
    this.worker.postMessage({ type: 'frame', buffer }, [buffer])
  }
  reset() {
    snapshotBuffer.clear()
  }
  close() {
    this.worker.terminate()
    snapshotBuffer.clear()
  }
}
