import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AircraftReadModel, Freshness, ResourceReadModel } from '@/contracts'

// A-04/A-05/A-09: the backend read model has a single ResourceSummaryCollection
// (ResourceReadModel[]); aircraft arrive via read_model_delta.aircraft_upserts
// (ControlFullState carries no aircraft collection).
export const useResourceStore = defineStore('resources', () => {
  const resources = ref<ResourceReadModel[]>([]),
    aircraft = ref<AircraftReadModel[]>([]),
    freshness = ref<Freshness>()
  function replace(nextResources: ResourceReadModel[], watermark: Freshness) {
    resources.value = structuredClone(nextResources)
    freshness.value = { ...watermark }
  }
  function upsertAircraft(upserts: AircraftReadModel[]) {
    if (!upserts.length) return
    const byId = new Map(aircraft.value.map((item) => [item.aircraft_id, item]))
    for (const item of upserts) byId.set(item.aircraft_id, item)
    aircraft.value = Array.from(byId.values())
  }
  function upsertResources(upserts: ResourceReadModel[]) {
    if (!upserts.length) return
    const byId = new Map(resources.value.map((item) => [item.resource_id, item]))
    for (const item of upserts) byId.set(item.resource_id, item)
    resources.value = Array.from(byId.values())
  }
  function clear() {
    aircraft.value = []
    resources.value = []
  }
  return { resources, aircraft, freshness, replace, upsertResources, upsertAircraft, clear }
})
