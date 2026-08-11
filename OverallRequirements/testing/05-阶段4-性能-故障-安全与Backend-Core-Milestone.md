# 阶段 4：性能、故障、安全与 Backend/Core Milestone

按 HITL 阶段组织目标、必须测试、机器证据、切换条件，并附对应设计测试条款。

## 内容来源
- HITL：7. 阶段 4：性能、故障、安全与 Backend/Core Milestone
- 设计：I.4 正式参考设备与 Benchmark fixture、I.5 Benchmark执行协议、I.6 性能通过标准、I.9 Fault injection matrix、I.12 Security and supply-chain tests、I.13 CI / release gates、I.14 Repository and release boundary、I.15 第一版发布完成门槛

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 关联文档

- [测试总览与追踪矩阵](00-总览与追踪矩阵.md)

## 规范正文

## 7. 阶段 4：性能、故障、安全与 Backend/Core Milestone

### 7.1 当前不测试的内容

因为 HTTP、WebSocket 和前端延期，本阶段不测试：

- HTTP route 和 status；
- control WS；
- snapshot WS；
- 网络重连和慢客户端；
- 浏览器 Snapshot decode；
- Vue/Pinia；
- Cesium/Flat Renderer；
- FPS/frame time；
- Hermite；
- accessibility；
- 浏览器 CSP/CORS。

这些项目只能标记为延期，不得标记为通过。

### 7.2 后端性能测试

| 测试项目 | 通过条件 |
|---|---|
| Warp CPU 1,000 @1× | Tick p99 `<=dt_s`；10 分钟无 backlog |
| Warp CUDA 4,000 @5× | Tick p99 `<=dt_s/5`；10 分钟无 backlog |
| Warp CUDA 20,000 @1× | Tick p99 `<=dt_s`；10 分钟无 backlog |
| Snapshot server path | encode+shared copy p95 `<=5 ms`；无 torn frame |
| 20k Build | validation/index/allocation/self-check 全通过；报告 stage time 和 peak memory |
| STOP drain | 无 active 工作时一个 control boundary；有 recovery/propagation 时完整排空 |

性能报告必须包含：

```text
p50 / p95 / p99 / max
raw samples
backlog
overrun count
host memory
GPU allocated/peak
kernel time
copy time
sort time
output pack time
JIT warm-up
measured duration
```

只报告平均值不构成通过。

### 7.3 故障注入测试

必须覆盖：

- Gateway queue full；
- Worker unavailable before admission；
- Module UNABLE；
- Runtime invariant failure；
- forced CUDA init failure；
- AUTO CUDA init failure；
- CUDA runtime failure；
- same-process generation mismatch；
- CRC mismatch；
- protocol major mismatch；
- reliable internal egress stalled；
- authoritative candidate overflow；
- Snapshot slot overwrite；
- Build 中途失败；
- hard worker process loss；
- STOP 期间新 Mutation。

每项测试报告应说明：

- 注入方式；
- 实际 fault/error/status；
- 哪些状态保持不变；
- 是否产生或没有产生 Command final；
- 是否产生或没有产生 event；
- 为什么该结果符合设计中的故障边界。

### 7.4 安全与发布边界测试

必须覆盖：

- duplicate key、深嵌套、oversized JSON/CLI、非法 UTF-8；
- `NaN`、`Infinity` 和非法 number；
- path traversal、absolute path、UNC、drive prefix、symlink escape；
- dataset fixed file set、bytes、release、datum、license；
- binary length、offset、alignment、reserved field、CRC、integer overflow 和 fuzz；
- metadata/log/event credential scan；
- deterministic codegen；
- dependency audit、SBOM 和 license；
- 地图数据、日志、cache、venv、node_modules、临时文件不进入 archive；
- clean environment 安装并运行 CPU 最简场景和 CUDA smoke。

### 7.5 Backend/Core Milestone 报告声明

阶段通过时，报告必须明确写出：

