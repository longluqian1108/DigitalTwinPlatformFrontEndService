import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Freshness, TaskReadModel } from '@/contracts'

export const useTaskStore = defineStore('tasks', () => {
  const items = ref<TaskReadModel[]>([]), freshness = ref<Freshness>()
  function replace(tasks: TaskReadModel[], watermark: Freshness) { items.value = structuredClone(tasks); freshness.value = { ...watermark } }
  return { items, freshness, replace }
})
