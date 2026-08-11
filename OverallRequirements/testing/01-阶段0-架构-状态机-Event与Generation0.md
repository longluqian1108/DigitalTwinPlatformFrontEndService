# 阶段 0：架构、状态机、Event 与 Generation 0

按 HITL 阶段组织目标、必须测试、机器证据、切换条件，并附对应设计测试条款。

## 内容来源
- HITL：3. 阶段 0：架构、状态机、Event 基础与 CPU Generation 0
- 设计：I.1 测试权威与证据原则、I.3 Determinism corpus、I.7 数值与算法单元测试、J.5 Binary protocol trace requirements

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 关联文档

- [测试总览与追踪矩阵](00-总览与追踪矩阵.md)

## 规范正文

## 3. 阶段 0：架构、状态机、Event 基础与 CPU Generation 0

### 3.1 阶段目标

本阶段建立：

- Gateway Core 和 InMemory Adapter；
- DocumentSlot、revision、confirm 和 Build；
- Kernel、Task、Resource、Environment、Execution Runtime、Projection Hub；
- 全部正式 Port；
- Warp CPU 基础 SoA/CSR/Arena 布局；
- 核心状态机和状态所有权；
- 第一版完整 command、event、reason、runtime enum registry；
- 状态转换、Candidate Delta、Event Fact 和 Projection Source 的统一结构；
- event candidate 排序、去重、sequence 和 Projection；
- Read Model；
- ViewerSnapshot binary；
- generation 0 原子提交。

Event 的机器结构和完整 registry 在本阶段建立。后续业务只补充对应的 transition 和 Event Fact producer，不再新增散落的 event 发送机制。

### 3.2 必须完成的 AI 测试

| 测试项目 | 测试目的 | 主要机器输出 | 成功说明 |
|---|---|---|---|
| 确定性 codegen | 证明 generated artifact 只由机器源决定 | 两次 generated tree、worktree diff | 两次逐字节一致且工作树无差异 |
| Schema/strict parser | 验证三个输入合同 | ValidationReport、issue code | 正例通过；unknown field、duplicate key、非法值被拒绝 |
| 跨语言 enum/code | 防止多份数值事实源 | Python/TypeScript/Warp 常量表 | symbol 和 numeric code 完全一致 |
| 三文件加载顺序 | 证明 Gateway Core 是唯一入口 | slot trace、BuildRequest | environment→resource→task→Build |
| 上游重传清空下游 | 防止旧数据自动复用 | slot state/revision | environment 清 resource/task；resource 清 task |
| Revision binding | 证明 confirm 绑定 exact revision | Gateway Error | 旧 revision 返回 `REVISION_MISMATCH` |
| Build 顺序 | 证明模块构建依赖正确 | Build stage trace | Environment Base→Resource→Environment Finalize→Task→Runtime |
| Build 原子失败 | 防止半成品进入下一次 Build | ID、Arena、allocation、generation | 任一阶段失败后无残留 |
| FrameRegistry gate | 证明坐标系统可运行 | rotation、round-trip、direct transform、adjacency errors | 所有设计阈值通过 |
| 模块方向 | 防止架构被绕过 | import/call graph | 禁止方向为零 |
| 状态所有权 | 防止第二份权威事实 | writer map | 每个权威事实只有一个写入者 |
| Port 唯一性 | 防止隐藏接口 | module-pair interface count | 每对一级模块最多一个正式逻辑接口 |
| Generation 0 | 证明初始 committed state 闭合 | Store/Runtime/Projection generation | 全部为 0；tick=0；t_s=0 |
| 状态与 Event Fact 同源 | 防止后补 event | transition result/call graph | Delta 和 Event Fact 由同一转换语义产生 |
| Event 特殊规则 | 提前固化抑制语义 | event candidate list | startup、terminal、QUEUED、UNABLE 规则正确 |
| Event ordering | 证明因果顺序可确定 | registry causal audit | 同 class 因果 event code 顺序正确 |
| Binary ABI | 证明 Python/TypeScript 对同一 bytes 解释一致 | header/offset/section decode | offset、端序、reserved、CRC 规则一致 |
| UUID binary identity | 防止 epoch 截断或折叠 | UUID↔bytes round-trip | canonical UUID 与 16 bytes 精确一致 |
| 前端数据 fixture | 证明数据合同可独立查看 | event、Read Model、static table、Snapshot fixture | 无前端也能完成严格校验和解码 |

