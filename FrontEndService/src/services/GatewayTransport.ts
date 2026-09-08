// A-07/A-08 (frontend adaptation guide): the transport surface now mirrors the
// backend gateway bindings one-to-one (GATEWAY_HTTP_BINDINGS, contract v1.0.0).
import type {
  BuildJob,
  BuildStatusResponse,
  CommandReceipt,
  ConfirmRequest,
  DocumentKind,
  DocumentUploadResult,
  FreshRuntimeReadModelResponse,
  ScenarioSession,
  SnapshotHello,
  Stage1ControlServerMessage,
} from '@/contracts'

export type TransportConnection = { close(): void }

/** Runtime control operations the workbench UI issues (wire canonical names). */
export type RuntimeControlOperation =
  | 'start'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'reset'
  | 'set_time_scale'

/** A-07: canonical command body minus the envelope fields the transport fills in. */
export interface ControlCommandInput {
  operation: RuntimeControlOperation
  args: Record<string, unknown>
}

/** A-06: snapshot WS now delivers a JSON SnapshotHello before binary frames. */
export interface SnapshotHandlers {
  onHello(hello: SnapshotHello): void
  onFrame(buffer: ArrayBuffer): void
}

export interface GatewayTransport {
  /** POST /scenarios -> 201 ScenarioSession */
  createScenario(): Promise<ScenarioSession>
  /** PUT /scenarios/{id}/documents/{kind} (raw document body) -> 200 DocumentUploadResult */
  uploadDocument(scenarioId: string, kind: DocumentKind, file: File): Promise<DocumentUploadResult>
  /** POST /scenarios/{id}/confirm/{kind} (ConfirmRequest) -> 200 ScenarioSession */
  confirmDocument(
    scenarioId: string,
    kind: DocumentKind,
    body: ConfirmRequest,
  ): Promise<ScenarioSession>
  /** POST /scenarios/{id}/build -> 202 BuildJob (async; poll buildStatus) */
  build(scenarioId: string): Promise<BuildJob>
  /** GET /scenarios/{id}/builds/{build_job_id} -> 200 BuildStatusResponse */
  buildStatus(scenarioId: string, buildJobId: string): Promise<BuildStatusResponse>
  /** POST /scenarios/{id}/commands (CanonicalCommandRequest) -> 202 CommandReceipt */
  control(
    scenarioId: string,
    epochId: string,
    command: ControlCommandInput,
  ): Promise<CommandReceipt>
  /** GET /scenarios/{id}/state -> 200 FreshRuntimeReadModelResponse (A-10) */
  state(scenarioId: string): Promise<FreshRuntimeReadModelResponse>
  /** control WS: client hello then Stage1ControlServerMessage stream */
  connectControl(
    scenarioId: string,
    epochId: string,
    onMessage: (message: Stage1ControlServerMessage) => void,
    onState: (connected: boolean) => void,
  ): TransportConnection
  /** snapshot WS: SnapshotClientHello out; JSON SnapshotHello then binary frames in */
  connectSnapshot(
    scenarioId: string,
    epochId: string,
    handlers: SnapshotHandlers,
    onState: (connected: boolean) => void,
  ): TransportConnection
}
