import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ConnectionState, SnapshotStaticEntry } from '@/contracts'

export const useConnectionStore = defineStore('connections', () => {
  const control = ref<ConnectionState>('idle'),
    snapshot = ref<ConnectionState>('idle'),
    staticTable = ref<SnapshotStaticEntry[]>([]),
    lastSnapshotAt = ref(0),
    snapshotError = ref(''),
    workerFailure = ref('')
  const knownAircraftIds = computed(
    () => new Set(staticTable.value.map((entry) => entry.aircraft_int_u32)),
  )
  function replaceStaticTable(entries: SnapshotStaticEntry[]) {
    staticTable.value = structuredClone(entries)
  }
  return {
    control,
    snapshot,
    staticTable,
    lastSnapshotAt,
    snapshotError,
    workerFailure,
    knownAircraftIds,
    replaceStaticTable,
  }
})
