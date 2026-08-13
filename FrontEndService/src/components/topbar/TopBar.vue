<script setup lang="ts">
import { NButton, NTag } from 'naive-ui'
import RuntimeControls from './RuntimeControls.vue'
import { runtimeConfig } from '@/config/runtime'
import { useConnectionStore } from '@/stores/connectionStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useSessionStore } from '@/stores/sessionStore'

defineEmits<{ openLoader: [] }>()
const session = useSessionStore(), runtime = useRuntimeStore(), connections = useConnectionStore()
</script>

<template>
  <div class="topbar panel">
    <div class="brand">
      <div class="mark">LBS</div>
      <div><strong>LightBlueSky</strong><span>SIMULATION WORKBENCH</span></div>
    </div>
    <NButton size="small" secondary type="info" @click="$emit('openLoader')">Loader</NButton>
    <div class="runtime mono">
      <div><span>STATE</span><strong :class="runtime.state.toLowerCase()">{{ runtime.state }}</strong></div>
      <div><span>EPOCH</span><strong>{{ session.epochId ? session.epochId.slice(0, 8) : '—' }}</strong></div>
      <div><span>TICK</span><strong>{{ runtime.model.tick_index }}</strong></div>
      <div><span>T+ SEC</span><strong>{{ runtime.model.t_s.toFixed(1) }}</strong></div>
      <div><span>RATE</span><strong>{{ runtime.model.time_scale }}×</strong></div>
    </div>
    <RuntimeControls />
    <div class="connections">
      <NTag size="small" :type="runtimeConfig.transportMode === 'mock' ? 'warning' : 'info'">{{ runtimeConfig.transportMode.toUpperCase() }}</NTag>
      <span title="Control WebSocket"><i class="status-dot" :class="connections.control === 'connected' ? 'ok' : 'bad'" />CTRL</span>
      <span title="Snapshot WebSocket"><i class="status-dot" :class="connections.snapshot === 'connected' ? 'ok' : 'bad'" />SNAP</span>
    </div>
  </div>
</template>

<style scoped>
.topbar { display: flex; align-items: center; gap: 14px; height: 100%; padding: 0 14px; border-radius: 4px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 195px; }
.brand .mark { display: grid; place-items: center; width: 38px; height: 38px; color: #06131d; background: linear-gradient(135deg, var(--cyan), #8ee5ed); border-radius: 4px; font-weight: 900; letter-spacing: -.05em; box-shadow: 0 0 20px rgb(73 198 229 / 24%); }
.brand strong,.brand span { display: block; }.brand strong { font-size: 15px; letter-spacing: .02em; }.brand span { margin-top: 2px; color: var(--muted); font-size: 8px; letter-spacing: .16em; }
.runtime { display: flex; align-items: center; gap: 18px; flex: 1; min-width: 430px; padding-left: 12px; border-left: 1px solid var(--line); }
.runtime div { display: grid; gap: 2px; }.runtime span { color: var(--muted); font-size: 8px; letter-spacing: .12em; }.runtime strong { font-size: 12px; }.runtime .running { color: var(--green); }.runtime .paused { color: var(--amber); }.runtime .worker_failed { color: var(--red); }
.connections { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 9px; letter-spacing: .08em; }.connections span { display: flex; align-items: center; gap: 5px; }
@media (max-width: 1380px) { .runtime { gap: 10px; min-width: 360px; }.brand { min-width: auto; }.brand span { display: none; } }
</style>
