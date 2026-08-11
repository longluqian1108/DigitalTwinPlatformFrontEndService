# 二进制精确布局

收录 SoA/CSR/Arena、Execution batch、UnifiedWorkerOutput、Worker IPC、共享内存与 ViewerSnapshot 的全部字段、offset、type 和约束。

## 内容来源
- 设计：附录 F：SoA / CSR / Arena / Binary Buffer 精确布局 全部

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 规范正文

## 附录 F：SoA / CSR / Arena / Binary Buffer 精确布局

### F.1 共同布局规则

- Binary均little-endian。
- 不依赖编译器packing或隐式padding；offset为固定ABI。
- Warp array为一维contiguous`wp.array`。
- Bool使用u8；enum/flag使用本附录指定整数。
- Optional float使用quiet NaN；Optional row使用i32=-1。
- `0xFFFFFFFF`为invalid u32。
- 二进制epoch identity固定为`epoch_id_bytes[16]`。它按第2.8.1节从canonical UUID string逐字节解码，是opaque 16-octet identity；不得哈希、截断、折叠、转换为u64或按整数端序交换。Runtime header中的全零16 bytes非法；仅Build-before-epoch tagged variant可以用全零表示absent。
- Variable payload offset相对buffer起点，至少8-byte aligned；ViewerSnapshot section为64-byte aligned。
- CRC32C只用于跨进程IPC、shared memory和network frame。同进程typed handle/array不计算CRC；对应CRC字段必须为0。
- 跨边界CRC覆盖完整buffer，计算时仅CRC字段自身视为0。
- Reserved字段必须为0；非0为`PROTOCOL_INCOMPATIBLE`。
- 改变size/offset/required section必须提升major。

### F.2 StableIdRegistry 与确定性 SplitMix64

```text
StableIdEntry
  kind_u8
  int_id_u32
  canonical_key_utf8
  display_id_utf8
```

Build按`(kind,canonical_key UTF-8 byte order)`分配u32。Runtime append-only。第一版Runtime不增加Aircraft identity。

JNL使用固定SplitMix64：

```text
stream_id = 0x4A4E4C5F   # "JNL_"
MASK64 = 0xFFFFFFFFFFFFFFFF

mix64(z):
    z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & MASK64
    z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & MASK64
    return (z ^ (z >> 31)) & MASK64

deterministic_u64(seed, aircraft_row_u32, task_row_u32):
    state = (
        seed
        ^ ((aircraft_row_u32 as u64 * 0x9E3779B97F4A7C15) & MASK64)
        ^ ((task_row_u32   as u64 * 0xBF58476D1CE4E5B9) & MASK64)
        ^ ((stream_id      as u64 * 0x94D049BB133111EB) & MASK64)
    ) & MASK64
    return mix64(state)

random_u64 = deterministic_u64(seed, aircraft_row_u32, task_row_u32)
top24 = (random_u64 >> 40) & 0xFFFFFF
uniform_f32 = f32(top24) * f32(1.0 / 16777216.0)
jnl_blend_k_m = f32(120.0) + f32(230.0) * uniform_f32
```

乘法、异或和shift均使用u64 wraparound。`top24`到f32精确可表示，CPU/CUDA必须使用同一路径。

Golden：

| seed | aircraft_row | task_row | random_u64 | top24 | uniform_f32 bits | blend_k_f32 bits |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0 | 0 | `0x50A2D60FDF5A3145` | `0x50A2D6` | `0x3EA145AC` | `0x4340724C` |
| 20260724 | 0 | 0 | `0x53AF82A813BE198D` | `0x53AF82` | `0x3EA75F04` | `0x43432FAF` |
| 20260724 | 17 | 31 | `0xD902FFAD8875C22C` | `0xD902FF` | `0x3F5902FF` | `0x439D7C58` |
| `0xFFFFFFFFFFFFFFFF` | `0xFFFFFFFF` | `0xFFFFFFFF` | `0xC3D82302578DF0DE` | `0xC3D823` | `0x3F43D823` | `0x4393FA18` |

