<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NTag } from 'naive-ui'
import type { DocumentKind, DocumentSlot } from '@/contracts'

const props = defineProps<{ kind: DocumentKind; slot: DocumentSlot; enabled: boolean; frozen: boolean }>()
const emit = defineEmits<{ upload: [file: File]; confirm: [] }>()
const errors = computed(() => props.slot.report?.errors.length ?? 0), warnings = computed(() => props.slot.report?.warnings.length ?? 0)
function choose(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (file) emit('upload', file); (event.target as HTMLInputElement).value = '' }
</script>

<template>
  <article class="step" :class="{ disabled: !enabled }">
    <div class="step-head"><span class="number">{{ { environment: '01', resource: '02', task: '03' }[kind] }}</span><div><strong>{{ kind }}.json</strong><small>{{ kind === 'environment' ? 'Frame, map and facilities' : kind === 'resource' ? 'Aircraft and resource catalog' : 'Tasks, routes and reservations' }}</small></div><NTag size="small" :type="slot.state === 'CONFIRMED' ? 'success' : slot.state === 'INVALID' ? 'error' : slot.state === 'VALID' ? 'warning' : 'default'">{{ slot.state }}</NTag></div>
    <div class="meta mono">
      <span>FILE <b>{{ slot.fileName ?? '—' }}</b></span><span>BYTES <b>{{ slot.bytes?.toLocaleString() ?? '—' }}</b></span>
      <span>SCHEMA <b>{{ slot.schemaVersion ?? '—' }}</b></span><span>REVISION <b>{{ slot.slotRevision || '—' }}</b></span>
    </div>
    <div class="counts"><span class="errors">● {{ errors }} errors</span><span class="warnings">▲ {{ warnings }} warnings</span></div>
    <div class="actions">
      <label class="file-button" :class="{ locked: !enabled || frozen }">{{ slot.state === 'EMPTY' ? 'Choose file' : 'Re-upload' }}<input type="file" accept="application/json,.json" :disabled="!enabled || frozen" @change="choose" /></label>
      <NButton size="small" type="primary" :aria-label="`Confirm ${kind}`" :disabled="slot.state !== 'VALID' || frozen" @click="$emit('confirm')">{{ warnings ? `Accept revision ${slot.slotRevision}` : 'Confirm' }}</NButton>
    </div>
  </article>
</template>

<style scoped>
.step { display: grid; gap: 13px; padding: 16px; background: var(--bg-1); border: 1px solid var(--line); border-radius: 5px; transition: opacity .2s, border-color .2s; }.step:not(.disabled):hover { border-color: var(--line-strong); }.disabled { opacity: .45; }
.step-head { display: flex; align-items: center; gap: 10px; }.step-head .number { color: var(--cyan); font: 700 11px monospace; }.step-head div { flex: 1; }.step-head strong,.step-head small { display: block; text-transform: capitalize; }.step-head small { margin-top: 3px; color: var(--muted); font-size: 10px; }
.meta { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; color: var(--muted); font-size: 9px; }.meta span { display: flex; justify-content: space-between; gap: 6px; }.meta b { overflow: hidden; color: var(--text); font-weight: 500; text-overflow: ellipsis; }
.counts { display: flex; gap: 15px; font-size: 10px; }.errors { color: var(--red); }.warnings { color: var(--amber); }.actions { display: flex; justify-content: space-between; gap: 8px; }
.file-button { display: inline-flex; align-items: center; padding: 0 13px; height: 28px; color: #b8d5e5; background: #172b3d; border: 1px solid #35516a; border-radius: 3px; cursor: pointer; }.file-button:hover { border-color: var(--cyan); }.file-button.locked { cursor: not-allowed; opacity: .45; }.file-button input { display: none; }
</style>
