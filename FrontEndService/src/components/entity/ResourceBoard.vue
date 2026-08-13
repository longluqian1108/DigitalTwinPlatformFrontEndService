<script setup lang="ts">
import { NCollapse, NCollapseItem, NTag } from 'naive-ui'
import { computed, ref } from 'vue'
import type { FacilityReadModel } from '@/contracts'
import { useResourceStore } from '@/stores/resourceStore'
import { useSelectionStore } from '@/stores/selectionStore'
const resources = useResourceStore(), selection = useSelectionStore(), view = ref<'aircraft' | 'facilities'>('aircraft')
const grouped = computed(() => resources.facilities.reduce<Partial<Record<FacilityReadModel['kind'], FacilityReadModel[]>>>((result, item) => {
  ;(result[item.kind] ??= []).push(item)
  return result
}, {}))
</script>
<template>
  <div class="resource-board">
    <nav><button :class="{ active: view === 'aircraft' }" @click="view = 'aircraft'">Aircraft <b>{{ resources.aircraft.length }}</b></button><button :class="{ active: view === 'facilities' }" @click="view = 'facilities'">Facilities <b>{{ resources.facilities.length }}</b></button></nav>
    <div class="scroll content">
      <NCollapse v-if="view === 'aircraft'" accordion>
        <NCollapseItem v-for="aircraft in resources.aircraft" :key="aircraft.aircraft_id" :name="aircraft.aircraft_id" @click="selection.select(aircraft.aircraft_id)">
          <template #header><div class="item-head"><span class="mono">{{ aircraft.aircraft_id }}</span><NTag size="tiny" :type="aircraft.resource_state === 'AVAILABLE' ? 'success' : aircraft.resource_state === 'DESTROYED' ? 'error' : 'info'">{{ aircraft.resource_state }}</NTag></div></template>
          <dl><dt>Display name</dt><dd>{{ aircraft.display_name }}</dd><dt>Model</dt><dd>{{ aircraft.model_type }}</dd><dt>Current Task</dt><dd>{{ aircraft.task_id ?? '—' }}</dd><dt>Placed</dt><dd>{{ aircraft.placed ? 'YES' : 'NO' }}</dd><dt>Derived state</dt><dd>{{ aircraft.destroyed ? 'DESTROYED' : aircraft.placed ? 'ACTIVE' : 'REGISTERED' }}</dd></dl>
        </NCollapseItem>
      </NCollapse>
      <template v-else><section v-for="kind in ['HANGAR','PAD','RUNWAY_END']" :key="kind"><h3>{{ kind.replace('_', ' ') }}S</h3><article v-for="facility in grouped[kind] ?? []" :key="facility.resource_id" class="facility" @click="selection.select(facility.resource_id)"><div><strong class="mono">{{ facility.resource_id }}</strong><NTag size="tiny" :type="facility.availability === 'OPEN' ? 'success' : 'warning'">{{ facility.availability }}</NTag></div><p>Owners: {{ facility.owner_task_ids.join(', ') || '—' }}</p><p>Occupancy: {{ facility.occupancy_aircraft_ids.join(', ') || '—' }}</p><small v-if="facility.blocking_reason">{{ facility.blocking_reason }}</small></article></section></template>
    </div>
  </div>
</template>
<style scoped>.resource-board { display: grid; grid-template-rows: 38px minmax(0,1fr); height: 100%; }nav { display: flex; border-bottom: 1px solid var(--line); }nav button { flex: 1; background: #0b1825; border: 0; border-bottom: 2px solid transparent; cursor: pointer; }nav button.active { color: var(--cyan); border-color: var(--cyan); }nav b { margin-left: 5px; color: var(--muted); }.content { padding: 0 11px; }.item-head { display: flex; justify-content: space-between; width: 100%; padding-right: 8px; }dl { display: grid; grid-template-columns: 100px 1fr; gap: 7px; margin: 0 0 12px; font-size: 10px; }dt { color: var(--muted); }dd { margin: 0; text-align: right; }h3 { margin: 14px 0 6px; color: var(--muted); font-size: 9px; letter-spacing: .12em; }.facility { padding: 10px; margin-bottom: 7px; background: #102131; border: 1px solid var(--line); cursor: pointer; }.facility:hover { border-color: var(--line-strong); }.facility div { display: flex; justify-content: space-between; }.facility p { margin: 6px 0 0; color: #9bb1c0; font-size: 10px; }.facility small { display: block; margin-top: 7px; color: var(--amber); }</style>
