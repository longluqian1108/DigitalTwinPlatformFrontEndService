import { reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', () => {
  const selectedId = ref<string>(), followId = ref<string>(), layers = reactive({ aircraft: true, trail: true, route: true, facility: true, building: true, obstacle: true, airspace: true, event: true })
  const saved = localStorage.getItem('lbs.selection.layers'); if (saved) Object.assign(layers, JSON.parse(saved) as object)
  watch(layers, (value) => localStorage.setItem('lbs.selection.layers', JSON.stringify(value)), { deep: true })
  function select(id?: string) { selectedId.value = id }
  function follow(id?: string) { followId.value = id }
  function clear() { selectedId.value = undefined; followId.value = undefined }
  return { selectedId, followId, layers, select, follow, clear }
})
