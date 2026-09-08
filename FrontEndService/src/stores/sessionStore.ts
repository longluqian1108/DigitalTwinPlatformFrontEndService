import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  BuildStatusResponse,
  ConfirmRequest,
  DocumentKind,
  DocumentSlot,
  ScenarioSession,
  SessionState,
  StagedPreviewSummary,
} from '@/contracts'
import { gatewayTransport } from '@/services/transport'

const order: DocumentKind[] = ['environment', 'resource', 'task']
const blank = (kind: DocumentKind): DocumentSlot => ({ kind, state: 'EMPTY', slotRevision: 0 })

const BUILD_POLL_INTERVAL_MS = 500
const BUILD_POLL_TIMEOUT_MS = 120_000

// R17 rev-4 frontend-private map display data. Pads, waypoints and task
// routes are extracted only from documents the backend has judged valid and
// are never a second wire contract; the snapshot extent stays authoritative
// for the fallback view box.
export interface MapPadDisplay {
  facilityId: string
  padId: string
  label: string
  e: number
  n: number
  radiusM: number
}
export interface MapWaypointDisplay {
  waypointId: string
  e: number
  n: number
}
export interface MapRoutePointDisplay {
  kind: 'pad' | 'waypoint'
  id: string
  e: number
  n: number
}
export interface MapRouteDisplay {
  taskId: string
  points: MapRoutePointDisplay[]
}
export interface MapDisplayState {
  pads: MapPadDisplay[]
  waypoints: MapWaypointDisplay[]
  routes: MapRouteDisplay[]
}

const blankMapDisplay = (): MapDisplayState => ({ pads: [], waypoints: [], routes: [] })

function numberOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function parseResourcePads(document: unknown): MapPadDisplay[] {
  const facilities = (document as { facilities?: unknown })?.facilities
  if (!Array.isArray(facilities)) return []
  const pads: MapPadDisplay[] = []
  for (const facility of facilities) {
    const facilityId = String((facility as { facility_id?: unknown })?.facility_id ?? '')
    const facilityPads = (facility as { pads?: unknown })?.pads
    if (!Array.isArray(facilityPads)) continue
    for (const pad of facilityPads) {
      const center = (pad as { center_enu_m?: unknown })?.center_enu_m
      if (!Array.isArray(center)) continue
      const touchdown = (pad as { touchdown_area?: { radius_m?: unknown } })?.touchdown_area
      pads.push({
        facilityId,
        padId: String((pad as { pad_id?: unknown })?.pad_id ?? ''),
        label: String((pad as { label?: unknown })?.label ?? ''),
        e: numberOf(center[0]),
        n: numberOf(center[1]),
        radiusM: numberOf(touchdown?.radius_m),
      })
    }
  }
  return pads
}

export function parseTaskGeometry(
  document: unknown,
  pads: MapPadDisplay[],
): { waypoints: MapWaypointDisplay[]; routes: MapRouteDisplay[] } {
  const waypoints: MapWaypointDisplay[] = []
  const rawWaypoints = (document as { waypoints?: unknown })?.waypoints
  if (Array.isArray(rawWaypoints)) {
    for (const waypoint of rawWaypoints) {
      const position = (waypoint as { position_enu_m?: unknown })?.position_enu_m
      if (!Array.isArray(position)) continue
      waypoints.push({
        waypointId: String((waypoint as { waypoint_id?: unknown })?.waypoint_id ?? ''),
        e: numberOf(position[0]),
        n: numberOf(position[1]),
      })
    }
  }
  const waypointById = new Map(waypoints.map((waypoint) => [waypoint.waypointId, waypoint]))
  const padById = new Map(pads.map((pad) => [pad.padId, pad]))
  const resolve = (
    point: { kind: 'pad' | 'waypoint'; id: string; e: number; n: number } | undefined,
  ) => point
  const routes: MapRouteDisplay[] = []
  const rawTasks = (document as { tasks?: unknown })?.tasks
  if (!Array.isArray(rawTasks)) return { waypoints, routes }
  for (const task of rawTasks) {
    const taskId = String((task as { task_id?: unknown })?.task_id ?? '')
    const flight = (task as { flight?: unknown })?.flight as
      | {
          origin?: { type?: unknown; pad_id?: unknown }
          destination?: { type?: unknown; pad_id?: unknown }
          route?: unknown
        }
      | undefined
    if (!flight) continue
    const points: MapRoutePointDisplay[] = []
    const padPoint = (
      reference: { type?: unknown; pad_id?: unknown } | undefined,
      kind: 'pad' | 'waypoint',
    ) => {
      const pad = padById.get(String(reference?.pad_id ?? ''))
      return pad ? resolve({ kind, id: pad.padId, e: pad.e, n: pad.n }) : undefined
    }
    const origin = padPoint(flight.origin, 'pad')
    if (origin) points.push(origin)
    if (Array.isArray(flight.route)) {
      for (const waypointId of flight.route) {
        const waypoint = waypointById.get(String(waypointId))
        if (waypoint)
          points.push({ kind: 'waypoint', id: waypoint.waypointId, e: waypoint.e, n: waypoint.n })
      }
    }
    const destination = padPoint(flight.destination, 'pad')
    if (destination) points.push(destination)
    if (points.length >= 2) routes.push({ taskId, points })
  }
  return { waypoints, routes }
}

