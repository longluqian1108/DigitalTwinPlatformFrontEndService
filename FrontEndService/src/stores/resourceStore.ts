import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AircraftReadModel, FacilityReadModel, Freshness } from '@/contracts'

export const useResourceStore = defineStore('resources', () => {
  const aircraft = ref<AircraftReadModel[]>([]),
    facilities = ref<FacilityReadModel[]>([]),
    freshness = ref<Freshness>()
  function replace(
    nextAircraft: AircraftReadModel[],
    nextFacilities: FacilityReadModel[],
    watermark: Freshness,
  ) {
    aircraft.value = structuredClone(nextAircraft)
    facilities.value = structuredClone(nextFacilities)
    freshness.value = { ...watermark }
  }
  return { aircraft, facilities, freshness, replace }
})
