# Everest Modules
## Overview
Everest is structured as an npm monorepo with two workspaces:
- `apps/desktop` — the Electron application (main process + renderer process)
- `packages/core` — a shared internal package containing types, constants, and utilities
The desktop app is divided into three Electron layers (main, preload, renderer), each with distinct functional sub-modules.
---
## Application Modules
> All located under `apps/desktop/src/`
| Module | Location | Responsibility | Status |
|---|---|---|---|
| App Entry (Main) | `main/main.ts` | Electron startup, DB init, IPC registration, window creation, cleanup | Active |
| IPC Layer | `main/ipc/` | Routes IPC calls from renderer to services (11 handlers) | Active |
| Request Service | `main/services/request-engine.ts` | Delegates HTTP requests to the runtime engine | Active |
| Collection Service | `main/services/collection-service.ts` | Collection and item CRUD operations | Active |
| Environment Service | `main/services/environment-service.ts` | Environment and variable persistence | Active |
| History Service | `main/services/history-service.ts` | Request history storage and retrieval | Active |
| Import/Export Service | `main/services/import-export-service.ts` | Postman and OpenAPI import/export | Active |
| WebSocket Service | `main/services/websocket-service.ts` | WebSocket connection lifecycle | Active |
| SSE Service | `main/services/sse-service.ts` | Server-Sent Events connection lifecycle | Active |
| GraphQL Service | `main/services/graphql-service.ts` | GraphQL introspection and execution | Active |
| Mock Service | `main/services/mock-service.ts` | Local mock HTTP server | Partial (roadmap) |
| Plugin Service | `main/services/plugin-service.ts` | Plugin loading and management | Partial (roadmap) |
| Auth Service | `main/services/auth-service.ts` | Authentication helpers | Active |
| Codegen Service | `main/services/codegen-service.ts` | Code generation for multiple HTTP client targets | Active |
| Runner Service | `main/services/runner-service.ts` | Collection runner coordination | Active |
| Script Sandbox | `main/services/script-sandbox.ts` | Isolated script execution wrapper | Active |
| Runtime Engine | `main/runtime/runtime-engine.ts` | Full request lifecycle orchestration | Active |
| Request Executor | `main/runtime/request-executor.ts` | HTTP execution via axios | Active |
| Variable Resolver | `main/runtime/variable-resolver.ts` | `{{variable}}` substitution in requests | Active |
| Environment Manager | `main/runtime/environment-manager.ts` | Variable scope resolution (env/global) | Active |
| Collection Runner | `main/runtime/collection-runner.ts` | Sequential multi-request execution | Active |
| Folder Runner | `main/runtime/folder-runner.ts` | Folder-level execution within runner | Active |
| Iteration Data Manager | `main/runtime/iteration-data-manager.ts` | Data-driven (CSV/JSON) runner iterations | Active |
| Test Result Engine | `main/runtime/test-result-engine.ts` | Assertion evaluation and test reporting | Active |
| Report Generator | `main/runtime/report-generator.ts` | Runner result aggregation and reporting | Active |
| Variable Manager (Runner) | `main/runtime/collection-variable-manager.ts` | Runner-scoped variable state | Active |
| Script Engine | `main/runtime/script-engine/` | Postman-compatible `pm.*` API sandbox | Active |
| Storage / Database | `main/storage/database.ts` | sql.js initialization, auto-save, migrations | Active |
| Preload Bridge | `preload/preload.ts` | `contextBridge` API surface (`window.api`) | Active |
| App Menu | `main/menu.ts` | Native OS application menu | Active |
---
## Core Packages
| Package | Location | Responsibility | Status |
|---|---|---|---|
| `@api-platform/core` | `packages/core/src/` | Shared TypeScript types, IPC channel constants, shared utilities | Active |
| Core Types | `packages/core/src/types.ts` | All domain types: `RequestConfig`, `Collection`, `Environment`, `RunnerConfig`, etc. | Active |
| Core Constants | `packages/core/src/constants.ts` | IPC channel name constants (`IPC_CHANNELS`) | Active |
| Core Utils | `packages/core/src/utils/` | `interpolation.ts`, `variable-resolver.ts`, `csv-parser.ts`, `script-utils.ts` | Active |
---
## Infrastructure Modules
| Module | Location | Responsibility | Status |
|---|---|---|---|
| SQL Migrations | `main/storage/migrations/` | Schema versioning (`001` → `004`) | Active |
| Build System (Renderer) | `vite.config.mts` | Vite build config, chunk splitting, path aliases | Active |
| Build System (Main) | `tsconfig.main.json` | TypeScript compilation for main process | Active |
| Packaging | `package.json` (build section) | electron-builder config for mac/win/linux | Active |
| Release Scripts | `scripts/` | Version bump and bundle analysis scripts | Active |
| i18n | `renderer/i18n/` | Internationalization via i18next | Active |
---
## Renderer UI Modules
> All located under `apps/desktop/src/renderer/`
| Component | Location | Responsibility |
|---|---|---|
| Request Panel | `components/request/` | Request builder UI (method, URL, headers, body, auth) |
| Response Panel | `components/response/` | Response viewer (body, headers, status, timing) |
| Collections Panel | `components/collections/` | Collection tree, folder/item management |
| Environments Panel | `components/environments/` | Environment and variable editor |
| History Panel | `components/history/` | Request history list and replay |
| Runner Panel | `components/runner/` | Collection runner configuration and results UI |
| Scripts Panel | `components/scripts/` | Pre-request and test script editors |
| Protocols Panel | `components/protocols/` | WebSocket / SSE UI |
| Import/Export UI | `components/import-export/` | Import from Postman/OpenAPI, export dialogs |
| cURL Import | `components/import-curl/` | Import from cURL command |
| Codegen UI | `components/codegen/` | Code generation output panel |
| Mock UI | `components/mock/` | Mock server configuration UI |
| Plugins UI | `components/plugins/` | Plugin management UI |
| Layout | `components/layout/` | App shell, panels, sidebar, tab bar |
| Common | `components/common/` | Shared/reusable UI primitives |
### Renderer State (Zustand Stores)
| Store | Location | Responsibility |
|---|---|---|
| `tab-store` | `store/tab-store.ts` | Active tab and request editor state |
| `collection-store` | `store/collection-store.ts` | Collections and items in-memory cache |
| `environment-store` | `store/environment-store.ts` | Environments and variable cache |
| `runner-store` | `store/runner-store.ts` | Runner configuration and result state |
| `history-store` | `store/history-store.ts` | Request history cache |
| `theme-store` | `store/theme-store.ts` | Dark/Light theme preference |
| `language-store` | `store/language-store.ts` | Active locale/language preference |
---
## Module Dependency Map
```
Renderer (React + Zustand)
  |
  | window.api.* (contextBridge)
  v
Preload Bridge (preload.ts)
  |
  | ipcRenderer.invoke / ipcMain.handle
  v
IPC Handlers (main/ipc/)
  |
  +---> Services Layer (main/services/)
  |         |
  |         +---> Storage (sql.js SQLite)
  |         |
  |         +---> Runtime Engine (main/runtime/)
  |                   |
  |                   +---> Script Engine (pm.* sandbox)
  |                   |
  |                   +---> Request Executor (axios)
  |                   |         |
  |                   |         v
  |                   |     External HTTP / GraphQL APIs
  |                   |
  |                   +---> WebSocket / SSE Services
  |
  +---> @api-platform/core (shared types + IPC constants)
```
---
## Unknown / Needs Investigation
| Area | Reason |
|---|---|
| `renderer/utils/` | Not inspected — likely UI helper functions |
| `renderer/styles/` | Not inspected — CSS/styling architecture unknown |
| `renderer/public/` | Not inspected — static assets, unknown contents |
| `main/types/` | Not inspected — main-process-specific type definitions |
| `main/utils/` | Not inspected — main-process utility functions |
| Plugin system internals | `plugin-service.ts` exists but feature is roadmap-stage; actual plugin API unknown |
| Mock server internals | `mock-service.ts` exists but feature is roadmap-stage; implementation maturity unknown |
| Test framework | No test runner found in any `package.json`; testing strategy unknown |
| `packages/core` dual output | Both `.ts` and `.js` files exist in `src/` — build/publish strategy unclear |
