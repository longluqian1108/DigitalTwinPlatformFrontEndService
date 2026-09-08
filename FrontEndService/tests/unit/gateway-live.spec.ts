// @vitest-environment node
// Live end-to-end verification of the adapted HttpGatewayTransport against the
// real Stage-1 backend service (E2E layer of the frontend adaptation task).
// Gated: run with LIGHTBLUESKY_LIVE_BACKEND=1 and the gateway listening on
// 127.0.0.1:8000 (start it from the backend worktree with
// `PYTHONPATH=.;src;generated/python python -m lightbluesky.gateway.service`).
// Backend Stage-1 behavior: the control/snapshot WS only accepts the handshake
// after the START command created the worker, so the spec connects post-START
// with a short retry (same policy the adapted workbench implements).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Stage1ControlServerMessage } from '@/contracts'
import { HttpGatewayTransport } from '@/services/HttpGatewayTransport'
import { GatewayHttpError } from '@/services/HttpGatewayTransport'

const live = process.env.LIGHTBLUESKY_LIVE_BACKEND ? describe : describe.skip
const backendRoot = process.env.LIGHTBLUESKY_BACKEND_ROOT ?? resolve(process.cwd(), '..', '..', 'Simulator-authority-worktree')
const fixture = (name: string) => new File([readFileSync(resolve(backendRoot, 'tests/fixtures/stage1/cpu_lifecycle', name))], name, { type: 'application/json' })

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