export function applyMapUploadGeometry(
  state: MapDisplayState,
  kind: DocumentKind,
  valid: boolean,
  documentText: string,
): void {
  if (kind === 'environment') {
    const cleared = blankMapDisplay()
    state.pads = cleared.pads
    state.waypoints = cleared.waypoints
    state.routes = cleared.routes
    return
  }
  if (kind === 'resource') {
    const cleared = blankMapDisplay()
    state.waypoints = cleared.waypoints
    state.routes = cleared.routes
    state.pads = valid ? parseResourcePads(JSON.parse(documentText)) : []
    return
  }
  state.waypoints = []
  state.routes = []
  if (!valid) return
  const parsed = parseTaskGeometry(JSON.parse(documentText), state.pads)
  state.waypoints = parsed.waypoints
  state.routes = parsed.routes
}

// R17 rev-4: aircraft labels resolve aircraft_int through the received
// snapshot_static_table; the derived AC-1xx label is only the fallback.
type StaticTableEntries = ReadonlyArray<{ aircraft_int: number; aircraft_id: string }>
export function aircraftDisplayName(entries: StaticTableEntries, aircraftInt: number): string {
  const entry = entries.find((candidate) => candidate.aircraft_int === aircraftInt)
  return entry ? entry.aircraft_id : `AC-${100 + aircraftInt}`
}

// R17 rev-4: the operational view box frames the business objects (pads,
// waypoints, current aircraft) with a safety margin and a minimum span so a
// canonical four-metre route stays resolvable inside a 300 m environment box.
const FIT_MARGIN_M = 8
const FIT_MIN_SPAN_M = 24

export function computeDisplayExtent(
  pads: ReadonlyArray<{ e: number; n: number }>,
  waypoints: ReadonlyArray<{ e: number; n: number }>,
  aircraftPoints: ReadonlyArray<{ e: number; n: number }>,
  previewExtent?: {
    type?: string
    min_e_m?: number
    min_n_m?: number
    max_e_m?: number
    max_n_m?: number
  },
): [number, number, number, number] {
  const easts: number[] = [],
    norths: number[] = []
  for (const group of [pads, waypoints, aircraftPoints]) {
    for (const point of group) {
      easts.push(point.e)
      norths.push(point.n)
    }
  }
  if (easts.length === 0) {
    if (previewExtent?.type === 'enu_box') {
      return [
        numberOf(previewExtent.min_e_m),
        numberOf(previewExtent.min_n_m),
        numberOf(previewExtent.max_e_m),
        numberOf(previewExtent.max_n_m),
      ]
    }
    return [-500, -350, 500, 350]
  }
  let minX = Math.min(...easts) - FIT_MARGIN_M,
    minY = Math.min(...norths) - FIT_MARGIN_M
  let maxX = Math.max(...easts) + FIT_MARGIN_M,
    maxY = Math.max(...norths) + FIT_MARGIN_M
  const centerX = (minX + maxX) / 2,
    centerY = (minY + maxY) / 2
  const spanX = Math.max(maxX - minX, FIT_MIN_SPAN_M),
    spanY = Math.max(maxY - minY, FIT_MIN_SPAN_M)
  return [centerX - spanX / 2, centerY - spanY / 2, centerX + spanX / 2, centerY + spanY / 2]
}

export function projectToViewport(
  x: number,
  y: number,
  extent: [number, number, number, number],
  width: number,
  height: number,
): { x: number; y: number } {
  const [minX, minY, maxX, maxY] = extent
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.88
  return {
    x: width / 2 + (x - (minX + maxX) / 2) * scale,
    y: height / 2 - (y - (minY + maxY) / 2) * scale,
  }
}

