<script setup lang="ts">
import { NButton, NButtonGroup, NInputNumber, useDialog } from 'naive-ui'
import { ref } from 'vue'
import { useRuntimeStore } from '@/stores/runtimeStore'

const runtime = useRuntimeStore(), dialog = useDialog(), rate = ref(1)
function send(operation: 'START' | 'PAUSE' | 'RESUME' | 'RATE') { void runtime.control(operation, operation === 'RATE' ? { scale: rate.value } : undefined) }
function confirm(operation: 'STOP' | 'RESET') {
  const isStop = operation === 'STOP'
  dialog.warning({
    title: `${isStop ? 'Stop' : 'Reset'} simulation?`,
    content: isStop
      ? 'This ends the current epoch and it cannot be resumed. The current committed state will be published. No server-side history or replay artifact is created.'
      : 'This creates a new epoch from the confirmed three-file build basis. Runtime-added Tasks, VOL/AX overlays, destruction latches and tombstones do not carry over.',
    positiveText: isStop ? 'Stop' : 'Reset', negativeText: 'Cancel', onPositiveClick: () => runtime.control(operation)
  })
}
</script>

<template>
  <div class="controls">
    <NButtonGroup size="tiny">
      <NButton :disabled="!runtime.isAllowed('START')" @click="send('START')">Start</NButton>
      <NButton :disabled="!runtime.isAllowed('PAUSE')" @click="send('PAUSE')">Pause</NButton>
      <NButton :disabled="!runtime.isAllowed('RESUME')" @click="send('RESUME')">Resume</NButton>
      <NButton :disabled="!runtime.isAllowed('STOP')" type="warning" @click="confirm('STOP')">Stop</NButton>
      <NButton :disabled="!runtime.isAllowed('RESET')" @click="confirm('RESET')">Reset</NButton>
    </NButtonGroup>
    <NInputNumber v-model:value="rate" size="tiny" :min="0.1" :max="100" :step="0.5" :show-button="false" :disabled="!runtime.isAllowed('RATE')" aria-label="Simulation rate" />
    <NButton size="tiny" :disabled="!runtime.isAllowed('RATE')" @click="send('RATE')">Rate</NButton>
  </div>
</template>

<style scoped>.controls { display: flex; align-items: center; gap: 5px; }.controls :deep(.n-input-number) { width: 72px; }</style>
