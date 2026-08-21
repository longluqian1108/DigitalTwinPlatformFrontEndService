import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { EnvironmentReadModel, Freshness } from '@/contracts'

export const useEnvironmentStore = defineStore('environment', () => {
  const model = ref<EnvironmentReadModel>(),
    freshness = ref<Freshness>()
  function replace(next: EnvironmentReadModel, watermark: Freshness) {
    model.value = structuredClone(next)
    freshness.value = { ...watermark }
  }
  return { model, freshness, replace }
})
