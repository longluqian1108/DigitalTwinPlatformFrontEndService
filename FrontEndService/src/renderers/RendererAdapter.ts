import type { CoordinateMode, SnapshotFrame, StagedPreviewSummary } from '@/contracts'

// A-09: preview is the generated StagedPreviewSummary (no points/routes arrays;
// collections arrive via the staged-preview collections endpoints, P-02).
export interface RendererAdapter {
  readonly mode: CoordinateMode
  setPreview(preview?: StagedPreviewSummary): void
  setFrames(previous?: SnapshotFrame, current?: SnapshotFrame): void
  focus(id: string): void
  destroy(): void
}
