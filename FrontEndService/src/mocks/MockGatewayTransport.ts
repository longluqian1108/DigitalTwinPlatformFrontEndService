// A-12: every downstream mock message is constructed directly from the vendored
// generated contract types (Stage1ControlServerMessage family), so mock and real
// backend are shape-identical.
import type {
  AircraftReadModel,
  BuildJob,
  BuildReadyResult,
  BuildStatusResponse,
  CommandReceipt,
  CommandStatusView,
  ControlCommandStatus,
  ControlEventEnvelope,
  ControlFullState,
  DocumentKind,
  DocumentSlotState,
  DocumentUploadResult,
  EnvironmentReadModel,
  FreshRuntimeReadModelResponse,
  ReadModelDelta,
  ResourceReadModel,
  ScenarioSession,
  SessionState,
  SnapshotHello,
  Stage1ControlServerMessage,
  StagedPreviewSummary,
  TaskReadModel,
  ValidationIssue,
  ValidationReport,
} from '@/contracts'
import type {
  ControlCommandInput,
  GatewayTransport,
  SnapshotHandlers,
  TransportConnection,
} from '@/services/GatewayTransport'
import { createMockSnapshot } from '@/snapshot/mockFrame'
import { runtimeConfig } from '@/config/runtime'

const EPOCH_ONE = '0198a2c2-0000-7000-8000-000000000001'
const EPOCH_TWO = '0198a2c2-0000-7000-8000-000000000002'
const SCENARIO_ID = '0198a2c2-0000-7000-8000-00000000ffff'
const kinds: DocumentKind[] = ['environment', 'resource', 'task']

interface MockScenario {
  id: string
  state: SessionState
  epochId: string
  previewRevision: number
  slotRevisions: Record<DocumentKind, number>
  slotStates: Record<DocumentKind, DocumentSlotState>
  buildJobId?: string
  builtAt?: number
  controlSequence: number
  ingressSequence: number
  eventSequence: number
  generation: number
  tick: number
  timeScale: number
  controlListeners: Set<(message: Stage1ControlServerMessage) => void>
  snapshotListeners: Set<(frame: ArrayBuffer) => void>
  timer?: number
}

function issue(
  kind: DocumentKind,
  revision: number,
  code: ValidationIssue['code'],
  message: string,
  severity: ValidationIssue['severity'],
): ValidationIssue {
  return {
    severity,
    code,
    message,
    document_kind: kind,
    slot_revision_u64: revision,
    json_pointer: '/',
    related_ids: [],
  }
}

function aircraftCatalog(count: number): AircraftReadModel[] {
  return Array.from({ length: count }, (_, index) => ({
    aircraft_id: `AC-${101 + index}`,
    profile_id: index % 2 ? 'MR-A' : 'FW-A',
    model_type: index % 2 ? 'multirotor' : 'fixed_wing',
    resource_state: index < 2 ? 'ASSIGNED' : 'AVAILABLE',
    capabilities: index % 2 ? ['hover'] : ['wing', 'runway'],
    registered: true,
    active: index < 2,
    placed: true,
    destroyed: false,
    current_task_id: index < 2 ? `TASK-00${index + 1}` : undefined,
  }))
}

