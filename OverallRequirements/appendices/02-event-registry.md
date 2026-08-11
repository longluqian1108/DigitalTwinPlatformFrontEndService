# Event Registry 与 Reason Registry

收录全部 event code、event_name、ordering class、payload schema、reason code 与使用边界。

## 内容来源
- 设计：附录 D：event Registry 与 Reason Registry 全部

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 规范正文

## 附录 D：event Registry 与 Reason Registry

### D.1 event envelope

Strict public envelope：

```json
{
  "event_id": "018f...:1201",
  "epoch_id": "018f...",
  "sequence": 1201,
  "tick_index": 600,
  "t_s": 60.0,
  "event_name": "aircraft_navigation_started",
  "severity": "info",
  "contract_version": "1.0.0",
  "task_id": "TASK001",
  "aircraft_id": "AC101",
  "reason_code": "NONE",
  "message": "Aircraft AC101 entered NAV.",
  "payload": {
    "from_state": "TAKEOFF",
    "to_state": "NAV"
  }
}
```

Required：

```text
event_id epoch_id sequence tick_index t_s
event_name severity contract_version payload
```

Optional association：

```text
task_id aircraft_id other_aircraft_id resource_id reservation_id
waypoint_id building_id obstacle_id volume_id zone_id command_id reason_code message
```

无关字段必须省略，不输出null占位；不提供独立事件类型字段。Subject ID只放envelope顶层；payload只放事件独有字段。`severity`是发布事实，default severity只是producer缺省值。

### D.2 Registry row

```text
event_code_u16
symbol
event_name
producer
ordering_class
default_severity
payload_schema
contract_version
dedup_key
```

`ordering_class` 必须引用第 7.28 节唯一权威表。`event_code` 全局唯一，并在同一 ordering class 内承担业务因果顺序：可能同时出现且必然先发生的 event 必须使用更小 code。新增 event 必须插入正确位置；若已正式发布 code 之间没有可用位置且不能保持既有语义，必须提升 event contract major version。不同 ordering class 之间的 code 数值没有排序含义，主顺序始终由 `ordering_class` 决定。第一版正式发布前可以按本文重生成 active code；只有正式发布过的 code 建立不可复用保护。

### D.3 Public event Registry

#### D.3.1 Command final status

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1001` | 10 | `command_accepted` | info | `command_status.v1` |
| `0x1002` | 10 | `command_unable` | error | `command_status.v1` |

QUEUED不对应event。

#### D.3.2 Runtime status

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1101` | 20 | `runtime_ready` | info | `runtime_status.v1` |
| `0x1102` | 20 | `runtime_started` | info | `runtime_status.v1` |
| `0x1103` | 20 | `runtime_paused` | info | `runtime_status.v1` |
| `0x1104` | 20 | `runtime_resumed` | info | `runtime_status.v1` |
| `0x1105` | 20 | `runtime_stopped` | info | `runtime_status.v1` |
| `0x1106` | 20 | `runtime_time_scale_changed` | info | `runtime_status.v1` |

#### D.3.3 Runtime volume

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1201` | 20 | `runtime_volume_added` | info | `volume_change.v1` |
| `0x1202` | 20 | `runtime_volume_removed` | info | `volume_change.v1` |
| `0x1203` | 20 | `runtime_volume_changed` | info | `volume_change.v1` |

#### D.3.4 Aircraft execution phase

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1301` | 30 | `aircraft_takeoff_started` | info | `aircraft_phase.v1` |
| `0x1302` | 30 | `aircraft_navigation_started` | info | `aircraft_phase.v1` |
| `0x1303` | 30 | `aircraft_landing_started` | info | `aircraft_phase.v1` |

#### D.3.5 Safety and airspace

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1401` | 40 | `aircraft_aircraft_nmac` | warning | `collision.v1` |
| `0x1402` | 40 | `aircraft_aircraft_mac` | critical | `collision.v1` |
| `0x1403` | 40 | `aircraft_world_object_mac` | critical | `collision.v1` |
| `0x1404` | 40 | `airspace_violation` | critical | `airspace_violation.v1` |

#### D.3.6 Airspace exemption

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1501` | 20 | `airspace_exemption_changed` | info | `exemption_change.v1` |

