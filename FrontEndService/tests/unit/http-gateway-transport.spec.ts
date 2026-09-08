import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpGatewayTransport } from '@/services/HttpGatewayTransport'

class WebSocketStub {
  static instances: WebSocketStub[] = []

  readonly sent: string[] = []
  readonly received: string[] = []
  binaryType = ''
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(readonly url: string) {
    WebSocketStub.instances.push(this)
  }

  send(value: string) { this.sent.push(value) }
  close() { this.onclose?.() }
  open() { this.onopen?.() }
  receive(value: string) {
    this.received.push(value)
    this.onmessage?.({ data: value } as MessageEvent)
  }
}

describe('HTTP Gateway WebSocket hello (A-01/A-06)', () => {
  afterEach(() => {
    WebSocketStub.instances.length = 0
    vi.unstubAllGlobals()
  })

  it('binds both client hello messages to the current epoch', () => {
    vi.stubGlobal('WebSocket', WebSocketStub)
    const transport = new HttpGatewayTransport()
    const epochId = '00112233-4455-6677-8899-aabbccddeeff'

    transport.connectControl('scenario-1', epochId, vi.fn(), vi.fn())
    transport.connectSnapshot('scenario-1', epochId, { onHello: vi.fn(), onFrame: vi.fn() }, vi.fn())

    expect(WebSocketStub.instances.map((socket) => socket.url)).toEqual([
      'ws://127.0.0.1:8000/ws/v1/scenarios/scenario-1/control',
      'ws://127.0.0.1:8000/ws/v1/scenarios/scenario-1/snapshot'
    ])
    for (const socket of WebSocketStub.instances) {
      socket.open()
      expect(JSON.parse(socket.sent[0]!)).toEqual({
        type: 'hello',
        protocol_version: '1.0.0',
        epoch_id: epochId
      })
    }
  })

  it('dispatches the snapshot hello JSON before binary frames (A-06)', () => {
    vi.stubGlobal('WebSocket', WebSocketStub)
    const transport = new HttpGatewayTransport()
    const onHello = vi.fn(), onFrame = vi.fn()
    transport.connectSnapshot('scenario-1', 'e-1', { onHello, onFrame }, vi.fn())
    const socket = WebSocketStub.instances[0]!
    socket.open()
    socket.receive(JSON.stringify({ type: 'snapshot_hello', protocol_version: '1.0.0', epoch_id: 'e-1', viewer_snapshot_contract_version: '1.0.0', workspace_origin_ecef_f64: [0, 0, 0], workspace_enu_to_ecef_rotation_f64: [1, 0, 0, 0, 1, 0, 0, 0, 1], latest_sequence: 0 }))
    socket.onmessage?.({ data: new ArrayBuffer(8) } as MessageEvent)

    expect(onHello).toHaveBeenCalledTimes(1)
    expect(onHello.mock.calls[0]![0].type).toBe('snapshot_hello')
    expect(onFrame).toHaveBeenCalledTimes(1)
  })
})
