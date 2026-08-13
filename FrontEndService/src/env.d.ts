/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRANSPORT_MODE?: 'mock' | 'http'
  readonly VITE_MOCK_AIRCRAFT_COUNT?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_CONTROL_WS_BASE_URL?: string
  readonly VITE_SNAPSHOT_WS_BASE_URL?: string
  readonly VITE_CESIUM_ION_TOKEN?: string
  readonly VITE_BASEMAP_URL?: string
}

interface ImportMeta { readonly env: ImportMetaEnv }
