import type { ControlMessage, DocumentKind, FullState, StagedPreview, SubmitResult, ValidationReport } from '@/contracts'
import { runtimeConfig } from '@/config/runtime'
import type { GatewayTransport, ScenarioSummary, TransportConnection } from './GatewayTransport'

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T
  if (!response.ok) throw Object.assign(new Error(`Gateway request failed (${response.status})`), { body })
  return body
}

export class HttpGatewayTransport implements GatewayTransport {
  async createScenario() { return json<ScenarioSummary>(await fetch(`${runtimeConfig.apiBaseUrl}/scenarios`, { method: 'POST' })) }
  async uploadDocument(id: string, kind: DocumentKind, file: File) { return json<ValidationReport>(await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${id}/documents/${kind}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: file })) }
  async confirmDocument(id: string, kind: DocumentKind, revision: number, upstream: Partial<Record<DocumentKind, number>>) { return json<StagedPreview>(await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${id}/confirm/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot_revision_u64: revision, upstream_slot_revisions: upstream }) })) }
  async build(id: string) { return json<FullState>(await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${id}/build`, { method: 'POST' })) }
  async control(id: string, epochId: string, operation: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET' | 'RATE', args: Record<string, unknown> = {}) { return this.postCommand(id, { contract_version: '1.0.0', command_id: crypto.randomUUID(), epoch_id: epochId, operation: operation.toLowerCase(), args }) }
  async submit(id: string, text: string, epochId: string) { return json<SubmitResult>(await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${id}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'CLI', cli_text: text, epoch_id: epochId }) })) }
  connectControl(id: string, onMessage: (message: ControlMessage) => void, onState: (connected: boolean) => void): TransportConnection {
    const ws = new WebSocket(`${runtimeConfig.controlWsBaseUrl}/scenarios/${id}/control`)
    ws.onopen = () => { onState(true); ws.send(JSON.stringify({ type: 'hello', protocol_version: '1.0.0' })) }
    ws.onmessage = (event) => onMessage(JSON.parse(String(event.data)) as ControlMessage)
    ws.onclose = () => onState(false); ws.onerror = () => onState(false)
    return { close: () => ws.close() }
  }
  connectSnapshot(id: string, onFrame: (buffer: ArrayBuffer) => void, onState: (connected: boolean) => void): TransportConnection {
    const ws = new WebSocket(`${runtimeConfig.snapshotWsBaseUrl}/scenarios/${id}/snapshot`); ws.binaryType = 'arraybuffer'
    ws.onopen = () => { onState(true); ws.send(JSON.stringify({ type: 'hello', protocol_version: '1.0.0' })) }
    ws.onmessage = (event) => { if (event.data instanceof ArrayBuffer) onFrame(event.data) }
    ws.onclose = () => onState(false); ws.onerror = () => onState(false)
    return { close: () => ws.close() }
  }
  private async postCommand(id: string, body: Record<string, unknown>) { return json<SubmitResult>(await fetch(`${runtimeConfig.apiBaseUrl}/scenarios/${id}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })) }
}
