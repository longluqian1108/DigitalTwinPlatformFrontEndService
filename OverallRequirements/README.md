# LightBlueSky 分层设计文档库

本库将《LightBlueSky 低空三维实时仿真平台最终统一设计规范 v8.0》与《LightBlueSky Human-in-the-Loop 大阶段切换与 AI 测试验收规范》拆分为导航、概念、公开合同、内部合同、项目阶段、前端、后端、测试、发布规划和速查附录九类文档。

## 权威关系

- **系统设计、公开合同与测试依据：** v8.0 统一设计规范。
- **当前项目推进与阶段验收：** [project/00-hitl-stages.md](project/00-hitl-stages.md)。
- **当前里程碑边界：** HITL 阶段 0–4 验证 Backend/Core Milestone；HTTP Adapter、WebSocket Adapter 和正式前端当前延期，不能标记为已通过，也不等同完整第一版发布。

## 分层结构

1. `concepts/` 解释系统目标、核心对象、状态机和端到端闭环。
2. `contracts/external/` 固化 HTTP、WebSocket、Read Model、命令、event 和 ViewerSnapshot 公开合同。
3. `contracts/internal/` 固化模块 Port、Execution batch、Committed output 和 Worker IPC。
4. `project/` 给出 HITL 阶段切换与人工验收入口。
5. `frontend/` 保留完整前端需求，即使当前项目阶段延期实现。
6. `backend/` 按 Kernel、Task、Resource、Environment、Runtime、Projection 和数据布局拆分实现约束。
7. `testing/` 按 HITL 阶段组织测试，并建立到设计附录 I/J 的追踪索引。
8. `release/` 记录下一版本功能，禁止在第一版预留活动合同。
9. `appendices/` 提供枚举、命令、event/reason 和二进制 ABI 的完整速查表。

## 推荐阅读路径

| 读者 | 推荐顺序 |
|---|---|
| 项目负责人 / 人工审查者 | 本页 → `project/00-hitl-stages.md` → `testing/00-总览与追踪矩阵.md` → 当前阶段测试文件 |
| 系统架构师 | 本页 → `concepts/` → `contracts/external/` 与 `contracts/internal/` → `backend/` |
| 后端开发者 | `concepts/01-core-state-machines.md` → `contracts/internal/` → 对应 `backend/` → `testing/` |
| 前端开发者 | `frontend/00-requirements.md` → `contracts/external/02-read-model.md` → `contracts/external/04-viewer-snapshot.md` → `contracts/external/01-websocket.md` |
| 合同 / Codegen 工程师 | `appendices/` → `contracts/` → `testing/00-总览与追踪矩阵.md` |
| 测试与发布工程师 | `project/00-hitl-stages.md` → `testing/` → `appendices/01-command-registry.md` → `appendices/02-event-registry.md` → `appendices/03-binary-layouts.md` |

## 文件树

```text
docs/
├─ README.md
├─ project/00-hitl-stages.md
├─ frontend/00-requirements.md
├─ concepts/{00-system-overview,01-core-state-machines,02-end-to-end-flow}.md
├─ contracts/external/{00-http-api,01-websocket,02-read-model,03-event-and-command,04-viewer-snapshot}.md
├─ contracts/internal/{00-module-ports,01-execution-batch,02-committed-output,03-worker-ipc}.md
├─ backend/{00-kernel,01-task-module,02-resource-module,03-environment-module,04-execution-runtime,05-projection-hub,06-common-data-layout}.md
├─ testing/{00-总览与追踪矩阵,01-阶段0-架构-状态机-Event与Generation0,02-阶段1-CPU最简全仿真周期,03-阶段2-CUDA嵌入与Parity基础设施,04-阶段3-完整业务-全部CLI与全部Event可达性,05-阶段4-性能-故障-安全与Backend-Core-Milestone}.md
├─ release/00-future-development.md
└─ appendices/{00-enums-and-flags,01-command-registry,02-event-registry,03-binary-layouts}.md
```

## 使用规则

- 任何公开字段、枚举、operation code、event code、reason code、二进制 offset 或状态转换修改，必须先修改权威设计，再修改结构化机器源并重新生成。
- `project/00-hitl-stages.md` 只定义当前 Backend/Core 阶段推进，不覆盖被明确延期的网络和浏览器验收。
- 拆分文档允许为阅读便利重复权威段落；不得把重复段落视为第二份事实源。
