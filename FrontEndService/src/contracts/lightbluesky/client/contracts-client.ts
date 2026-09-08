// @ts-nocheck
// DO NOT EDIT.
// Source: schemas/source/common.schema.json, schemas/source/environment.schema.json, schemas/source/messages.schema.json, schemas/source/resource.schema.json, schemas/source/task.schema.json, schemas/registries/command_registry.yaml, schemas/registries/event_registry.yaml, schemas/registries/port_registry.yaml, schemas/registries/reason_registry.yaml, schemas/registries/runtime_enum_registry.yaml, protocol/source/committed_output.yaml, protocol/source/execution_input.yaml, protocol/source/execution_output.yaml, protocol/source/viewer_snapshot.yaml, protocol/source/worker_ipc.yaml
// Design: LightBlueSky_v8.0.md
// Contract version: 1.0.0
// Generator version: 1.0.0
// Source clause IDs: LBS8-2-ARCH-001, LBS8-2-FRAME-003, LBS8-2-INPUT-002, LBS8-2-TIME-004, LBS8-3-COMMIT-004, LBS8-4-GROUND-003, LBS8-4-LIFECYCLE-002, LBS8-4-ROUTE-004, LBS8-4-TASK-001, LBS8-5-AIRCRAFT-001, LBS8-5-DELAY-004, LBS8-5-RESERVATION-003, LBS8-5-RUNWAY-005, LBS8-5-STATE-002, LBS8-6-BUILD-004, LBS8-6-DATASET-002, LBS8-6-ENV-001, LBS8-6-VOLAX-003, LBS8-7-BUFFER-005, LBS8-8-EVENT-002, LBS8-8-PROJECTION-001, LBS8-8-SNAPSHOT-003, LBS8-9-GATEWAY-001, LBS8-9-WS-002, LBS8-A-SCHEMA-001, LBS8-B-ENUM-001, LBS8-C-CMD-001, LBS8-D-EVENT-001, LBS8-E-PORT-001, LBS8-F-BINARY-001, LBS8-G-MSG-001, LBS8-H-VALID-001, LBS8-I-INVARIANT-024, LBS8-I-INVARIANT-025, LBS8-I-INVARIANT-026, LBS8-I-INVARIANT-027, LBS8-I-STAGE1-013, LBS8-I-UNIT-025, LBS8-J-BINARY-001, LBS8-J-BINARY-002, LBS8-J-BINARY-003, LBS8-J-BINARY-004, LBS8-J-BINARY-005, LBS8-J-BINARY-006, LBS8-J-BINARY-007, LBS8-J-BINARY-008, LBS8-J-BINARY-009, LBS8-J-BINARY-010, LBS8-J-BINARY-011

export const CONTRACT_VERSION = "1.0.0";

