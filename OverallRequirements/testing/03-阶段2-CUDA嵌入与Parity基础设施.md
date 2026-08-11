# 阶段 2：CUDA 嵌入与 Parity 基础设施

按 HITL 阶段组织目标、必须测试、机器证据、切换条件，并附对应设计测试条款。

## 内容来源
- HITL：5. 阶段 2：CUDA 嵌入与 Parity 基础设施
- 设计：I.2 CPU/CUDA parity 分类、I.3 Determinism corpus

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 关联文档

- [测试总览与追踪矩阵](00-总览与追踪矩阵.md)

## 规范正文

## 5. 阶段 2：CUDA 嵌入与 Parity 基础设施

### 5.1 阶段目标

阶段 1 的完全相同业务 slice 必须运行于：

```text
Warp CPU
Warp CUDA
```

CPU/CUDA 使用同一套 Warp kernel、generated layout、常量和业务语义。

从本阶段结束开始，所有新增业务必须 CPU/CUDA 同步完成。

### 5.2 必须完成的 AI 测试

| 测试项目 | 目的 | 主要机器输出 | 成功说明 |
|---|---|---|---|
| CUDA startup self-check | 证明 CUDA backend 可正式运行 | layout/copy/smoke/output result | 全部自检通过后才 READY |
| 强制 CUDA 初始化失败 | 证明 `backend=cuda` 不回退 | Build result、backend_active | BUILD_FAILED，不激活 CPU |
| AUTO fallback | 证明 fallback 只发生在 Build | warning、backend_active | warning 后 CPU READY，epoch 内固定 |
| 离散 parity | 证明业务语义一致 | state、cursor、status、event、fatal set | 全部 bit-exact |
| 数值 parity | 验证允许的浮点差异 | abs/ULP diff | 满足设计容差 |
| f64 exact | 防止时间和计划被改写 | time/schedule/reservation bits | bit-exact |
| SplitMix64 golden | 验证确定性随机路径 | u64/top24/f32 bits | CPU/CUDA 和 golden 一致 |
| Candidate/Event ordering | 排除 unordered atomic 影响 | sorted candidate/event bytes | 完全一致 |
| CUDA runtime failure | 证明运行期 fail-stop | Session/fault/backend/final rows | WORKER_FAILED，不继续 CPU，不伪造 final |
| 同 kernel 审查 | 防止第二套业务算法 | CPU/CUDA kernel registry | 两 backend 使用同一 kernel 定义 |
| Host 热路径 | 防止 per-aircraft Python loop | static scan/profiler/copy report | 热路径为 resident view 和 compact batch |
| Parity comparator 自测 | 证明测试工具能发现差异 | 注入 mismatch 后的 diff | 能定位 Tick、row、field 和容差 |

### 5.3 阶段切换条件

- 阶段 1 全场景 CPU/CUDA 均通过；
- 离散字段 bit-exact；
- 数值字段满足设计容差；
- forced CUDA failure、AUTO fallback、runtime failure 语义正确；
- 不存在 backend-specific 业务实现；
- parity 报告包含原始差异数据，不只包含汇总。

---


## 对应设计测试条款

### I.2 CPU/CUDA parity 分类

Warp CPU是语义基线和完整生产Backend；Warp CUDA是同一合同的生产加速Backend。

| Field class | Required parity |
|---|---|
| Stable ID、integer row、enum、TaskLifecycle/Phase、AircraftResourceState、AircraftExecutionState/Subphase、route/ground cursor、ReservationState、availability/permission、command final、event order、fatal set | bit-exact |
| `f64` time/schedule/reservation/frame constants | bit-exact |
| WorkCell position/velocity | `max(abs)<=2e-4`或`<=4 ULP` |
| heading、PI output、integrator | `max(abs)<=2e-5`或`<=4 ULP` |
| WorkCell migration ECEF continuity | `<=1e-4 m` |
| SplitMix64 random_u64/top24/uniform/blend_k | bit-exact |
| NMAC、anisotropic swept aircraft MAC、world-object MAC、airspace、Resource support/occupancy | bit-exact |
| Event candidate reduction/dedup/ordering | bit-exact |
| Trace evidence | 离散exact；浮点按规定ULP bucket量化 |

Parity失败不得通过为两个Backend建立不同业务算法解决。


### I.3 Determinism corpus

同一Backend、同一输入、同一seed和同一CanonicalCommand stream至少重复运行20次。以下必须相同：

- stable integer mapping；
- Task/Resource/Environment committed generation；
- CommandStatus与reason；
- event数量、顺序、ID、ordering class、event code和canonical JSON bytes；
- route/ground occurrence serial与tombstone；
- reservation exclusivity/order和延误传播结果；
- NMAC/MAC/airspace episode start；
- fatal set和BLOCKED集合；
- ViewerSnapshot离散section与record order；
- SplitMix64 golden values。

等价输入对象数组重排测试必须证明：除route、Ground Plan sequence等语义有序数组外，输入顺序不改变stable ID、Build结果和离散仿真结果。