function resourceCatalog(): ResourceReadModel[] {
  return [
    {
      resource_id: 'HGR-01',
      facility_id: 'F-HGR-01',
      resource_kind: 'HANGAR',
      label: 'Hangar 01',
      availability: 'OPEN',
      capacity: 2,
      owner_task_ids: ['TASK-002'],
      occupying_aircraft_ids: ['AC-102'],
      current_reservations: [],
      warning_count: 0,
    },
    {
      resource_id: 'PAD-A',
      facility_id: 'F-PAD-A',
      resource_kind: 'PAD',
      label: 'North pad',
      availability: 'OPEN',
      capacity: 1,
      owner_task_ids: ['TASK-001'],
      occupying_aircraft_ids: ['AC-101'],
      current_reservations: [],
      warning_count: 0,
    },
    {
      resource_id: 'PAD-B',
      facility_id: 'F-PAD-B',
      resource_kind: 'PAD',
      label: 'South pad',
      availability: 'BLOCKED',
      capacity: 1,
      owner_task_ids: [],
      occupying_aircraft_ids: [],
      current_reservations: [],
      warning_count: 1,
    },
    {
      resource_id: 'RWY-09',
      facility_id: 'F-RWY-09',
      resource_kind: 'RUNWAY_END',
      label: 'Runway 09',
      availability: 'OPEN',
      capacity: 1,
      owner_task_ids: [],
      occupying_aircraft_ids: [],
      current_reservations: [],
      warning_count: 0,
    },
  ]
}

function taskCatalog(): TaskReadModel[] {
  const flight = (origin: string, destination: string, scheduled: number, remaining: number) => ({
    origin_resource_id: origin,
    destination_resource_id: destination,
    schedule: { scheduled_takeoff_s: scheduled, planned_arrival_anchor_s: scheduled + 120 },
    route_progress: {
      completed_occurrences: 0,
      total_occurrences: remaining,
      remaining_route_count: remaining,
      occurrences: [],
      tombstoned_occurrence_refs: [],
    },
    constraints: [],
  })
  return [
    {
      task_id: 'TASK-001',
      aircraft_id: 'AC-101',
      lifecycle: 'PLANNED',
      phase: 'PRE_GROUND',
      held: false,
      delayed: false,
      flight: flight('PAD-A', 'RWY-09', 15, 3),
      ground_tasks: { mode: 'auto', segments: [], associated_resource_ids: ['PAD-A'] },
    },
    {
      task_id: 'TASK-002',
      aircraft_id: 'AC-102',
      lifecycle: 'PLANNED',
      phase: 'PRE_GROUND',
      held: true,
      delayed: true,
      blocking_reason: 'RESOURCE_OCCUPIED',
      flight: flight('HGR-01', 'PAD-B', 45, 2),
      ground_tasks: { mode: 'auto', segments: [], associated_resource_ids: ['HGR-01'] },
    },
    {
      task_id: 'TASK-003',
      aircraft_id: 'AC-103',
      lifecycle: 'COMPLETED',
      held: false,
      delayed: false,
      completion_t_s: 96.5,
      flight: flight('PAD-C', 'RWY-27', 0, 0),
      ground_tasks: { mode: 'none', segments: [], associated_resource_ids: [] },
    },
  ]
}

function environmentModel(): EnvironmentReadModel {
  return {
    frame: {
      type: 'virtual_enu',
      workspace_frame_id: 'WS-MOCK',
      workcell_count: 1,
      origin: [0, 0, 0],
      bounds: {
        type: 'enu_box',
        min_e_m: -500,
        max_e_m: 500,
        min_n_m: -350,
        max_n_m: 350,
        min_u_m: 0,
        max_u_m: 120,
      },
    },
    map: { map_id: 'MAP-MOCK', dataset_status: 'NONE', terrain_status: 'NONE', building_count: 1 },
    static_obstacle_count: 1,
    static_airspace_zone_count: 2,
    runtime_volumes: [],
    airspace_exemptions: [],
    active_environment_warnings: [],
  }
}