#### D.3.7 Resource

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1601` | 60 | `resource_reservation_changed` | info | `resource_change.v1` |
| `0x1602` | 60 | `resource_use_phase_changed` | info | `resource_change.v1` |
| `0x1603` | 60 | `resource_owner_changed` | info | `resource_change.v1` |
| `0x1604` | 60 | `resource_occupancy_changed` | info | `resource_change.v1` |
| `0x1605` | 60 | `resource_availability_changed` | info | `resource_change.v1` |

Producer可以按具体事实将severity提升为warning/critical。Class 60 的 code 顺序直接编码以下可能同时出现的业务链：reservation定义/取消、ReservationState变化、owner变化、occupancy变化、availability变化。

#### D.3.8 Route

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1701` | 30 | `route_waypoint_added` | info | `route.v1` |
| `0x1702` | 30 | `route_waypoint_deleted` | info | `route.v1` |
| `0x1703` | 30 | `route_replaced` | info | `route.v1` |
| `0x1704` | 30 | `route_diverted` | info | `route.v1` |
| `0x1705` | 30 | `route_constraint_set` | info | `route.v1` |

#### D.3.9 Task（非 fatal）

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1801` | 30 | `task_started` | info | `task_status.v1` |
| `0x1802` | 30 | `task_phase_changed` | info | `task_status.v1` |
| `0x1803` | 30 | `task_completed` | info | `task_status.v1` |
| `0x1804` | 30 | `task_cancelled` | info | `task_status.v1` |

`task_started`不伴随首次phase event；terminal event不伴随phase event。`task_interrupted`属于fatal class 50，见D.3.10。

#### D.3.10 Constraint / performance / fatal consequence

| Code | Class | event_name | Default severity | Payload |
|---:|---:|---|---|---|
| `0x1901` | 30 | `route_altitude_constraint_missed` | warning | `constraint_missed.v1` |
| `0x1902` | 30 | `route_speed_constraint_missed` | warning | `constraint_missed.v1` |
| `0x1903` | 30 | `route_time_constraint_missed` | warning | `constraint_missed.v1` |
| `0x1904` | 70 | `realtime_overrun` | warning | `overrun.v1` |
| `0x1A01` | 50 | `aircraft_destroyed_by_aircraft_mac` | critical | `aircraft_destroyed.v1` |
| `0x1A02` | 50 | `aircraft_destroyed_by_world_object_mac` | critical | `aircraft_destroyed.v1` |
| `0x1A10` | 50 | `task_interrupted` | critical | `task_status.v1` |

Class 50 的 code 保留 destroyed 与 interrupted 之间的插入空间，但未分配的数值不是 event，不得生成。`0x1A01/0x1A02 < 0x1A10` 直接保证同一事故中 Aircraft destruction 排在 Task interruption 前。

#### D.3.11 Ordering-class audit

- class 10：两个final结果互斥。
- class 20：同一mutation只产生一个对应事实；无跨对象必然因果对。
- class 30：首次与terminal抑制规则消除重复过渡；其他可能同时出现的事实无强制producer先后，按code稳定排序。
- class 40：`0x1401` NMAC先于`0x1402/0x1403` MAC；`0x1404` airspace violation独立。
- class 50：`0x1A01/0x1A02` destroyed先于`0x1A10` interrupted。
- class 60：`0x1601..0x1605`符合reservation/state/owner/occupancy/availability因果链。
- class 70：当前只有`0x1904`。

### D.4 Payload schemas

#### `command_status.v1`

Required：

```text
operation
status                    # ACCEPTED / UNABLE
canonical_ingress_sequence
final_generation
final_tick_index
```

Optional：

```text
args_summary
result
```

#### `runtime_status.v1`

```text
from_state
to_state
old_time_scale?
new_time_scale?
stop_reason?
old_epoch_id?
new_epoch_id?
```

#### `volume_change.v1`

```text
change_kind               # ADDED / REMOVED / ENABLED / DISABLED / UPDATED
volume_kind               # RESTRICTED_AIRSPACE / OBSTACLE
active_from_s?
active_until_s?
```

`volume_id`在envelope顶层。

#### `aircraft_phase.v1`

```text
from_state
to_state
```

只允许public AircraftExecutionState。

#### `collision.v1`

Required：

```text
condition_kind            # NMAC / AIRCRAFT_MAC / WORLD_OBJECT_MAC
```

Optional：

```text
episode_id
collider_kind             # TERRAIN / BUILDING / OBSTACLE / RESOURCE_SURFACE
contact_workspace_enu_m[3]
relative_speed_mps
min_horizontal_m
min_vertical_m
contact_t_within_tick_s
contact_failure_reason
```

`aircraft_id`、`other_aircraft_id`、`resource_id`、`building_id`和`obstacle_id`等关联ID放envelope顶层。

#### `airspace_violation.v1`

```text
episode_id
position_workspace_enu_m[3]
matched_rule_id?
height_value_m?
vertical_reference?
```

`zone_id`和`aircraft_id`在envelope顶层。

#### `exemption_change.v1`

```text
change_kind               # GRANTED / UPDATED / DISABLED
subject_kind              # AIRCRAFT / TASK
enabled
active_from_s?
active_until_s?
exemption_reason?
```

`zone_id`以及subject对应的`aircraft_id`或`task_id`在envelope顶层。

#### `resource_change.v1`

```text
change_kind
from?
to?
operation?
capacity_lane?
base_window?
effective_window?
actual_interval?
delay_s?
owner_task_ids?
occupying_aircraft_ids?
departure_open?
arrival_open?
blocking_reason?
cause_event_id?
```

`resource_id`、`reservation_id`与主`task_id/aircraft_id`在envelope顶层。`from/to`对reservation state使用`PLANNED/PREPARE/IN_PROGRESS/OCCUPIED/RECOVERY/CONSUMED/CANCELLED`。

#### `route.v1`

```text
mutation_kind
new_occurrence_ref?
before_occurrence_ref?
after_occurrence_ref?
deleted_occurrence_refs[]?
tombstoned_occurrence_refs[]?
remaining_occurrence_refs[]?
remaining_route_count
constraint?
```

`task_id`与`waypoint_id`在envelope顶层。

#### `task_status.v1`

```text
from_lifecycle?
to_lifecycle?
from_phase?
to_phase?
completion_t_s?
interruption_cause_event_id?
```

`task_id`在envelope顶层。Terminal payload不要求phase transition字段。

#### `constraint_missed.v1`

```text
occurrence_ref
constraint_kind
target_value
actual_value
window_from_s?
window_until_s?
```

`task_id`与`waypoint_id`在envelope顶层。

#### `overrun.v1`

```text
backlog_ticks
wall_lag_s
time_scale
tick_wall_time_ms?
```

#### `aircraft_destroyed.v1`

```text
cause_event_id
cancelled_future_task_ids[]
cancelled_reservation_ids[]
collider_kind?
```

`aircraft_id`、`other_aircraft_id`、当前`task_id`以及相关`resource_id/building_id/obstacle_id`在envelope顶层。ID arrays即使为空也显式输出，并按canonical integer ID对应string ID升序。

### D.5 Condition close 与 fatal-chain ordering

NMAC和airspace episode退出只写internal episode store close metadata，不发布public exit event。Frontend current warning view通过Read Model投影active/closed状态。

Fatal chain不使用额外事件排序字段。Event Sequencer只按第7.28节的key排序；D.3中的class/code必须得到：

```text
0x1402 / 0x1403 MAC (class 40)
-> 0x1A01 / 0x1A02 Aircraft destroyed (class 50)
-> 0x1A10 task_interrupted (class 50)
-> 0x1601..0x1605 Resource consequence (class 60)
```

Registry loader必须验证第7.28节与D.3.11明确列出的同class causal pair均满足`predecessor.event_code < successor.event_code`；违反时codegen和CI失败。

### D.6 Reason Registry

Public使用symbol string，compact protocol使用u16。任何public failure不得返回UNKNOWN reason。

#### D.6.1 Success/no-op

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0000` | `NONE` | 无附加原因。 |
| `0x0001` | `ALREADY_IN_STATE` | 目标已在请求状态，幂等成功。 |
| `0x0002` | `ALREADY_ABSENT` | 待删除/禁用对象不存在，幂等成功。 |
| `0x0003` | `NO_CHANGE` | 规范化后没有变化。 |

