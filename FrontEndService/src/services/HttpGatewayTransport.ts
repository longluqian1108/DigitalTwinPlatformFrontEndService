// A-06/A-07/A-08/A-10 (frontend adaptation guide): HTTP + WS transport aligned
// with the Stage-1 gateway bindings (GATEWAY_HTTP_BINDINGS, contract v1.0.0).
import {
  CONTRACT_VERSION,
  type BuildJob,
  type BuildStatusResponse,
  type CommandReceipt,
  type ConfirmRequest,
  type ControlClientHello,
  type DocumentKind,
  type DocumentUploadResult,
  type FreshRuntimeReadModelResponse,
  type GatewayError,
  type ScenarioSession,
  type SnapshotHello,
  type SnapshotClientHello,
  type Stage1ControlServerMessage,
} from '@/contracts'
import { runtimeConfig } from '@/config/runtime'
import type {
  ControlCommandInput,
  GatewayTransport,
  SnapshotHandlers,
  TransportConnection,
} from './GatewayTransport'

/** Error carrying the gateway error envelope (GATEWAY_ERROR_CATALOG shape). */
export class GatewayHttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown
  constructor(status: number, envelope: Partial<GatewayError> | undefined) {
    const entry = envelope?.error
    super(entry?.message ?? `Gateway request failed (${status})`)
    this.name = 'GatewayHttpError'
    this.status = status
    this.code = entry?.code ?? `HTTP_${status}`
    this.details = entry?.details
  }
}

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as
    | T
    | Partial<GatewayError>
    | undefined
  if (!response.ok) throw new GatewayHttpError(response.status, body as Partial<GatewayError>)
  return body as T
}

export class HttpGatewayTransport implements GatewayTransport {
  // A-08: POST /scenarios -> 201 ScenarioSession (no request body).
  async createScenario(): Promise<ScenarioSession> {
    return json<ScenarioSession>(
      await fetch(`${runtimeConfig.apiBaseUrl}/scenarios`, { method: 'POST' }),
    )
  }

  // A-08: PUT raw document JSON -> 200 DocumentUploadResult{validation_report, staged_preview}.
  async uploadDocument(
    scenarioId: string,
    kind: DocumentKind,
    file: File,
  ): Promise<DocumentUploadResult> {
    return json<DocumentUploadResult>(
      await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${scenarioId}/documents/${kind}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: file,
      }),
    )
  }

  // A-07/A-08: ConfirmRequest{slot_revision_u64, upstream_slot_revisions{environment?, resource?}} -> 200 ScenarioSession.
  async confirmDocument(
    scenarioId: string,
    kind: DocumentKind,
    body: ConfirmRequest,
  ): Promise<ScenarioSession> {
    return json<ScenarioSession>(
      await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${scenarioId}/confirm/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }

  // A-08: POST /build -> 202 BuildJob (async; completion via buildStatus polling / control WS full_state).
  async build(scenarioId: string): Promise<BuildJob> {
    return json<BuildJob>(
      await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${scenarioId}/build`, { method: 'POST' }),
    )
  }

  // A-08: GET /builds/{build_job_id} -> 200 BuildJob | BuildProgress | BuildReadyResult | BuildFailedResult.
  async buildStatus(scenarioId: string, buildJobId: string): Promise<BuildStatusResponse> {
    return json<BuildStatusResponse>(
      await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${scenarioId}/builds/${buildJobId}`),
    )
  }

  // A-07: strict CanonicalCommandRequest body {contract_version, command_id?, epoch_id, operation, args};
  // no cli_text/source (D-17). -> 202 CommandReceipt.
  async control(
    scenarioId: string,
    epochId: string,
    command: ControlCommandInput,
  ): Promise<CommandReceipt> {
    return this.postCommand(scenarioId, {
      contract_version: CONTRACT_VERSION,
      command_id: crypto.randomUUID(),
      epoch_id: epochId,
      operation: command.operation,
      args: command.args,
    })
  }

  // A-10: GET /state -> FreshRuntimeReadModelResponse (fresh or stale{WORKER_FAILED}).
  async state(scenarioId: string): Promise<FreshRuntimeReadModelResponse> {
    return json<FreshRuntimeReadModelResponse>(
      await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${scenarioId}/state`),
    )
  }

  // A-01: control WS client hello unchanged; downstream is the six-member union.
  connectControl(
    scenarioId: string,
    epochId: string,
    onMessage: (message: Stage1ControlServerMessage) => void,
    onState: (connected: boolean) => void,
  ): TransportConnection {
    const ws = new WebSocket(`${runtimeConfig.controlWsBaseUrl}/scenarios/${scenarioId}/control`)
    const hello: ControlClientHello = {
      type: 'hello',
      protocol_version: CONTRACT_VERSION,
      epoch_id: epochId,
    }
    ws.onopen = () => {
      onState(true)
      ws.send(JSON.stringify(hello))
    }
    ws.onmessage = (event) =>
      onMessage(JSON.parse(String(event.data)) as Stage1ControlServerMessage)
    ws.onclose = () => onState(false)
    ws.onerror = () => onState(false)
    return { close: () => ws.close() }
  }

  // A-06: snapshot WS first answers with a JSON SnapshotHello, then binary frames.
  connectSnapshot(
    scenarioId: string,
    epochId: string,
    handlers: SnapshotHandlers,
    onState: (connected: boolean) => void,
  ): TransportConnection {
    const ws = new WebSocket(`${runtimeConfig.snapshotWsBaseUrl}/scenarios/${scenarioId}/snapshot`)
    ws.binaryType = 'arraybuffer'
    const hello: SnapshotClientHello = {
      type: 'hello',
      protocol_version: CONTRACT_VERSION,
      epoch_id: epochId,
    }
    ws.onopen = () => {
      onState(true)
      ws.send(JSON.stringify(hello))
    }
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') handlers.onHello(JSON.parse(event.data) as SnapshotHello)
      else if (event.data instanceof ArrayBuffer) handlers.onFrame(event.data)
    }
    ws.onclose = () => onState(false)
    ws.onerror = () => onState(false)
    return { close: () => ws.close() }
  }

  private async postCommand(
    scenarioId: string,
    body: Record<string, unknown>,
  ): Promise<CommandReceipt> {
    return json<CommandReceipt>(
      await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${scenarioId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
  }
}