function previewSummary(scenario: MockScenario): StagedPreviewSummary {
  const confirmed = kinds.filter((kind) => scenario.slotStates[kind] === 'CONFIRMED')
  return {
    contract_version: '1.0.0',
    scenario_id: scenario.id,
    preview_revision_u64: scenario.previewRevision,
    session_state: scenario.state,
    preview_stage: confirmed.length === 3 ? 'complete' : (confirmed.at(-1) ?? 'empty'),
    build_eligible: confirmed.length === 3,
    slot_revisions: {
      environment: scenario.slotRevisions.environment,
      resource: scenario.slotRevisions.resource,
      task: scenario.slotRevisions.task,
    },
    confirmations: {
      environment: scenario.slotStates.environment === 'CONFIRMED',
      resource: scenario.slotStates.resource === 'CONFIRMED',
      task: scenario.slotStates.task === 'CONFIRMED',
    },
    coordinate_summary: {
      type: 'virtual_enu',
      vertical_datum: 'virtual_u',
      origin_enu_m: [0, 0, 0],
    },
    extent: {
      type: 'enu_box',
      min_e_m: -500,
      max_e_m: 500,
      min_n_m: -350,
      max_n_m: 350,
      min_u_m: 0,
      max_u_m: 120,
    },
    layer_availability: {
      facilities: confirmed.includes('environment'),
      resources: confirmed.includes('resource'),
      obstacles: confirmed.includes('environment'),
      airspace_zones: confirmed.includes('environment'),
      airspace_exemptions: false,
      aircraft_catalog: confirmed.includes('resource'),
      tasks: confirmed.includes('task'),
      routes: confirmed.includes('task'),
      constraints: false,
      reservations: false,
    },
    object_counts: {
      facilities: confirmed.includes('environment') ? 4 : 0,
      resources: confirmed.includes('resource') ? (scenario.slotRevisions.resource > 0 ? 6 : 0) : 0,
      obstacles: confirmed.includes('environment') ? 1 : 0,
      airspace_zones: confirmed.includes('environment') ? 2 : 0,
      airspace_exemptions: 0,
      aircraft_catalog: confirmed.includes('resource') ? 6 : 0,
      tasks: confirmed.includes('task') ? 3 : 0,
      routes: confirmed.includes('task') ? 1 : 0,
      constraints: 0,
      reservations: confirmed.includes('task') ? 2 : 0,
    },
    issue_summary: { error: 0, warning: 0, info: 0 },
    links: {
      self: '/staged-preview',
      issues: '/staged-preview/issues',
      collections: {
        facilities: '/staged-preview/collections/facilities',
        resources: '/staged-preview/collections/resources',
        obstacles: '/staged-preview/collections/obstacles',
        airspace_zones: '/staged-preview/collections/airspace_zones',
        airspace_exemptions: '/staged-preview/collections/airspace_exemptions',
        aircraft_catalog: '/staged-preview/collections/aircraft_catalog',
        tasks: '/staged-preview/collections/tasks',
        routes: '/staged-preview/collections/routes',
        constraints: '/staged-preview/collections/constraints',
        reservations: '/staged-preview/collections/reservations',
      },
    },
  }
}

function runtimeModel(scenario: MockScenario) {
  return {
    scenario_id: scenario.id,
    epoch_id: scenario.epochId,
    session_state: scenario.state,
    tick_index: scenario.tick,
    t_s: scenario.tick * 0.1,
    dt_s: 0.1,
    time_scale: scenario.timeScale,
    resume_time_scale: 1,
    backend_requested: 'auto' as const,
    backend_active: 'cpu' as const,
    worker_status: 'HEALTHY',
    committed_generation: scenario.generation,
    aircraft_total: 6,
    aircraft_active: 2,
    aircraft_placed: 6,
    aircraft_destroyed: 0,
    task_counts_by_lifecycle: {
      PLANNED: 2,
      RUNNING: 0,
      COMPLETED: 1,
      CANCELLED: 0,
      INTERRUPTED: 0,
    },
    task_counts_by_phase: { PRE_GROUND: 2, TAKEOFF: 0, NAV: 0, LANDING: 0, POST_GROUND: 0 },
    warning_count: 1,
    critical_count: 0,
    canonical_snapshot_sequence: scenario.tick,
    live_published_snapshot_sequence: scenario.tick,
    snapshot_lag_s: 0,
  }
}

