# 模块 Port 合同

固定一级模块之间的唯一逻辑接口、方向、typed envelope、Build/Tick/Commit/Abort 方法、projection output 与 failure semantics。

## 内容来源
- 设计：2.2
- 设计附录 E 全部

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 关联文档

- [总体架构](../../concepts/00-system-overview.md)
- [Worker IPC](03-worker-ipc.md)

## 规范正文

### 2.2 强制接口方向与唯一接口原则

允许的逻辑方向只有：

```text
Frontend <-> Gateway
Gateway -> Simulation Kernel
Simulation Kernel <-> Task Module
Simulation Kernel <-> Resource Module
Simulation Kernel <-> Environment Module
Task Module <-> Execution Runtime
Resource Module <-> Execution Runtime
Environment Module <-> Execution Runtime
Simulation Kernel <-> Execution Runtime（仅 TickControlPort）
Execution Runtime -> Projection Hub
Projection Hub -> Gateway
```

禁止：

```text
Frontend -> Simulation Kernel
Frontend -> Execution Runtime
Gateway -> Execution Runtime
Simulation Kernel -> Gateway 的直接运行状态输出
Task Module -> Resource Module
Task Module -> Environment Module
Resource Module -> Environment Module
Projection Hub -> Simulation Kernel
Projection Hub -> 领域状态写入
Projection Hub -> Execution Runtime 的反向控制
```

Gateway 产生的形式校验 Error 可以直接返回 Frontend，因为请求尚未进入正式命令系统。一旦命令进入 QUEUED，后续最终状态只能沿：

```text
Execution Runtime -> Projection Hub -> Gateway -> Frontend
```

每两个一级模块之间最多一个正式逻辑接口，固定名称见附录 E。


## 附录 E：Module Port 合同

### E.1 固定接口集合

| Interface | Pair | Direction | Contract |
|---|---|---|---|
| `TaskPort` | Simulation Kernel ↔ Task Module | request/response | Task Build、批量Intent/Decision、execution result应用、commit/abort。 |
| `TaskExecutionPort` | Task Module ↔ Execution Runtime | bidirectional data | Task resident view、Compact Delta Batch、Result Batch。 |
| `ResourcePort` | Simulation Kernel ↔ Resource Module | request/response | Resource Build、requirements/grants、延误传播、commit/abort。 |
| `ResourceExecutionPort` | Resource Module ↔ Execution Runtime | bidirectional data | Resource resident view、Compact Delta Batch、Result Batch。 |
| `EnvironmentPort` | Simulation Kernel ↔ Environment Module | request/response | Environment两阶段Build、overlay batch、commit/abort。 |
| `EnvironmentExecutionPort` | Environment Module ↔ Execution Runtime | bidirectional data | Environment view、Compact Delta Batch、Result Batch。 |
| `TickControlPort` | Simulation Kernel ↔ Execution Runtime | narrow control | Build lifecycle、Tick Start/Commit/Abort、Pacing/Reset/Health。 |
| `UnifiedWorkerOutputPort` | Worker/Execution Runtime → Projection Hub | one-way tagged union | Build progress/failure、Runtime committed output、fault latch。 |
| `EgressPort` | Projection Hub → Gateway | one-way tagged union | Build Egress或Runtime Egress。 |

任何一级模块pair不得增加第二个正式逻辑接口。Debug/metrics通道只能承载非业务计数器。

### E.2 通用 typed envelope

同进程typed handle/array至少携带：

```text
port_contract_version = 1.0.0
epoch_id_uuid128?                  # canonical UUID identity；Build前省略
working_or_committed_generation_u64?
tick_id_u64?
request_id_u64
```

CRC只用于跨进程IPC、shared memory和network。Generation/version不匹配是system fault，不返回DomainDecision。

Kernel向各Module提供只读：

```text
CanonicalReferenceDirectory
TransactionBindingSlot[]
TaskEligibilitySummary[]
```

这些结构只包含stable row/reference和紧凑状态摘要，不提供其他模块可写Store。

### E.3 TaskPort

```text
BuildTask(request) -> TaskBuildResult

EvaluateIntentBatch(
  TypedTaskIntentBatch,
  ShadowContext
) -> {
  TaskDecisionBatch,
  TaskCandidateHandle[],
  ResourceRequirement[]
}

ApplyExecutionResultBatch(
  TaskExecutionResultBatch,
  generation
) -> FinalTaskDeltaBatch

Commit(generation)
Abort(generation)
GetProjectionSource(committed_generation)
```

`TypedTaskIntentBatch`按transaction slot连续布局。对于T/R sequential operation，ALLOW row必须提供operation-specific ResourceRequirement；UNABLE row不得包含partial candidate handle。

`FinalTaskDeltaBatch`至少分区：

```text
lifecycle
phase
held/blocking
route/ground occurrence and cursor
tombstone ranges
Task event source candidates
```

### E.4 TaskExecutionPort

```text
PublishView(TaskExecutionViewHandle)
PublishDeltaBatch(TaskCompactDeltaBatch)
ReceiveResultBatch() -> TaskExecutionResultBatch
```

Handle只指向generated layout，不允许Python object graph。Result不得直接修改TaskStore或返回业务Decision。

### E.5 ResourcePort

```text
BuildResource(request) -> ResourceBuildResult
BuildResourceGeometryView() -> ResourceGeometryViewHandle
ValidateInitialReservations(requirements) -> DomainDecision/BuildIssues

EvaluateIntentBatch(
  TypedResourceIntentBatch,
  ShadowContext
) -> {
  ResourceDecisionBatch,
  ResourceCandidateHandle[],
  ResourceGrant[]
}

ApplyExecutionResultBatch(
  ResourceExecutionResultBatch,
  generation
) -> FinalResourceDeltaBatch

PropagateReservationDelays(
  affected_rows,
  generation
) -> PropagationDelta

Commit(generation)
Abort(generation)
GetProjectionSource(committed_generation)
```

