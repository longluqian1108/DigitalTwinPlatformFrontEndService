import { CONTRACT_VERSION, type CommandStatusView, type ControlMessage, type DocumentKind, type DocumentSlot, type FullState, type SessionState, type StagedPreview, type SubmitResult, type ValidationIssue, type ValidationReport } from '@/contracts'
import type { GatewayTransport, ScenarioSummary, TransportConnection } from '@/services/GatewayTransport'
import { createMockSnapshot } from '@/snapshot/mockFrame'
import { runtimeConfig } from '@/config/runtime'

const EPOCH_ONE = '0198a2c2-0000-7000-8000-000000000001'
const EPOCH_TWO = '0198a2c2-0000-7000-8000-000000000002'
const kinds: DocumentKind[] = ['environment', 'resource', 'task']

interface MockScenario {
  id: string
  state: SessionState
  epochId: string
  previewRevision: number
  slots: Record<DocumentKind, DocumentSlot>
  fullState?: FullState
  controlSequence: number
  ingressSequence: number
  eventSequence: number
  tick: number
  controlListeners: Set<(message: ControlMessage) => void>
  snapshotListeners: Set<(frame: ArrayBuffer) => void>
  timer?: number
}

function emptySlot(kind: DocumentKind): DocumentSlot { return { kind, state: 'EMPTY', slotRevision: 0 } }
function issue(kind: DocumentKind, code: string, message: string, severity: 'error' | 'warning'): ValidationIssue {
  return { severity, code, document_kind: kind, json_pointer: '/', message }
}

function preview(scenario: MockScenario): StagedPreview {
  const confirmed = kinds.filter((kind) => scenario.slots[kind].state === 'CONFIRMED')
  return {
    contract_version: CONTRACT_VERSION, scenario_id: scenario.id, preview_revision_u64: scenario.previewRevision,
    preview_stage: confirmed.length === 3 ? 'complete' : confirmed.at(-1) ?? 'empty', build_eligible: confirmed.length === 3,
    coordinate_mode: 'virtual_enu', extent: [-500, -350, 500, 350],
    object_counts: { aircraft: confirmed.includes('resource') ? 6 : 0, facilities: confirmed.includes('environment') ? 5 : 0, tasks: confirmed.includes('task') ? 3 : 0 },
    points: confirmed.includes('environment') ? [
      { id: 'PAD-A', label: 'North pad', x: -310, y: -110, kind: 'facility' },
      { id: 'RWY-09', label: 'Runway 09', x: 220, y: 115, kind: 'facility' },
      { id: 'OBS-1', label: 'Tower', x: 45, y: -30, kind: 'obstacle' }
    ] : [],
    routes: confirmed.includes('task') ? [{ id: 'ROUTE-1', taskId: 'TASK-001', points: [{ x: -310, y: -110 }, { x: -80, y: 160 }, { x: 220, y: 115 }] }] : []
  }
}

function makeFullState(scenario: MockScenario): FullState {
  return {
    runtime: { epoch_id: scenario.epochId, generation: 0, tick_index: 0, t_s: 0, session_state: 'READY', time_scale: 1, backend: 'MOCK', snapshot_publish_hz: 10 },
    tasks: [
      { task_id: 'TASK-001', lifecycle: 'PLANNED', aircraft_id: 'AC-101', origin: 'PAD-A', destination: 'RWY-09', scheduled_takeoff_s: 15, remaining_route_count: 3, held: false, delayed: false },
      { task_id: 'TASK-002', lifecycle: 'PLANNED', aircraft_id: 'AC-102', origin: 'HGR-01', destination: 'PAD-B', scheduled_takeoff_s: 45, remaining_route_count: 2, held: true, delayed: true, blocking_reason: 'RESOURCE_OCCUPIED' },
      { task_id: 'TASK-003', lifecycle: 'COMPLETED', aircraft_id: 'AC-103', origin: 'PAD-C', destination: 'RWY-27', scheduled_takeoff_s: 0, remaining_route_count: 0, held: false, delayed: false }
    ],
    aircraft: Array.from({ length: 6 }, (_, index) => ({ aircraft_id: `AC-${101 + index}`, display_name: `Aircraft ${101 + index}`, model_type: index % 2 ? 'multirotor' : 'fixed_wing', resource_state: index < 2 ? 'ASSIGNED' : 'AVAILABLE', task_id: index < 2 ? `TASK-00${index + 1}` : undefined, placed: true, destroyed: false })),
    facilities: [
      { resource_id: 'HGR-01', kind: 'HANGAR', availability: 'OPEN', owner_task_ids: ['TASK-002'], occupancy_aircraft_ids: ['AC-102'] },
      { resource_id: 'PAD-A', kind: 'PAD', availability: 'OPEN', owner_task_ids: ['TASK-001'], occupancy_aircraft_ids: ['AC-101'] },
      { resource_id: 'PAD-B', kind: 'PAD', availability: 'BLOCKED', owner_task_ids: [], occupancy_aircraft_ids: [], blocking_reason: 'INSPECTION' },
      { resource_id: 'RWY-09', kind: 'RUNWAY_END', availability: 'OPEN', owner_task_ids: [], occupancy_aircraft_ids: [] }
    ],
    environment: { coordinate_mode: 'virtual_enu', obstacle_count: 1, airspace_zone_count: 2, overlay_count: 0 }
  }
}

