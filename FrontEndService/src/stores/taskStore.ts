import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Freshness, TaskReadModel } from '@/contracts'

// A-04/A-09: TaskReadModel is the generated read model; the freshness watermark
// mirrors the ControlFullState envelope fields.
export const useTaskStore = defineStore('tasks', () => {
  const items = ref<TaskReadModel[]>([]),
    freshness = ref<Freshness>()
  function replace(tasks: TaskReadModel[], watermark: Freshness) {
    items.value = structuredClone(tasks)
    freshness.value = { ...watermark }
  }
  // A-05: read_model_delta upserts/removals keyed by task_id.
  function upsert(upserts: TaskReadModel[]) {
    if (!upserts.length) return
    const byId = new Map(items.value.map((task) => [task.task_id, task]))
    for (const task of upserts) byId.set(task.task_id, task)
    items.value = Array.from(byId.values())
  }
  function remove(ids: string[]) {
    if (!ids.length) return
    const gone = new Set(ids)
    items.value = items.value.filter((task) => !gone.has(task.task_id))
  }
  return { items, freshness, replace, upsert, remove }
})
