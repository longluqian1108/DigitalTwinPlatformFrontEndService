<script setup lang="ts">
import { NSelect } from 'naive-ui'
import { useEventStore } from '@/stores/eventStore'
import { useSelectionStore } from '@/stores/selectionStore'
const events = useEventStore(), selection = useSelectionStore()
const options = ['all', 'info', 'warning', 'error', 'fatal'].map((value) => ({ label: value.toUpperCase(), value }))
function activate(sequence: number, subjectId: string) { events.markRead(sequence); selection.select(subjectId) }
</script>
<template>
  <section class="events panel">
    <header class="panel-title"><span>Realtime events</span><b>{{ events.items.filter((event) => !event.read).length }} unread</b></header>
    <div class="filters"><NSelect v-model:value="events.severity" size="tiny" :options="options" aria-label="Event severity filter" /><span>Current connection only</span></div>
    <div class="stream scroll" role="log" aria-label="Realtime events">
      <button v-for="event in events.visible" :key="event.event_sequence" class="event" :class="[event.severity, { unread: !event.read, boundary: event.boundary }]" @click="activate(event.event_sequence, event.primary_subject.id)">
        <div class="rail"><i /><span class="mono">{{ event.t_s.toFixed(1) }}</span></div>
        <div class="content"><div><strong>{{ event.event_name.replaceAll('_', ' ') }}</strong><span class="mono">#{{ event.event_sequence }}</span></div><p>{{ event.message }}</p><small>{{ event.primary_subject.kind }} · {{ event.primary_subject.id }} · {{ event.reason_code }}</small></div>
      </button>
      <div v-if="!events.visible.length" class="empty-state"><strong>No events on this connection</strong><br />Events will appear after the simulation starts.</div>
    </div>
  </section>
</template>
<style scoped>
.events { display: grid; grid-template-rows: auto auto minmax(0,1fr); width: 100%; height: 100%; min-height: 0; overflow: hidden; border-radius: 4px; }.stream { min-height: 0; overflow: auto; }.panel-title { justify-content: space-between; }.panel-title b { color: var(--cyan); font-size: 9px; }.filters { display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--line); }.filters :deep(.n-select) { width: 105px; }.filters span { color: var(--muted); font-size: 9px; }
.event { display: grid; grid-template-columns: 42px 1fr; width: 100%; padding: 0; color: inherit; text-align: left; background: transparent; border: 0; border-bottom: 1px solid rgb(38 62 84 / 70%); cursor: pointer; }.event:hover { background: #16293a; }.event.unread { background: rgb(29 55 73 / 45%); }.rail { position: relative; padding-top: 13px; color: var(--muted); text-align: center; border-right: 1px solid var(--line); }.rail i { display: block; width: 7px; height: 7px; margin: 0 auto 7px; background: var(--blue); border-radius: 50%; }.warning .rail i { background: var(--amber); }.error .rail i,.fatal .rail i { background: var(--red); }.rail span { font-size: 9px; }.content { min-width: 0; padding: 11px 10px; }.content>div { display: flex; justify-content: space-between; gap: 8px; }.content strong { font-size: 10px; letter-spacing: .04em; }.content div span,.content small { color: var(--muted); font-size: 8px; }.content p { margin: 5px 0 7px; color: #b8ccd9; font-size: 11px; line-height: 1.35; }.content small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.boundary { border: 1px dashed #8b6a28; background: #241d10; }
</style>
