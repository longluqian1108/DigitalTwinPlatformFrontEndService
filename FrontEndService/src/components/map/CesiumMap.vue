<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Viewer } from 'cesium'
import { runtimeConfig } from '@/config/runtime'
const container = ref<HTMLElement>(), failure = ref('')
let viewer: Viewer | undefined
onMounted(async () => {
  try {
    const Cesium = await import('cesium')
    if (runtimeConfig.cesiumIonToken) Cesium.Ion.defaultAccessToken = runtimeConfig.cesiumIonToken
    viewer = new Cesium.Viewer(container.value!, { baseLayer: false, geocoder: false, homeButton: false, sceneModePicker: true, timeline: false, animation: false, navigationHelpButton: false, fullscreenButton: false })
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(116.391, 39.907, 5000) })
  } catch (cause) { failure.value = cause instanceof Error ? cause.message : 'Cesium initialization failed' }
})
onBeforeUnmount(() => { if (viewer && !viewer.isDestroyed()) viewer.destroy() })
</script>
<template><div ref="container" class="cesium"><div v-if="failure" class="failure">Cesium unavailable: {{ failure }}</div></div></template>
<style scoped>.cesium { position: relative; width: 100%; height: 100%; background: #07131f; }.failure { position: absolute; inset: 0; display: grid; place-items: center; color: var(--amber); }</style>
