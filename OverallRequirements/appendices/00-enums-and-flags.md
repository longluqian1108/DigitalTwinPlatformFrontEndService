# 枚举、状态值与 Flags

收录 Python、Warp、TypeScript 的共同整数事实源。

## 内容来源
- 设计：附录 B：固定枚举、状态值和 flags 全部

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 规范正文

## 附录 B：固定枚举、状态值和 flags

本附录是Python、Warp与TypeScript的共同整数事实源。Public JSON使用字符串，Runtime/Binary使用整数。

### B.1 Session / Document / Backend

| Enum | Value |
|---|---:|
| `SessionState.EMPTY` | 0 |
| `LOADING` | 1 |
| `BUILDING` | 2 |
| `BUILD_FAILED` | 3 |
| `READY` | 4 |
| `RUNNING` | 5 |
| `PAUSED` | 6 |
| `STOPPED` | 7 |
| `WORKER_FAILED` | 8 |
| `CLOSED` | 9 |

| Enum | Value |
|---|---:|
| `DocumentSlotState.EMPTY` | 0 |
| `VALID` | 1 |
| `INVALID` | 2 |
| `CONFIRMED` | 3 |

| Enum | Value |
|---|---:|
| `Backend.AUTO` | 0 |
| `CPU` | 1 |
| `CUDA` | 2 |

| Enum | Value |
|---|---:|
| `FrameKind.WORKSPACE` | 1 |
| `WORKCELL` | 2 |

### B.2 Aircraft model / capability

| `ModelType` | Value |
|---|---:|
| `MULTIROTOR` | 1 |
| `HELICOPTER` | 2 |
| `FIXED_WING` | 3 |
| `COMPOUND_WING` | 4 |
| `TILTROTOR` | 5 |

| `CapabilityFlag` | Bit |
|---|---:|
| `ROTOR` | `1<<0` |
| `WING` | `1<<1` |
| `HOVER` | `1<<2` |
| `RUNWAY` | `1<<3` |
| `TRANSITION` | `1<<4` |
| `TILT` | `1<<5` |

`capability_mask`只由model_type查表生成，Build后只读。

### B.3 Task

| `TaskLifecycle` | Value |
|---|---:|
| `PLANNED` | 0 |
| `RUNNING` | 1 |
| `COMPLETED` | 2 |
| `CANCELLED` | 3 |
| `INTERRUPTED` | 4 |

| `TaskPhaseInternal` | Value |
|---|---:|
| `NONE` | 0 |
| `PRE_GROUND` | 1 |
| `TAKEOFF` | 2 |
| `NAV` | 3 |
| `LANDING` | 4 |
| `POST_GROUND` | 5 |

`NONE`只在内部使用；Public TaskPhase只允许1..5对应字符串。

| `GroundMode` | Value |
|---|---:|
| `NONE` | 0 |
| `AUTO` | 1 |
| `EXPLICIT` | 2 |

| `GroundSegmentPhase` | Value |
|---|---:|
| `PRE_GROUND` | 0 |
| `POST_GROUND` | 1 |

Task不定义公开等待状态或可派生的delay/ground-plan/route-complete flags。held使用独立u8；其余值由权威数据派生。

### B.4 Aircraft Resource / Execution

| `AircraftResourceState` | Value |
|---|---:|
| `AVAILABLE` | 0 |
| `ASSIGNED` | 1 |
| `EXECUTING` | 2 |
| `DESTROYED` | 3 |

| `AircraftExecutionState` | Value |
|---|---:|
| `GROUND` | 0 |
| `TAKEOFF` | 1 |
| `NAV` | 2 |
| `LANDING` | 3 |

| `AircraftSubphase` | Value |
|---|---:|
| `NONE` | 0 |
| `TAKEOFF_VERTICAL_CLIMB` | 1 |
| `TAKEOFF_RUNWAY_ROLL` | 2 |
| `TAKEOFF_WING_BORNE` | 3 |
| `TAKEOFF_TRANSITION` | 4 |
| `LANDING_APPROACH` | 5 |
| `LANDING_BACK_TRANSITION` | 6 |
| `LANDING_VERTICAL_DESCENT` | 7 |
| `LANDING_ROLLOUT` | 8 |
| `GROUND_RECOVERY` | 9 |