function fullState(scenario: MockScenario): ControlFullState {
  return {
    type: 'full_state',
    protocol_version: '1.0.0',
    epoch_id: scenario.epochId,
    source_generation: scenario.generation,
    source_tick_index: scenario.tick,
    source_t_s: scenario.tick * 0.1,
    runtime: runtimeModel(scenario),
    all_or_paged_task_summary: { mode: 'all', items: taskCatalog() },
    all_or_paged_resource_summary: { mode: 'all', items: resourceCatalog() },
    environment: environmentModel(),
    warning_projection: [],
    command_activity_watermark: 0,
  }
}

function aircraftDelta(scenario: MockScenario): ReadModelDelta {
  return {
    type: 'read_model_delta',
    epoch_id: scenario.epochId,
    source_generation: scenario.generation,
    source_tick_index: scenario.tick,
    source_t_s: scenario.tick * 0.1,
    task_upserts: [],
    task_removals: [],
    aircraft_upserts: aircraftDeltaOnce ? [] : aircraftCatalog(runtimeConfig.mockAircraftCount),
    resource_upserts: [],
  }
}
let aircraftDeltaOnce = false

export class MockGatewayTransport implements GatewayTransport {
  private scenario?: MockScenario
  private readonly aircraftCount = runtimeConfig.mockAircraftCount

  private get(id: string): MockScenario {
    if (!this.scenario || this.scenario.id !== id) throw new Error('Mock scenario not found')
    return this.scenario
  }

  private ensure(): MockScenario {
    if (!this.scenario)
      this.scenario = {
        id: SCENARIO_ID,
        state: 'EMPTY',
        epochId: EPOCH_ONE,
        previewRevision: 0,
        slotRevisions: { environment: 0, resource: 0, task: 0 },
        slotStates: { environment: 'EMPTY', resource: 'EMPTY', task: 'EMPTY' },
        controlSequence: 0,
        ingressSequence: 0,
        eventSequence: 0,
        generation: 0,
        tick: 0,
        timeScale: 1,
        controlListeners: new Set(),
        snapshotListeners: new Set(),
      }
    return this.scenario
  }

  async createScenario(): Promise<ScenarioSession> {
    const scenario = this.ensure()
    return this.sessionView(scenario)
  }

  private sessionView(scenario: MockScenario): ScenarioSession {
    const slot = (revision: number, state: DocumentSlotState) => ({
      state,
      slot_revision_u64: revision,
    })
    return {
      scenario_id: scenario.id,
      state: scenario.state,
      document_slots: {
        environment: slot(scenario.slotRevisions.environment, scenario.slotStates.environment),
        resource: slot(scenario.slotRevisions.resource, scenario.slotStates.resource),
        task: slot(scenario.slotRevisions.task, scenario.slotStates.task),
      },
      preview_revision_u64: scenario.previewRevision,
      epoch_id: null,
    }
  }

