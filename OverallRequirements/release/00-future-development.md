# 下一版本待办事项

完整保留 Script System、历史、Artifact、Recorder/Replay、高级模型与 Provider、Checkpoint、运营部署、第二阶段性能和未来依赖图；这些功能不得在第一版预留活动合同。

## 内容来源
- 设计：第 11 章全部

> 本文件是权威输入文档的分层视图。若拆分文本与源文档发生差异，以《LightBlueSky v8.0 统一设计规范》为系统设计与公开合同权威，以《HITL 大阶段切换规范》为当前项目阶段推进与人工验收权威。

## 规范正文

## 11. 下一版本待办事项

本章只记录未来功能名称和设计方向，不为第一版预留字段、API、命令、event、Read Model、UI控件、numeric code或测试豁免。进入未来版本前必须形成独立设计并提升受影响合同版本。

### 11.1 Script System

未来设计：脚本上传、解析、调度、确定性admission、运行控制、UI及与Command Registry的关系。

### 11.2 Event History Store

未来设计：持久化、retention、分页、断线续传、索引、隐私、配额和完整性。第一版Gateway cache不得隐式升级为历史事实源。

### 11.3 Trajectory / Snapshot Artifact Store

未来设计：逐Tick轨迹、Snapshot artifact、压缩、分块、索引、导出与长期兼容。

### 11.4 Recorder 与 Replay

未来设计：

```text
Recorder state machine
ReplayFolder format
Replay Service
ReplayPlayer / Replay Frontend
export / integrity / partial failure / recovery report
```

Replay artifact不天然等于可恢复checkpoint。

### 11.5 高级模型与 Provider

未来设计：

- MLP GainProvider、模型格式、fallback、可复现加载和安全边界；
- LandingFeasibilityProvider及其业务reason、diagnostics和provider版本；
- 高级气动与姿态；
- 天气与风场；
- 噪声与下洗流；
- 能源/电池和性能退化。

上述能力在第一版不预留numeric code或公开字段。

### 11.6 Checkpoint 独立设计

Checkpoint必须独立定义FlightCore/PI、Task/Resource/Environment mutable state、command queue、generation、Backend mirror和恢复幂等；不得假设Replay artifact可直接恢复仿真。

### 11.7 运营与部署

未来设计：

- 场站调度优化；
- 法规和容量评价；
- 多客户端控制权；
- 远程部署、TLS、认证和集群；
- GPU memory仲裁和多worker调度；
- 多种realtime overrun policy。

### 11.8 第二阶段性能

在不降低第一版权威计算和输出语义的前提下，使用RTX 5080执行更高规模、更多Building/airspace、加速倍率和多worker压力测试。

### 11.9 未来依赖图

**图 11-1　未来历史与回放依赖图（本章唯一图）**

```mermaid
flowchart LR
    E["Event / Snapshot / Trajectory History"]
    R["Recorder"]
    F["Replay Package"]
    S["Replay Service"]
    P["ReplayPlayer"]
    UI["Replay Frontend / Export"]
    E --> R
    R --> F
    F --> S
    S --> P
    P --> UI
```
