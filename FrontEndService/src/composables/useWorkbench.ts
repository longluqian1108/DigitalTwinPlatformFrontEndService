import { onBeforeUnmount } from 'vue'
import type {
  ControlFullState,
  Freshness,
  ReadModelDelta,
  SessionState,
  Stage1ControlServerMessage,
} from '@/contracts'
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
  const session = useSessionStore(),
    runtime = useRuntimeStore(),
    tasks = useTaskStore(),
    resources = useResourceStore(),
    environment = useEnvironmentStore()
  const events = useEventStore(),
    commands = useCommandStore(),
    connections = useConnectionStore()
  const selection = useSelectionStore()
  let controlConnection: TransportConnection | undefined,
    snapshotConnection: TransportConnection | undefined
  let lastGeneration = -1
  let reconnectTimer: number | undefined,
    connectionGeneration = 0,
    disposed = false
  // Stage-1 service reality: the control WS only accepts the handshake after the
  // START command created the worker; a pre-START connection is closed before
  // hello. Track hello-per-connection so reconnects before the handshake stay
  // silent (no synthetic boundary events), and reconnect right after START.
  let handshaken = false
  const pipeline = new SnapshotPipeline(
    () => {
      connections.lastSnapshotAt = performance.now()
      connections.snapshotError = ''
    },
    (message) => {
      connections.snapshotError = message
    },
  )

  // A-04: ControlFullState is the field family (no local FullState aggregate).
  // Stage 1 only ships mode:'all' collections (v8 G.18); the paged branch stays
  // unimplemented until P-02/P-04.
  function applyFullState(message: ControlFullState) {
    if (runtime.model.epoch_id && runtime.model.epoch_id !== message.runtime.epoch_id) {
      pipeline.reset()
      selection.clear()
      resources.clear()
    }
    const watermark: Freshness = {
      epoch_id: message.epoch_id,
      source_generation: message.source_generation,
      source_tick_index: message.source_tick_index,
      source_t_s: message.source_t_s,
    }
    lastGeneration = message.source_generation
    runtime.apply(message.runtime)
    tasks.replace(
      message.all_or_paged_task_summary.mode === 'all'
        ? message.all_or_paged_task_summary.items
        : [],
      watermark,
    )
    resources.replace(
      message.all_or_paged_resource_summary.mode === 'all'
        ? message.all_or_paged_resource_summary.items
        : [],
      watermark,
    )
    environment.replace(message.environment, watermark)
  }

  // A-05: apply a read_model_delta only when its generation is exactly next;
  // any gap falls back to a full resync request.
  function applyReadModelDelta(delta: ReadModelDelta) {
    if (delta.source_generation !== lastGeneration + 1) {
      requestFullResync()
      return
    }
    lastGeneration = delta.source_generation
    const watermark: Freshness = {
      epoch_id: delta.epoch_id,
      source_generation: delta.source_generation,
      source_tick_index: delta.source_tick_index,
      source_t_s: delta.source_t_s,
    }
    tasks.upsert(delta.task_upserts)
    tasks.remove(delta.task_removals)
    resources.upsertAircraft(delta.aircraft_upserts)
    resources.upsertResources(delta.resource_upserts)
    if (delta.environment_delta) environment.replace(delta.environment_delta, watermark)
    if (delta.runtime_delta) runtime.apply(delta.runtime_delta)
    tasks.freshness = watermark
    resources.freshness = watermark
  }

  function requestFullResync() {
    // Stage 1 has no HTTP full-state fetch for a built epoch; reconnecting the
    // control WS replays hello -> full_state (v8 9.10 push sequence).
    connect()
  }

  // A-01: six-member Stage1ControlServerMessage union; worker_failed and the
  // wire connection_boundary are gone (delta P-05/D-01); boundary is local-only.
  function handleControl(message: Stage1ControlServerMessage) {
    if (message.type === 'hello') {
      handshaken = true
      connections.serverHello = message
      session.syncRuntime(message.session_state as SessionState, session.epochId)
    } else if (message.type === 'full_state') applyFullState(message)
    else if (message.type === 'snapshot_static_table') {
      connections.replaceStaticTable(message.entries)
      pipeline.setStaticTable(message.entries)
    } else if (message.type === 'event') events.add(message.event)
    else if (message.type === 'command_status') commands.update(message)
    else if (message.type === 'read_model_delta') applyReadModelDelta(message)
  }

  function scheduleReconnect() {
    if (disposed || reconnectTimer !== undefined) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, 1_500)
  }

  function connect() {
    const generation = ++connectionGeneration
    handshaken = false
    controlConnection?.close()
    snapshotConnection?.close()
    connections.control = 'connecting'
    connections.snapshot = 'connecting'
    controlConnection = gatewayTransport.connectControl(
      session.scenarioId,
      session.epochId,
      handleControl,
      (connected) => {
        if (generation !== connectionGeneration) return
        const wasConnected = connections.control === 'connected'
        connections.control = connected ? 'connected' : 'disconnected'
        if (!connected) {
          if (wasConnected && handshaken)
            events.boundary(
              session.epochId,
              'Control connection lost. Event history will not be recovered.',
            )
          scheduleReconnect()
        }
      },
    )
    snapshotConnection = gatewayTransport.connectSnapshot(
      session.scenarioId,
      session.epochId,
      {
        onHello: (hello) => {
          connections.snapshotHello = hello
        },
        onFrame: (buffer) => pipeline.accept(buffer),
      },
      (connected) => {
        if (generation !== connectionGeneration) return
        connections.snapshot = connected ? 'connected' : 'disconnected'
        if (!connected) scheduleReconnect()
      },
    )
  }

  async function boot() {
    runtime.onStartSubmitted(() => {
      if (!disposed) connect()
    })
    await session.initialize()
  }
  // A-08: build() now completes via polling; the full_state is the first control
  // WS push after connect (hello -> full_state -> static table -> cached
  // statuses -> live). Pre-START connects on the real service are closed before
  // hello and simply reconnect (silent until handshaken).
  async function build() {
    await session.build()
    connect()
  }
  onBeforeUnmount(() => {
    disposed = true
    connectionGeneration += 1
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
    controlConnection?.close()
    snapshotConnection?.close()
    pipeline.close()
  })
  return { boot, build, connect, applyFullState }
}