  async uploadDocument(
    scenarioId: string,
    kind: DocumentKind,
    file: File,
  ): Promise<DocumentUploadResult> {
    const scenario = this.get(scenarioId)
    scenario.slotRevisions[kind] += 1
    scenario.previewRevision += 1
    const revision = scenario.slotRevisions[kind]
    const errors: ValidationIssue[] = [],
      warnings: ValidationIssue[] = []
    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(await file.text()) as Record<string, unknown>
    } catch {
      errors.push(issue(kind, revision, 'INVALID_JSON', 'The document is not valid JSON.', 'error'))
    }
    if (body.schema_version !== undefined && body.schema_version !== '1.0.0')
      errors.push(
        issue(
          kind,
          revision,
          'SCHEMA_VERSION_UNSUPPORTED',
          'schema_version must be 1.0.0.',
          'error',
        ),
      )
    if (body.warning === true)
      warnings.push(
        issue(kind, revision, 'NONE', 'This fixture contains a demonstrative warning.', 'warning'),
      )
    scenario.slotStates[kind] = errors.length ? 'INVALID' : 'VALID'
    const downstream =
      kind === 'environment'
        ? (['resource', 'task'] as const)
        : kind === 'resource'
          ? (['task'] as const)
          : []
    for (const child of downstream) {
      scenario.slotRevisions[child] = 0
      scenario.slotStates[child] = 'EMPTY'
    }
    if (scenario.state === 'EMPTY') scenario.state = 'LOADING'
    const report: ValidationReport = {
      valid: !errors.length,
      slot_revision_u64: revision,
      preview_revision_u64: scenario.previewRevision,
      schema_version: '1.0.0',
      errors,
      warnings,
      infos: [],
    }
    return { validation_report: structuredClone(report), staged_preview: previewSummary(scenario) }
  }

  async confirmDocument(
    scenarioId: string,
    kind: DocumentKind,
    body: {
      slot_revision_u64: number
      upstream_slot_revisions: { environment?: number; resource?: number }
    },
  ): Promise<ScenarioSession> {
    const scenario = this.get(scenarioId)
    if (scenario.slotRevisions[kind] !== body.slot_revision_u64)
      throw Object.assign(
        new Error('The supplied revision binding does not match the current document revisions.'),
        { code: 'REVISION_MISMATCH' },
      )
    if (scenario.slotStates[kind] !== 'VALID')
      throw Object.assign(
        new Error('The current document revision is not valid and cannot be confirmed.'),
        { code: 'DOCUMENT_NOT_VALID' },
      )
    if (
      kind !== 'environment' &&
      body.upstream_slot_revisions.environment !== scenario.slotRevisions.environment
    )
      throw Object.assign(
        new Error('The supplied revision binding does not match the current document revisions.'),
        { code: 'REVISION_MISMATCH' },
      )
    if (
      kind === 'task' &&
      body.upstream_slot_revisions.resource !== scenario.slotRevisions.resource
    )
      throw Object.assign(
        new Error('The supplied revision binding does not match the current document revisions.'),
        { code: 'REVISION_MISMATCH' },
      )
    scenario.slotStates[kind] = 'CONFIRMED'
    scenario.previewRevision += 1
    return this.sessionView(scenario)
  }

  // A-08: build is async — 202 BuildJob, then poll to READY.
  async build(scenarioId: string): Promise<BuildJob> {
    const scenario = this.get(scenarioId)
    if (!kinds.every((kind) => scenario.slotStates[kind] === 'CONFIRMED'))
      throw Object.assign(
        new Error('All three current document revisions must be confirmed before Build.'),
        { code: 'DOCUMENTS_NOT_CONFIRMED' },
      )
    scenario.state = 'BUILDING'
    scenario.buildJobId = crypto.randomUUID()
    scenario.builtAt = Date.now() + 650
    const job: BuildJob = {
      build_job_id: scenario.buildJobId,
      scenario_id: scenario.id,
      state: 'QUEUED',
      input_slot_revisions: {
        environment: scenario.slotRevisions.environment,
        resource: scenario.slotRevisions.resource,
        task: scenario.slotRevisions.task,
      },
    }
    return structuredClone(job)
  }

  async buildStatus(scenarioId: string, buildJobId: string): Promise<BuildStatusResponse> {
    const scenario = this.get(scenarioId)
    if (!scenario.buildJobId || scenario.buildJobId !== buildJobId)
      throw Object.assign(new Error('The requested object was not found.'), {
        code: 'ID_NOT_FOUND',
      })
    if (Date.now() < (scenario.builtAt ?? 0))
      return {
        build_job_id: buildJobId,
        scenario_id: scenario.id,
        state: 'QUEUED',
        input_slot_revisions: {
          environment: scenario.slotRevisions.environment,
          resource: scenario.slotRevisions.resource,
          task: scenario.slotRevisions.task,
        },
      }
    scenario.state = 'READY'
    const ready: BuildReadyResult = {
      state: 'READY',
      scenario_id: scenario.id,
      epoch_id: scenario.epochId,
      backend_requested: 'auto',
      backend_active: 'cpu',
      issues: [],
    }
    return structuredClone(ready)
  }

  async control(
    scenarioId: string,
    _epochId: string,
    command: ControlCommandInput,
  ): Promise<CommandReceipt> {
    const scenario = this.get(scenarioId)
    const commandId = crypto.randomUUID(),
      ingress = ++scenario.ingressSequence
    const receipt: CommandReceipt = {
      command_id: commandId,
      epoch_id: scenario.epochId,
      canonical_ingress_sequence: ingress,
      status: 'QUEUED',
      operation: command.operation as CommandReceipt['operation'],
    }
    this.emit(scenario, {
      type: 'command_status',
      status: structuredClone(receipt),
      control_sequence: ++scenario.controlSequence,
    })
    window.setTimeout(() => {
      const reason = this.apply(scenario, command)
      const final = {
        command_id: commandId,
        epoch_id: scenario.epochId,
        canonical_ingress_sequence: ingress,
        status: reason ? ('UNABLE' as const) : ('ACCEPTED' as const),
        operation: command.operation as CommandStatusView['operation'],
        final_generation: scenario.generation,
        final_tick_index: scenario.tick,
        final_t_s: scenario.tick * 0.1,
        reason_code: reason ?? 'NONE',
        message: reason
          ? `Command cannot be applied: ${reason}.`
          : `${command.operation} was committed.`,
        result: {},
      } as CommandStatusView
      const view: ControlCommandStatus = {
        type: 'command_status',
        status: final,
        control_sequence: ++scenario.controlSequence,
      }
      this.emit(scenario, view)
      this.emitEvent(scenario, final)
    }, 260)
    return structuredClone(receipt)
  }

  async state(scenarioId: string): Promise<FreshRuntimeReadModelResponse> {
    const scenario = this.get(scenarioId)
    return {
      epoch_id: scenario.epochId,
      source_generation: scenario.generation,
      source_tick_index: scenario.tick,
      source_t_s: scenario.tick * 0.1,
      data: runtimeModel(scenario),
    }
  }

  private apply(
    scenario: MockScenario,
    command: ControlCommandInput,
  ): CommandStatusView['reason_code'] | undefined {
    const operation = command.operation
    if (operation === 'start' && scenario.state === 'READY') scenario.state = 'RUNNING'
    else if (operation === 'pause' && scenario.state === 'RUNNING') scenario.state = 'PAUSED'
    else if (operation === 'resume' && scenario.state === 'PAUSED') scenario.state = 'RUNNING'
    else if (operation === 'stop' && ['RUNNING', 'PAUSED'].includes(scenario.state))
      scenario.state = 'STOPPED'
    else if (operation === 'reset' && scenario.state === 'STOPPED') {
      scenario.state = 'READY'
      scenario.epochId = scenario.epochId === EPOCH_ONE ? EPOCH_TWO : EPOCH_ONE
      scenario.tick = 0
      scenario.generation = 0
    } else if (
      operation === 'set_time_scale' &&
      scenario.state === 'RUNNING' &&
      Number((command.args as { scale?: number }).scale) > 0
    ) {
      scenario.timeScale = Number((command.args as { scale: number }).scale)
    } else return 'INVALID_SESSION_STATE'
    this.publishFullState(scenario)
    this.syncTicker(scenario)
    return undefined
  }

  connectControl(
    scenarioId: string,
    _epochId: string,
    onMessage: (message: Stage1ControlServerMessage) => void,
    onState: (connected: boolean) => void,
  ): TransportConnection {
    const scenario = this.get(scenarioId)
    scenario.controlListeners.add(onMessage)
    onState(true)
    queueMicrotask(() => {
      onMessage({
        type: 'hello',
        protocol_version: '1.0.0',
        epoch_id: scenario.epochId,
        session_state: scenario.state,
        current_control_sequence: ++scenario.controlSequence,
        source_generation: scenario.generation,
        history_available: false,
      })
      this.publishFullState(scenario)
      onMessage({
        type: 'snapshot_static_table',
        protocol_version: '1.0.0',
        epoch_id: scenario.epochId,
        contract_version: '1.0.0',
        entries: Array.from({ length: this.aircraftCount }, (_, index) => ({
          aircraft_int: index + 1,
          aircraft_id: `AC-${101 + index}`,
          profile_id: index % 2 ? 'MR-A' : 'FW-A',
          model_type: (index % 2 ? 'multirotor' : 'fixed_wing') as 'multirotor' | 'fixed_wing',
          display_name: `Aircraft ${101 + index}`,
        })),
      })
      // A-05: one aircraft delta so the palette/board path is exercised in mock too.
      if (!aircraftDeltaOnce) {
        aircraftDeltaOnce = true
        onMessage(aircraftDelta(scenario))
      }
    })
    return {
      close: () => {
        scenario.controlListeners.delete(onMessage)
        onState(false)
      },
    }
  }

  connectSnapshot(
    scenarioId: string,
    _epochId: string,
    handlers: SnapshotHandlers,
    onState: (connected: boolean) => void,
  ): TransportConnection {
    const scenario = this.get(scenarioId)
    scenario.snapshotListeners.add(handlers.onFrame)
    onState(true)
    this.syncTicker(scenario)
    const hello: SnapshotHello = {
      type: 'snapshot_hello',
      protocol_version: '1.0.0',
      epoch_id: scenario.epochId,
      viewer_snapshot_contract_version: '1.0.0',
      workspace_origin_ecef_f64: [0, 0, 0],
      workspace_enu_to_ecef_rotation_f64: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      latest_sequence: scenario.tick,
    }
    queueMicrotask(() => handlers.onHello(hello))
    return {
      close: () => {
        scenario.snapshotListeners.delete(handlers.onFrame)
        onState(false)
        this.syncTicker(scenario)
      },
    }
  }

  private emit(scenario: MockScenario, message: Stage1ControlServerMessage) {
    for (const listener of scenario.controlListeners) listener(structuredClone(message))
  }

  private publishFullState(scenario: MockScenario) {
    scenario.generation += 1
    this.emit(scenario, fullState(scenario))
  }

  private emitEvent(scenario: MockScenario, command: CommandStatusView) {
    const envelope: ControlEventEnvelope = {
      event_id: crypto.randomUUID(),
      epoch_id: scenario.epochId,
      sequence: ++scenario.eventSequence,
      tick_index: scenario.tick,
      t_s: scenario.tick * 0.1,
      event_name: command.status === 'UNABLE' ? 'command_unable' : 'command_accepted',
      severity: command.status === 'UNABLE' ? 'warning' : 'info',
      contract_version: '1.0.0',
      command_id: command.command_id,
      reason_code: command.reason_code,
      payload: {
        operation: command.operation,
        status: command.status,
        canonical_ingress_sequence: command.canonical_ingress_sequence,
        final_generation: command.final_generation,
        final_tick_index: command.final_tick_index,
      },
    }
    this.emit(scenario, { type: 'event', event: envelope })
  }

  private syncTicker(scenario: MockScenario) {
    if (
      scenario.state === 'RUNNING' &&
      scenario.snapshotListeners.size &&
      scenario.timer === undefined
    )
      scenario.timer = window.setInterval(() => {
        scenario.tick += 1
        const tS = scenario.tick * 0.1
        for (const listener of scenario.snapshotListeners)
          listener(
            createMockSnapshot({
              epochId: scenario.epochId,
              sequence: scenario.tick,
              tick: scenario.tick,
              tS,
              count: this.aircraftCount,
            }),
          )
        if (scenario.tick % 10 === 0) this.publishFullState(scenario)
      }, 100)
    if (
      (scenario.state !== 'RUNNING' || !scenario.snapshotListeners.size) &&
      scenario.timer !== undefined
    ) {
      window.clearInterval(scenario.timer)
      scenario.timer = undefined
    }
  }
}
