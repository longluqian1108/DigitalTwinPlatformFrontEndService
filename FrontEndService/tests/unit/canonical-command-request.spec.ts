import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpGatewayTransport, GatewayHttpError } from '@/services/HttpGatewayTransport'

// A-07: control() must POST the strict CanonicalCommandRequest envelope
// {contract_version, command_id, epoch_id, operation, args} — no cli_text/source.
describe('canonical command request body (A-07)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the strict envelope with lower-case canonical operation', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ command_id: 'c-1', epoch_id: 'e-1', canonical_ingress_sequence: 1, status: 'QUEUED', operation: 'start' }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' })

    const transport = new HttpGatewayTransport()
    const receipt = await transport.control('scenario-1', 'e-1', { operation: 'start', args: {} })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:8000/api/v1/scenarios/scenario-1/commands')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      contract_version: '1.0.0',
      command_id: 'fixed-uuid',
      epoch_id: 'e-1',
      operation: 'start',
      args: {}
    })
    expect(receipt.status).toBe('QUEUED')
  })

  it('surfaces the gateway error envelope code and message', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'EPOCH_MISMATCH', message: 'The command epoch does not match the current session epoch.', details: {} } }), { status: 409 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid' })

    const transport = new HttpGatewayTransport()
    const error = await transport.control('scenario-1', 'stale-epoch', { operation: 'stop', args: {} }).catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(GatewayHttpError)
    expect((error as GatewayHttpError).code).toBe('EPOCH_MISMATCH')
    expect((error as GatewayHttpError).status).toBe(409)
  })
})