export const GATEWAY_OPENAPI_VERSION = "3.1.0" as const;
export const GATEWAY_BINDING = {"control_ws":{"client_message":{"$ref":"#/$defs/ControlClientHello"},"path":"/ws/v1/scenarios/{scenario_id}/control","server_message":{"$ref":"#/$defs/Stage1ControlServerMessage"}},"global_errors":{"400":{"$ref":"#/$defs/GatewayError"},"404":{"$ref":"#/$defs/GatewayError"},"409":{"$ref":"#/$defs/GatewayError"},"413":{"$ref":"#/$defs/GatewayError"},"429":{"$ref":"#/$defs/GatewayError"},"503":{"$ref":"#/$defs/GatewayError"}},"http":[{"error_codes":["REQUEST_BODY_NOT_ALLOWED","SCHEMA_UNKNOWN_FIELD","ID_ALLOCATION_EXHAUSTED","INTERNAL_GATEWAY_FAILURE"],"method":"POST","path":"/api/v1/scenarios","request_body":false,"success_schema":{"$ref":"#/$defs/ScenarioSession"},"success_status":201},{"error_codes":["INVALID_ARGUMENT","DOCUMENT_KIND_UNKNOWN","PAYLOAD_TOO_LARGE","SCHEMA_REQUIRED_FIELD","CONTENT_TYPE_UNSUPPORTED","SCHEMA_UNKNOWN_FIELD","ID_NOT_FOUND","DOCUMENT_ORDER_INVALID","RUNTIME_ALREADY_BUILT","INVALID_SESSION_STATE","INTERNAL_GATEWAY_FAILURE"],"method":"PUT","path":"/api/v1/scenarios/{id}/documents/{kind}","request_body":{"$ref":"#/$defs/Stage1RawDocument"},"success_schema":{"$ref":"#/$defs/DocumentUploadResult"},"success_status":200},{"error_codes":["INVALID_ARGUMENT","DOCUMENT_KIND_UNKNOWN","PAYLOAD_TOO_LARGE","SCHEMA_REQUIRED_FIELD","CONTENT_TYPE_UNSUPPORTED","INVALID_JSON","DUPLICATE_JSON_KEY","SCHEMA_UNKNOWN_FIELD","INVALID_NUMBER","ID_NOT_FOUND","DOCUMENT_NOT_VALID","REVISION_MISMATCH","RUNTIME_ALREADY_BUILT","INVALID_SESSION_STATE","INTERNAL_GATEWAY_FAILURE"],"method":"POST","path":"/api/v1/scenarios/{id}/confirm/{kind}","request_body":{"$ref":"#/$defs/ConfirmRequest"},"success_schema":{"$ref":"#/$defs/ScenarioSession"},"success_status":200},{"error_codes":["INVALID_ARGUMENT","REQUEST_BODY_NOT_ALLOWED","SCHEMA_UNKNOWN_FIELD","ID_NOT_FOUND","DOCUMENTS_NOT_CONFIRMED","RUNTIME_ALREADY_BUILT","INVALID_SESSION_STATE","WORKER_UNAVAILABLE","PROTOCOL_INCOMPATIBLE","ID_ALLOCATION_EXHAUSTED","INTERNAL_GATEWAY_FAILURE"],"method":"POST","path":"/api/v1/scenarios/{id}/build","request_body":false,"success_schema":{"$ref":"#/$defs/BuildJob"},"success_status":202},{"error_codes":["INVALID_ARGUMENT","PAYLOAD_TOO_LARGE","SCHEMA_REQUIRED_FIELD","CONTENT_TYPE_UNSUPPORTED","INVALID_JSON","DUPLICATE_JSON_KEY","SCHEMA_VERSION_UNSUPPORTED","SCHEMA_UNKNOWN_FIELD","INVALID_NUMBER","UNKNOWN_OPERATION","ID_NOT_FOUND","ID_ALLOCATION_EXHAUSTED","COMMAND_ID_REUSE_MISMATCH","EPOCH_MISMATCH","INVALID_SESSION_STATE","WORKER_UNAVAILABLE","COMMAND_QUEUE_FULL","INTERNAL_GATEWAY_FAILURE"],"method":"POST","path":"/api/v1/scenarios/{id}/commands","request_body":{"$ref":"#/$defs/CanonicalCommandRequest"},"success_schema":{"$ref":"#/$defs/CommandReceipt"},"success_status":202},{"error_codes":["INVALID_ARGUMENT","REQUEST_BODY_NOT_ALLOWED","SCHEMA_UNKNOWN_FIELD","ID_NOT_FOUND","INTERNAL_GATEWAY_FAILURE"],"method":"GET","path":"/api/v1/scenarios/{id}/commands/{command_id}","request_body":false,"success_schema":{"$ref":"#/$defs/CommandStatusResponse"},"success_status":200},{"error_codes":["INVALID_ARGUMENT","REQUEST_BODY_NOT_ALLOWED","SCHEMA_UNKNOWN_FIELD","ID_NOT_FOUND","INVALID_SESSION_STATE","INTERNAL_GATEWAY_FAILURE"],"method":"GET","path":"/api/v1/scenarios/{id}/state","request_body":false,"success_schema":{"$ref":"#/$defs/FreshRuntimeReadModelResponse"},"success_status":200},{"error_codes":["INVALID_ARGUMENT","REQUEST_BODY_NOT_ALLOWED","SCHEMA_UNKNOWN_FIELD","ID_NOT_FOUND","INTERNAL_GATEWAY_FAILURE"],"method":"GET","path":"/api/v1/scenarios/{id}/builds/{build_job_id}","request_body":false,"success_schema":{"$ref":"#/$defs/BuildStatusResponse"},"success_status":200}],"openapi_version":"3.1.0","snapshot_ws":{"binary_protocol_source":"protocol/source/viewer_snapshot.yaml","client_message":{"$ref":"#/$defs/SnapshotClientHello"},"path":"/ws/v1/scenarios/{scenario_id}/snapshot","server_json_message":{"$ref":"#/$defs/SnapshotHello"}}} as const;
export const GATEWAY_HTTP_BINDINGS = GATEWAY_BINDING.http;
export const GATEWAY_ERROR_CATALOG = {"COMMAND_ID_REUSE_MISMATCH":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The command ID was already used with different canonical payload bytes.","status_u16":409},"COMMAND_QUEUE_FULL":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The command ingress queue is full.","status_u16":429},"CONTENT_TYPE_UNSUPPORTED":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request Content-Type is not supported.","status_u16":400},"DOCUMENTS_NOT_CONFIRMED":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"All three current document revisions must be confirmed before Build.","status_u16":409},"DOCUMENT_KIND_UNKNOWN":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The document kind is not supported.","status_u16":400},"DOCUMENT_NOT_VALID":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The current document revision is not valid and cannot be confirmed.","status_u16":409},"DOCUMENT_ORDER_INVALID":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The document cannot be uploaded before its required upstream documents are confirmed.","status_u16":409},"DUPLICATE_JSON_KEY":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request body contains a duplicate JSON key.","status_u16":400},"EPOCH_MISMATCH":{"details_schema_ref":"../source/messages.schema.json#/$defs/EpochMismatchDetails","message_en":"The command epoch does not match the current session epoch.","status_u16":409},"ID_ALLOCATION_EXHAUSTED":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"A required server-generated identifier could not be allocated.","status_u16":503},"ID_NOT_FOUND":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The requested object was not found.","status_u16":404},"INTERNAL_GATEWAY_FAILURE":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The Gateway failed while processing the request.","status_u16":503},"INVALID_ARGUMENT":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request contains an invalid argument.","status_u16":400},"INVALID_JSON":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request body is not valid UTF-8 JSON.","status_u16":400},"INVALID_NUMBER":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request contains an invalid numeric value.","status_u16":400},"INVALID_SESSION_STATE":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The current session state does not allow this operation.","status_u16":409},"PAYLOAD_TOO_LARGE":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request payload exceeds the allowed size.","status_u16":413},"PROTOCOL_INCOMPATIBLE":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The worker protocol handshake is incompatible.","status_u16":503},"REQUEST_BODY_NOT_ALLOWED":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"This operation does not accept a request body.","status_u16":400},"REVISION_MISMATCH":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The supplied revision binding does not match the current document revisions.","status_u16":409},"RUNTIME_ALREADY_BUILT":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The runtime has already been built for this scenario.","status_u16":409},"SCHEMA_REQUIRED_FIELD":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request is missing a required body or field.","status_u16":400},"SCHEMA_UNKNOWN_FIELD":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The request contains an unknown field.","status_u16":400},"SCHEMA_VERSION_UNSUPPORTED":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The requested schema or contract version is not supported.","status_u16":400},"UNKNOWN_OPERATION":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The requested operation is not supported.","status_u16":400},"WORKER_UNAVAILABLE":{"details_schema_ref":"../source/messages.schema.json#/$defs/GatewayEmptyDetails","message_en":"The scenario worker is unavailable for this operation.","status_u16":503}} as const;