export class MockGatewayTransport implements GatewayTransport {
  private scenario?: MockScenario
  private readonly aircraftCount = runtimeConfig.mockAircraftCount

  private get(id: string): MockScenario {
    if (!this.scenario || this.scenario.id !== id) throw new Error('Mock scenario not found')
    return this.scenario
  }

  async createScenario(): Promise<ScenarioSummary> {
    if (!this.scenario) this.scenario = {
      id: 'demo-scenario', state: 'EMPTY', epochId: EPOCH_ONE, previewRevision: 0,
      slots: { environment: emptySlot('environment'), resource: emptySlot('resource'), task: emptySlot('task') },
      controlSequence: 0, ingressSequence: 0, eventSequence: 0, tick: 0,
      controlListeners: new Set(), snapshotListeners: new Set()
    }
    return { scenarioId: this.scenario.id, sessionState: this.scenario.state, epochId: this.scenario.epochId, preview: preview(this.scenario) }
  }

  async uploadDocument(scenarioId: string, kind: DocumentKind, file: File): Promise<ValidationReport> {
    const scenario = this.get(scenarioId)
    const slot = scenario.slots[kind]
    slot.slotRevision += 1; scenario.previewRevision += 1
    const errors: ValidationIssue[] = [], warnings: ValidationIssue[] = []
    let body: Record<string, unknown> = {}
    try { body = JSON.parse(await file.text()) as Record<string, unknown> } catch { errors.push(issue(kind, 'JSON_INVALID', 'The document is not valid JSON.', 'error')) }
    if (body.document_kind !== kind) errors.push(issue(kind, 'DOCUMENT_KIND_MISMATCH', `Expected document_kind "${kind}".`, 'error'))
    if (body.schema_version !== '1.0.0') errors.push(issue(kind, 'SCHEMA_VERSION', 'schema_version must be 1.0.0.', 'error'))
    if (body.warning === true) warnings.push(issue(kind, 'DEMO_WARNING', 'This fixture contains a demonstrative warning.', 'warning'))
    slot.fileName = file.name; slot.bytes = file.size; slot.schemaVersion = typeof body.schema_version === 'string' ? body.schema_version : undefined
    slot.state = errors.length ? 'INVALID' : 'VALID'
    const report = { valid: !errors.length, slot_revision_u64: slot.slotRevision, preview_revision_u64: scenario.previewRevision, schema_version: slot.schemaVersion ?? 'unknown', errors, warnings }
    slot.report = report
    const downstream = kind === 'environment' ? ['resource', 'task'] as const : kind === 'resource' ? ['task'] as const : []
    for (const child of downstream) scenario.slots[child] = emptySlot(child)
    scenario.state = 'STAGED'
    return structuredClone(report)
  }

  async confirmDocument(scenarioId: string, kind: DocumentKind, revision: number, upstream: Partial<Record<DocumentKind, number>>): Promise<StagedPreview> {
    const scenario = this.get(scenarioId), slot = scenario.slots[kind]
    if (slot.slotRevision !== revision) throw new Error('REVISION_MISMATCH')
    if (slot.state !== 'VALID') throw new Error('DOCUMENT_NOT_VALID')
    if (kind !== 'environment' && upstream.environment !== scenario.slots.environment.slotRevision) throw new Error('REVISION_MISMATCH')
    if (kind === 'task' && upstream.resource !== scenario.slots.resource.slotRevision) throw new Error('REVISION_MISMATCH')
    slot.state = 'CONFIRMED'; scenario.previewRevision += 1
    return structuredClone(preview(scenario))
  }

