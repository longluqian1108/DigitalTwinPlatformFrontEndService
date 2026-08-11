# 阶段 3：完整业务、全部 CLI 与全部 Event 可达性

按 HITL 阶段组织目标、必须测试、机器证据、切换条件，并附对应设计测试条款。

## 内容来源
- HITL：6. 阶段 3：完整业务、全部 CLI 与全部 Event 可达性
- 设计：C.7 Command Conformance Matrix、D.7 Reason使用边界、I.8 Mandatory end-to-end scenarios、J.3 Command conformance row requirements、J.4 Event conformance row requirements

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 关联文档

- [测试总览与追踪矩阵](00-总览与追踪矩阵.md)

## 规范正文

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


## 对应设计测试条款

### C.7 Command Conformance Matrix

每个ACTIVE row必须关联：

```text
normalize_canonical_and_cli
primary_cli_parse
valid_success
missing_argument
wrong_type_and_boundary
allowed_session_state
forbidden_session_state
phase_gate
target_not_found
capability/resource failure
successful_state_delta
QUEUED control status and one final command event
same_command_id_same_payload_bytes_retry
same_command_id_different_payload_bytes_error
same_tick_order/conflict
failure_has_no_partial_domain_event
CPU/CUDA parity where applicable
Frontend activity rendering
```

Query row必须验证freshness、no CommandStatus、no event和no GPU working gather。Unknown/removed spelling必须有parser guard。CI从registry生成HELP，禁止手工维护第二份命令清单。


### D.7 Reason使用边界

- Gateway Error使用schema/identity/admission类别；
- Build error可以使用validation/dataset/geometry/capacity code；
- Command UNABLE使用operation allowlist，不使用system fault code；
- System fault使用0x06/0x07类别并进入WORKER_FAILED；
- world-object MAC payload可使用`RESOURCE_NOT_PREPARED`、`RESOURCE_OWNER_MISMATCH`、`RESOURCE_CLOSED`、`RESOURCE_BLOCKED`、`OPERATION_DISABLED`、`OUTSIDE_AUTHORIZED_SUPPORT_AREA`作为contact failure reason；
- Warning使用`ARRIVAL_TIME_DERIVED`等，不改变CommandStatus。


### I.8 Mandatory end-to-end scenarios

1. 五类Aircraft各自完成完整Task。
2. none/auto/explicit各自完成；auto unresolved时Build失败或ADD_TASK UNABLE且无partial Task。
3. selected off-route→DCT/JNL DEG capture→route tracking。
4. duplicate waypoint、stable occurrence、tombstone/non-reuse、`OCCURRENCE_REQUIRED`。
5. `RTE REPLACE WPTS=[]`清空remaining route，随后LND可接受；RTE ADD后重新未完成。
6. 同一Aircraft连续Task，PLANNED等待、assignment交接和facility continuity。
7. reservation延误在同resource/group→same Task→same Aircraft next Task多跳传播与回收。
8. Runway End双端独立Resource、共享exclusivity、body事故双端BLOCKED。
9. Hangar logical lane不产生PhysicalOccupancy或occupancy event；仅在Aircraft完成实体Hangar进入后设置`INSIDE_HANGAR`，lane分配本身不得置位；离开机库时清除，并验证ground-ground MAC过滤只受该flag控制。
10. none mode在Recovery完成前持续占用destination，随后原子转入Hangar lane/virtual holding。
11. NMAC strict threshold、tick内穿越、episode re-entry。
12. heading anisotropic AABB与swept hash覆盖防漏检。
13. Terrain/Building/Obstacle/illegal Resource contact统一world-object MAC。
14. LND在arrival reservation PLANNED时接受；后续Resource BLOCKED仍继续plan，接触时fatal。
15. 多个同TickMAC candidate的deterministic fatal set和事故event顺序。
16. VOL ADD RA/OBS、VOL SET、VOL RM；static object不可修改。
17. AX SET Task-scoped随current Aircraft，Aircraft-scoped固定跟随Aircraft。
18. ADD_TASK/DIVERT/CHGRES/SLOT/RTE任一步失败完整rollback。
19. Gateway形式Error不创建Command row、sequence、QUEUED或event。
20. QUEUED通过control status发送，不分配event sequence；final只有accepted/unable event。
21. 任一Module UNABLE时normal Tick继续，Runtime不执行业务feasibility。
22. CUDA/runtime/overflow/egress failure进入WORKER_FAILED。
23. STOP结束pending command并发布最终状态；无历史工作。
24. RESET bytes幂等索引在current epoch检查前命中。
25. 早于schedule TKF保持QUEUED且不head-of-line block。
26. READY只接受START和Query。
27. environment re-upload清空resource/task slot；resource re-upload清空task slot。
28. READY query返回tick0；unplaced Aircraft省略动态字段。
29. Snapshot reconnect只有full state、epoch static table和latest frame，无event history。


### J.3 Command conformance row requirements

Mutation/Control row至少关联：

```text
normalize_and_parse
valid_success
missing_argument
wrong_type_and_boundary
allowed/forbidden_session_state
phase_gate
target_not_found_as_UNABLE
capability_or_resource_UNABLE
successful_candidate_delta
Gateway QUEUED control status
one final command event
same_command_id_same_payload_bytes_retry
same_command_id_different_payload_bytes_Error
same_tick_order/conflict
failure_no_partial_domain_event
CPU_CUDA_parity_when_applicable
Frontend activity rendering
```

Query row覆盖freshness、not-found HTTP Error、no CommandStatus、no event、no GPU gather。Removed spelling覆盖not parseable、no OpenAPI action、no frontend action。


### J.4 Event conformance row requirements

每个public event row至少覆盖：

```text
unique code and event_name
producer authority
ordering_class and within-class event_code causal order
authoritative severity
strict payload schema
subject IDs only at envelope top
no independent event type field
no unrelated optional/null field
canonical JSON bytes
frontend discriminated union by event_name
reconnect behavior
```

Command event只有accepted/unable。Gateway QUEUED与Gateway Error不得进入Event Sequencer。
