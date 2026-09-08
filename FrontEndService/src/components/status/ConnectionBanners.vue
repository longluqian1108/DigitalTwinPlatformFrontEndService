<script setup lang="ts">
import { computed } from 'vue'
import { useConnectionStore } from '@/stores/connectionStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useSessionStore } from '@/stores/sessionStore'
// A-09: snapshot staleness now uses the server-reported snapshot_lag_s from the
// generated RuntimeReadModel (snapshot_publish_hz no longer exists on the wire).
const connection = useConnectionStore(), session = useSessionStore(), runtime = useRuntimeStore()
const banners = computed(() => [
  session.error,
  connection.control === 'disconnected' && session.sessionState === 'RUNNING' ? 'Control connection disconnected. The last committed state is stale.' : '',
  connection.snapshot === 'disconnected' && session.sessionState === 'RUNNING' ? 'Snapshot connection disconnected. The renderer is frozen.' : '',
  runtime.model.snapshot_lag_s > 2 ? `Snapshot stream is stale (lag ${runtime.model.snapshot_lag_s.toFixed(1)}s). The renderer is holding the last authoritative frame.` : '',
  runtime.error,
  connection.snapshotError,
  connection.workerFailure
].filter(Boolean))
</script>
<template><div v-if="banners.length" class="banners" role="alert"><div v-for="banner in banners" :key="banner">⚠ {{ banner }}</div></div></template>
<style scoped>.banners { position: fixed; z-index: 5000; top: 86px; left: 50%; display: grid; gap: 6px; width: min(680px, 80vw); transform: translateX(-50%); pointer-events: none; }.banners div { padding: 9px 14px; color: #ffd6dc; background: rgb(72 17 28 / 95%); border: 1px solid #9f3548; border-radius: 4px; box-shadow: var(--shadow); }</style>