  async build(scenarioId: string): Promise<FullState> {
    const scenario = this.get(scenarioId)
    if (!kinds.every((kind) => scenario.slots[kind].state === 'CONFIRMED')) throw new Error('BUILD_NOT_ELIGIBLE')
    scenario.state = 'BUILDING'
    await new Promise((resolve) => window.setTimeout(resolve, 650))
    scenario.state = 'READY'; scenario.fullState = makeFullState(scenario)
    return structuredClone(scenario.fullState)
  }

  async control(scenarioId: string, _epochId: string, operation: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET' | 'RATE', args: Record<string, unknown> = {}): Promise<SubmitResult> {
    const scenario = this.get(scenarioId)
    return this.admit(scenario, operation, () => {
      if (operation === 'START' && scenario.state === 'READY') scenario.state = 'RUNNING'
      else if (operation === 'PAUSE' && scenario.state === 'RUNNING') scenario.state = 'PAUSED'
      else if (operation === 'RESUME' && scenario.state === 'PAUSED') scenario.state = 'RUNNING'
      else if (operation === 'STOP' && ['RUNNING', 'PAUSED'].includes(scenario.state)) scenario.state = 'STOPPED'
      else if (operation === 'RESET' && scenario.state === 'STOPPED') { scenario.state = 'READY'; scenario.epochId = scenario.epochId === EPOCH_ONE ? EPOCH_TWO : EPOCH_ONE; scenario.tick = 0 }
      else if (operation === 'RATE' && scenario.state === 'RUNNING' && Number(args.scale) > 0) { /* valid */ }
      else return 'INVALID_SESSION_STATE'
      if (!scenario.fullState) scenario.fullState = makeFullState(scenario)
      scenario.fullState.runtime.session_state = scenario.state
      scenario.fullState.runtime.epoch_id = scenario.epochId
      if (operation === 'RATE') scenario.fullState.runtime.time_scale = Number(args.scale)
      this.publishFullState(scenario)
      this.syncTicker(scenario)
      return undefined
    })
  }

  async submit(scenarioId: string, text: string, _epochId: string): Promise<SubmitResult> {
    const scenario = this.get(scenarioId), trimmed = text.trim()
    if (!trimmed) return { kind: 'error', error: { error: { code: 'CLI_EMPTY', message: 'Enter a command or query.' } } }
    const operation = trimmed.split(/\s+/)[0]!.toUpperCase()
    if (['TIME', 'POS', 'HELP', 'LIST_TASKS', 'LIST_WARNINGS'].includes(operation)) {
      const runtime = scenario.fullState?.runtime
      return { kind: 'query', response: { epoch_id: scenario.epochId, generation: runtime?.generation ?? 0, tick_index: scenario.tick, t_s: runtime?.t_s ?? 0, data: operation === 'LIST_TASKS' ? scenario.fullState?.tasks ?? [] : { operation, value: operation === 'TIME' ? runtime?.t_s ?? 0 : 'Mock query result' } } }
    }
    if (operation === 'BOGUS') return { kind: 'error', error: { error: { code: 'UNKNOWN_OPERATION', message: 'Unknown operation BOGUS.' } } }
    return this.admit(scenario, operation, () => trimmed.includes('UNABLE') ? 'RESOURCE_OCCUPIED' : undefined)
  }

