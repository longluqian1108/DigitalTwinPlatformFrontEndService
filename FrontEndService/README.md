# LightBlueSky Frontend Service

Vue 3 + TypeScript strict workstation for the LightBlueSky v1 public contracts. The application owns interaction and display state only; authoritative simulation facts always come from the Gateway projections.

## Run locally

Requirements: Node.js 22+ and npm 10+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:5173`. Mock mode is the default. In the Loader, use the sample files linked by the UI or upload these in order:

1. `public/mock-data/environment.json`
2. `public/mock-data/resource.json`
3. `public/mock-data/task.json`

Confirm every revision, select **Build simulation**, then use **Start**. Try `TIME`, `LIST_TASKS`, `BOGUS`, `SEL AC-101`, or `SEL AC-101 UNABLE` in the CLI.

## Architecture

```text
Vue views → Pinia low-rate Read Models → GatewayTransport
                                      ├─ MockGatewayTransport
                                      └─ HttpGatewayTransport → HTTP/control WS

snapshot WS → Web Worker validation/decode → non-reactive TypedArray double buffer → renderer
```

- Pinia never owns per-frame Aircraft arrays.
- Gateway errors, Queries, QUEUED, and final CommandStatus are separate UI paths.
- Events cover the current connection only; reconnect boundaries explicitly state that history is unavailable.
- `virtual_enu` uses the Canvas flat renderer. `real_world_wgs84` lazy-loads Cesium and supports token-free empty-basemap fallback.
- Hermite interpolation is browser-only, bounded between adjacent authoritative frames, and falls back to linear when outside its safety envelope.

## Real Gateway mode

Set `VITE_TRANSPORT_MODE=http` and configure the three base URLs in `.env.local`. The current TypeScript contracts are maintained from `OverallRequirements`; replace the internals of `HttpGatewayTransport` with generated OpenAPI types when a machine-readable contract becomes available.

## Verification

```bash
npm run typecheck
npm test
npm run test:performance
npm run build
npx playwright install chromium   # first machine setup only
npm run test:e2e
```

The unit suite covers Snapshot CRC/sections/static IDs, Hermite boundaries, runtime control permissions, and a 20k decode baseline. Formal 20k FPS evidence must still be recorded on the target Chrome/Edge and GPU because CI timing alone is not hardware acceptance evidence.

Production output is written to `dist/`. Serve it as an SPA and route API/WS traffic to the Gateway; Cesium workers and assets are emitted under `dist/cesium/`.

For an interactive 20,000-Aircraft renderer run, set `VITE_MOCK_AIRCRAFT_COUNT=20000` in `.env.local`, restart the dev server, complete the same three-file Build, and press **Start**. Record FPS/frame-time on the target Windows Chrome/Edge and GPU; the default remains 6 for convenient functional development.
