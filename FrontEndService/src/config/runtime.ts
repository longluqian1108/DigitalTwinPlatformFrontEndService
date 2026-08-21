export const runtimeConfig = Object.freeze({
  contractVersion: '1.0.0',
  transportMode: import.meta.env.VITE_TRANSPORT_MODE ?? 'mock',
  mockAircraftCount: Math.max(
    1,
    Math.min(20_000, Number.parseInt(import.meta.env.VITE_MOCK_AIRCRAFT_COUNT ?? '6', 10) || 6),
  ),
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080/api/v1',
  controlWsBaseUrl: import.meta.env.VITE_CONTROL_WS_BASE_URL ?? 'ws://127.0.0.1:8080/ws/v1',
  snapshotWsBaseUrl: import.meta.env.VITE_SNAPSHOT_WS_BASE_URL ?? 'ws://127.0.0.1:8080/ws/v1',
  cesiumIonToken: import.meta.env.VITE_CESIUM_ION_TOKEN ?? '',
  basemapUrl: import.meta.env.VITE_BASEMAP_URL ?? '',
})
