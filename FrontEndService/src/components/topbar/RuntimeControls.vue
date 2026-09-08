<script setup lang="ts">
import { NButton, NButtonGroup, useDialog } from 'naive-ui'
import type { RuntimeControlOperation } from '@/services/GatewayTransport'
import { useRuntimeStore } from '@/stores/runtimeStore'

// Stage 1 top-bar controls: only the two session operations the Gateway
// registry admits (start/stop). hold_task/cancel_task/takeoff/land live in
// the command palette; pause/resume/reset/rate are not Stage-1 operations
// and are never rendered.
const runtime = useRuntimeStore(), dialog = useDialog()
function send(operation: Extract<RuntimeControlOperation, 'start'>) { void runtime.control({ operation, args: {} }) }
function confirmStop() {
  dialog.warning({
    title: 'Stop simulation?',
    content: 'This ends the current epoch and it cannot be resumed. The current committed state will be published. No server-side history or replay artifact is created.',
    positiveText: 'Stop', negativeText: 'Cancel', onPositiveClick: () => runtime.control({ operation: 'stop', args: {} })
  })
}
</script>

<template>
  <div class="controls">
    <NButtonGroup size="tiny">
      <NButton :disabled="!runtime.isAllowed('start')" @click="send('start')">Start</NButton>
      <NButton :disabled="!runtime.isAllowed('stop')" type="warning" @click="confirmStop()">Stop</NButton>
    </NButtonGroup>
  </div>
</template>

<style scoped>.controls { display: flex; align-items: center; gap: 5px; }</style>