### F.3 FrameRegistry

```text
FrameRecord
  frame_id_u32
  frame_kind_u8
  parent_frame_id_i32
  origin_ecef_f64[3]
  enu_to_ecef_rotation_f64[9]
  ecef_to_enu_rotation_f64[9]
  core_min_enu_f64[3]
  core_max_enu_f64[3]
  overlap_min_enu_f64[3]
  overlap_max_enu_f64[3]
  direct_to_workspace_A_f64[9]
  direct_to_workspace_b_f64[3]

FrameAdjacencyCSR
  offsets_u32[frame_count+1]
  neighbor_frame_id_u32[]
  direct_i_to_j_A_f64[][9]
  direct_i_to_j_b_f64[][3]
```

### F.4 AircraftResourceSoA

```text
AircraftResourceSoA
  count_u32 / capacity_u32 / generation_u64
  aircraft_id_u32[]
  profile_id_u32[]
  model_type_u8[]
  resource_state_u8[]
  capability_mask_u16[]          # model_type derived, read-only
  assigned_task_i32[]

  geometry_mass_f32[]
  geometry_length_f32[]
  geometry_width_f32[]
  geometry_height_f32[]
  wingspan_f32[]                 # absent NaN
  safety_margin_f32[]

  nmac_horizontal_f32[]
  nmac_vertical_f32[]

  rotor_cruise_f32[]
  rotor_max_speed_f32[]
  rotor_max_climb_f32[]
  rotor_max_descent_f32[]

  wing_min_level_f32[]
  wing_cruise_f32[]
  wing_max_speed_f32[]
  wing_max_climb_f32[]
  wing_max_descent_f32[]

  transition_type_u8[]
  transition_duration_f32[]
  back_transition_duration_f32[]
  tilt_rate_f32[]

  taxi_speed_f32[]
  touchdown_max_horizontal_f32[]
  touchdown_max_vertical_f32[]
  touchdown_max_total_f32[]
  min_vertical_takeoff_height_f32[]

  gain_bank_start_u32[]
  gain_bank_count_u8[]
```

Static profile columns Build后immutable；`resource_state/assigned_task/generation` mutable。

### F.5 AircraftExecutionSoA

```text
AircraftExecutionSoA
  count_u32 / capacity_u32 / generation_u64
  aircraft_id_u32[]
  execution_state_u8[]
  subphase_u8[]
  flags_u16[]                     # PLACED / INSIDE_HANGAR
  owner_workcell_u32[]

  pos_e_f32[] / pos_n_f32[] / pos_u_f32[]
  vel_e_f32[] / vel_n_f32[] / vel_u_f32[]

  workspace_e_f32[] / workspace_n_f32[] / workspace_u_f32[]
  workspace_ve_f32[] / workspace_vn_f32[] / workspace_vu_f32[]
  heading_rad_f32[]

  body_half_height_f32[]
  body_half_length_f32[]
  body_half_width_f32[]
  collision_half_u_f32[]
  safety_margin_f32[]

  current_task_i32[]              # Resource authority read-only mirror
  assigned_origin_resource_i32[]
  assigned_destination_resource_i32[]

  selected_hdg_rad_f32[]
  selected_alt_u_f32[]
  selected_spd_f32[]
  selected_vs_limit_f32[]
  lateral_source_u8[]

  active_route_occurrence_i32[]
  active_leg_from_occurrence_i32[]
  active_leg_to_occurrence_i32[]

  jnl_state_u8[]
  jnl_from_occurrence_i32[]
  jnl_to_occurrence_i32[]
  jnl_heading_goal_rad_f32[]
  jnl_blend_k_m_f32[]

  rotor_integrator_heading_f32[]
  rotor_integrator_speed_f32[]
  rotor_integrator_altitude_f32[]
  wing_integrator_heading_f32[]
  wing_integrator_speed_f32[]
  wing_integrator_altitude_f32[]

  transition_elapsed_f32[]
  landing_plan_kind_u8[]
  landing_d0_f32[]
  landing_h0_f32[]
  landing_v0_f32[]

  ground_segment_i32[]
  ground_occurrence_cursor_i32[]
```

