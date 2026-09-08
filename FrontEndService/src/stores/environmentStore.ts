import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { EnvironmentReadModel, Freshness } from '@/contracts'

// A-04/A-05/A-09: EnvironmentReadModel is the generated read model (frame/map/
// volumes/exemptions/warnings); deltas patch the whole model (Stage 1 granularity).
export const useEnvironmentStore = defineStore('environment', () => {
  const model = ref<EnvironmentReadModel>(),
    freshness = ref<Freshness>()
  function replace(next: EnvironmentReadModel, watermark: Freshness) {
    model.value = structuredClone(next)
    freshness.value = { ...watermark }
  }
  return { model, freshness, replace }
})