| `AircraftExecutionFlag` | Bit |
|---|---:|
| `PLACED` | `1<<0` |
| `INSIDE_HANGAR` | `1<<1` |

`INSIDE_HANGAR`表示Aircraft已经完成实体Hangar进入并处于机库内；它不表示仅取得、预留或占用Hangar logical lane。进入完成时设置，离开机库并开始Ground movement时清除。

`registered/active/destroyed`由row和AircraftResourceState派生，不占flag。

| `LateralSource` | Value |
|---|---:|
| `ROUTE_TRACKING` | 0 |
| `DIRECT_TO_WAYPOINT` | 1 |
| `OFF_ROUTE_SELECTED` | 2 |
| `JOIN_ROUTE` | 3 |

### B.5 Resource / Reservation

| `ReservationState` | Value |
|---|---:|
| `PLANNED` | 0 |
| `PREPARE` | 1 |
| `IN_PROGRESS` | 2 |
| `OCCUPIED` | 3 |
| `RECOVERY` | 4 |
| `CONSUMED` | 5 |
| `CANCELLED` | 6 |

| `ReservationOperation` | Value |
|---|---:|
| `DEPARTURE` | 0 |
| `ARRIVAL` | 1 |
| `GROUND_PRE` | 2 |
| `GROUND_POST` | 3 |

| `ResourceAvailability` | Value |
|---|---:|
| `OPEN` | 0 |
| `CLOSED` | 1 |
| `BLOCKED` | 2 |

| `ResourceKind` | Value |
|---|---:|
| `HANGAR` | 1 |
| `PAD` | 2 |
| `RUNWAY_END` | 3 |

| `DependencyKind` | Value |
|---|---:|
| `SAME_RESOURCE_OR_EXCLUSIVITY_GROUP` | 1 |
| `SAME_TASK` | 2 |
| `NEXT_TASK_SAME_AIRCRAFT` | 3 |

| `FacilityHoldingKind` | Value |
|---|---:|
| `NONE` | 0 |
| `PHYSICAL_HANGAR` | 1 |
| `VIRTUAL_HOLDING` | 2 |

### B.6 Command / Decision / Severity

| `CommandStatus` | Value |
|---|---:|
| `QUEUED` | 0 |
| `ACCEPTED` | 1 |
| `UNABLE` | 2 |

| `DomainDecision` | Value |
|---|---:|
| `ALLOW` | 0 |
| `UNABLE` | 1 |

| `OperationClass` | Value |
|---|---:|
| `MUTATION` | 1 |
| `CONTROL` | 2 |
| `QUERY` | 3 |

| `CommandSource` | Value |
|---|---:|
| `UI` | 1 |
| `CLI` | 2 |
| `HTTP` | 3 |
| `SCHEDULER_INTERNAL` | 4 |

| `Severity` | Value |
|---|---:|
| `INFO` | 0 |
| `WARNING` | 1 |
| `ERROR` | 2 |
| `CRITICAL` | 3 |

### B.7 Object kind

| `ObjectKind` | Value |
|---|---:|
| `AIRCRAFT` | 1 |
| `TASK` | 2 |
| `FACILITY` | 3 |
| `HANGAR` | 4 |
| `PAD` | 5 |
| `RUNWAY_BODY` | 6 |
| `RUNWAY_END` | 7 |
| `WAYPOINT` | 8 |
| `OBSTACLE` | 9 |
| `BUILDING` | 10 |
| `AIRSPACE_ZONE` | 11 |
| `RUNTIME_VOLUME` | 12 |
| `RESERVATION` | 13 |
| `COMMAND` | 14 |
| `EVENT` | 15 |
| `TERRAIN` | 16 |

### B.8 Participant mask

| Bit | Module |
|---:|---|
| `1<<0` | Task Module |
| `1<<1` | Resource Module |
| `1<<2` | Environment Module |

Control/Query可以为0。未知bit必须拒绝。