/* Generated Stage 0 in-memory fixture decoder; it never reads repository sources at runtime. */
/* This module stays inside the plain JavaScript syntax subset: it runs identically under */
/* bare node as .mjs and under node --experimental-strip-types as .ts. */

const STAGE0_ABI = JSON.parse(String.raw`{"compact_event_candidate":{"alignment_bytes":8,"fields":[{"name":"event_code_u16","offset":0,"type":"u16"},{"name":"severity_u8","offset":2,"type":"u8"},{"name":"flags_u8","offset":3,"type":"u8"},{"name":"subject_kind_u8","offset":4,"type":"u8"},{"name":"related_kind_u8","offset":5,"type":"u8"},{"name":"payload_schema_u16","offset":6,"type":"u16"},{"name":"subject_id_i32","offset":8,"type":"i32"},{"name":"related_id_i32","offset":12,"type":"i32"},{"name":"task_id_i32","offset":16,"type":"i32"},{"name":"resource_id_i32","offset":20,"type":"i32"},{"name":"canonical_ingress_sequence_u64","offset":24,"type":"u64"},{"name":"candidate_local_sequence_u32","offset":32,"type":"u32"},{"name":"payload_offset_u32","offset":36,"type":"u32"},{"name":"payload_bytes_u16","offset":40,"type":"u16"},{"name":"reason_code_u16","offset":42,"type":"u16"},{"name":"reserved0_u32","offset":44,"type":"u32","zero":true}],"legacy_sizes":{"32":"reject"},"protocol":{"major":1,"minor":0},"size_bytes":48},"endianness":"little","payload_schema_codes":{"aircraft_destroyed.v1":1,"aircraft_phase.v1":2,"airspace_violation.v1":3,"collision.v1":4,"command_status.v1":5,"constraint_missed.v1":6,"exemption_change.v1":7,"overrun.v1":8,"resource_change.v1":9,"route.v1":10,"runtime_status.v1":11,"task_status.v1":12,"volume_change.v1":13},"viewer_snapshot_frame":{"crc32c":{"algorithm":"CRC32C","coverage":"complete_buffer_with_crc_field_zeroed","field":"crc32c_u32","mode":"required"},"directory":{"aircraft_count_consistency":{"closure_id":"CC-B7A-viewersnapshot-directory-abi","derived":true,"rule":"frame_header.aircraft_count_u32_must_equal_count_u32_of_every_required_section"},"element_type_codes":{"F32":5,"I32":4,"U16":2,"U32":3,"U8":1},"element_type_size_bytes":{"F32":4,"I32":4,"U16":2,"U32":4,"U8":1},"entry_layout":{"fields":[{"name":"section_code_u16","offset":0,"type":"u16"},{"name":"element_type_u8","offset":2,"type":"u8"},{"name":"components_u8","offset":3,"type":"u8"},{"name":"offset_u32","offset":4,"type":"u32"},{"name":"count_u32","offset":8,"type":"u32"},{"name":"byte_length_u32","offset":12,"type":"u32"}],"size_bytes":16},"entry_size_bytes":16,"payload_bytes":{"frame_header_payload_bytes_u32":"all_bytes_after_the_72_byte_frame_header_directory_sections_and_alignment_padding","frame_total_bytes":"frame_header_bytes_plus_payload_bytes_u32","slot_header_payload_bytes_u32":"complete_frame_length"},"rejections":["offset_plus_byte_length_out_of_bounds","section_interval_overlap","unknown_section_code","missing_required_section","reserved_section_code_0x0009_present_in_v1","unknown_element_type","byte_length_mismatch","aircraft_count_mismatch"],"rules":{"alignment_padding":"must_be_zero_bytes","byte_length_identity":"count_u32_times_components_u8_times_element_type_size_bytes","directory_layout":"consecutive_entries_immediately_after_frame_header","directory_offset_bytes":72,"entry_count_source":"frame_header.section_count_u16","offset_base":"frame_start","section_code_order":"strictly_increasing_and_unique","section_start_alignment_bytes":64},"unknown_element_type":"reject"},"header_fields":[{"const":1448297036,"name":"magic_u32","offset":0,"type":"u32"},{"const":1,"name":"protocol_major_u16","offset":4,"type":"u16"},{"const":0,"name":"protocol_minor_u16","offset":6,"type":"u16"},{"const":72,"name":"header_bytes_u16","offset":8,"type":"u16"},{"name":"flags_u16","offset":10,"type":"u16"},{"name":"frame_id_u32","offset":12,"type":"u32"},{"all_zero":"reject","encoding":"canonical_uuid_string_exact_bytes","hash_truncate_or_fold":"forbidden","integer_endian_transform":false,"name":"epoch_id_bytes","offset":16,"type":"bytes[16]"},{"name":"sequence_u64","offset":32,"type":"u64"},{"name":"tick_index_u64","offset":40,"type":"u64"},{"name":"t_s_f64","offset":48,"type":"f64"},{"name":"aircraft_count_u32","offset":56,"type":"u32"},{"name":"section_count_u16","offset":60,"type":"u16"},{"const":16,"name":"directory_entry_bytes_u16","offset":62,"type":"u16"},{"name":"payload_bytes_u32","offset":64,"type":"u32"},{"name":"crc32c_u32","offset":68,"type":"u32"}],"header_size_bytes":72,"required_frame_sections":{"0x0001":["aircraft_id","U32",1],"0x0002":["task_id","I32",1],"0x0003":["workspace_position","F32",3],"0x0004":["workspace_velocity","F32",3],"0x0005":["heading_rad","F32",1],"0x0006":["horizontal_speed_mps","F32",1],"0x0007":["vertical_speed_mps","F32",1],"0x0008":["aircraft_execution_state","U8",1],"0x000A":["flags","U16",1],"0x000B":["owner_workcell_id","U32",1]},"reserved_frame_section_codes":["0x0009"]}}`);
const FRONTEND_SHAPE = JSON.parse(String.raw`{"keys":{"events":{"element":null,"kind":"array"},"read_models":{"keys":{"aircraft":{"keys":{"aircraft":{"element":{"keys":{"active":{"kind":"scalar","type":"boolean"},"aircraft_id":{"kind":"scalar","type":"string"},"destroyed":{"kind":"scalar","type":"boolean"},"execution_state":{"kind":"scalar","type":"string"},"heading_rad":{"kind":"scalar","type":"number"},"model_type":{"kind":"scalar","type":"string"},"placed":{"kind":"scalar","type":"boolean"},"profile_id":{"kind":"scalar","type":"string"},"registered":{"kind":"scalar","type":"boolean"},"resource_state":{"kind":"scalar","type":"string"},"workspace_position_enu_m":{"element":{"kind":"scalar","type":"number"},"kind":"array"},"workspace_velocity_enu_mps":{"element":{"kind":"scalar","type":"number"},"kind":"array"}},"kind":"object"},"kind":"array"},"epoch_id":{"kind":"scalar","type":"string"},"freshness":{"keys":{"epoch_id":{"kind":"scalar","type":"string"},"source_generation":{"kind":"scalar","type":"number"},"source_t_s":{"kind":"scalar","type":"number"},"source_tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"generation":{"kind":"scalar","type":"number"},"t_s":{"kind":"scalar","type":"number"},"tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"environment":{"keys":{"active_environment_warnings":{"element":null,"kind":"array"},"airspace_exemptions":{"element":null,"kind":"array"},"building_count":{"kind":"scalar","type":"number"},"epoch_id":{"kind":"scalar","type":"string"},"freshness":{"keys":{"epoch_id":{"kind":"scalar","type":"string"},"source_generation":{"kind":"scalar","type":"number"},"source_t_s":{"kind":"scalar","type":"number"},"source_tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"generation":{"kind":"scalar","type":"number"},"runtime_volumes":{"element":null,"kind":"array"},"static_airspace_zone_count":{"kind":"scalar","type":"number"},"static_obstacle_count":{"kind":"scalar","type":"number"},"t_s":{"kind":"scalar","type":"number"},"tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"resource":{"keys":{"epoch_id":{"kind":"scalar","type":"string"},"freshness":{"keys":{"epoch_id":{"kind":"scalar","type":"string"},"source_generation":{"kind":"scalar","type":"number"},"source_t_s":{"kind":"scalar","type":"number"},"source_tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"generation":{"kind":"scalar","type":"number"},"resources":{"element":{"keys":{"availability":{"kind":"scalar","type":"string"},"capacity":{"kind":"scalar","type":"number"},"current_reservations":{"element":{"keys":{"occupancy":{"kind":"scalar","type":"null"},"owner_id":{"kind":"scalar","type":"null"},"pad_id":{"kind":"scalar","type":"string"},"reservation_id":{"kind":"scalar","type":"string"},"role":{"kind":"scalar","type":"string"},"state":{"kind":"scalar","type":"string"}},"kind":"object"},"kind":"array"},"facility_row":{"kind":"scalar","type":"number"},"occupying_aircraft_ids":{"element":null,"kind":"array"},"owner_task_ids":{"element":null,"kind":"array"},"resource_id":{"kind":"scalar","type":"string"},"resource_kind":{"kind":"scalar","type":"string"},"warning_count":{"kind":"scalar","type":"number"}},"kind":"object"},"kind":"array"},"t_s":{"kind":"scalar","type":"number"},"tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"runtime":{"keys":{"aircraft_destroyed":{"kind":"scalar","type":"number"},"aircraft_placed":{"kind":"scalar","type":"number"},"aircraft_total":{"kind":"scalar","type":"number"},"canonical_snapshot_sequence":{"kind":"scalar","type":"number"},"committed_generation":{"kind":"scalar","type":"number"},"epoch_id":{"kind":"scalar","type":"string"},"freshness":{"keys":{"epoch_id":{"kind":"scalar","type":"string"},"source_generation":{"kind":"scalar","type":"number"},"source_t_s":{"kind":"scalar","type":"number"},"source_tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"generation":{"kind":"scalar","type":"number"},"live_published_snapshot_sequence":{"kind":"scalar","type":"number"},"session_state":{"kind":"scalar","type":"string"},"t_s":{"kind":"scalar","type":"number"},"task_total":{"kind":"scalar","type":"number"},"tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"task":{"keys":{"epoch_id":{"kind":"scalar","type":"string"},"freshness":{"keys":{"epoch_id":{"kind":"scalar","type":"string"},"source_generation":{"kind":"scalar","type":"number"},"source_t_s":{"kind":"scalar","type":"number"},"source_tick_index":{"kind":"scalar","type":"number"}},"kind":"object"},"generation":{"kind":"scalar","type":"number"},"t_s":{"kind":"scalar","type":"number"},"tasks":{"element":{"keys":{"aircraft_id":{"kind":"scalar","type":"string"},"blocking_reason":{"kind":"scalar","type":"string"},"delayed":{"kind":"scalar","type":"boolean"},"flight":{"keys":{"route_progress":{"keys":{"remaining_route_count":{"kind":"scalar","type":"number"},"route_cursor":{"kind":"scalar","type":"number"}},"kind":"object"}},"kind":"object"},"held":{"kind":"scalar","type":"boolean"},"lifecycle":{"kind":"scalar","type":"string"},"phase":{"kind":"scalar","type":"string"},"task_id":{"kind":"scalar","type":"string"}},"kind":"object"},"kind":"array"},"tick_index":{"kind":"scalar","type":"number"}},"kind":"object"}},"kind":"object"},"snapshot":{"keys":{"aircraft_count_u32":{"kind":"scalar","type":"number"},"crc32c_u32":{"kind":"scalar","type":"number"},"directory_entry_bytes_u16":{"kind":"scalar","type":"number"},"epoch_id_bytes":{"kind":"scalar","type":"string"},"flags_u16":{"kind":"scalar","type":"number"},"frame_id_u32":{"kind":"scalar","type":"number"},"header_bytes_u16":{"kind":"scalar","type":"number"},"magic_u32":{"kind":"scalar","type":"number"},"payload_bytes_u32":{"kind":"scalar","type":"number"},"protocol_major_u16":{"kind":"scalar","type":"number"},"protocol_minor_u16":{"kind":"scalar","type":"number"},"section_count_u16":{"kind":"scalar","type":"number"},"sections":{"element":{"keys":{"byte_length_u32":{"kind":"scalar","type":"number"},"components_u8":{"kind":"scalar","type":"number"},"count_u32":{"kind":"scalar","type":"number"},"element_type_u8":{"kind":"scalar","type":"number"},"offset_u32":{"kind":"scalar","type":"number"},"section_code_u16":{"kind":"scalar","type":"number"},"values":{"element":{"kind":"scalar","type":"number"},"kind":"array"}},"kind":"object"},"kind":"array"},"sequence_u64":{"kind":"scalar","type":"number"},"t_s_f64":{"kind":"scalar","type":"number"},"tick_index_u64":{"kind":"scalar","type":"number"}},"kind":"object"},"static_table":{"keys":{"contract_version":{"kind":"scalar","type":"string"},"entries":{"element":{"keys":{"aircraft_id":{"kind":"scalar","type":"string"},"aircraft_int":{"kind":"scalar","type":"number"},"display_name":{"kind":"scalar","type":"string"},"model_type":{"kind":"scalar","type":"string"},"profile_id":{"kind":"scalar","type":"string"}},"kind":"object"},"kind":"array"},"epoch_id":{"kind":"scalar","type":"string"},"protocol_version":{"kind":"scalar","type":"string"},"type":{"kind":"scalar","type":"string"}},"kind":"object"}},"kind":"object"}`);

