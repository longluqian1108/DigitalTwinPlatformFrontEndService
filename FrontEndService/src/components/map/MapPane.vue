<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NButtonGroup, NCheckbox, NPopover } from 'naive-ui'
import FlatMap from './FlatMap.vue'
import CesiumMap from './CesiumMap.vue'
import { useCommandStore } from '@/stores/commandStore'
import { useEnvironmentStore } from '@/stores/environmentStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSessionStore } from '@/stores/sessionStore'
const session = useSessionStore(), environment = useEnvironmentStore(), selection = useSelectionStore(), commands = useCommandStore(), dimension = ref<'2D' | '3D'>('2D')
const mode = computed(() => environment.model?.coordinate_mode ?? session.preview?.coordinate_mode ?? 'virtual_enu')
function draft() { if (selection.selectedId?.startsWith('AC-')) commands.fillDraft(`POS ${selection.selectedId}`) }
</script>
<template>
  <section class="map-pane panel">
    <header class="toolbar">
      <div class="map-title"><strong>MAP</strong><span>{{ mode }}</span></div>
      <NButtonGroup size="tiny"><NButton :type="dimension === '2D' ? 'primary' : 'default'" @click="dimension = '2D'">2D</NButton><NButton :type="dimension === '3D' ? 'primary' : 'default'" @click="dimension = '3D'">3D</NButton></NButtonGroup>
      <NButton size="tiny">Fit</NButton><NButton size="tiny" :disabled="!selection.selectedId">Focus</NButton><NButton size="tiny" :disabled="!selection.selectedId" @click="selection.follow(selection.selectedId)">Follow</NButton><NButton size="tiny" :disabled="!selection.followId" @click="selection.follow()">Unfollow</NButton>
      <NPopover trigger="click"><template #trigger><NButton size="tiny">Layers</NButton></template><div class="layers"><NCheckbox v-for="(_, key) in selection.layers" :key="key" v-model:checked="selection.layers[key]">{{ key }}</NCheckbox></div></NPopover>
      <span class="spacer" /><NButton size="tiny" :disabled="!selection.selectedId" @click="draft">Use draft</NButton>
    </header>
    <div class="viewport"><CesiumMap v-if="mode === 'real_world_wgs84'" /><FlatMap v-else /><div class="north">N<br /><i>↑</i></div><div class="legend"><span><i class="aircraft" />Aircraft</span><span><i class="facility" />Facility</span><span><i class="obstacle" />Obstacle</span><span><i class="airspace" />Airspace</span></div><div v-if="selection.selectedId" class="selection"><span>SELECTED</span><strong>{{ selection.selectedId }}</strong><small v-if="selection.followId === selection.selectedId">FOLLOWING</small></div></div>
  </section>
</template>
<style scoped>.map-pane { display: grid; grid-template-rows: 39px minmax(0,1fr); height: 100%; overflow: hidden; border-radius: 4px; }.toolbar { display: flex; align-items: center; gap: 6px; padding: 0 9px; border-bottom: 1px solid var(--line); }.map-title { display: flex; align-items: baseline; gap: 7px; margin-right: 4px; }.map-title strong { font-size: 11px; letter-spacing: .13em; }.map-title span { color: var(--muted); font: 8px monospace; }.spacer { flex: 1; }.viewport { position: relative; min-height: 0; }.north { position: absolute; top: 15px; right: 15px; color: #9db6c7; font: 9px monospace; text-align: center; pointer-events: none; }.north i { color: var(--cyan); font-size: 18px; font-style: normal; }.legend { position: absolute; bottom: 12px; left: 12px; display: flex; gap: 12px; padding: 7px 9px; color: #91a9b8; background: #07131fdd; border: 1px solid var(--line); font-size: 8px; text-transform: uppercase; pointer-events: none; }.legend span { display: flex; align-items: center; gap: 4px; }.legend i { width: 7px; height: 7px; border-radius: 50%; }.aircraft { background: var(--cyan); }.facility { background: var(--green); }.obstacle { background: var(--amber); }.airspace { background: transparent; border: 1px solid #b772e6; }.selection { position: absolute; top: 12px; left: 12px; display: grid; gap: 2px; padding: 8px 10px; background: #0b1a28e8; border-left: 2px solid var(--amber); pointer-events: none; }.selection span,.selection small { color: var(--muted); font-size: 8px; letter-spacing: .12em; }.selection strong { font: 12px monospace; }.selection small { color: var(--green); }.layers { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 14px; padding: 5px; text-transform: capitalize; }</style>
