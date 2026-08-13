<script setup lang="ts">
import { useSessionStore } from '@/stores/sessionStore'
const session = useSessionStore()
</script>
<template>
  <section class="summary">
    <div><span>Preview revision</span><strong class="mono">{{ session.preview?.preview_revision_u64 ?? 0 }}</strong></div>
    <div><span>Coordinate frame</span><strong>{{ session.preview?.coordinate_mode ?? '—' }}</strong></div>
    <div v-for="(count, key) in session.preview?.object_counts" :key="key"><span>{{ key }}</span><strong class="mono">{{ count }}</strong></div>
  </section>
</template>
<style scoped>.summary { display: flex; gap: 1px; background: var(--line); border: 1px solid var(--line); }.summary div { flex: 1; min-width: 100px; padding: 10px 12px; background: var(--bg-1); }.summary span,.summary strong { display: block; }.summary span { color: var(--muted); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }.summary strong { margin-top: 4px; font-size: 12px; text-transform: capitalize; }</style>