export const PAYLOAD_SCHEMA_CODES = STAGE0_ABI.payload_schema_codes;

const CRC32C_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) !== 0 ? (0x82F63B78 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32c(bytes) {
  let value = 0xFFFFFFFF;
  for (let index = 0; index < bytes.byteLength; index += 1) {
    value = CRC32C_TABLE[(value ^ bytes[index]) & 0xFF] ^ (value >>> 8);
  }
  return (value ^ 0xFFFFFFFF) >>> 0;
}

const SCALAR_READERS = {
  u8: (view, offset) => view.getUint8(offset),
  u16: (view, offset) => view.getUint16(offset, true),
  u32: (view, offset) => view.getUint32(offset, true),
  u64: (view, offset) => Number(view.getBigUint64(offset, true)),
  i32: (view, offset) => view.getInt32(offset, true),
  f64: (view, offset) => view.getFloat64(offset, true),
  f32: (view, offset) => view.getFloat32(offset, true),
};

function readFixedRecord(fields, view) {
  const record = {};
  for (const field of fields) {
    const offset = field.offset;
    const type = field.type;
    if (type.startsWith("bytes[")) {
      const length = Number(type.slice(6, -1));
      let hex = "";
      for (let index = 0; index < length; index += 1) {
        hex += view.getUint8(offset + index).toString(16).padStart(2, "0");
      }
      if (field.all_zero === "reject" && hex === "0".repeat(length * 2)) {
        throw new Error(`${field.name} must not be the all-zero UUID`);
      }
      record[field.name] = hex;
      continue;
    }
    const value = SCALAR_READERS[type](view, offset);
    if (field.const !== undefined && value !== field.const) {
      throw new Error(`${field.name} violates its fixed ABI constant`);
    }
    if (field.zero === true && value !== 0) {
      throw new Error(`reserved field ${field.name} must be zero`);
    }
    record[field.name] = value;
  }
  return record;
}

function sectionCodeKey(code) {
  return `0x${code.toString(16).padStart(4, "0").toUpperCase()}`;
}

function decodeCompactEventCandidate(bytes) {
  const spec = STAGE0_ABI.compact_event_candidate;
  if (bytes.byteLength !== spec.size_bytes) {
    throw new Error(`CompactEventCandidate must be exactly ${spec.size_bytes} bytes`);
  }
  return readFixedRecord(spec.fields, new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength));
}

