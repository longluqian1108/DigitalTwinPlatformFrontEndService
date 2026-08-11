# HITL 大阶段切换与 AI 测试验收规范

当前项目阶段推进、AI 测试报告和人工阶段切换的唯一入口。本文保留 HITL 规范全部内容。

## 内容来源
- HITL 规范：全文（0–11）

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 关联文档

- [测试总览与追踪矩阵](../testing/00-总览与追踪矩阵.md)
- [设计附录 J 追踪矩阵](../testing/00-总览与追踪矩阵.md#设计附录-j-原文)

## 规范正文

## LightBlueSky Human-in-the-Loop 大阶段切换与 AI 测试验收规范

**版本定位：** 无正式前端、无 HTTP、无 WebSocket 的核心仿真开发阶段  
**日期：** 2026-08-04  
**依据：** 《LightBlueSky 低空三维实时仿真平台最终统一设计规范 v8.0》

---

### 0. 范围说明

本文用于划分 LightBlueSky 的大开发阶段，并定义每个阶段切换前应由 AI 完成的测试和应提交给人的审查材料。

当前明确延期：

- HTTP Adapter；
- control WebSocket Adapter；
- snapshot WebSocket Adapter；
- Vue Workbench；
- 浏览器 Snapshot Worker；
- Cesium/Flat Renderer；
- 浏览器插值、交互和可视化测试。

当前仍必须实现和验证：

- Gateway Core；
- CanonicalCommand、CanonicalQuery 和 Gateway Error；
- CommandReceipt 和 CommandStatusView；
- event registry、event candidate、event ordering 和 event envelope；
- Read Model；
- EgressBundle；
- ViewerSnapshot binary ABI；
- snapshot static table；
- Python、TypeScript 和 Warp 的合同一致性。

所有测试均通过机器可观察的输入和输出完成，不依赖前端界面或视觉判断。

通过本文全部阶段表示核心后端达到 **Backend/Core Milestone**，不等同于设计规范定义的完整第一版产品发布。

---

## 1. Human-in-the-Loop 工作方式

### 1.1 阶段内工作

每个阶段内部由 Codex 使用 Spec Kit skills 自行完成：

```text
specify
→ plan
→ tasks
→ implement
→ test
→ analyze failures
→ fix
→ regression
→ converge
```

AI 可以把实现和测试分解给多个子智能体。具体分工、测试调度和报告组织由 Spec Kit 与 Codex 自行处理，本文不规定固定角色和格式。

### 1.2 AI 测试报告的基本要求

每项测试至少说明：

- 测试目的；
- 测试输入和前置状态；
- 预期输出；
- 实际机器输出；
- 测试成功或失败；
- 成功为什么可以证明对应功能成立；
- 失败发生在哪里、可能原因是什么；
- 原始证据和复现方式。

失败原因可以使用自然语言说明，不要求固定分类。

所有结论必须基于机器可见字段，例如：

- JSON 字段；
- enum/code；
- command status；
- event candidate 和 event envelope；
- Store/generation；
- Read Model；
- ViewerSnapshot binary 和解码数组；
- fault code；
- timing 和 memory samples；
- process/worker 状态。

不允许只写“测试通过”，也不允许使用“看起来正确”作为验收依据。

### 1.3 AI 自主闭合合同

设计文档中未完全闭合、存在歧义或需要局部补充的合同，可以由 AI 在阶段内根据上下文自行决定并继续实现。

阶段报告必须单独列出这些决定，并说明：

- 原合同缺口；
- AI 的决定；
- 决定理由；
- 影响的状态机、event、Port、binary 或 public data；
- 添加了哪些测试；
- 是否存在回滚或兼容风险。

最终是否接受这些决定，由人在阶段切换时审查。

### 1.4 人的职责

人不需要逐项执行测试，主要审查：

1. 测试是否覆盖本阶段目标；
2. 测试报告是否有原始证据；
3. 失败是否已经修复并完成回归；
4. AI 自主闭合的合同是否合理；
5. 是否存在未说明的跳过项；
6. 是否满足阶段切换条件。

人工结论：

| 结论 | 含义 |
|---|---|
| `ACCEPT` | 进入下一阶段 |
| `ACCEPT_WITH_CHANGE` | 完成指定修改并重跑受影响测试后进入下一阶段 |
| `REJECT` | 返回当前阶段继续实现和收敛 |
| `DEFER` | 明确延期，但必须证明不破坏下一阶段的基础假设 |

---

## 2. 大阶段切换总表

| 阶段 | 核心目标 | AI 必须完成的主要测试 | 人的审查重点 | 切换条件 |
|---|---|---|---|---|
| **0. 架构、状态机、Event 基础与 CPU Generation 0** | 建立完整系统形状和机器合同骨架 | codegen、Schema、Build、Frame、Port、状态所有权、generation、event pipeline、binary | 合同结构、状态/Event 集中性、Build 原子性、AI 合同闭合 | 三文件经 Gateway Core Build 到 READY；generation 0 一致；event/状态机基础不需后续重建 |
| **1. Warp CPU 最简全仿真周期** | 用最小场景贯穿完整事务和投影 | START→TKF→NAV→LND→COMPLETED→STOP、Gateway Error、ACCEPTED、UNABLE、rollback、determinism | Golden Tick Bundle、状态/event/Read Model/Snapshot 一致性 | CPU 最简周期稳定完成；20 次离散结果一致；失败无部分提交 |
| **2. CUDA 嵌入与 Parity 基础设施** | 同一业务垂直切片运行于 Warp CPU/CUDA | CUDA startup、自检、CPU/CUDA exact/tolerance parity、CUDA 故障、resident view | parity 明细、backend failure、无第二套业务算法 | 离散 bit-exact；数值满足容差；运行期不静默切 backend |
| **3. 完整业务、全部 CLI 与全部 Event 可达性** | 完成核心第一版全部业务语义 | 全业务场景、全部 active CLI、全部 event/reason、rollback、fault、CPU/CUDA parity | Command/Event Conformance Matrix、复杂业务 trace、合同闭合记录 | 所有 active CLI、event、reason 均有正反例和机器证据 |
| **4. 性能、故障、安全与 Backend/Core Milestone** | 验证无前端/无网络条件下的后端性能、故障和发布边界 | 1k/4k/20k、Build、Snapshot encode、fault injection、安全和 archive | 原始性能样本、故障语义、安全边界、延期声明 | 后端相关门槛通过；无未批准跳过项；明确不宣称完整产品发布 |

---

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

## 4. 阶段 1：Warp CPU 最简全仿真周期

### 4.1 固定最简场景

```text
frame = virtual_enu
map = flat_heightfield
backend = cpu
Aircraft = 1 架 multirotor
Facility = 2 个 vertiport
Resource = origin Pad + destination Pad
Task = 1
Ground mode = none
Route = 2 个 waypoint
```

命令通过 Gateway Core 的结构化 CanonicalCommand 入口提交，不使用 CLI，不直接调用 Kernel。

### 4.2 必须完成的 AI 测试

| 测试项目 | 目的 | 主要检查字段 | 成功说明 |
|---|---|---|---|
| 完整最简周期 | 证明核心业务闭环 | Session、Task lifecycle/phase、Aircraft state、ReservationState | Build→START→TKF→NAV→LND→COMPLETED→STOP 完成 |
| 状态/event/Read Model 同 generation | 防止投影读取旧数据或 working data | source_generation、final_generation、committed_generation | 所有关联输出一致 |
| ViewerSnapshot 数据链 | 验证高频机器数据 | header、epoch、sequence、row、position、velocity | binary 合法、row 稳定、数据来自 committed Tick |
| Gateway Error | 证明形式错误不进入命令系统 | ingress counter、command cache、event count | 返回 Error 且其他计数不变 |
| ACCEPTED | 证明命令只提交一次 | QUEUED、final、command event | 一次 QUEUED、一个 ACCEPTED、一个 `command_accepted` |
| UNABLE | 证明业务失败无部分 mutation | Store diff、domain events、final | 只有 `command_unable`，状态不变，正常 Tick 继续 |
| Tick 原子 Commit | 证明所有 Store 同步提交 | generation headers | 全部一起从 g→g+1 |
| Abort | 证明 working generation 不公开 | committed headers、counts、events | 故障后保持上一 generation |
| STOP pending | 证明未 apply 命令有明确终态 | ingress order、reason | 按顺序结束为 `SESSION_STOPPED_BEFORE_APPLY` |
| 20 次确定性复跑 | 证明离散语义可复现 | ID、state、event bytes、Snapshot row order | 所有离散输出一致 |
| 无语义输入重排 | 证明 stable ID 不依赖数组顺序 | mapping、Build/result | 重排后离散结果不变 |
| Golden Tick Bundle | 证明关键 Tick 可追踪 | command bytes、Decision、Delta、event、Read Model、Snapshot | 能从证据恢复完整因果链 |

### 4.3 阶段 1 必须可达的 Event

至少包括：

```text
runtime_ready
runtime_started
runtime_stopped
command_accepted
command_unable
task_started
task_phase_changed
task_completed
aircraft_takeoff_started
aircraft_navigation_started
aircraft_landing_started
resource_reservation_changed
resource_use_phase_changed
resource_owner_changed
resource_occupancy_changed
```

每个 event 必须有正例、抑制/反例、payload 校验和 ordering 校验。

### 4.4 阶段切换条件

- CPU 最简周期稳定结束；
- Gateway Error、ACCEPTED、UNABLE 三条路径全部通过；
- Abort 后无部分状态、ID、row 或 event；
- 20 次重复运行离散结果一致；
- Read Model、event 和 Snapshot 均来自相同 committed generation。

---

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

## 6. 阶段 3：完整业务、全部 CLI 与全部 Event 可达性

### 6.1 阶段实施方式

每个业务 slice 都应完成：

```text
Domain guard
→ Candidate Delta
→ Runtime effect
→ Final Delta
→ Event Fact
→ Read Model
→ ViewerSnapshot（适用时）
→ CPU/CUDA parity
→ rollback/fault
→ CLI normalization
```

不能先完成全部 CPU 功能再统一移植 CUDA。

### 6.2 全部 CLI 命令逐项测试要求

以下所有 active CLI 都必须逐项测试。每个 Mutation/Control 命令至少覆盖：

- primary CLI 正常解析；
- CLI→CanonicalCommand normalization；
- 缺失参数；
- 参数类型和边界；
- allowed/forbidden SessionState；
- phase/state gate；
- target not found；
- capability/resource/geometry 失败；
- Gateway QUEUED；
- 唯一 final ACCEPTED 或 UNABLE；
- 相同 command_id+相同 payload 幂等；
- 相同 command_id+不同 payload mismatch；
- same-Tick ordering/conflict；
- 失败无部分领域 event；
- 对应 event；
- CPU/CUDA parity。

每个 Query 命令至少覆盖：

- 正常查询；
- target not found；
- FreshResponse；
- 不产生 ingress sequence；
- 不产生 CommandStatus；
- 不产生 event；
- 不触发 Runtime/GPU gather。

#### 6.2.1 Task、Ground、Departure CLI

| CLI | 必须覆盖的核心场景 |
|---|---|
| `ADD_TASK` | 合法创建、ID 冲突、schedule 冲突、Ground auto 失败、capacity、完整 rollback |
| `TKF` | 正常起飞、提前排队、schedule/resource/owner/position gate、无 head-of-line blocking |
| `TAXI` | ENU、WGS84、HANGAR、PAD、RUNWAY_END target；PRE/POST_GROUND gate；manual occurrence |
| `SLOT` | 六字段分别修改、组合修改、任一字段 gate 失败时整条回滚 |
| `HOLD_TASK` | PLANNED、PRE_GROUND、幂等、非法 phase、reservation PLANNED/PREPARE 行为 |
| `REL_TASK` | 正常解除、幂等、目标未 held、terminal/非法状态 |
| `CXL_TASK` | PLANNED、PRE_GROUND、非法后续 phase、reservation/assignment 原子释放 |
| `CHGRES` | DEP/ARR 正常修改、资源不存在、不兼容、非 PLANNED reservation、冲突回滚 |
| `CHGAC` | 正常换机、Aircraft 不可用、不兼容、schedule 冲突、PRE_GROUND 后拒绝 |

#### 6.2.2 Airborne Navigation CLI

| CLI | 必须覆盖的核心场景 |
|---|---|
| `SEL` | SPD、DEG、ALT、ALT+VS、组合参数、NAV gate、envelope exceeded、hover SPD=0 |
| `DCT` | 唯一 occurrence、显式 `@serial`、歧义、completed/tombstoned target |
| `JNL` | 相邻 occurrence、非相邻、反向、可选 DEG、heading capture、geometry unreachable |
| `RTE ADD` | BEFORE、AFTER、现有 waypoint、新 waypoint object、identity conflict、serial/rollback |
| `RTE DEL` | 精确 occurrence、基础 ID+ALL、歧义、active/completed 保护、tombstone |
| `RTE REPLACE` | 正常替换、`WPTS=[]`、包含 active occurrence、serial 不复用、route complete |
| `AT` | altitude、speed、time、window、组合约束、target occurrence、边界和不可达 event |

#### 6.2.3 Landing 与 Diversion CLI

| CLI | 必须覆盖的核心场景 |
|---|---|
| `LND` | route complete、route incomplete、arrival reservation PLANNED、resource closed/blocked、ManagedLandingPlanV1 初始化 |
| `DIVERT` | PAD/Runway End destination、route replacement、resource conflict、LANDING 后拒绝、完整 rollback |

#### 6.2.4 Resource CLI

| CLI | 必须覆盖的核心场景 |
|---|---|
| `RSRC SET ... AVAILABILITY=OPEN|CLOSED` | Pad/Hangar/Runway End、active reservation gate、Facility aggregate gate、BLOCKED 不可清除 |
| `RSRC SET ... DEPARTURE_OPEN=true|false` | Runway End、静态 capability、active departure reservation gate |
| `RSRC SET ... ARRIVAL_OPEN=true|false` | Runway End、静态 capability、active arrival reservation gate |
| `RSRC <resource-ref>` | 正常 Query、不存在 Resource、freshness、无 CommandStatus/event |
| `RSRCUSE END ... PREPARE=` | DEP/ARR、未来/当前/过去时间、已完成 phase、唯一合法后继 |
| `RSRCUSE END ... RECOVERY=` | DEP/ARR、未来/当前/过去时间、已完成 phase、不得直接清 occupancy/BLOCKED |

#### 6.2.5 Environment VOL CLI

| CLI | 必须覆盖的核心场景 |
|---|---|
| `VOL ADD RA` | 合法 polygon/rule/interval、非法 geometry、ID 冲突、capacity、CPU/CUDA airspace decision |
| `VOL ADD OBS` | 合法 AABB、非法 min/max、ID 冲突、capacity、world-object MAC |
| `VOL RM` | 正常删除、幂等/不存在、static object 不可删除、tombstone |
| `VOL SET` | ENABLED true/false、幂等、static object 不可修改 |
| `VOL SHOW` | 正常 Query、不存在 ID、freshness、无 CommandStatus/event |
| `VOL LIST` | 空列表、过滤、稳定排序和 freshness |

#### 6.2.6 Airspace Exemption CLI

| CLI | 必须覆盖的核心场景 |
|---|---|
| `AX SET ... ENABLED=true` | TASK scope、Aircraft scope、interval、reason、update、zone/subject missing |
| `AX SET ... ENABLED=false` | 正常禁用、不存在项幂等、episode 重新进入 |
| `AXLS` | 全量、按 zone/subject filter、freshness、无 CommandStatus/event |

#### 6.2.7 Runtime 与 Query CLI

| CLI | 必须覆盖的核心场景 |
|---|---|
| `START` | READY 正常、其他状态拒绝、首个 committed output |
| `PAUSE` | RUNNING 正常、boundary 生效、其他状态拒绝 |
| `RESUME` | PAUSED 正常、无参数、恢复后首 Tick apply pending mutation |
| `RATE` | RUNNING、PAUSED、allowed positive scale、0/非法 scale/非法状态 |
| `STOP` | RUNNING、PAUSED、pending command、recovery/propagation drain |
| `RESET` | STOPPED、new epoch、旧 epoch final、相同/不同 payload 幂等 |
| `TIME` | READY/RUNNING/PAUSED/STOPPED freshness |
| `POS` | placed/unplaced/destroyed/not-found Aircraft |
| `SHOW_TASK` | 各 lifecycle、not-found、freshness |
| `SHOW_ROUTE` | 重复 waypoint、tombstone、active/future/complete |
| `LIST_TASKS` | 无 filter、lifecycle filter、phase filter、稳定排序 |
| `LIST_WARNINGS` | active/closed filter、NMAC/airspace episode、freshness |
| `HELP` | 全命令、单 operation、registry 一致、无手写第二清单 |

#### 6.2.8 Removed/Unknown CLI Guard

以下 spelling 必须逐项测试为拒绝：

```text
PON
POFF
RWYON
RWYOFF
RWYEND
VOL ON
VOL OFF
AXON
AXOFF
TS
ETA
ADD_FLT
HOLD_FLT
REL_FLT
CXL_FLT
SHOW_FLIGHT
LIST_FLIGHTS
RTE CLEAR
```

另外必须测试：

```text
VOL ADD
```

缺少 `RA` 或 `OBS` 子命令时不得解析为通用 payload。

### 6.3 完整业务测试包

除了逐项 CLI conformance，还必须运行跨命令、跨模块的完整业务场景。

#### Task、Ground、Route

- 五阶段 Task lifecycle；
- Ground `none`、`auto`、`explicit`；
- auto unresolved 不得 fallback；
- explicit segment 连续性；
- ADD_TASK 原子创建；
- HOLD/REL/CXL；
- SLOT 六字段；
- CHGAC/CHGRES/DIVERT；
- duplicate waypoint 和 occurrence serial；
- RTE ADD/DEL/REPLACE；
- `RTE REPLACE WPTS=[]`；
- DCT/JNL/AT；
- manual TAXI occurrence；
- failed mutation 不消费 ID、serial 或 Arena row。

#### Resource 与 Reservation

- AircraftResourceState；
- Runway End 独立预约与共享 exclusivity；
- owner、occupancy、ReservationState 正交；
- Hangar lane 与 `INSIDE_HANGAR`；
- automatic PREPARE；
- reservation 多跳 delay propagation；
- PLANNED window 左回收；
- CLOSED/BLOCKED；
- none mode holding；
- illegal Resource contact；
- MAC 原子后果。

#### Environment

- real-world/virtual coordinate union；
- dataset path/file set/bytes/release/license guard；
- WorkCell migration；
- terrain/building/obstacle/airspace 分离；
- VOL overlay；
- AX Task/Aircraft scope；
- airspace boundary 和 episode；
- query/candidate overflow。

#### FlightCore 与 Safety

- 五类 Aircraft；
- PI、anti-windup、bumpless transfer；
- RouteTracker 和 zero-length leg；
- Managed takeoff；
- ManagedLandingPlanV1；
- continuous NMAC；
- anisotropic swept aircraft MAC；
- terrain/building/obstacle/resource-surface MAC；
- fatal set 去重；
- fatal event chain；
- LND accepted 后 Resource BLOCKED。

### 6.4 全 Event 可达性测试

所有 active event 必须在 event reachability 表中有：

- producer；
- 对应状态转换或 Runtime result；
- 正例；
- 抑制/反例；
- ordering；
- payload schema；
- CPU/CUDA parity；
- 可达状态。

必须验证：

- QUEUED 不进入 Event Sequencer；
- Gateway Error 不进入 Event Sequencer；
- failed Mutation 除 `command_unable` 外无领域 event；
- Task startup 不伴随首次 phase event；
- Task terminal 不伴随终态 phase event；
- NMAC/airspace ACTIVE 不重复 event；
- 已 BLOCKED Resource 再事故不重复 availability change；
- subject ID 位于 envelope 顶层；
- payload 无无关 null；
- 同 generation event 顺序确定；
- CPU/CUDA event candidate 和公开 event 一致。

### 6.5 全 Reason 使用测试

Reason Registry 中每个 active reason 必须验证：

- 使用边界正确；
- 能由对应 operation/build/fault 场景触发；
- 不被错误用于其他层；
- Gateway Error、Command UNABLE 和 system fault 不混淆；
- public failure 不返回 UNKNOWN reason；
- world-object MAC contact reason 只使用允许集合。

### 6.6 阶段切换条件

- 所有 active CLI 均完成逐项 conformance；
- removed spelling 全部拒绝；
- 所有 active event 均可达并有抑制测试；
- 所有 active reason 均有使用测试；
- 所有完整业务场景 CPU/CUDA parity 通过；
- 所有 rollback 测试证明无部分状态；
- 所有失败已经修复并完成回归，或被人明确接受延期；
- 本阶段 scope 内设计条款无未说明缺口。

---

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

## 8. 每阶段 AI 报告建议结构

Spec Kit 可以自行生成具体格式，但最终报告至少应包含：

```markdown
## Stage N Test Report

### Candidate
- Commit
- Environment
- Backend
- Input revisions
- Seed

### Scope
- 本阶段完成内容
- 明确延期内容

### Summary
- 测试总数
- 成功
- 失败
- 未执行或延期

### Test Results
#### 测试名称
- 目的
- 输入
- 预期输出
- 实际输出
- 结果
- 成功证明或失败原因
- 证据路径
- 复现方式

### Contract Closures
- 缺口
- AI 决定
- 理由
- 影响
- 测试
- 风险

### Remaining Risks
- ...

### Proposed Gate Decision
- ACCEPT / ACCEPT_WITH_CHANGE / REJECT / DEFER
```

---

## 9. 人工阶段审查清单

人只需要审查：

1. 候选 commit 和测试环境是否明确；
2. 是否执行了本阶段全部测试；
3. 是否有未说明的跳过或阻塞；
4. 每个成功是否有足够机器证据；
5. 每个失败是否说明原因并完成回归；
6. 全部 CLI 是否逐项覆盖；
7. event/reason 是否全量覆盖；
8. CPU/CUDA parity 是否有原始 diff；
9. AI 自主闭合合同是否可以接受；
10. 是否满足阶段切换条件。

阶段决策记录：

```yaml
stage:
candidate_commit:
reviewer:
reviewed_at:
accepted_contract_closures: []
rejected_contract_closures: []
deferred_items: []
known_risks: []
decision: ACCEPT | ACCEPT_WITH_CHANGE | REJECT | DEFER
required_followups: []
```

---

## 10. 最终阶段顺序

```text
阶段 0
架构、状态机、Event 基础与 CPU Generation 0
        ↓
阶段 1
Warp CPU 最简全仿真周期
        ↓
阶段 2
CUDA 嵌入与 Parity 基础设施
        ↓
阶段 3
完整业务、全部 CLI 与全部 Event 可达性
        ↓
阶段 4
性能、故障、安全与 Backend/Core Milestone
```

HTTP、WebSocket 和正式前端后续单独规划。

---

## 11. 核心执行规则

1. Event 数据架构在阶段 0 完整建立。
2. 状态判断、Candidate Delta 和 Event Fact 必须属于同一转换语义。
3. 所有测试必须经过 Gateway Core，不得直接从测试调用 Kernel。
4. 阶段 2 后所有新增业务 CPU/CUDA 锁步。
5. 所有 active CLI 必须逐项测试，不得只测试代表性命令。
6. 所有 active event 和 reason 必须有正例、反例和机器证据。
7. AI 可以自主闭合合同，但必须在阶段报告中单独说明。
8. 测试成功必须解释为什么输出足以证明功能成功。
9. 测试失败必须说明实际现象、可能原因和回归结果。
10. 当前版本不依赖前端或视觉判断。
11. 通过本文全部阶段不等于完整第一版产品发布。
