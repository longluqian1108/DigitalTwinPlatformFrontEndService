import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  ConnectionState,
  ControlServerHello,
  SnapshotHello,
  SnapshotStaticTable,
} from '@/contracts'

// A-01/A-06: static table entries use the wire field `aircraft_int`; the control
// and snapshot hello payloads are retained for freshness/workspace consumers.
export const useConnectionStore = defineStore('connections', () => {
  const control = ref<ConnectionState>('idle'),
    snapshot = ref<ConnectionState>('idle')
  const staticTable = ref<SnapshotStaticTable['entries']>([])
  const serverHello = ref<ControlServerHello>(),
    snapshotHello = ref<SnapshotHello>()
  const lastSnapshotAt = ref(0),
    snapshotError = ref(''),
    workerFailure = ref('')
  const knownAircraftIds = computed(
    () => new Set(staticTable.value.map((entry) => entry.aircraft_int)),
  )
  function replaceStaticTable(entries: SnapshotStaticTable['entries']) {
    staticTable.value = structuredClone(entries)
  }
  return {
    control,
    snapshot,
    staticTable,
    serverHello,
    snapshotHello,
    lastSnapshotAt,
    snapshotError,
    workerFailure,
    knownAircraftIds,
    replaceStaticTable,
  }
})
