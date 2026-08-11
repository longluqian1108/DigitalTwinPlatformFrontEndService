# Command Registry 与 CLI Grammar

收录全部 active operation code、CLI spelling、参数、gate、query 语义、removed spelling 和 conformance 要求。

## 内容来源
- 设计：附录 C：Command Registry 与 CLI Grammar 全部

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 规范正文

## 附录 C：Command Registry 与 CLI Grammar

### C.1 Registry row

每行固定：

```text
operation_code_u16
canonical_name
primary_cli_spelling
operation_class
participant_mask
orchestration_mode          # SINGLE / PARALLEL_TR / SEQUENTIAL_TR
allowed_session_states
phase_gate
argument_schema
result_schema
reason_allowlist
```

第一版发布前从本表生成紧凑active code。只有正式发布过的code才建立不可复用保护；未来功能不预留numeric code。

### C.2 CLI lexical grammar

1. UTF-8单行，最大1 MiB。
2. Keyword/subcommand/key不区分大小写并规范化为大写；ID/string value保留大小写。
3. ASCII whitespace分隔token；含空格value使用JSON double-quoted string。
4. key-value使用`KEY=value`；bool只接受`true/false`。
5. Number为finite decimal，不接受hex、NaN、Infinity或locale comma。
6. JSON payload从首个`{`或`[`开始按strict JSON解析，可以包含空格。
7. CLI不维护default Aircraft或Task；目标ID必须显式给出。
8. Parse成功后round-trip为canonical JSON；幂等直接比较canonical payload bytes。

```ebnf
command   = keyword, { ws, argument } ;
argument  = bare | key, "=", value | json ;
keyword   = alpha, { alpha | "_" }, { ws, subkeyword } ;
value     = bare | json_string | number | boolean | csv_value ;
```

### C.3 Active Command Registry

Participant：`T`=Task，`R`=Resource，`E`=Environment，`-`=无领域模块。

#### C.3.1 Task / Ground / Departure

| Code | Canonical | CLI | Class | Participant / orchestration | Allowed | Args / gate |
|---:|---|---|:---:|---|---|---|
| `0x0101` | `add_task` | `ADD_TASK` | M | T/R sequential | RUNNING/PAUSED | 完整Task JSON。 |
| `0x0102` | `takeoff` | `TKF` | M | T/R parallel | RUNNING/PAUSED | aircraft；Task PRE_GROUND。 |
| `0x0103` | `taxi_to` | `TAXI` | M | T/R parallel | RUNNING/PAUSED | aircraft + one ENU/WGS84/HANGAR/PAD/RUNWAY_END target；PRE/POST_GROUND。 |
| `0x0104` | `set_slot` | `SLOT` | M | T/R sequential | RUNNING/PAUSED | task + 六字段至少一个。 |
| `0x0105` | `hold_task` | `HOLD_TASK` | M | T | RUNNING/PAUSED | PLANNED或RUNNING/PRE_GROUND。 |
| `0x0106` | `release_task` | `REL_TASK` | M | T | RUNNING/PAUSED | held nonterminal task。 |
| `0x0107` | `cancel_task` | `CXL_TASK` | M | T/R parallel | RUNNING/PAUSED | PLANNED或RUNNING/PRE_GROUND。 |
| `0x0108` | `change_resource` | `CHGRES` | M | T/R sequential | RUNNING/PAUSED | task + DEP/ARR resource；reservation PLANNED。 |
| `0x0109` | `change_aircraft` | `CHGAC` | M | T/R sequential | RUNNING/PAUSED | task + new aircraft；PRE_GROUND前。 |

Examples：

```text
ADD_TASK {"task_id":"TASK002",...}
TKF AC101
TAXI AC101 ENU=1200,350
TAXI AC101 HANGAR=BJ-VERT-001/H01
TAXI AC101 PAD=BJ-VERT-001/PAD-A
TAXI AC101 RUNWAY_END=BJ-APT-001/RWY-END-09
SLOT TASK001 TKF=900 LND=1500 DEP_PREPARE=60 DEP_RECOVERY=30 ARR_PREPARE=30 ARR_RECOVERY=60
HOLD_TASK TASK001
REL_TASK TASK001
CXL_TASK TASK001
CHGRES TASK001 DEP=RUNWAY_END:BJ-APT-001/RWY-END-09
CHGRES TASK001 ARR=PAD:BJ-VERT-002/PAD-B
CHGAC TASK001 AC202
```

SLOT字段：

```text
TKF / LND                         # absolute simulation seconds
DEP_PREPARE / DEP_RECOVERY        # duration seconds
ARR_PREPARE / ARR_RECOVERY        # duration seconds
```

至少一个。字段级gate以第4.10节为权威；四个duration字段非负，`operation_duration_s`不可修改，实际阶段结束时刻只能由`RSRCUSE END`调整。

#### C.3.2 Airborne navigation