function decodeViewerSnapshotFrame(bytes) {
  const spec = STAGE0_ABI.viewer_snapshot_frame;
  const headerBytes = spec.header_size_bytes;
  if (bytes.byteLength < headerBytes) throw new Error("ViewerSnapshotFrame is truncated below its header");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = readFixedRecord(spec.header_fields, view);
  if (bytes.byteLength !== headerBytes + header.payload_bytes_u32) {
    throw new Error("ViewerSnapshotFrame length must equal header plus payload_bytes");
  }
  const directory = spec.directory;
  const rules = directory.rules;
  const entryBytes = directory.entry_size_bytes;
  const directoryOffset = rules.directory_offset_bytes;
  const alignment = rules.section_start_alignment_bytes;
  const codeToType = new Map();
  for (const [name, code] of Object.entries(directory.element_type_codes)) {
    codeToType.set(code, name);
  }
  const typeSizes = directory.element_type_size_bytes;
  const required = spec.required_frame_sections;
  const reserved = new Set(spec.reserved_frame_section_codes);
  const sectionCount = header.section_count_u16;
  const directoryEnd = directoryOffset + sectionCount * entryBytes;
  if (directoryEnd > bytes.byteLength) throw new Error("frame directory exceeds the frame");

  const sections = [];
  const covered = [[directoryOffset, directoryEnd]];
  let previousCode = 0;
  for (let index = 0; index < sectionCount; index += 1) {
    const entryView = new DataView(bytes.buffer, bytes.byteOffset + directoryOffset + index * entryBytes, entryBytes);
    const entry = readFixedRecord(directory.entry_layout.fields, entryView);
    const code = entry.section_code_u16;
    if (code <= previousCode) throw new Error("section codes must be strictly increasing and unique");
    previousCode = code;
    const key = sectionCodeKey(code);
    if (reserved.has(key)) throw new Error("reserved section code must not appear in a v1 frame");
    const definition = required[key];
    if (definition === undefined) throw new Error("unknown section code");
    const typeName = codeToType.get(entry.element_type_u8);
    if (typeName === undefined) throw new Error("unknown element_type");
    const components = entry.components_u8;
    const count = entry.count_u32;
    const byteLength = entry.byte_length_u32;
    if (byteLength !== count * components * typeSizes[typeName]) {
      throw new Error("byte_length must equal count times components times element size");
    }
    const offset = entry.offset_u32;
    if (offset % alignment !== 0) throw new Error("section start must be aligned");
    if (offset + byteLength > bytes.byteLength) throw new Error("section interval is out of bounds");
    for (const [start, end] of covered) {
      if (offset < end && start < offset + byteLength) throw new Error("section intervals must not overlap");
    }
    covered.push([offset, offset + byteLength]);
    sections.push({ ...entry, values: readSectionValues(view, offset, typeName, count, components) });
  }
  for (const key of Object.keys(required)) {
    if (!sections.some((section) => sectionCodeKey(section.section_code_u16) === key)) {
      throw new Error("missing required section");
    }
  }
  covered.sort((left, right) => left[0] - right[0]);
  for (let index = 0; index < covered.length; index += 1) {
    const gapStart = index === 0 ? headerBytes : covered[index - 1][1];
    const gapEnd = covered[index][0];
    for (let offset = gapStart; offset < gapEnd; offset += 1) {
      if (view.getUint8(offset) !== 0) throw new Error("alignment padding must be zero");
    }
  }
  for (let offset = covered[covered.length - 1][1]; offset < bytes.byteLength; offset += 1) {
    if (view.getUint8(offset) !== 0) throw new Error("alignment padding must be zero");
  }
  for (const section of sections) {
    if (section.count_u32 !== header.aircraft_count_u32) {
      throw new Error("aircraft_count must equal every required section count");
    }
  }
  const crcField = spec.crc32c.field;
  const crcOffset = spec.header_fields.find((field) => field.name === crcField).offset;
  const expected = view.getUint32(crcOffset, true);
  const zeroed = new Uint8Array(bytes);
  zeroed[crcOffset] = 0; zeroed[crcOffset + 1] = 0; zeroed[crcOffset + 2] = 0; zeroed[crcOffset + 3] = 0;
  if (crc32c(zeroed) !== expected) throw new Error("crc32c mismatch");
  return { ...header, sections };
}