export const useSessionStore = defineStore('session', () => {
  const scenarioId = ref('')
  const sessionState = ref<SessionState>('EMPTY')
  const epochId = ref('')
  const preview = ref<StagedPreviewSummary>()
  const previewRevision = ref(0)
  const mapDisplay = ref<MapDisplayState>(blankMapDisplay())
  const slots = reactive<Record<DocumentKind, DocumentSlot>>({
    environment: blank('environment'),
    resource: blank('resource'),
    task: blank('task'),
  })
  const busy = ref(false),
    error = ref('')
  const buildEligible = computed(() => order.every((kind) => slots[kind].state === 'CONFIRMED'))

  // A-08: apply the authoritative ScenarioSession (state/slots/preview revision).
  function applySession(session: ScenarioSession) {
    scenarioId.value = session.scenario_id
    sessionState.value = session.state
    epochId.value = session.epoch_id ?? ''
    previewRevision.value = session.preview_revision_u64
    for (const kind of order) {
      const wireSlot = session.document_slots[kind]
      Object.assign(slots[kind], {
        state: wireSlot.state,
        slotRevision: wireSlot.slot_revision_u64,
      })
    }
  }

  async function initialize() {
    busy.value = true
    error.value = ''
    mapDisplay.value = blankMapDisplay()
    try {
      applySession(await gatewayTransport.createScenario())
    } catch (cause) {
      error.value = messageOf(cause)
    } finally {
      busy.value = false
    }
  }

  // A-08: upload returns DocumentUploadResult{validation_report, staged_preview};
  // the staged preview carries the authoritative session_state after staging.
  // R17 rev-4: only backend-valid documents become private map display data,
  // and an invalid or replaced upload clears its stale display geometry.
  async function upload(kind: DocumentKind, file: File) {
    busy.value = true
    error.value = ''
    try {
      const documentText = await file.text()
      const result = await gatewayTransport.uploadDocument(scenarioId.value, kind, file)
      const report = result.validation_report
      Object.assign(slots[kind], {
        state: report.valid ? 'VALID' : 'INVALID',
        fileName: file.name,
        bytes: file.size,
        slotRevision: report.slot_revision_u64,
        schemaVersion: report.schema_version,
        report,
      })
      const downstream =
        kind === 'environment'
          ? (['resource', 'task'] as const)
          : kind === 'resource'
            ? (['task'] as const)
            : []
      for (const child of downstream) Object.assign(slots[child], blank(child))
      applyMapUploadGeometry(mapDisplay.value, kind, report.valid, documentText)
      preview.value = result.staged_preview
      previewRevision.value = result.staged_preview.preview_revision_u64
      sessionState.value = result.staged_preview.session_state as SessionState
    } catch (cause) {
      error.value = messageOf(cause)
    } finally {
      busy.value = false
    }
  }

  // A-07/A-08: confirm posts a strict ConfirmRequest and returns the refreshed ScenarioSession.
  async function confirm(kind: DocumentKind) {
    busy.value = true
    error.value = ''
    try {
      const upstream: ConfirmRequest['upstream_slot_revisions'] = {}
      if (kind !== 'environment') upstream.environment = slots.environment.slotRevision
      if (kind === 'task') upstream.resource = slots.resource.slotRevision
      const body: ConfirmRequest = {
        slot_revision_u64: slots[kind].slotRevision,
        upstream_slot_revisions: upstream,
      }
      applySession(await gatewayTransport.confirmDocument(scenarioId.value, kind, body))
      slots[kind].state = 'CONFIRMED'
    } catch (cause) {
      error.value = messageOf(cause)
    } finally {
      busy.value = false
    }
  }

  // A-08: build is now asynchronous: 202 BuildJob -> poll GET /builds/{job_id}
  // until READY (epoch_id) or BUILD_FAILED. The full_state push arrives on the
  // control WS once the workbench connects.
  async function build(): Promise<boolean> {
    busy.value = true
    error.value = ''
    sessionState.value = 'BUILDING'
    try {
      const job = await gatewayTransport.build(scenarioId.value)
      const deadline = Date.now() + BUILD_POLL_TIMEOUT_MS
      for (;;) {
        const status: BuildStatusResponse = await gatewayTransport.buildStatus(
          scenarioId.value,
          job.build_job_id,
        )
        if (status.state === 'READY') {
          sessionState.value = 'READY'
          epochId.value = status.epoch_id
          return true
        }
        if (status.state === 'BUILD_FAILED') {
          sessionState.value = 'BUILD_FAILED'
          error.value = status.issues.some((issue) => issue.severity === 'error')
            ? `Build failed: ${status.issues
                .filter((issue) => issue.severity === 'error')
                .map((issue) => issue.code)
                .join(', ')}`
            : 'Build failed.'
          return false
        }
        if (Date.now() > deadline) {
          sessionState.value = 'BUILD_FAILED'
          error.value = 'Build polling timed out.'
          return false
        }
        await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_INTERVAL_MS))
      }
    } catch (cause) {
      sessionState.value = 'BUILD_FAILED'
      error.value = messageOf(cause)
      return false
    } finally {
      busy.value = false
    }
  }

  function syncRuntime(state: SessionState, epoch: string) {
    sessionState.value = state
    epochId.value = epoch
  }
  return {
    scenarioId,
    sessionState,
    epochId,
    preview,
    previewRevision,
    mapDisplay,
    slots,
    busy,
    error,
    buildEligible,
    initialize,
    upload,
    confirm,
    build,
    syncRuntime,
  }
})

function messageOf(cause: unknown) {
  if (cause instanceof Error) {
    const code = (cause as unknown as { code?: string }).code
    return code ? `${code} — ${cause.message}` : cause.message
  }
  return 'Unexpected gateway failure'
}