删除`acc_e/n/u`。`collision_half_e/n`不持久化，由`body_half_length/body_half_width/safety_margin/heading_rad`在碰撞查询前即时计算。

`flags_u16`中的`INSIDE_HANGAR`由Execution Runtime依据已提交的Hangar进入/离开事实设置或清除。它表示Aircraft处于实体机库内，不得由Hangar logical lane的分配状态直接推导；lane分配但尚未完成进入时，该bit必须为0。

### F.6 Task / Route / Ground

```text
TaskSoA
  count_u32 / capacity_u32 / generation_u64
  task_id_u32[]
  aircraft_row_i32[]
  lifecycle_u8[]
  phase_internal_u8[]             # NONE sentinel or public phase
  held_u8[]
  blocking_reason_u16[]
  remaining_route_count_u32[]     # derived read-only cache

  scheduled_takeoff_s_f64[]
  scheduled_landing_s_f64[]       # absent NaN
  planned_arrival_anchor_s_f64[]
  completion_t_s_f64[]

  origin_resource_i32[]
  destination_resource_i32[]
  route_start_u32[] / route_len_u32[]
  constraint_start_u32[] / constraint_len_u32[]
  ground_segment_start_u32[] / ground_segment_len_u32[]
  current_ground_segment_i32[]
  departure_reservation_i32[]
  arrival_reservation_i32[]
```

```text
WaypointSoA
  count_u32 / capacity_u32 / generation_u64
  waypoint_id_u32[]
  workspace_e_f32[] / workspace_n_f32[]
  capture_radius_f32[]
  source_u8[]                      # DOCUMENT / RUNTIME
```

```text
RouteOccurrenceArena
  count_u32 / capacity_u32 / generation_u64
  task_row_u32[]
  waypoint_row_u32[]
  stable_serial_u64[]
  enabled_u8[]
  completed_u8[]
  tombstone_u8[]
```

```text
RouteConstraintArena
  count_u32 / capacity_u32 / generation_u64
  occurrence_row_u32[]
  altitude_u_f32[]                # absent NaN
  speed_f32[]
  target_time_s_f64[]
  window_from_s_f64[]
  window_until_s_f64[]
```

```text
GroundSegmentArena
  count_u32 / capacity_u32 / generation_u64
  ground_segment_id_u32[]
  task_row_u32[]
  phase_u8[]
  occurrence_start_u32[]
  occurrence_len_u32[]
  scheduled_start_s_f64[]
  target_arrival_s_f64[]
```

```text
GroundOccurrenceArena
  count_u32 / capacity_u32 / generation_u64
  task_row_u32[]
  ground_segment_row_i32[]
  stable_serial_u64[]
  source_u8[]                     # PLANNED / MANUAL
  target_kind_u8[]
  target_row_i32[]
  workspace_e_f32[]
  workspace_n_f32[]
  workspace_u_f32[]
  surface_reference_u8[]
  completed_u8[]
  tombstone_u8[]
```

TAXI append一个MANUAL occurrence；完成后tombstone，serial不复用。GroundSegment无state column。

### F.7 Resource / Reservation / Occupancy

```text
FacilitySoA
  count_u32 / generation_u64
  facility_id_u32[]
  availability_u8[]
  center_workspace_f32[][3]
```

