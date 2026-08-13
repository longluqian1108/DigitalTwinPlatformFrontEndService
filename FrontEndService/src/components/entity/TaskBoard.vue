<script setup lang="ts">
import { NCollapse, NCollapseItem, NTag } from 'naive-ui'
import { useSelectionStore } from '@/stores/selectionStore'
import { useTaskStore } from '@/stores/taskStore'
const tasks = useTaskStore(), selection = useSelectionStore()
</script>
<template>
  <div class="board scroll">
    <div class="subhead"><span>Flights</span><b>{{ tasks.items.length }}</b></div>
    <NCollapse accordion :default-expanded-names="tasks.items[0]?.task_id">
      <NCollapseItem v-for="task in tasks.items" :key="task.task_id" :name="task.task_id" @click="selection.select(task.task_id)">
        <template #header><div class="item-head"><span class="mono">{{ task.task_id }}</span><NTag size="tiny" :type="task.lifecycle === 'ACTIVE' ? 'success' : task.delayed ? 'warning' : 'default'">{{ task.lifecycle }}</NTag></div></template>
        <dl><dt>Aircraft</dt><dd>{{ task.aircraft_id ?? 'Unassigned' }}</dd><dt>Route</dt><dd>{{ task.origin }} → {{ task.destination }}</dd><dt>Schedule</dt><dd class="mono">T+{{ task.scheduled_takeoff_s.toFixed(1) }}</dd><dt>Remaining route</dt><dd>{{ task.remaining_route_count }}</dd><dt>Held / delayed</dt><dd>{{ task.held ? 'HELD' : 'NO' }} / {{ task.delayed ? 'DELAYED' : 'ON TIME' }}</dd><template v-if="task.blocking_reason"><dt>Blocking reason</dt><dd class="warning">{{ task.blocking_reason }}</dd></template></dl>
      </NCollapseItem>
    </NCollapse>
    <div class="subhead"><span>Ground</span><b>Task subview</b></div>
    <p class="hint">Ground phases share the same Task identity and freshness watermark.</p>
    <div v-if="tasks.freshness" class="fresh mono">GEN {{ tasks.freshness.generation }} · TICK {{ tasks.freshness.tick_index }} · T+{{ tasks.freshness.t_s.toFixed(1) }}</div>
  </div>
</template>
<style scoped>.board { height: 100%; }.subhead { display: flex; justify-content: space-between; padding: 9px 11px; color: #a9c4d5; background: #0a1723; border-bottom: 1px solid var(--line); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }.subhead b { color: var(--muted); font-size: 9px; }.board :deep(.n-collapse) { padding: 0 11px; }.item-head { display: flex; justify-content: space-between; width: 100%; padding-right: 8px; }dl { display: grid; grid-template-columns: 115px 1fr; gap: 7px; margin: 0 0 12px; font-size: 10px; }dt { color: var(--muted); }dd { margin: 0; text-align: right; }.warning { color: var(--amber); }.hint { margin: 12px; color: var(--muted); line-height: 1.5; }.fresh { position: sticky; bottom: 0; padding: 8px 11px; color: var(--cyan); background: #07131fcc; border-top: 1px solid var(--line); font-size: 9px; }</style>