Sequential T/R row必须携带同一`TransactionBindingSlot`，使Task candidate/requirement与Resource candidate/grant可原子绑定。Resource不得直接读取TaskStore；自动PREPARE只消费`TaskEligibilitySummary`。

`FinalResourceDeltaBatch`至少分区：

```text
AircraftResourceState / assignment
ReservationState / windows / exclusivity
owner derived cache
PhysicalOccupancy
ResourceAvailability / Runway End permission
FacilityHolding / Hangar lane
delay propagation
Resource event source candidates
```

### E.6 ResourceExecutionPort

```text
PublishView(ResourceExecutionViewHandle)
PublishDeltaBatch(ResourceCompactDeltaBatch)
ReceiveResultBatch() -> ResourceExecutionResultBatch
```

Result可以包含support contact、occupancy和fatal attribution，但不包含Resource业务最终状态或ALLOW/UNABLE。

### E.7 EnvironmentPort

```text
BuildEnvironmentBase(request) -> EnvironmentBaseBuildResult

FinalizeEnvironmentIndex(
  ResourceGeometryViewHandle
) -> EnvironmentExecutionViewHandle

EvaluateIntentBatch(
  TypedEnvironmentIntentBatch,
  ShadowContext
) -> {
  EnvironmentDecisionBatch,
  EnvironmentCandidateHandle[]
}

ApplyExecutionResultBatch(
  EnvironmentExecutionResultBatch,
  generation
) -> FinalEnvironmentDeltaBatch

Commit(generation)
Abort(generation)
GetProjectionSource(committed_generation)
```

`ResourceGeometryViewHandle`为immutable、read-only Build artifact。Environment不得保留可写Resource pointer。Task-scoped AX subject由Kernel通过CanonicalReferenceDirectory解析，不允许Environment读TaskStore。

### E.8 EnvironmentExecutionPort

```text
PublishView(EnvironmentExecutionViewHandle)
PublishDeltaBatch(EnvironmentCompactDeltaBatch)
ReceiveResultBatch() -> EnvironmentExecutionResultBatch
```

Result包括环境query候选，不直接写EnvironmentStore或返回业务Decision。

### E.9 TickControlPort

第一版唯一methods：

```text
StartBuild(build_request_id)

ReportBuildProgress(
  build_request_id,
  stage_code,
  progress_permille,
  summary_handle
)

CommitBuild(
  build_request_id,
  new_epoch_id,
  generation_zero_view_handles
)

AbortBuild(
  build_request_id,
  issue_bundle_handle
)

StartTick(
  tick_id,
  t_s,
  dt_s,
  working_generation,
  accepted_transaction_mask_handle,
  expected_committed_generation
)

Commit(
  working_generation,
  final_domain_delta_handles
)

Abort(
  working_generation,
  fault_code
)

SetPacingState(
  session_state,
  time_scale,
  resume_time_scale
)

ResetGeneration(
  new_epoch_id,
  generation_zero_view_handles
)

GetRuntimeHealth()
```

禁止上传完整TaskGraph、ResourceStore、EnvironmentStore、JSON或public query request。

### E.10 UnifiedWorkerOutputPort

One-way push tagged union：

```text
PublishBuildProgress(
  scenario_id,
  build_request_id,
  stage_code,
  progress_permille,
  summary_handle
)

PublishBuildFailed(
  scenario_id,
  build_request_id,
  issue_bundle_handle,
  summary_handle?
)

PublishRuntimeCommitted(
  committed_generation,
  buffer_handle
)

PublishWorkerFailedLatch(
  last_committed_generation,
  fault_handle
)
```

同进程buffer lifetime至少持续到Projection取得引用。跨进程物理封装使用ReliableMessageHeader与CRC。Build variant没有epoch/generation/CommandStatus/event/Read Model/Snapshot；READY只由Runtime committed generation 0表达。

### E.11 EgressPort

```text
PublishBuildEgress(
  scenario_id,
  build_request_id,
  outcome,                    # BUILDING / BUILD_FAILED
  issues,
  build_summary?
)

PublishRuntimeEgress(
  epoch_id,
  committed_generation,
  control_messages,
  cache_revision_handle,
  latest_snapshot_sequence?
)
```

Gateway ack只表示IPC接收，不表示Frontend已读。EgressPort不得承载命令反向输入。Epoch-static Aircraft table作为current cache成员在连接/reconnect时完整发送，不维护generation。

### E.12 Port failure semantics

| Failure | Port response |
|---|---|
| 业务条件不成立 | Task/Resource/Environment Decision=UNABLE+reason。 |
| Gateway formal schema失败 | 不进入Port。 |
| Generation/protocol mismatch | system fault/fail-stop。 |
| 预声明业务Arena容量不足，且尚未写入 | Command UNABLE `CAPACITY_EXCEEDED`。 |
| Authoritative output/result overflow | system fault。 |
| Runtime计算失败 | WORKER_FAILED，不包装为UNABLE。 |
| Implementation invariant broken | system fault。 |

### E.13 Interface direction tests

静态架构test必须拒绝：

```text
frontend importing worker/kernel modules
gateway importing execution kernels
task importing resource/environment
resource importing task/environment mutable store
environment importing task/resource mutable store
projection importing kernel/domain mutator
runtime importing gateway/frontend
```

Generated Runtime view types可以被对应Module和Execution Runtime共同import，不构成业务模块调用。