```text
ResourceSoA
  count_u32 / capacity_u32 / generation_u64
  resource_id_u32[]
  resource_kind_u8[]              # HANGAR / PAD / RUNWAY_END
  facility_row_u32[]
  runway_body_row_i32[]
  availability_u8[]
  capacity_u16[]
  geometry_row_u32[]
  compatibility_mask_u16[]
  supports_departure_u8[]
  supports_arrival_u8[]
  departure_open_u8[]
  arrival_open_u8[]
  current_task_i32[]              # active owner derived cache
  owner_start_u32[] / owner_count_u16[]
  occupant_start_u32[] / occupant_count_u16[]
  hangar_slot_start_u32[]
```

```text
RunwayBodySoA
  count_u32
  runway_id_u32[]
  facility_row_u32[]
  exclusivity_group_u32[]
  end_a_resource_row_u32[]
  end_b_resource_row_u32[]
  axis_e_f32[] / axis_n_f32[]
  length_f32[] / width_f32[]
  min_u_f32[] / max_u_f32[]
```

```text
ResourceGeometrySoA
  resource_row_u32[]
  owner_workcell_u32[]
  min_e_f32[] / min_n_f32[] / min_u_f32[]
  max_e_f32[] / max_n_f32[] / max_u_f32[]
  center_e_f32[] / center_n_f32[] / center_u_f32[]
  axis_e_f32[] / axis_n_f32[]
  length_f32[] / width_f32[]
  shape_code_u8[]
  touchdown_param_start_u32[]
  operation_zone_param_start_u32[]
```

```text
ReservationSoA
  count_u32 / capacity_u32 / generation_u64
  reservation_id_u32[]
  canonical_ingress_sequence_u64[]
  task_row_i32[]
  aircraft_row_i32[]
  resource_row_i32[]
  exclusivity_group_i32[]
  capacity_lane_u16[]
  operation_u8[]
  anchor_s_f64[]
  reserved_from_s_f64[] / reserved_until_s_f64[]
  effective_from_s_f64[] / effective_until_s_f64[]
  prepare_end_s_f64[] / recovery_end_s_f64[]
  actual_start_s_f64[] / actual_end_s_f64[]
  state_u8[]
  blocking_reason_u16[]
```

删除`lifecycle_u8[]`与`resource_use_phase_u8[]`。

```text
ReservationDependencyCSR
  offsets_u32[reservation_count+1]
  downstream_reservation_row_u32[]
  dependency_kind_u8[]
```

```text
ResourceOwnerArena
  count_u32 / capacity_u32 / generation_u64
  resource_row_u32[]
  reservation_row_u32[]
  task_row_u32[]
  capacity_lane_u16[]
```

该Arena是active reservation派生cache，与ReservationState同事务更新。

```text
PhysicalOccupancyArena
  count_u32 / capacity_u32 / generation_u64
  resource_row_u32[]              # PAD / RUNWAY_END only
  reservation_row_u32[]
  aircraft_row_u32[]
  occupancy_flags_u16[]
```

```text
HangarSlotArena
  count_u32 / capacity_u32 / generation_u64
  resource_row_u32[]
  slot_index_u16[]
  occupying_aircraft_row_i32[]    # logical lane; free=-1
```

HangarSlotArena不等于PhysicalOccupancy。

```text
FacilityHoldingStore
  capacity_u32 / generation_u64
  facility_row_u32[]
  holding_kind_u8[]
  hangar_resource_row_i32[]
  hangar_lane_i32[]
```

### F.8 Environment layouts

```text
ObstacleSoA
  count_u32 / capacity_u32 / generation_u64
  obstacle_id_u32[]
  kind_code_u16[]
  min_e_f32[] / min_n_f32[] / min_u_f32[]
  max_e_f32[] / max_n_f32[] / max_u_f32[]
  active_from_s_f64[] / active_until_s_f64[]
  enabled_u8[]
  source_u8[]
  tombstone_u8[]
```

```text
BuildingSoA
  count_u32
  building_id_u32[]
  owner_workcell_u32[]
  min_e_f32[] / min_n_f32[] / min_u_f32[]
  max_e_f32[] / max_n_f32[] / max_u_f32[]
  source_feature_row_u64[]
```