  connectControl(scenarioId: string, onMessage: (message: ControlMessage) => void, onState: (connected: boolean) => void): TransportConnection {
    const scenario = this.get(scenarioId); scenario.controlListeners.add(onMessage); onState(true)
    queueMicrotask(() => {
      onMessage({ type: 'hello', protocol_version: CONTRACT_VERSION, epoch_id: scenario.epochId, control_sequence: ++scenario.controlSequence })
      if (scenario.fullState) onMessage({ type: 'full_state', protocol_version: CONTRACT_VERSION, epoch_id: scenario.epochId, control_sequence: ++scenario.controlSequence, state: structuredClone(scenario.fullState) })
      onMessage({ type: 'snapshot_static_table', protocol_version: CONTRACT_VERSION, epoch_id: scenario.epochId, control_sequence: ++scenario.controlSequence, entries: Array.from({ length: this.aircraftCount }, (_, index) => ({ aircraft_int_u32: index + 1, aircraft_id: `AC-${101 + index}`, profile_id: index % 2 ? 'MR-A' : 'FW-A', model_type: index % 2 ? 'multirotor' : 'fixed_wing', display_name: `Aircraft ${101 + index}` })) })
    })
    return { close: () => { scenario.controlListeners.delete(onMessage); onState(false) } }
  }

  connectSnapshot(scenarioId: string, onFrame: (buffer: ArrayBuffer) => void, onState: (connected: boolean) => void): TransportConnection {
    const scenario = this.get(scenarioId); scenario.snapshotListeners.add(onFrame); onState(true); this.syncTicker(scenario)
    return { close: () => { scenario.snapshotListeners.delete(onFrame); onState(false); this.syncTicker(scenario) } }
  }

  private async admit(scenario: MockScenario, operation: string, apply: () => string | undefined): Promise<SubmitResult> {
    const commandId = crypto.randomUUID(), ingress = ++scenario.ingressSequence
    const queued: CommandStatusView = { type: 'command_status', protocol_version: CONTRACT_VERSION, command_id: commandId, epoch_id: scenario.epochId, canonical_ingress_sequence: ingress, status: 'QUEUED', operation }
    this.emit(scenario, queued)
    window.setTimeout(() => {
      const reason = apply()
      const final: CommandStatusView = { ...queued, status: reason ? 'UNABLE' : 'ACCEPTED', final_generation: scenario.fullState?.runtime.generation ?? 0, final_tick_index: scenario.tick, final_t_s: scenario.fullState?.runtime.t_s ?? 0, reason_code: reason ?? 'NONE', message: reason ? `Command cannot be applied: ${reason}.` : `${operation} was committed.`, result: {} }
      this.emit(scenario, final)
      this.emitEvent(scenario, final)
    }, 260)
    return { kind: 'command', receipt: queued }
  }

  private emit(scenario: MockScenario, message: ControlMessage) { for (const listener of scenario.controlListeners) listener(structuredClone(message)) }
  private publishFullState(scenario: MockScenario) { if (scenario.fullState) this.emit(scenario, { type: 'full_state', protocol_version: CONTRACT_VERSION, epoch_id: scenario.epochId, control_sequence: ++scenario.controlSequence, state: structuredClone(scenario.fullState) }) }
  private emitEvent(scenario: MockScenario, command: CommandStatusView) {
    this.emit(scenario, { type: 'event', protocol_version: CONTRACT_VERSION, epoch_id: scenario.epochId, event_sequence: ++scenario.eventSequence, event_name: 'COMMAND_FINAL', severity: command.status === 'UNABLE' ? 'warning' : 'info', tick_index: scenario.tick, t_s: scenario.fullState?.runtime.t_s ?? 0, primary_subject: { kind: 'command', id: command.command_id }, reason_code: command.reason_code ?? 'NONE', message: command.message ?? '' })
  }
  private syncTicker(scenario: MockScenario) {
    if (scenario.state === 'RUNNING' && scenario.snapshotListeners.size && scenario.timer === undefined) scenario.timer = window.setInterval(() => {
      scenario.tick += 1
      if (scenario.fullState) { scenario.fullState.runtime.tick_index = scenario.tick; scenario.fullState.runtime.generation += 1; scenario.fullState.runtime.t_s = Number((scenario.fullState.runtime.t_s + 0.1 * scenario.fullState.runtime.time_scale).toFixed(3)) }
      const tS = scenario.fullState?.runtime.t_s ?? 0
      for (const listener of scenario.snapshotListeners) listener(createMockSnapshot({ epochId: scenario.epochId, sequence: scenario.tick, tick: scenario.tick, tS, count: this.aircraftCount }))
      if (scenario.tick % 10 === 0) this.publishFullState(scenario)
    }, 100)
    if ((scenario.state !== 'RUNNING' || !scenario.snapshotListeners.size) && scenario.timer !== undefined) { window.clearInterval(scenario.timer); scenario.timer = undefined }
  }
}
