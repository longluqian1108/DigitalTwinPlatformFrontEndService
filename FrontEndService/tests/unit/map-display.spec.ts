import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  aircraftDisplayName,
  applyMapUploadGeometry,
  computeDisplayExtent,
  projectToViewport,
  parseResourcePads,
  parseTaskGeometry,
  type MapPadDisplay
} from '@/stores/sessionStore'

// Canonical Stage-1 fixture geometry (tests/fixtures/stage1/cpu_lifecycle/
// resource.json + task.json): pad-a at ENU (0,0), pad-b at ENU (0,4), the
// task route runs pad-a -> waypoint-a (0,2) -> waypoint-b (0,4) -> pad-b.
const canonicalResource = {
  facilities: [
    {
      facility_id: 'facility-a',
      pads: [{ pad_id: 'pad-a', label: 'pad-a', center_enu_m: [0, 0, 0], touchdown_area: { shape: 'circle', radius_m: 5 } }]
    },
    {
      facility_id: 'facility-b',
      pads: [{ pad_id: 'pad-b', label: 'pad-b', center_enu_m: [0, 4, 0], touchdown_area: { shape: 'circle', radius_m: 5 } }]
    }
  ]
}
const canonicalTask = {
  waypoints: [
    { waypoint_id: 'waypoint-a', position_enu_m: [0, 2] },
    { waypoint_id: 'waypoint-b', position_enu_m: [0, 4] }
  ],
  tasks: [
    {
      task_id: 'task-a',
      flight: {
        origin: { type: 'pad', facility_id: 'facility-a', pad_id: 'pad-a' },
        destination: { type: 'pad', facility_id: 'facility-b', pad_id: 'pad-b' },
        route: ['waypoint-a', 'waypoint-b']
      }
    }
  ]
}

function blank() {
  return { pads: [] as MapPadDisplay[], waypoints: [], routes: [] }
}

// R17 rev-4 UI-MAP oracle: the uploaded documents validated by the backend
// become frontend-private display geometry, and stale geometry cannot survive
// an invalid or replaced upstream upload.
describe('map display geometry retention', () => {
  it('retains exact canonical pad coordinates and labels from a valid resource', () => {
    const state = blank()
    applyMapUploadGeometry(state, 'resource', true, JSON.stringify(canonicalResource))
    expect(state.pads).toEqual([
      { facilityId: 'facility-a', padId: 'pad-a', label: 'pad-a', e: 0, n: 0, radiusM: 5 },
      { facilityId: 'facility-b', padId: 'pad-b', label: 'pad-b', e: 0, n: 4, radiusM: 5 }
    ])
  })

  it('retains waypoints and the pad-anchored route from a valid task', () => {
    const state = blank()
    applyMapUploadGeometry(state, 'resource', true, JSON.stringify(canonicalResource))
    applyMapUploadGeometry(state, 'task', true, JSON.stringify(canonicalTask))
    expect(state.waypoints).toEqual([
      { waypointId: 'waypoint-a', e: 0, n: 2 },
      { waypointId: 'waypoint-b', e: 0, n: 4 }
    ])
    expect(state.routes).toEqual([
      {
        taskId: 'task-a',
        points: [
          { kind: 'pad', id: 'pad-a', e: 0, n: 0 },
          { kind: 'waypoint', id: 'waypoint-a', e: 0, n: 2 },
          { kind: 'waypoint', id: 'waypoint-b', e: 0, n: 4 },
          { kind: 'pad', id: 'pad-b', e: 0, n: 4 }
        ]
      }
    ])
  })

  it('clears stale geometry when an upload of the same kind is invalid', () => {
    const state = blank()
    applyMapUploadGeometry(state, 'resource', true, JSON.stringify(canonicalResource))
    applyMapUploadGeometry(state, 'task', true, JSON.stringify(canonicalTask))
    applyMapUploadGeometry(state, 'task', false, '{"waypoints": []}')
    expect(state.waypoints).toEqual([])
    expect(state.routes).toEqual([])
    expect(state.pads).toHaveLength(2)
  })

  it('clears downstream geometry when a replaced resource upload arrives', () => {
    const state = blank()
    applyMapUploadGeometry(state, 'resource', true, JSON.stringify(canonicalResource))
    applyMapUploadGeometry(state, 'task', true, JSON.stringify(canonicalTask))
    applyMapUploadGeometry(state, 'resource', true, JSON.stringify(canonicalResource))
    expect(state.waypoints).toEqual([])
    expect(state.routes).toEqual([])
    expect(state.pads).toHaveLength(2)
  })

  it('clears every geometry when the environment document changes', () => {
    const state = blank()
    applyMapUploadGeometry(state, 'resource', true, JSON.stringify(canonicalResource))
    applyMapUploadGeometry(state, 'task', true, JSON.stringify(canonicalTask))
    applyMapUploadGeometry(state, 'environment', true, '{}')
    expect(state.pads).toEqual([])
    expect(state.waypoints).toEqual([])
    expect(state.routes).toEqual([])
  })
})

