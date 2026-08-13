import type {
  ControlMessage, DocumentKind, FullState, SessionState, StagedPreview,
  SubmitResult, ValidationReport
} from '@/contracts'

export interface ScenarioSummary {
  scenarioId: string
  sessionState: SessionState
  epochId?: string
  preview?: StagedPreview
}

export interface TransportConnection { close(): void }

export interface GatewayTransport {
  createScenario(): Promise<ScenarioSummary>
  uploadDocument(scenarioId: string, kind: DocumentKind, file: File): Promise<ValidationReport>
  confirmDocument(scenarioId: string, kind: DocumentKind, revision: number, upstream: Partial<Record<DocumentKind, number>>): Promise<StagedPreview>
  build(scenarioId: string): Promise<FullState>
  control(scenarioId: string, epochId: string, operation: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET' | 'RATE', args?: Record<string, unknown>): Promise<SubmitResult>
  submit(scenarioId: string, text: string, epochId: string): Promise<SubmitResult>
  connectControl(scenarioId: string, onMessage: (message: ControlMessage) => void, onState: (connected: boolean) => void): TransportConnection
  connectSnapshot(scenarioId: string, onFrame: (buffer: ArrayBuffer) => void, onState: (connected: boolean) => void): TransportConnection
}
