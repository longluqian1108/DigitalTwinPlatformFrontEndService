<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const left = ref(320), right = ref(440), dock = ref(250)
const style = computed(() => ({ '--left': `${left.value}px`, '--right': `${right.value}px`, '--dock': `${dock.value}px` }))

onMounted(() => {
  const saved = localStorage.getItem('lbs.layout')
  try { const value = JSON.parse(saved ?? '{}') as Partial<Record<'left' | 'right' | 'dock', number>>; left.value = value.left ?? 320; right.value = value.right ?? 440; dock.value = value.dock ?? 250 } catch { /* ignore corrupt local preference */ }
})
function persist() { localStorage.setItem('lbs.layout', JSON.stringify({ left: left.value, right: right.value, dock: dock.value })) }
function resize(kind: 'left' | 'right' | 'dock', event: PointerEvent) {
  const startX = event.clientX, startY = event.clientY, start = { left: left.value, right: right.value, dock: dock.value }[kind]
  const move = (next: PointerEvent) => {
    if (kind === 'left') left.value = Math.max(250, Math.min(430, start + next.clientX - startX))
    if (kind === 'right') right.value = Math.max(330, Math.min(540, start - next.clientX + startX))
    if (kind === 'dock') dock.value = Math.max(180, Math.min(340, start - next.clientY + startY))
  }
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); persist() }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
}
</script>

<template>
  <main class="shell" :style="style">
    <header><slot name="top" /></header>
    <section class="body">
      <aside class="left"><slot name="events" /></aside>
      <button class="resize vertical left-handle" aria-label="Resize events panel" @pointerdown="resize('left', $event)" />
      <section class="map"><slot name="map" /></section>
      <button class="resize vertical right-handle" aria-label="Resize entity panel" @pointerdown="resize('right', $event)" />
      <aside class="right"><slot name="entities" /></aside>
    </section>
    <button class="resize horizontal" aria-label="Resize command dock" @pointerdown="resize('dock', $event)" />
    <footer><slot name="dock" /></footer>
    <div class="viewport-warning">A viewport of at least 1280 × 720 is recommended for the formal workstation.</div>
  </main>
</template>

<style scoped>
.shell { position: relative; display: grid; grid-template-rows: 72px minmax(0, 1fr) var(--dock); width: 100%; height: 100%; padding: 8px; gap: 6px; background: radial-gradient(circle at 55% 10%, #14283b 0, #08121e 45%, #050b12 100%); }
header, footer { min-width: 0; min-height: 0; }
.body { position: relative; display: grid; grid-template-columns: var(--left) minmax(480px, 1fr) var(--right); gap: 6px; min-width: 0; min-height: 0; }
.left,.map,.right { min-width: 0; min-height: 0; }
.resize { position: absolute; z-index: 20; padding: 0; border: 0; background: transparent; }
.resize:hover,.resize:focus-visible { background: rgb(73 198 229 / 25%); }
.vertical { top: 0; bottom: 0; width: 8px; cursor: col-resize; }
.left-handle { left: calc(var(--left) + 2px); }
.right-handle { right: calc(var(--right) + 2px); }
.horizontal { right: 8px; bottom: calc(var(--dock) + 5px); left: 8px; height: 8px; cursor: row-resize; }
.viewport-warning { display: none; position: absolute; z-index: 100; right: 14px; bottom: 14px; padding: 8px 12px; color: var(--amber); background: #251d0d; border: 1px solid #6f5521; border-radius: 4px; }
@media (max-width: 1279px), (max-height: 719px) { .viewport-warning { display: block; } }
</style>