```text
已验证：
- Gateway Core
- Core simulation modules
- Warp CPU/CUDA
- 全部 CLI
- Event/Read Model/ViewerSnapshot data contracts
- Core performance
- Backend fault and security boundaries

未验证：
- HTTP Adapter
- WebSocket Adapters
- Frontend
- Browser rendering/decode/interpolation
- Network reconnect/backpressure behavior
- 完整第一版产品发布
```

---


## 对应设计测试条款

### I.4 正式参考设备与 Benchmark fixture

第一参考设备：

```text
Lenovo 90V2000RCP
Windows 11 Pro 64-bit
Intel Core i9-13900KF
约128 GiB RAM
NVIDIA RTX 3070 8 GiB, compute capability 8.6
正式证据记录当次实际driver
Warp CPU / cuda:0
同一RTX 3070同时承担CUDA仿真和Viewer渲染
```

实现/工具链范围：

```text
Gateway/Worker: CPython >=3.13,<3.14
Warp: warp-lang >=1.15,<1.16
Frontend: Node >=22,<25 + pnpm
Gateway: FastAPI + Pydantic v2 + asyncio
Frontend: Vue 3 + TypeScript strict + Vite
```

正式fixture：

```text
examples/benchmark/beijing20k/
frame.type = real_world_wgs84
bbox = 115.4–117.6°E / 39.4–41.1°N
Workspace target = 200 km × 200 km
WorkCell count = 100
Aircraft = 20,000 stable IDs, five-model mixture
route occurrences per Task = 32
active airspace fraction = 10%
random_seed = 20260724
formal dt_s = 0.05 s
snapshot publish target = 20 Hz at time_scale=1
```

Terrain/building读取第6.5.1节固定file set并校验文件名、bytes、release、datum、bbox和license guard；不得依赖在线服务。


### I.5 Benchmark执行协议

1. 进程冷启动并完成Backend self-check；JIT/compile时间单独报告。
2. 预热60 s，不计统计。
3. 连续测量10 min。
4. 禁止跳过物理Tick、改变dt、减少输入或关闭规定环境查询。
5. Viewer与CUDA共享GPU时保持正式图层集合。
6. 记录每Tick wall time、backlog、snapshot encode/copy、Gateway copy、browser decode、renderer frame time、queue depth和memory。
7. 不得出现`realtime_overrun`、authoritative overflow、worker failure或protocol error。
8. Snapshot允许latest-wins跳过旧显示帧，但物理Tick和committed generation不得缺失。


### I.6 性能通过标准

| Test | Pass criteria |
|---|---|
| Warp CPU 1,000 @ 1× | Tick wall time p99`<=dt_s`；10 min无backlog；离散parity通过。 |
| Warp CUDA 4,000 @ 5× | Tick wall time p99`<=dt_s/5`；10 min无backlog。 |
| Warp CUDA 20,000 @ 1× | Tick wall time p99`<=dt_s`；10 min无backlog。 |
| Viewer 20,000，同RTX 3070 | steady FPS`>=30`；frame-time p95`<=33.3 ms`。 |
| Snapshot server path | encode+shared-copy p95`<=5 ms`；无torn frame。 |
| Browser Snapshot Worker | CRC/section validation+TypedArray decode p95`<=8 ms`。 |
| Reliable control egress | final command/event/read-model bundle admission p99不超过一个Tick预算；不得丢失或重排。 |
| Three-file Build, 20k | 全部validation/index/allocation/self-check通过；报告peak memory和stage time。 |
| STOP drain | 无active工作时一个control boundary完成；有propagation/Recovery时按条件排空。 |

性能不足不得通过降低规定工作量或删除authoritative output绕过。


### I.9 Fault injection matrix

