<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const LAYOUT_KEY = 'lbs.layout.v2'
const MIN_LEFT = 250, MIN_MAP = 480, MIN_RIGHT = 330, GUTTER_WIDTH = 12
const leftRatio = ref(0.255), rightRatio = ref(0.35), dockRatio = ref(0.28)
const mapRatio = computed(() => Math.max(0.05, 1 - leftRatio.value - rightRatio.value))
const style = computed(() => ({
  '--left-track': `${leftRatio.value}fr`,
  '--map-track': `${mapRatio.value}fr`,
  '--right-track': `${rightRatio.value}fr`,
  '--dock-track': `clamp(180px, ${(dockRatio.value * 100).toFixed(3)}dvh, 320px)`
}))

onMounted(() => {
  try {
    const value = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}') as Partial<Record<'version' | 'leftRatio' | 'rightRatio' | 'dockRatio', number>>
    if (value.version === 2 && validRatio(value.leftRatio) && validRatio(value.rightRatio) && validRatio(value.dockRatio) && value.leftRatio + value.rightRatio < 0.78) {
      leftRatio.value = value.leftRatio
      rightRatio.value = value.rightRatio
      dockRatio.value = value.dockRatio
    }
  } catch { /* ignore corrupt local preference */ }
})
function validRatio(value: number | undefined): value is number { return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1 }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }
function persist() { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ version: 2, leftRatio: leftRatio.value, rightRatio: rightRatio.value, dockRatio: dockRatio.value })) }
function resize(kind: 'left' | 'right' | 'dock', event: PointerEvent) {
  event.preventDefault()
  const shell = (event.currentTarget as HTMLElement).closest('.shell')
  const body = shell?.querySelector<HTMLElement>('.body')
  const leftPanel = body?.querySelector<HTMLElement>('.left'), rightPanel = body?.querySelector<HTMLElement>('.right')
  if (!shell || !body || !leftPanel || !rightPanel) return
  const startX = event.clientX, startY = event.clientY
  const availableWidth = Math.max(1, body.getBoundingClientRect().width - GUTTER_WIDTH)
  const startLeftRatio = leftPanel.getBoundingClientRect().width / availableWidth
  const startRightRatio = rightPanel.getBoundingClientRect().width / availableWidth
  const startDockPx = shell.querySelector<HTMLElement>(':scope > footer')?.getBoundingClientRect().height ?? window.innerHeight * dockRatio.value
  const move = (next: PointerEvent) => {
    if (kind === 'left') {
      const min = MIN_LEFT / availableWidth, max = 1 - startRightRatio - MIN_MAP / availableWidth
      leftRatio.value = clamp(startLeftRatio + (next.clientX - startX) / availableWidth, min, max)
      rightRatio.value = startRightRatio
    }
    if (kind === 'right') {
      const min = MIN_RIGHT / availableWidth, max = 1 - startLeftRatio - MIN_MAP / availableWidth
      rightRatio.value = clamp(startRightRatio - (next.clientX - startX) / availableWidth, min, max)
      leftRatio.value = startLeftRatio
    }
    if (kind === 'dock') dockRatio.value = clamp(startDockPx - next.clientY + startY, 180, 320) / window.innerHeight
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
.shell { position: relative; display: grid; grid-template-rows: 72px minmax(0, 1fr) var(--dock-track); width: 100vw; width: 100dvw; height: 100vh; height: 100dvh; padding: 8px; gap: 6px; overflow: hidden; background: radial-gradient(circle at 55% 10%, #14283b 0, #08121e 45%, #050b12 100%); }
header, footer { min-width: 0; min-height: 0; overflow: hidden; }
.body { position: relative; display: grid; grid-template-columns: minmax(250px, var(--left-track)) 6px minmax(480px, var(--map-track)) 6px minmax(330px, var(--right-track)); min-width: 0; min-height: 0; overflow: hidden; }
.left,.map,.right { min-width: 0; min-height: 0; overflow: hidden; }
.resize { z-index: 20; padding: 0; border: 0; background: transparent; touch-action: none; }
.resize:hover,.resize:focus-visible { background: rgb(73 198 229 / 25%); }
.vertical { position: relative; width: 6px; height: 100%; cursor: col-resize; }
.horizontal { position: absolute; right: 8px; bottom: calc(var(--dock-track) + 5px); left: 8px; height: 8px; cursor: row-resize; }
.viewport-warning { display: none; position: absolute; z-index: 100; right: 14px; bottom: 14px; padding: 8px 12px; color: var(--amber); background: #251d0d; border: 1px solid #6f5521; border-radius: 4px; }
@media (max-width: 1279px), (max-height: 719px) { .viewport-warning { display: block; } }
</style>
