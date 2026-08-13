import { onBeforeUnmount } from 'vue'
import type { ControlMessage, Freshness, FullState } from '@/contracts'
import type { TransportConnection } from '@/services/GatewayTransport'
import { gatewayTransport } from '@/services/transport'
import { SnapshotPipeline } from '@/snapshot/SnapshotPipeline'
import { useCommandStore } from '@/stores/commandStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useEnvironmentStore } from '@/stores/environmentStore'
import { useEventStore } from '@/stores/eventStore'
import { useResourceStore } from '@/stores/resourceStore'
import { useRuntimeStore } from '@/stores/runtimeStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useTaskStore } from '@/stores/taskStore'

export function useWorkbench() {
  const session = useSessionStore(), runtime = useRuntimeStore(), tasks = useTaskStore(), resources = useResourceStore(), environment = useEnvironmentStore()
  const events = useEventStore(), commands = useCommandStore(), connections = useConnectionStore()
  const selection = useSelectionStore()
  let controlConnection: TransportConnection | undefined, snapshotConnection: TransportConnection | undefined
  let reconnectTimer: number | undefined, connectionGeneration = 0, disposed = false
  const pipeline = new SnapshotPipeline(() => { connections.lastSnapshotAt = performance.now(); connections.snapshotError = '' }, (message) => { connections.snapshotError = message })

  function applyFullState(state: FullState) {
    if (runtime.model.epoch_id && runtime.model.epoch_id !== state.runtime.epoch_id) { pipeline.reset(); selection.clear() }
    const watermark: Freshness = { epoch_id: state.runtime.epoch_id, generation: state.runtime.generation, tick_index: state.runtime.tick_index, t_s: state.runtime.t_s }
    runtime.apply(state.runtime); tasks.replace(state.tasks, watermark); resources.replace(state.aircraft, state.facilities, watermark); environment.replace(state.environment, watermark)
  }

  function handleControl(message: ControlMessage) {
    if (message.type === 'full_state') applyFullState(message.state)
    else if (message.type === 'snapshot_static_table') { connections.replaceStaticTable(message.entries); pipeline.setStaticTable(message.entries) }
    else if (message.type === 'event') events.add(message)
    else if (message.type === 'command_status') commands.update(message)
    else if (message.type === 'connection_boundary') events.boundary(message.epoch_id, message.message)
    else if (message.type === 'worker_failed') connections.workerFailure = message.message
  }

  function scheduleReconnect() {
    if (disposed || reconnectTimer !== undefined) return
    reconnectTimer = window.setTimeout(() => { reconnectTimer = undefined; connect() }, 1_500)
  }

  function connect() {
    const generation = ++connectionGeneration
    controlConnection?.close(); snapshotConnection?.close()
    connections.control = 'connecting'; connections.snapshot = 'connecting'
    controlConnection = gatewayTransport.connectControl(session.scenarioId, handleControl, (connected) => {
      if (generation !== connectionGeneration) return
      const wasConnected = connections.control === 'connected'; connections.control = connected ? 'connected' : 'disconnected'
      if (!connected) { if (wasConnected) events.boundary(session.epochId, 'Control connection lost. Event history will not be recovered.'); scheduleReconnect() }
    })
    snapshotConnection = gatewayTransport.connectSnapshot(session.scenarioId, (buffer) => pipeline.accept(buffer), (connected) => { if (generation !== connectionGeneration) return; connections.snapshot = connected ? 'connected' : 'disconnected'; if (!connected) scheduleReconnect() })
  }

  async function boot() { await session.initialize() }
  async function build() { const state = await session.build(); if (state) { applyFullState(state); connect() } }
  onBeforeUnmount(() => { disposed = true; connectionGeneration += 1; if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer); controlConnection?.close(); snapshotConnection?.close(); pipeline.close() })
  return { boot, build, connect, applyFullState }
}