| Fault | Required behavior |
|---|---|
| Gateway queue full | Error`COMMAND_QUEUE_FULL`；无ingress sequence/QUEUED/event。 |
| Worker unavailable before admission | Error`WORKER_UNAVAILABLE`。 |
| Module UNABLE | final UNABLE；无partial domain event；Tick继续。 |
| Runtime invariant/array bounds | fail-stop；Session WORKER_FAILED。 |
| AUTO CUDA init failure | Build warning后CPU；READY后Backend固定。 |
| forced CUDA init failure | BUILD_FAILED`CUDA_UNAVAILABLE`。 |
| CUDA runtime failure | fail-stop；不切CPU。 |
| Cross-process CRC mismatch | 拒绝message/frame；authoritative corruption fail-stop。 |
| Same-process handle generation mismatch | fail-stop；不使用CRC掩盖。 |
| IPC major mismatch | handshake失败。 |
| Reliable egress stalled | fail-stop`RELIABLE_EGRESS_STALLED`。 |
| Authoritative buffer overflow | fail-stop`AUTHORITATIVE_CANDIDATE_OVERFLOW`。 |
| Snapshot slot overwrite | Gateway重读最新完整slot。 |
| Viewer CRC/section error | 丢弃display frame，不改变仿真。 |
| Unknown static Aircraft ID | 暂停frame并resync。 |
| Worker crash with fault latch | Kernel提交WORKER_FAILED；Gateway停止mutation/Snapshot。 |
| Hard process loss without fault output | Gateway只设置transport worker_status=FAILED并保留stale SessionState cache；不得合成SessionState或Command final。 |
| Build中途失败 | 删除临时allocation/index。 |
| STOP期间新Mutation | Gateway/session Error。 |


### I.12 Security and supply-chain tests

最低门槛：

- duplicate-key、deep nesting、oversized JSON/CLI/WS、malformed UTF-8；
- path traversal、absolute path injection、UNC、drive/symlink escape；
- dataset manifest/provenance fixed file set、bytes、release、license guard；
- metadata/log/event credential scan；
- command idempotency byte substitution；
- protocol length/offset/integer overflow、reserved-field和CRC范围；
- no arbitrary client filesystem write；
- loopback binding、CORS、CSP；
- dependency audit、SBOM、license和secret scan；
- release archive deny-list；
- 默认无联网telemetry和自动crash upload。


### I.13 CI / release gates

```text
G0  format / lint / static typecheck
G1  deterministic codegen from clean checkout; generated manifest schema exact; post-generation worktree has no diff
G2  JSON Schema / OpenAPI / registry / protocol compatibility
G3  unit / property / golden / fuzz corpus
G4  command / event / reason conformance and removed-spelling guards
G5  Warp CPU integration and determinism
G6  Warp CUDA parity on protected runner
G7  Gateway API / Frontend / Web Worker / E2E
G8  fault injection / security / license / SBOM
G9  scheduled performance benchmark
G10 release archive reproducibility and deny-list
```

正式release在完整数据和参考GPU执行G5–G9且零SKIP。


### I.14 Repository and release boundary

仓库至少包含：

```text
LICENSE
NOTICE
README.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
CHANGELOG.md
requirements.txt
requirements-dev.txt
package.json
pnpm-lock.yaml
generated/manifest.json
docs/compatibility-policy.md
docs/release-process.md
THIRD_PARTY_NOTICES/
sbom/
```

北京terrain/building数据不进入Git、release package或项目代码SBOM；本机目录由`.gitignore`整目录排除并保留license/attribution/provenance。禁止进入发布包：credential、`.env*`、虚拟环境、node_modules、Warp cache、build/dist、var、运行日志、event/trajectory/Snapshot存储、用户场景和临时文件。

Release preflight检查`git ls-files`、archive成员、固定deny-list和secret scan；发现本机地图数据或credential立即失败。


### I.15 第一版发布完成门槛

第一版只有同时满足：

1. 三个Schema、OpenAPI、registries、Ports和binary protocol与本文一致；
2. 正文和附录强制条款有实现/测试追踪；
3. Warp CPU完整功能与Warp CUDA parity通过；
4. 全部active operation/event/reason有conformance test；
5. removed spelling不可解析；未来功能无numeric code或公开占位；
6. Task/Resource/Environment/Execution/Projection/Gateway/Frontend闭环E2E；
7. 20,000 Aircraft性能门槛通过；
8. 故障、安全、license、SBOM和archive gate通过；
9. 文档、机器源、generated code、实现和测试无旧术语活动语义；
10. 第一版不包含第11部分功能的Schema/API/Command/event/Read Model/UI/server storage。