```text
AirspaceZoneSoA
  count_u32 / capacity_u32 / generation_u64
  zone_id_u32[]
  kind_u8[]
  vertical_reference_u8[]
  floor_f32[] / ceiling_f32[]
  polygon_start_u32[] / polygon_len_u32[]
  rule_start_u32[] / rule_len_u32[]
  exemption_start_u32[] / exemption_len_u32[]
  active_from_s_f64[] / active_until_s_f64[]
  enabled_u8[]
  source_u8[]
  tombstone_u8[]

PolygonCSR
  offsets_u32[]
  polygon_e_f32[] / polygon_n_f32[]

RestrictedRuleCSR
  offsets_u32[]
  compiled_rule_code_u16[]
  field_code_u16[]
  min_f32[] / max_f32[]
  bound_flags_u8[]

ExemptionArena
  zone_row_u32[]
  subject_kind_u8[]
  subject_row_u32[]
  active_from_s_f64[] / active_until_s_f64[]
  reason_string_id_u32[]
  enabled_u8[]
```

```text
TerrainHeightField
  workcell_row_u32
  origin_e_f64 / origin_n_f64
  spacing_e_f32 / spacing_n_f32
  width_u32 / height_u32
  height_u_f32[]
  validity_u8[]
```

Spatial index使用sorted cell key + CSR offset/count；object row按stable integer ID排序。

### F.9 Mutable transaction header

```text
StoreHeader
  committed_count_u32
  working_count_u32
  capacity_u32
  reserved_u32
  committed_generation_u64
  working_generation_u64
```

Commit原子更新count/generation。Abort恢复working header，不擦除不可见shadow bytes。

### F.10 ExecutionInputBatch

Header 72 bytes：

```text
+00 magic_u32                    # "LBIN" = 0x4E49424C
+04 protocol_major_u16           # 1
+06 protocol_minor_u16           # 0
+08 header_bytes_u16             # 72
+10 flags_u16
+12 reserved0_u32                # zero
+16 epoch_id_bytes[16]           # canonical UUID bytes；不得截断或折叠
+32 apply_tick_u64
+40 transaction_count_u32
+44 delta_row_count_u32
+48 row_table_offset_u32
+52 int_payload_offset_u32
+56 float_payload_offset_u32
+60 byte_payload_offset_u32
+64 total_bytes_u32
+68 crc32c_u32                    # zero in-process
```

`DomainDeltaRow` 48 bytes：

```text
+00 operation_code_u16
+02 participant_mask_u8
+03 domain_kind_u8               # TASK=1 RESOURCE=2 ENVIRONMENT=3 CONTROL=4
+04 transaction_slot_u32
+08 canonical_ingress_sequence_u64
+16 target_id_i32
+20 flags_u32
+24 int_offset_u32
+28 int_count_u16
+30 reserved0_u16
+32 float_offset_u32
+36 float_count_u16
+38 reserved1_u16
+40 byte_offset_u32
+44 byte_count_u16
+46 reserved2_u16
```

Backend不解析JSON。

### F.11 ExecutionOutputBatch

Header 88 bytes：

```text
+00 magic_u32                    # "LBOT" = 0x544F424C
+04 protocol_major_u16
+06 protocol_minor_u16
+08 header_bytes_u16             # 88
+10 flags_u16
+12 crc32c_u32                   # zero in-process
+16 epoch_id_bytes[16]           # canonical UUID bytes
+32 completed_tick_u64
+40 working_generation_u64
+48 trace_token_u64
+56 event_candidate_count_u32
+60 command_result_count_u32
+64 task_result_count_u32
+68 resource_result_count_u32
+72 environment_result_count_u32
+76 row_table_offset_u32
+80 total_bytes_u32
+84 overflow_flags_u32
```

`CompactEventCandidate` 32 bytes：