describe('aircraft identity via the snapshot static table', () => {
  const entries = [{ aircraft_int: 0, aircraft_id: 'aircraft-a' }]
  it('maps aircraft_int through snapshot_static_table entries', () => {
    expect(aircraftDisplayName(entries, 0)).toBe('aircraft-a')
  })
  it('keeps the derived label only as the fallback for unknown ints', () => {
    expect(aircraftDisplayName(entries, 7)).toBe('AC-107')
  })
})

// The canonical four-metre route must occupy resolvable screen distance: the
// operational extent frames the business objects with a safety margin and a
// minimum span instead of the full 300 m environment box.
describe('operational fit and projection', () => {
  const pads = parseResourcePads(canonicalResource)
  const geometry = {
    pads,
    waypoints: parseTaskGeometry(canonicalTask, pads).waypoints,
    routes: parseTaskGeometry(canonicalTask, pads).routes
  }

  it('frames the canonical objects instead of the environment extent', () => {
    const extent = computeDisplayExtent(geometry.pads, geometry.waypoints, [], {
      type: 'enu_box', min_e_m: -100, min_n_m: -100, max_e_m: 200, max_n_m: 200
    })
    const [minX, minY, maxX, maxY] = extent
    expect(minX).toBeLessThan(0)
    expect(maxX).toBeGreaterThan(0)
    expect(maxY - minY).toBeGreaterThanOrEqual(24)
    expect(maxX - minX).toBeGreaterThanOrEqual(24)
    expect(maxX - minX).toBeLessThan(30)
    expect(maxY - minY).toBeLessThan(30)
  })

  it('falls back to the preview extent when no business object exists', () => {
    const extent = computeDisplayExtent([], [], [], {
      type: 'enu_box', min_e_m: -100, min_n_m: -100, max_e_m: 200, max_n_m: 200
    })
    expect(extent).toEqual([-100, -100, 200, 200])
  })

  it('resolves the four-metre pad separation to a visible screen distance', () => {
    const extent = computeDisplayExtent(geometry.pads, geometry.waypoints, [], undefined)
    const top = projectToViewport(0, 0, extent, 800, 600)
    const bottom = projectToViewport(0, 4, extent, 800, 600)
    expect(Math.hypot(top.x - bottom.x, top.y - bottom.y)).toBeGreaterThanOrEqual(60)
  })

  it('projects two distinct ViewerSnapshot positions to distinct points', () => {
    const extent = computeDisplayExtent(geometry.pads, geometry.waypoints, [{ e: 0, n: 2 }], undefined)
    const atPadA = projectToViewport(0, 0.5, extent, 800, 600)
    const climbing = projectToViewport(0, 1.5, extent, 800, 600)
    expect(atPadA).not.toEqual(climbing)
  })
})

describe('store integration', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('exposes a blank private geometry state on a fresh store', async () => {
    const { useSessionStore } = await import('@/stores/sessionStore')
    const session = useSessionStore()
    expect(session.mapDisplay.pads).toEqual([])
    expect(session.mapDisplay.waypoints).toEqual([])
    expect(session.mapDisplay.routes).toEqual([])
  })
})