live('live gateway flow (A-06/A-07/A-08 against real backend)', () => {
  const transport = new HttpGatewayTransport()
  const cleanup: Array<() => void> = []

  afterEach(() => { for (const close of cleanup) close(); cleanup.length = 0 })

  it('walks create -> upload -> confirm -> build -> READY -> start -> live WS -> stop', async () => {
    // 201 ScenarioSession
    const session = await transport.createScenario()
    const scenarioId = session.scenario_id
    expect(session.state).toBe('EMPTY')
    expect(Object.keys(session.document_slots).sort()).toEqual(['environment', 'resource', 'task'])

    // upload -> 200 DocumentUploadResult; confirm -> 200 ScenarioSession (order enforced upstream-first)
    const revisions: Record<'environment' | 'resource' | 'task', number> = { environment: 0, resource: 0, task: 0 }
    for (const kind of ['environment', 'resource', 'task'] as const) {
      const uploaded = await transport.uploadDocument(scenarioId, kind, fixture(`${kind}.json`))
      expect(uploaded.validation_report.valid, `${kind} fixture must be valid`).toBe(true)
      expect(uploaded.staged_preview.session_state).toBe('LOADING')
      revisions[kind] = uploaded.validation_report.slot_revision_u64
      const upstream = kind === 'environment' ? {} : kind === 'resource' ? { environment: revisions.environment } : { environment: revisions.environment, resource: revisions.resource }
      const confirmed = await transport.confirmDocument(scenarioId, kind, { slot_revision_u64: revisions[kind], upstream_slot_revisions: upstream })
      expect(confirmed.document_slots[kind].state).toBe('CONFIRMED')
    }

    // build -> 202 BuildJob; poll -> READY with a fresh epoch
    const job = await transport.build(scenarioId)
    expect(job.state).toBe('QUEUED')
    let status = await transport.buildStatus(scenarioId, job.build_job_id)
    const deadline = Date.now() + 60_000
    while (status.state === 'QUEUED' || status.state === 'BUILDING') {
      if (Date.now() > deadline) throw new Error('build polling timed out')
      await sleep(300)
      status = await transport.buildStatus(scenarioId, job.build_job_id)
    }
    expect(status.state).toBe('READY')
    if (status.state !== 'READY') throw new Error('unreachable')
    const epochId = status.epoch_id
    expect(epochId).toBeTruthy()

    // START -> 202 CommandReceipt (queued), then the control WS accepts the handshake.
    const receipt = await transport.control(scenarioId, epochId, { operation: 'start', args: {} })
    expect(receipt.status).toBe('QUEUED')
    expect(receipt.operation).toBe('start')

    const messages: Stage1ControlServerMessage[] = []
    const connected = (async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const outcome = await new Promise<true | 'closed'>((resolveConnect) => {
          let done = false
          const connection = transport.connectControl(scenarioId, epochId, (message) => {
            messages.push(message)
            if (message.type === 'hello' && !done) { done = true; resolveConnect(true) }
          }, (ok) => { if (!ok && !done) { done = true; resolveConnect('closed') } })
          cleanup.push(() => connection.close())
        })
        if (outcome === true) return
        await sleep(150)
      }
      throw new Error('control WS never accepted the handshake after START')
    })()
    await connected

    // Opening push sequence: hello -> full_state -> snapshot_static_table (v8 9.10).
    const deadlineOpening = Date.now() + 5_000
    while (!messages.some((message) => message.type === 'snapshot_static_table')) {
      if (Date.now() > deadlineOpening) throw new Error(`opening push incomplete: ${JSON.stringify(messages.map((message) => message.type))}`)
      await sleep(100)
    }
    const hello = messages.find((message) => message.type === 'hello')
    expect(hello && hello.type === 'hello' && hello.epoch_id).toBe(epochId)
    expect(hello && hello.type === 'hello' && hello.history_available).toBe(false)
    expect(messages.some((message) => message.type === 'full_state')).toBe(true)
    expect(messages.some((message) => message.type === 'snapshot_static_table')).toBe(true)
    const fullState = messages.find((message) => message.type === 'full_state')
    expect(fullState && fullState.type === 'full_state' && fullState.all_or_paged_task_summary.mode).toBe('all')

    // Live data plane: deltas flow on every committed generation while RUNNING.
    await sleep(2_500)
    expect(messages.some((message) => message.type === 'read_model_delta')).toBe(true)

    // state endpoint (A-10) reports the live runtime as fresh.
    const state = await transport.state(scenarioId)
    expect('stale' in state).toBe(false)
    expect(state.data.session_state).toBe('RUNNING')

    // snapshot WS: JSON SnapshotHello then binary frames (A-06).
    const snapshotHello = await new Promise<true>((resolveHello, rejectHello) => {
      let done = false
      const connection = transport.connectSnapshot(scenarioId, epochId, {
        onHello: (helloMessage) => { if (!done) { done = true; expect(helloMessage.type).toBe('snapshot_hello'); expect(helloMessage.epoch_id).toBe(epochId); expect(helloMessage.viewer_snapshot_contract_version).toBe('1.0.0'); resolveHello(true) } },
        onFrame: () => undefined
      }, (ok) => { if (!ok && !done) { done = true; rejectHello(new Error('snapshot WS closed before hello')) } })
      cleanup.push(() => connection.close())
      setTimeout(() => { if (!done) rejectHello(new Error('snapshot hello timed out')) }, 8_000)
    })
    expect(snapshotHello).toBe(true)

    // STOP ends the epoch; commands apply asynchronously at tick boundaries,
    // so poll the state endpoint until it reports STOPPED.
    await transport.control(scenarioId, epochId, { operation: 'stop', args: {} })
    const stopDeadline = Date.now() + 15_000
    for (;;) {
      const stopped = await transport.state(scenarioId)
      if (stopped.data.session_state === 'STOPPED') break
      if (Date.now() > stopDeadline) throw new Error(`stop not applied, state still ${stopped.data.session_state}`)
      await sleep(300)
    }

    // Event observation: report which domain events the live connection saw.
    const eventNames = new Set(messages.flatMap((message) => message.type === 'event' ? [message.event.event_name] : []))
    console.log('[gateway-live] events seen:', JSON.stringify(Array.from(eventNames)))
  }, 90_000)

  it('surfaces the gateway error envelope on a bad epoch (A-08)', async () => {
    const session = await transport.createScenario()
    const error = await transport.control(session.scenario_id, '00000000-0000-4000-8000-000000000000', { operation: 'start', args: {} }).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(GatewayHttpError)
    expect((error as GatewayHttpError).code).toBe('WORKER_UNAVAILABLE')
  })
})