### 3.3 阶段报告必须提交

- Build generation 0 trace；
- module dependency graph；
- state ownership report；
- transition-effect matrix；
- event registry 和 reachability 初始表；
- binary golden；
- contract closure list；
- 所有失败、修复和回归结果。

### 3.4 阶段切换条件

- 三文件必须经 Gateway Core Build 到 READY；
- 所有 committed generation 一致；
- Build 失败不残留半成品；
- Event 结构和状态转换结构已经统一；
- 不存在测试直接绕过 Gateway 调用 Kernel；
- 不存在未说明的高风险合同闭合。

---


## 对应设计测试条款

### I.1 测试权威与证据原则

本附录定义第一版最低可发布门槛。每个强制条款必须具有稳定clause ID，并映射到自动化测试或人工发布检查。

正式证据记录：

```text
project version / git commit
generator_version and contract_versions from generated/manifest.json
codegen command, clean-checkout assertion and post-generation worktree-diff result
OS build
CPU / RAM
GPU / driver / compute capability
Python / Warp / CUDA runtime
Node / pnpm / browser
backend requested / backend active
dt_s / time_scale / scenario seed
input slot revisions
dataset manifest/provenance version, file set and bytes
warm-up duration / measured duration
host working set / pinned memory / GPU allocated and peak
```

不使用内容摘要、manifest修订号或人工源码修订号作为生成一致性依据。生成证据必须证明codegen确定性、执行前checkout为clean、执行后工作树无差异且CI gate通过。测试结果必须保存原始样本和聚合统计；只报告平均值不构成通过。


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


### I.7 数值与算法单元测试

最低覆盖：

- WGS84/orthometric/geoid/ECEF/ENU round-trip；
- FrameRegistry正交性、direct transform和migration；
- heading wrap与低速保留；
- PI、anti-windup、bumpless transfer、hybrid smoothstep；
- RouteTracker、zero-length leg、DCT/JNL；
- SplitMix64四组golden和CPU/CUDA bit-exact；
- Manual TAXI occurrence插入/完成/tombstone/idempotency；
- Managed takeoff/ManagedLandingPlanV1/touchdown/rollout；
- body_half_height与collision_half_u区分；
- heading-based collision half E/N；
- expanded swept AABB cell coverage；
- continuous NMAC strict boundary；
- swept aircraft MAC和world-object MAC；
- legal support contact与Resource contact failure reason；
- airspace boundary、rule、AX Task/Aircraft scope；
- ReservationState转换、half-open overlap、Runway End exclusivity；
- automatic PREPARE、HOLD/PREPARE；
- reservation delay DAG和左右回收；
- Ground Plan none/auto/explicit；
- `test_inside_hangar_flag_set_on_committed_entry_and_clear_on_exit`；
- `test_hangar_lane_assignment_alone_does_not_set_inside_hangar`；
- `test_ground_ground_mac_filtered_only_when_inside_hangar`；
- atomic rollback和generation一致性；
- canonical UUID string与`epoch_id_bytes[16]`的逐字节golden、nil Runtime epoch拒绝，以及F.10/F.11/F.12/F.14/F.15新header offset/size round-trip；
- event registry同class causal edge验证、`0x1A01/0x1A02 < 0x1A10`、不含额外事件排序字段，以及CPU/CUDA Event Sequencer排序一致性。


### J.5 Binary protocol trace requirements

每个header/row/section必须具有：

- byte offset和size golden；
- little-endian round-trip；
- zero-reserved enforcement；
- bounds/overlap/alignment validation；
- cross-process/shared-memory CRC positive/negative；
- same-process CRC field zero；
- unknown major rejection；
- compatible minor test；
- Python/TypeScript/Warp layout agreement；
- canonical UUID string ↔ `epoch_id_bytes[16]` exact agreement；
- truncated/oversized/fuzz corpus。
