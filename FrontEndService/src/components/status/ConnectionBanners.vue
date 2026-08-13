<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useConnectionStore } from '@/stores/connectionStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useSessionStore } from '@/stores/sessionStore'
const connection = useConnectionStore(), session = useSessionStore(), runtime = useRuntimeStore(), clock = ref(performance.now())
let timer = 0
onMounted(() => { timer = window.setInterval(() => { clock.value = performance.now() }, 250) })
onBeforeUnmount(() => window.clearInterval(timer))
const stale = computed(() => runtime.state === 'RUNNING' && connection.snapshot === 'connected' && connection.lastSnapshotAt > 0 && clock.value - connection.lastSnapshotAt > 2_000 / Math.max(runtime.model.snapshot_publish_hz, 1))
const banners = computed(() => [
  session.error,
  connection.control === 'disconnected' && session.sessionState !== 'EMPTY' ? 'Control connection disconnected. The last committed state is stale.' : '',
  connection.snapshot === 'disconnected' && session.sessionState === 'RUNNING' ? 'Snapshot connection disconnected. The renderer is frozen.' : '',
  stale.value ? 'Snapshot stream is stale. The renderer is holding the last authoritative frame.' : '',
  connection.snapshotError,
  connection.workerFailure
].filter(Boolean))
</script>
<template><div v-if="banners.length" class="banners" role="alert"><div v-for="banner in banners" :key="banner">⚠ {{ banner }}</div></div></template>
<style scoped>.banners { position: fixed; z-index: 5000; top: 86px; left: 50%; display: grid; gap: 6px; width: min(680px, 80vw); transform: translateX(-50%); pointer-events: none; }.banners div { padding: 9px 14px; color: #ffd6dc; background: rgb(72 17 28 / 95%); border: 1px solid #9f3548; border-radius: 4px; box-shadow: var(--shadow); }</style>