#### D.6.2 Gateway / Schema / Document

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0101` | `INVALID_JSON` | JSON无法解析。 |
| `0x0102` | `DUPLICATE_JSON_KEY` | Object出现重复key。 |
| `0x0103` | `SCHEMA_VERSION_UNSUPPORTED` | Schema major/version不支持。 |
| `0x0104` | `SCHEMA_REQUIRED_FIELD` | 缺少必填字段。 |
| `0x0105` | `SCHEMA_UNKNOWN_FIELD` | Strict object出现unknown field。 |
| `0x0106` | `INVALID_ARGUMENT` | 参数值或组合非法。 |
| `0x0107` | `MISSING_ARGUMENT` | CLI/Command缺少参数。 |
| `0x0108` | `INVALID_NUMBER` | 非finite、范围或单位错误。 |
| `0x0109` | `DOCUMENT_LIMIT_EXCEEDED` | 超过安全上限。 |
| `0x010A` | `PATH_NOT_ALLOWED` | Path不在许可root或逃逸。 |
| `0x010B` | `DOCUMENT_NOT_VALID` | 当前slot仍有validation error。 |
| `0x010C` | `PAYLOAD_TOO_LARGE` | 请求超过大小上限。 |
| `0x010D` | `UNKNOWN_OPERATION` | Operation/CLI spelling不存在。 |
| `0x010E` | `PROTOCOL_VERSION_UNSUPPORTED` | Public contract/protocol version不支持。 |

#### D.6.3 Identity / Revision

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0201` | `ID_NOT_FOUND` | 引用ID不存在。 |
| `0x0202` | `ID_DUPLICATE` | Namespace内重复。 |
| `0x0203` | `WAYPOINT_IDENTITY_CONFLICT` | 同waypoint ID的位置/radius不一致。 |
| `0x0204` | `COMMAND_ID_REUSE_MISMATCH` | 同command ID的canonical payload bytes不同。 |
| `0x0205` | `EPOCH_MISMATCH` | Command/connection epoch不匹配。 |
| `0x0206` | `OCCURRENCE_REQUIRED` | 多个waypoint候选，必须显式@serial。 |
| `0x0207` | `REVISION_MISMATCH` | Confirm绑定slot revision变化。 |
| `0x0208` | `PREVIEW_REVISION_CHANGED` | Preview expected revision已过期。 |

