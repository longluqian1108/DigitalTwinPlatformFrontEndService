import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), viteStaticCopy({ targets: [
    { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'cesium' },
    { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'cesium' },
    { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'cesium' },
    { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'cesium' }
  ] })],
  define: { CESIUM_BASE_URL: JSON.stringify('/cesium') },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5173 },
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true }
})
