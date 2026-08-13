import type { CoordinateMode, SnapshotFrame, StagedPreview } from '@/contracts'

export interface RendererAdapter {
  readonly mode: CoordinateMode
  setPreview(preview?: StagedPreview): void
  setFrames(previous?: SnapshotFrame, current?: SnapshotFrame): void
  focus(id: string): void
  destroy(): void
}