#### D.6.4 State / Phase

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0301` | `INVALID_SESSION_STATE` | Session state不接受操作。 |
| `0x0302` | `INVALID_AIRCRAFT_PHASE` | AircraftExecutionState不接受操作。 |
| `0x0303` | `INVALID_TASK_PHASE` | TaskPhase不接受操作。 |
| `0x0304` | `TASK_ALREADY_STARTED` | 只允许Task开始前的mutation。 |
| `0x0305` | `TASK_TERMINAL` | Task已terminal。 |
| `0x0306` | `RESERVATION_PHASE_COMPLETED` | 目标reservation阶段已完成。 |
| `0x0307` | `SESSION_STOPPED_BEFORE_APPLY` | Command已排队但STOP前未apply。 |
| `0x0308` | `RUNTIME_ALREADY_BUILT` | 已创建epoch，不能修改staged documents。 |
| `0x0309` | `TASK_DEPENDENCY_UNSATISFIED` | Task dependency未满足。 |
| `0x030A` | `TASK_HELD` | Task处于hold。 |
| `0x030B` | `ROUTE_NOT_COMPLETE` | LND前仍有remaining occurrence。 |

#### D.6.5 Capability / Geometry / FlightCore

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0401` | `CAPABILITY_UNSUPPORTED` | Model/mode无能力。 |
| `0x0402` | `ENVELOPE_EXCEEDED` | 目标超active envelope。 |
| `0x0403` | `ROUTE_CONTEXT_INVALID` | Active route/occurrence不允许操作。 |
| `0x0404` | `JNL_GEOMETRY_UNREACHABLE` | 当前包线无法连续汇入。 |
| `0x0405` | `TAKEOFF_GATED` | Schedule/release/position/resource gate未满足。 |
| `0x0406` | `GEOMETRY_INVALID` | Candidate geometry不合法。 |
| `0x0407` | `OUTSIDE_AUTHORIZED_SUPPORT_AREA` | 实际接触不在合法支撑面。 |

