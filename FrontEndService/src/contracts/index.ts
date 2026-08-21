export const CONTRACT_VERSION = '1.0.0' as const

export type DocumentKind = 'environment' | 'resource' | 'task'
export type DocumentSlotState = 'EMPTY' | 'VALID' | 'INVALID' | 'CONFIRMED'
export type SessionState =
  | 'EMPTY'
  | 'STAGED'
  | 'BUILDING'
  | 'BUILD_FAILED'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'WORKER_FAILED'
  | 'CLOSED'
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed'

export interface ValidationIssue {
  severity: 'error' | 'warning'
  code: string
  document_kind: DocumentKind
  json_pointer: string
  object_kind?: string
  object_id?: string
  message: string
}

export interface ValidationReport {
  valid: boolean
  slot_revision_u64: number
  preview_revision_u64: number
  schema_version: string
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

export interface DocumentSlot {
  kind: DocumentKind
  state: DocumentSlotState
  fileName?: string
  bytes?: number
  slotRevision: number
  schemaVersion?: string
  report?: ValidationReport
}

export type CoordinateMode = 'virtual_enu' | 'real_world_wgs84'

export interface PreviewPoint {
  id: string
  label: string
  x: number
  y: number
  kind: 'aircraft' | 'facility' | 'obstacle'
}
export interface PreviewRoute {
  id: string
  taskId: string
  points: Array<{ x: number; y: number }>
}
export interface StagedPreview {
  contract_version: typeof CONTRACT_VERSION
  scenario_id: string
  preview_revision_u64: number
  preview_stage: DocumentKind | 'empty' | 'complete'
  build_eligible: boolean
  coordinate_mode: CoordinateMode
  extent: [number, number, number, number]
  object_counts: Record<string, number>
  points: PreviewPoint[]
  routes: PreviewRoute[]
}

export interface Freshness {
  epoch_id: string
  generation: number
  tick_index: number
  t_s: number
}

export interface RuntimeReadModel extends Freshness {
  session_state: SessionState
  time_scale: number
  backend: 'MOCK' | 'CPU' | 'CUDA'
  snapshot_publish_hz: number
}

export interface TaskReadModel {
  task_id: string
  lifecycle: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  phase?: 'PRE_GROUND' | 'RUNNING' | 'POST_GROUND'
  aircraft_id?: string
  origin: string
  destination: string
  scheduled_takeoff_s: number
  remaining_route_count: number
  held: boolean
  delayed: boolean
  blocking_reason?: string
}

export interface AircraftReadModel {
  aircraft_id: string
  display_name: string
  model_type: string
  resource_state: 'AVAILABLE' | 'ASSIGNED' | 'EXECUTING' | 'DESTROYED'
  task_id?: string
  placed: boolean
  destroyed: boolean
}

export interface FacilityReadModel {
  resource_id: string
  kind: 'HANGAR' | 'PAD' | 'RUNWAY_END'
  availability: 'OPEN' | 'CLOSED' | 'BLOCKED'
  owner_task_ids: string[]
  occupancy_aircraft_ids: string[]
  blocking_reason?: string
}

export interface EnvironmentReadModel {
  coordinate_mode: CoordinateMode
  obstacle_count: number
  airspace_zone_count: number
  overlay_count: number
}

export interface FullState {
  runtime: RuntimeReadModel
  tasks: TaskReadModel[]
  aircraft: AircraftReadModel[]
  facilities: FacilityReadModel[]
  environment: EnvironmentReadModel
}

export type Severity = 'info' | 'warning' | 'error' | 'fatal'
export interface EventEnvelope {
  type: 'event'
  protocol_version: typeof CONTRACT_VERSION
  epoch_id: string
  event_sequence: number
  event_name: string
  severity: Severity
  tick_index: number
  t_s: number
  primary_subject: { kind: string; id: string }
  reason_code: string
  message: string
}

export interface SnapshotStaticEntry {
  aircraft_int_u32: number
  aircraft_id: string
  profile_id: string
  model_type: string
  display_name: string
}

export type CommandStatus = 'QUEUED' | 'ACCEPTED' | 'UNABLE'
export interface CommandStatusView {
  type: 'command_status'
  protocol_version: typeof CONTRACT_VERSION
  command_id: string
  epoch_id: string
  canonical_ingress_sequence: number
  status: CommandStatus
  operation: string
  final_generation?: number
  final_tick_index?: number
  final_t_s?: number
  reason_code?: string
  message?: string
  result?: Record<string, unknown>
}

export interface GatewayError {
  error: { code: string; message: string; details?: Record<string, unknown> }
}

export interface FreshResponse<T = unknown> extends Freshness {
  data: T
}
export interface CommandSubmission {
  text: string
  command_id?: string
  epoch_id: string
}
export type SubmitResult =
  | { kind: 'error'; error: GatewayError }
  | { kind: 'query'; response: FreshResponse }
  | { kind: 'command'; receipt: CommandStatusView }

export type ControlMessage =
  | {
      type: 'hello'
      protocol_version: typeof CONTRACT_VERSION
      epoch_id: string
      control_sequence: number
    }
  | {
      type: 'full_state'
      protocol_version: typeof CONTRACT_VERSION
      epoch_id: string
      control_sequence: number
      state: FullState
    }
  | {
      type: 'snapshot_static_table'
      protocol_version: typeof CONTRACT_VERSION
      epoch_id: string
      control_sequence: number
      entries: SnapshotStaticEntry[]
    }
  | EventEnvelope
  | CommandStatusView
  | {
      type: 'connection_boundary'
      protocol_version: typeof CONTRACT_VERSION
      epoch_id: string
      message: string
    }
  | {
      type: 'worker_failed'
      protocol_version: typeof CONTRACT_VERSION
      epoch_id: string
      message: string
    }

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
}