```text
+00 event_code_u16
+02 severity_u8
+03 flags_u8
+04 subject_kind_u8
+05 related_kind_u8
+06 payload_schema_u16
+08 subject_id_i32
+12 related_id_i32
+16 task_id_i32
+20 resource_id_i32
+24 payload_offset_u32
+28 payload_bytes_u16
+30 reason_code_u16
```

`CommandResultRow` 32 bytes：

```text
+00 transaction_slot_u32
+04 status_u8                    # ACCEPTED / UNABLE only
+05 flags_u8
+06 reason_code_u16
+08 canonical_ingress_sequence_u64
+16 result_offset_u32
+20 result_bytes_u32
+24 final_generation_u64
```

`overflow_flags!=0`为authoritative fault。

### F.12 UnifiedWorkerOutput

Common header 96 bytes：

```text
+00 magic_u32                    # "LBWO" = 0x4F57424C
+04 contract_major_u16           # 1
+06 contract_minor_u16           # 0
+08 header_bytes_u16             # 96
+10 variant_u8                   # 1 PROGRESS / 2 FAILED / 3 RUNTIME / 4 FAULT
+11 flags_u8
+12 crc32c_u32                   # zero in-process; populated for IPC bytes
+16 epoch_id_bytes[16]           # all zero for Build variants; nonzero canonical UUID for Runtime/Fault
+32 generation_u64               # zero for Build variants
+40 tick_index_u64               # zero for Build variants
+48 t_s_f64                      # zero for Build variants
+56 section_count_u16
+58 directory_entry_bytes_u16    # 24
+60 directory_offset_u32
+64 total_bytes_u32
+68 reserved0_u32
+72 trace_token_u64
+80 reserved1_u64
+88 reserved2_u64
```

Directory entry 24 bytes：

```text
+00 section_code_u16
+02 element_type_u8
+03 components_u8
+04 offset_u32
+08 count_u32
+12 byte_length_u32
+16 source_generation_u64
```

Build sections：

| Code | Section |
|---:|---|
| `0x0101` | scenario_id UTF-8 |
| `0x0102` | build_request_id UTF-8 |
| `0x0103` | progress/summary canonical JSON |
| `0x0104` | issues canonical JSON |

Runtime sections：

| Code | Section |
|---:|---|
| `0x1001` | final CommandStatus rows |
| `0x1002` | sorted event candidates |
| `0x2001` | Task projection source delta |
| `0x2002` | Aircraft projection source arrays |
| `0x2003` | Resource projection source delta |
| `0x2004` | Environment projection source delta |
| `0x3001` | ViewerSnapshot dynamic source arrays |
| `0x4001` | Runtime health/overrun counters |

Fault variant只允许`0x4001`。Build variants不包含epoch/generation/CommandStatus/event/Read Model/Snapshot。

### F.13 ReliableMessageHeader（Worker IPC）

32 bytes：

```text
+00 magic_u32                    # "LBIP" = 0x5049424C
+04 protocol_major_u16
+06 protocol_minor_u16
+08 message_type_u16
+10 flags_u16
+12 reserved0_u32
+16 sequence_u64
+24 payload_bytes_u32
+28 crc32c_u32
```

Message type：

| Code | Type |
|---:|---|
| `0x0001` | BUILD_REQUEST |
| `0x0002` | WORKER_OUTPUT_BUILD |
| `0x0010` | CANONICAL_COMMAND |
| `0x0011` | CONTROL_REQUEST |
| `0x0020` | EGRESS_BUILD |
| `0x0021` | EGRESS_RUNTIME |
| `0x0030` | HEARTBEAT |
| `0x0031` | WORKER_HEALTH |
| `0x00F0` | SHUTDOWN_REQUEST |
| `0x00F1` | SHUTDOWN_ACK |
| `0x00FF` | PROTOCOL_FAULT |

FIFO按header sequence。Unknown major拒绝handshake。所有跨进程payload验证CRC。

### F.14 ViewerSnapshot three-slot shared memory