#### D.6.6 Resource / Task schedule

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0501` | `RESOURCE_NOT_FOUND` | Resource ID不存在。 |
| `0x0502` | `RESOURCE_CLOSED` | Resource或parent Facility普通关闭。 |
| `0x0503` | `RESOURCE_BLOCKED` | Resource事故锁存。 |
| `0x0504` | `RESOURCE_OCCUPIED` | Active reservation/physical occupancy不允许操作。 |
| `0x0505` | `RESOURCE_CAPACITY_EXCEEDED` | owner/occupant/lane超过capacity。 |
| `0x0506` | `RESOURCE_INCOMPATIBLE` | Aircraft与Resource不兼容。 |
| `0x0507` | `RESERVATION_CONFLICT` | Candidate interval与accepted计划冲突。 |
| `0x0508` | `CHRONOLOGY_INVALID` | Task/Aircraft accepted window非正向。 |
| `0x0509` | `AIRCRAFT_SCHEDULE_OVERLAP` | 同Aircraft Task window重叠。 |
| `0x050A` | `GROUND_PLAN_INVALID` | 显式/输入Ground Plan结构非法。 |
| `0x050B` | `GROUND_AUTO_UNRESOLVED` | 系统无法自动生成完整可执行Ground Plan。 |
| `0x050C` | `AIRCRAFT_NOT_AVAILABLE` | AircraftResourceState不可分配。 |
| `0x050D` | `OPERATION_DISABLED` | Runway End operation permission关闭或静态不支持。 |
| `0x050E` | `RESOURCE_NOT_PREPARED` | 实际接触时reservation/PREPARE gate未完成。 |
| `0x050F` | `RESOURCE_OWNER_MISMATCH` | 实际接触时owner Task不匹配。 |

#### D.6.7 Capacity / Queue / Output

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0601` | `CAPACITY_EXCEEDED` | 预声明业务Arena capacity不足。 |
| `0x0602` | `COMMAND_QUEUE_FULL` | Ingress backpressure。 |
| `0x0603` | `RELIABLE_EGRESS_STALLED` | Authoritative egress无法安全排队。 |
| `0x0604` | `SNAPSHOT_SLOT_TOO_SMALL` | Slot无法容纳最大完整frame。 |
| `0x0605` | `SEQUENCE_EXHAUSTED` | Sequence达到允许上限。 |
| `0x0606` | `AUTHORITATIVE_CANDIDATE_OVERFLOW` | Runtime required candidate/result buffer overflow。 |
| `0x0607` | `WORKER_UNAVAILABLE` | Gateway admission时worker不可用。 |

#### D.6.8 Backend / Protocol / Dataset / Invariant

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0701` | `CUDA_UNAVAILABLE` | CUDA初始化不可用。 |
| `0x0702` | `CUDA_RUNTIME_FAILURE` | CUDA production run失败。 |
| `0x0703` | `WORKER_FAILED` | Worker退出或失联。 |
| `0x0704` | `PROTOCOL_INCOMPATIBLE` | IPC/WS/Binary major不兼容。 |
| `0x0705` | `CRC_MISMATCH` | 跨进程/message/frame损坏。 |
| `0x0706` | `DATASET_MISSING` | 必要map/asset不可读。 |
| `0x0707` | `GEOID_MISSING` | 必要geoid数据不可用。 |
| `0x0708` | `DATASET_INVALID` | Manifest/file set/bytes/release/license guard不一致。 |
| `0x0709` | `BACKEND_UNAVAILABLE` | 请求Backend或AUTO全部候选失败。 |
| `0x070A` | `INTERNAL_INVARIANT_BROKEN` | Runtime内部不变量破坏。 |
| `0x070B` | `ARRAY_BOUNDS_VIOLATION` | Internal array bounds violation。 |

#### D.6.9 Scheduling / Diagnostics

| Code | Symbol | Default semantics |
|---:|---|---|
| `0x0801` | `EARLY_OPERATION_NOT_ALLOWED` | Operation不允许time-gated pending却要求提前生效。 |
| `0x0802` | `MAXIMUM_TIME_DRAINED` | Nominal horizon后工作已排空。 |
| `0x0803` | `OUTPUT_DEGRADED` | 非权威display transport跳帧。 |
| `0x0804` | `ARRIVAL_TIME_DERIVED` | Landing time省略，使用派生anchor。 |
| `0x0805` | `BUILD_VALIDATION_FAILED` | Build candidate存在错误。 |

### D.7 Reason使用边界

- Gateway Error使用schema/identity/admission类别；
- Build error可以使用validation/dataset/geometry/capacity code；
- Command UNABLE使用operation allowlist，不使用system fault code；
- System fault使用0x06/0x07类别并进入WORKER_FAILED；
- world-object MAC payload可使用`RESOURCE_NOT_PREPARED`、`RESOURCE_OWNER_MISMATCH`、`RESOURCE_CLOSED`、`RESOURCE_BLOCKED`、`OPERATION_DISABLED`、`OUTSIDE_AUTHORIZED_SUPPORT_AREA`作为contact failure reason；
- Warning使用`ARRIVAL_TIME_DERIVED`等，不改变CommandStatus。