| Code | Canonical | CLI | Class | Participant | Allowed | Args / gate |
|---:|---|---|:---:|:---:|---|---|
| `0x0201` | `set_selected` | `SEL` | M | T | RUNNING/PAUSED | aircraft；SPD/DEG/ALT至少一项；VS依赖ALT；NAV。 |
| `0x0202` | `direct_to_waypoint` | `DCT` | M | T | RUNNING/PAUSED | aircraft + unfinished occurrence。 |
| `0x0203` | `join_route_leg` | `JNL` | M | T | RUNNING/PAUSED | aircraft + adjacent from/to + optional DEG。 |
| `0x0204` | `route_add_waypoint` | `RTE ADD` | M | T | RUNNING/PAUSED | aircraft + exactly one BEFORE/AFTER + WPT。 |
| `0x0205` | `route_delete_waypoint` | `RTE DEL` | M | T | RUNNING/PAUSED | aircraft + WPT + optional ALL。 |
| `0x0206` | `route_replace_waypoints` | `RTE REPLACE` | M | T | RUNNING/PAUSED | aircraft + WPTS array，可为空。 |
| `0x0207` | `set_waypoint_constraint` | `AT` | M | T | RUNNING/PAUSED | aircraft + WPT + constraint fields。 |

```text
SEL AC101 SPD=45 DEG=90 ALT=160 VS=2
DCT AC101 WP010@2
JNL AC101 WP010@2 WP011@2 DEG=110
RTE ADD AC101 BEFORE=WP010@1 WPT=WP015
RTE ADD AC101 AFTER=WP010@2 WPT={"waypoint_id":"WP015",...}
RTE DEL AC101 WPT=WP015@2
RTE DEL AC101 WPT=WP015 ALL=true
RTE REPLACE AC101 WPTS=["WP020","WP021"]
RTE REPLACE AC101 WPTS=[]
AT AC101 WP011@2 ALT=160 SPD=45 TIME=300
```

RTE REPLACE从active occurrence开始（含）替换。空数组清空所有remaining occurrence。

#### C.3.3 Landing / Diversion

| Code | Canonical | CLI | Class | Participant / orchestration | Allowed | Args / gate |
|---:|---|---|:---:|---|---|---|
| `0x0301` | `land` | `LND` | M | T/R parallel | RUNNING/PAUSED | aircraft；NAV；route complete。 |
| `0x0302` | `divert` | `DIVERT` | M | T/R sequential | RUNNING/PAUSED | task + DEST + RTE；LANDING前。 |

```text
LND AC101
DIVERT TASK001 DEST=PAD:BJ-VERT-002/PAD-ALT-01 RTE=["WP090","WP091"]
DIVERT TASK001 DEST=RUNWAY_END:BJ-APT-002/RWY-END-15 RTE=["WP090","WP091"]
```

LND在ManagedLandingPlanV1初始化提交时ACCEPTED，不等待touchdown。

#### C.3.4 Resource

| Code | Canonical | CLI | Class | Participant / orchestration | Allowed | Args / gate |
|---:|---|---|:---:|---|---|---|
| `0x0401` | `set_resource` | `RSRC SET` | M | R | RUNNING/PAUSED | availability form或Runway End permission form。 |
| `0x0402` | `show_resource` | `RSRC` | Q | - | READY/RUNNING/PAUSED/STOPPED | canonical resource ID。 |
| `0x0403` | `adjust_resource_use_end` | `RSRCUSE END` | M | T/R sequential | RUNNING/PAUSED | task + OP + exactly one PREPARE/RECOVERY absolute time。 |

```text
RSRC SET PAD:BJ-VERT-001/PAD-A AVAILABILITY=CLOSED
RSRC SET HANGAR:BJ-VERT-001/H01 AVAILABILITY=OPEN
RSRC SET RUNWAY_END:BJ-APT-001/RWY-END-09 AVAILABILITY=CLOSED
RSRC SET RUNWAY_END:BJ-APT-001/RWY-END-09 DEPARTURE_OPEN=false
RSRC SET RUNWAY_END:BJ-APT-001/RWY-END-09 ARRIVAL_OPEN=true
RSRC PAD:BJ-VERT-001/PAD-A
RSRCUSE END TASK001 OP=DEP PREPARE=340
RSRCUSE END TASK001 OP=ARR RECOVERY=980
```

`AVAILABILITY`与permission key不得混写；CLI不能设置BLOCKED。

#### C.3.5 Environment VOL

| Code | Canonical | CLI | Class | Participant | Allowed | Args |
|---:|---|---|:---:|:---:|---|---|
| `0x0501` | `add_restricted_airspace` | `VOL ADD RA` | M | E | RUNNING/PAUSED | zone + polygon + floor/ceiling + interval/rules。 |
| `0x0502` | `add_obstacle` | `VOL ADD OBS` | M | E | RUNNING/PAUSED | obstacle + AABB + kind + interval。 |
| `0x0503` | `remove_volume` | `VOL RM` | M | E | RUNNING/PAUSED | runtime volume ID。 |
| `0x0504` | `set_volume` | `VOL SET` | M | E | RUNNING/PAUSED | runtime volume ID + ENABLED bool。 |
| `0x0505` | `show_volume` | `VOL SHOW` | Q | - | READY/RUNNING/PAUSED/STOPPED | ID。 |
| `0x0506` | `list_volumes` | `VOL LIST` | Q | - | READY/RUNNING/PAUSED/STOPPED | optional filters。 |