```text
SharedMemory
├── GlobalHeader 128 bytes
├── Slot 0: SlotHeader 64 + payload[slot_bytes]
├── Slot 1: SlotHeader 64 + payload[slot_bytes]
└── Slot 2: SlotHeader 64 + payload[slot_bytes]
```

GlobalHeader：

```text
+00 magic_u32                  # "LBS3" = 0x3353424C
+04 protocol_major_u16
+06 protocol_minor_u16
+08 header_bytes_u16          # 128
+10 slot_count_u16            # exactly 3
+12 slot_bytes_u32
+16 epoch_id_bytes[16]        # canonical UUID bytes
+32 published_sequence_u64
+40 writer_heartbeat_u64
+48 reader_last_sequence_u64
+56 dropped_snapshot_count_u64
+64 reserved[64]
```

SlotHeader：

```text
+00 committed_sequence_u64
+08 payload_bytes_u32
+12 crc32c_u32
+16 tick_index_u64
+24 t_s_f64
+32 viewer_major_u16
+34 viewer_minor_u16
+36 flags_u32
+40 epoch_id_bytes[16]        # must equal GlobalHeader epoch_id
+56 reserved[8]
```

Writer/reader使用release-acquire、before/copy/after双读和CRC；任何不一致丢弃并重读最新。

### F.15 ViewerSnapshot frame

Header 72 bytes：

| Offset | Type | Field |
|---:|---|---|
| 0 | u32 | magic`"LBSV" = 0x5653424C` |
| 4 | u16 | major=1 |
| 6 | u16 | minor=0 |
| 8 | u16 | header_bytes=72 |
| 10 | u16 | flags |
| 12 | u32 | frame_id |
| 16 | bytes[16] | `epoch_id_bytes`（canonical UUID） |
| 32 | u64 | sequence |
| 40 | u64 | tick_index |
| 48 | f64 | t_s |
| 56 | u32 | aircraft_count |
| 60 | u16 | section_count |
| 62 | u16 | directory_entry_bytes=16 |
| 64 | u32 | payload_bytes |
| 68 | u32 | crc32c |

Required sections：

| Code | Field | Type/components |
|---:|---|---|
| `0x0001` | aircraft_id | U32/1 |
| `0x0002` | task_id | I32/1 |
| `0x0003` | workspace_position | F32/3 |
| `0x0004` | workspace_velocity | F32/3 |
| `0x0005` | heading_rad | F32/1 |
| `0x0006` | horizontal_speed_mps | F32/1 |
| `0x0007` | vertical_speed_mps | F32/1 |
| `0x0008` | aircraft_execution_state | U8/1 |
| `0x000A` | flags | U16/1 |
| `0x000B` | owner_workcell_id | U32/1 |

`0x0009`保留。Row按Aircraft integer ID升序，只包含`placed && resource_state != DESTROYED`。ViewerSnapshot不包含Subphase、TaskLifecycle/TaskPhase、AircraftResourceState、reservation、event或controller。

### F.16 Snapshot static table

Control WS JSON，strict：

```json
{
  "type": "snapshot_static_table",
  "protocol_version": "1.0.0",
  "epoch_id": "...",
  "contract_version": "1.0.0",
  "entries": [
    {
      "aircraft_int": 17,
      "aircraft_id": "AC101",
      "profile_id": "FW-A",
      "model_type": "fixed_wing",
      "display_name": "AC101"
    }
  ]
}
```

Entries按aircraft_int严格递增且唯一。无`generation`字段；epoch内固定。

### F.17 Generation consistency assertions

每次Commit后必须断言：

```text
TaskStore.generation
= ResourceStore.generation
= EnvironmentStore.generation
= AircraftExecutionSoA.generation
= UnifiedWorkerOutput.runtime.generation
= Projection cache source_generation
```

ViewerSnapshot可以因cadence未发布，但不能引用其他epoch static table。
