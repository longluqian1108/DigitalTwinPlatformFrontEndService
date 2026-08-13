<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { snapshotBuffer } from '@/snapshot/SnapshotBuffer'
import { interpolatePosition } from '@/snapshot/hermite'
import { useSelectionStore } from '@/stores/selectionStore'
import { useSessionStore } from '@/stores/sessionStore'

const canvas = ref<HTMLCanvasElement>(), session = useSessionStore(), selection = useSelectionStore()
let context: CanvasRenderingContext2D | null = null, observer: ResizeObserver | undefined, raf = 0, transitionStart = performance.now()
const extent = () => session.preview?.extent ?? [-500, -350, 500, 350]
function project(x: number, y: number) {
  const [minX, minY, maxX, maxY] = extent(), width = canvas.value?.clientWidth ?? 1, height = canvas.value?.clientHeight ?? 1
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * .88
  return { x: width / 2 + (x - (minX + maxX) / 2) * scale, y: height / 2 - (y - (minY + maxY) / 2) * scale }
}
function draw() {
  raf = requestAnimationFrame(draw); const element = canvas.value
  if (!element || !context) return
  const ratio = window.devicePixelRatio || 1, width = element.clientWidth, height = element.clientHeight
  if (element.width !== width * ratio || element.height !== height * ratio) { element.width = width * ratio; element.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0) }
  context.clearRect(0, 0, width, height); context.fillStyle = '#07131f'; context.fillRect(0, 0, width, height)
  drawGrid(width, height); drawPreview(); drawAircraft()
}
function drawGrid(width: number, height: number) {
  if (!context) return; context.strokeStyle = '#173047'; context.lineWidth = 1
  for (let x = width % 50; x < width; x += 50) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke() }
  for (let y = height % 50; y < height; y += 50) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke() }
  const origin = project(0, 0); context.strokeStyle = '#31536c'; context.beginPath(); context.moveTo(0, origin.y); context.lineTo(width, origin.y); context.moveTo(origin.x, 0); context.lineTo(origin.x, height); context.stroke()
}
function drawPreview() {
  if (!context || !session.preview) return
  if (selection.layers.route) for (const route of session.preview.routes) { context.beginPath(); route.points.forEach((point, i) => { const p = project(point.x, point.y); i ? context!.lineTo(p.x, p.y) : context!.moveTo(p.x, p.y) }); context.strokeStyle = '#5b8ff9'; context.lineWidth = 2; context.setLineDash([7, 5]); context.stroke(); context.setLineDash([]) }
  for (const point of session.preview.points) {
    if ((point.kind === 'facility' && !selection.layers.facility) || (point.kind === 'obstacle' && !selection.layers.obstacle)) continue
    const p = project(point.x, point.y); context.fillStyle = point.kind === 'obstacle' ? '#ffbd45' : '#39d98a'; context.fillRect(p.x - 4, p.y - 4, 8, 8); context.fillStyle = '#9fb6c5'; context.font = '10px sans-serif'; context.fillText(point.label, p.x + 8, p.y + 3)
  }
}
function drawAircraft() {
  if (!context || !selection.layers.aircraft || !snapshotBuffer.current) return
  const current = snapshotBuffer.current, previous = snapshotBuffer.previous
  const durationMs = previous ? Math.max(16, (current.tS - previous.tS) * 1000) : 0
  const renderT = previous ? previous.tS + Math.min(1, (performance.now() - transitionStart) / durationMs) * (current.tS - previous.tS) : current.tS
  for (let i = 0; i < current.aircraftCount; i += 1) {
    const currentPos = { x: current.positions[i * 3] ?? 0, y: current.positions[i * 3 + 1] ?? 0, z: current.positions[i * 3 + 2] ?? 0 }
    let pos = currentPos
    if (previous && previous.aircraftCount === current.aircraftCount) pos = interpolatePosition(
      { x: previous.positions[i * 3] ?? 0, y: previous.positions[i * 3 + 1] ?? 0, z: previous.positions[i * 3 + 2] ?? 0 },
      { x: previous.velocities[i * 3] ?? 0, y: previous.velocities[i * 3 + 1] ?? 0, z: previous.velocities[i * 3 + 2] ?? 0 }, currentPos,
      { x: current.velocities[i * 3] ?? 0, y: current.velocities[i * 3 + 1] ?? 0, z: current.velocities[i * 3 + 2] ?? 0 }, previous.tS, current.tS, renderT, 100)
    const p = project(pos.x, pos.y), id = `AC-${100 + (current.aircraftIds[i] ?? 0)}`, selected = selection.selectedId === id
    context.save(); context.translate(p.x, p.y); context.rotate(current.headings[i] ?? 0); context.beginPath(); context.moveTo(9, 0); context.lineTo(-6, -5); context.lineTo(-3, 0); context.lineTo(-6, 5); context.closePath(); context.fillStyle = selected ? '#ffbd45' : '#49c6e5'; context.shadowColor = context.fillStyle; context.shadowBlur = selected ? 14 : 6; context.fill(); context.restore()
    context.fillStyle = selected ? '#ffda8d' : '#8fb4ca'; context.font = '9px monospace'; context.fillText(`${id}  ${Math.round(pos.z)}m`, p.x + 10, p.y - 7)
  }
}
function click(event: MouseEvent) {
  const current = snapshotBuffer.current; if (!current || !canvas.value) return
  let nearest: { id: string; distance: number } | undefined
  for (let i = 0; i < current.aircraftCount; i += 1) { const p = project(current.positions[i * 3] ?? 0, current.positions[i * 3 + 1] ?? 0); const d = Math.hypot(p.x - event.offsetX, p.y - event.offsetY); if (d < 22 && (!nearest || d < nearest.distance)) nearest = { id: `AC-${100 + (current.aircraftIds[i] ?? 0)}`, distance: d } }
  selection.select(nearest?.id)
}
function frame() { transitionStart = performance.now() }
watch(() => session.preview?.preview_revision_u64, () => { transitionStart = performance.now() })
onMounted(() => { context = canvas.value?.getContext('2d') ?? null; observer = new ResizeObserver(() => {}); if (canvas.value) observer.observe(canvas.value); snapshotBuffer.addEventListener('frame', frame); draw() })
onBeforeUnmount(() => { cancelAnimationFrame(raf); observer?.disconnect(); snapshotBuffer.removeEventListener('frame', frame) })
</script>
<template><canvas ref="canvas" aria-label="Virtual ENU simulation map" @click="click" /></template>
<style scoped>canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }</style>
