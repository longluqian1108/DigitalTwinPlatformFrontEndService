import { runtimeConfig } from '@/config/runtime'
import { MockGatewayTransport } from '@/mocks/MockGatewayTransport'
import { HttpGatewayTransport } from './HttpGatewayTransport'

export const gatewayTransport =
  runtimeConfig.transportMode === 'http' ? new HttpGatewayTransport() : new MockGatewayTransport()
