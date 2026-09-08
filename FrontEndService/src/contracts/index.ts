/**
 * Frontend contract surface.
 *
 * A-00/A-09 (docs/frontend-alignment/2026-09-05-frontend-adaptation-guide.md):
 * every wire shape is imported from the vendored backend generated contracts
 * (`src/contracts/lightbluesky/`, synced by `npm run sync:contracts`, DO NOT EDIT).
 * This module re-exports the wire types the app consumes and keeps ONLY
 * frontend-internal view types (clearly separated from wire types).
 */
import type {
  CommandReceipt,
  CommandStatusView,
  ControlEventEnvelope,
  EnvironmentFrameReadModel,
  ScenarioSession,
  ValidationIssue,
  ValidationReport,
} from './lightbluesky/types/contracts'

// ---------------------------------------------------------------------------
// Wire contract re-exports (single source: backend generated contracts, v1.0.0)
// ---------------------------------------------------------------------------
export { CONTRACT_VERSION } from './lightbluesky/client/contracts-client'

export type {
  AircraftReadModel,
  BuildJob,
  BuildReadyResult,
  BuildStatusResponse,
  CommandReceipt,
  CommandStatusPayload,
  CommandStatusView,
  ConfirmRequest,
  ControlClientHello,
  ControlCommandStatus,
  ControlEvent,
  ControlEventEnvelope,
  ControlFullState,
  ControlServerHello,
  DocumentUploadResult,
  EnvironmentReadModel,
  FreshRuntimeReadModelResponse,
  GatewayError,
  ReadModelDelta,
  ResourceReadModel,
  RuntimeReadModel,
  ScenarioSession,
  SnapshotHello,
  SnapshotClientHello,
  SnapshotStaticTable,
  Stage1ControlServerMessage,
  StagedPreviewSummary,
  TaskReadModel,
  ValidationIssue,
  ValidationReport,
  WarningProjection,
} from './lightbluesky/types/contracts'

// Derived wire aliases (no local re-shapes; carved from the generated types).
export type SessionState = ScenarioSession['state']
export type DocumentKind = ValidationIssue['document_kind']
export type DocumentSlotState = ScenarioSession['document_slots']['environment']['state']
export type CoordinateMode = EnvironmentFrameReadModel['type']
export type Severity = ControlEventEnvelope['severity']
export type ActivityStatus = CommandReceipt | CommandStatusView

// ---------------------------------------------------------------------------
// Frontend-internal types (never wire shapes; local view/store concerns only)
// ---------------------------------------------------------------------------

/** Local WS connection lifecycle (not a wire concept). */
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'

/** Local per-slot upload view state; wire slot state lives in ScenarioSession. */
export interface DocumentSlot {
  kind: DocumentKind
  state: DocumentSlotState
  fileName?: string
  bytes?: number
  slotRevision: number
  schemaVersion?: string
  report?: ValidationReport
}

/** Freshness watermark the UI stores alongside read model collections (A-04). */
export interface Freshness {
  epoch_id: string
  source_generation: number
  source_tick_index: number
  source_t_s: number
}

/** A-12: local synthetic "connection boundary" marker; it never comes from the wire. */
export interface LocalBoundaryEntry {
  kind: 'boundary'
  epoch_id: string
  message: string
  read: boolean
}

/** Decoded ViewerSnapshot frame (frontend decode output, ABI-identical; A-11 kept). */
export interface SnapshotFrame {
  epochId: string
  sequence: bigint
  tickIndex: bigint
  tS: number
  aircraftCount: number
  aircraftIds: Uint32Array
  taskIds: Int32Array
  positions: Float32Array
  velocities: Float32Array
  headings: Float32Array
  horizontalSpeeds: Float32Array
  verticalSpeeds: Float32Array
  aircraftExecutionStates: Uint8Array
  flags: Uint16Array
  ownerWorkcellIds: Uint32Array
}