```text
VOL ADD RA ZONE=RA001 POLY_ENU=0,0;100,0;100,100 FLOOR_U=0 CEIL_U=300 START=120 END=600
VOL ADD OBS ID=OBS001 AABB_ENU=1000,1000,44,1100,1100,180 KIND=tower_crane
VOL RM ID=RA001
VOL SET ID=RA001 ENABLED=true
VOL SHOW ID=RA001
VOL LIST
```

VOL RM/SET只作用于runtime volume；static obstacle/zone不可修改。

#### C.3.6 Airspace exemption

| Code | Canonical | CLI | Class | Participant | Allowed | Args |
|---:|---|---|:---:|:---:|---|---|
| `0x0601` | `set_airspace_exemption` | `AX SET` | M | E | RUNNING/PAUSED | ZONE + AC xor TASK + ENABLED + optional START/END/REASON。 |
| `0x0602` | `list_airspace_exemptions` | `AXLS` | Q | - | READY/RUNNING/PAUSED/STOPPED | optional filters。 |

```text
AX SET ZONE=MEDICAL-NFZ TASK=TASK001 ENABLED=true START=300 END=900 REASON=medical
AX SET ZONE=MEDICAL-NFZ TASK=TASK001 ENABLED=false
AXLS ZONE=MEDICAL-NFZ
```

#### C.3.7 Runtime / Query

| Code | Canonical | CLI | Class | Participant | Allowed | Args |
|---:|---|---|:---:|:---:|---|---|
| `0x0901` | `start` | `START` | C | - | READY | none。 |
| `0x0902` | `pause` | `PAUSE` | C | - | RUNNING | none。 |
| `0x0903` | `resume` | `RESUME` | C | - | PAUSED | none。 |
| `0x0904` | `set_time_scale` | `RATE` | C | - | RUNNING/PAUSED | positive allowed scale。 |
| `0x0905` | `stop` | `STOP` | C | - | RUNNING/PAUSED | none。 |
| `0x0906` | `reset` | `RESET` | C | - | STOPPED | none。 |
| `0x0907` | `time` | `TIME` | Q | - | READY/RUNNING/PAUSED/STOPPED | none。 |
| `0x0908` | `pos` | `POS` | Q | - | READY/RUNNING/PAUSED/STOPPED | aircraft ID。 |
| `0x0909` | `show_task` | `SHOW_TASK` | Q | - | READY/RUNNING/PAUSED/STOPPED | task ID。 |
| `0x090A` | `show_route` | `SHOW_ROUTE` | Q | - | READY/RUNNING/PAUSED/STOPPED | task ID。 |
| `0x090B` | `list_tasks` | `LIST_TASKS` | Q | - | READY/RUNNING/PAUSED/STOPPED | optional lifecycle/phase filters。 |
| `0x090C` | `list_warnings` | `LIST_WARNINGS` | Q | - | READY/RUNNING/PAUSED/STOPPED | optional filters。 |
| `0x090D` | `help` | `HELP` | Q | - | all non-CLOSED | optional operation。 |

```text
START
PAUSE
RATE 2
RESUME
STOP
RESET
TIME
POS AC101
SHOW_TASK TASK001
SHOW_ROUTE TASK001
LIST_TASKS PHASE=NAV
LIST_WARNINGS ACTIVE=true
HELP
```

`RATE 0`、`TS`、`RESUME RATE=n`均非法。

### C.4 Query语义

Q operation由Gateway读取Projection cache，不产生QUEUED/CommandStatus/event。Query response使用外层freshness：

```json
{
  "epoch_id": "...",
  "source_generation": 1200,
  "source_tick_index": 1194,
  "source_t_s": 119.4,
  "data": {}
}
```

Target不存在返回HTTP 404 Query Error。

### C.5 Unknown/removed spelling guard

以下不是alias，必须返回`UNKNOWN_OPERATION`或明确的invalid subcommand：

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

`VOL ADD`若缺少RA/OBS子命令也不得解析为通用discriminated payload。

### C.6 Command result规则

- ACCEPTED幂等no-op可以使用`ALREADY_IN_STATE`、`ALREADY_ABSENT`或`NO_CHANGE`；
- UNABLE必须使用operation reason allowlist；
- result object strict；无结果时为`{}`；
- Route mutation result必须包含new/deleted/tombstoned occurrence refs与`remaining_route_count`；
- ADD_TASK result包含`task_id`和生成的ground/occurrence refs，不公开task_row；
- SLOT result包含修改字段及新的base/effective windows；
- command final不得包含内部diagnostics、device pointer或working row。

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