function readSectionValues(view, offset, typeName, count, components) {
  const values = [];
  for (let index = 0; index < count * components; index += 1) {
    values.push(SCALAR_READERS[typeName.toLowerCase()](view, offset + index * SCALAR_SIZE[typeName]));
  }
  return values;
}

const SCALAR_SIZE = { U8: 1, U16: 2, U32: 4, I32: 4, F32: 4 };

function validateFrontendShape(shape, value, path) {
  if (shape.kind === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`frontend ${path} must be an object`);
    }
    const actual = Object.keys(value).sort().join(",");
    const expected = Object.keys(shape.keys).sort().join(",");
    if (actual !== expected) {
      throw new Error(`frontend ${path} must have exactly the canonical key set`);
    }
    for (const key of Object.keys(shape.keys)) {
      validateFrontendShape(shape.keys[key], value[key], `${path}.${key}`);
    }
    return;
  }
  if (shape.kind === "array") {
    if (!Array.isArray(value)) {
      throw new Error(`frontend ${path} must be an array`);
    }
    if (shape.element !== null) {
      for (let index = 0; index < value.length; index += 1) {
        validateFrontendShape(shape.element, value[index], `${path}[${index}]`);
      }
    }
    return;
  }
  if (shape.type === "null") {
    if (value !== null) {
      throw new Error(`frontend ${path} must be null`);
    }
    return;
  }
  if (value === null || typeof value !== shape.type) {
    throw new Error(`frontend ${path} must be a ${shape.type} scalar`);
  }
}

export function decodeStage0Fixture(kind, bytes) {
  if (kind === "frontend") {
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    validateFrontendShape(FRONTEND_SHAPE, value, "$");
    return value;
  }
  if (kind === "binary_abi") {
    if (bytes.byteLength === STAGE0_ABI.compact_event_candidate.size_bytes) {
      return decodeCompactEventCandidate(bytes);
    }
    return decodeViewerSnapshotFrame(bytes);
  }
  throw new Error(`unknown fixture kind: ${kind}`);
}
