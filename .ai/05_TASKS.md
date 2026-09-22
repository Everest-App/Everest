# Everest Tasks

## Current Focus

- **Goal:** Not explicitly defined. No active task tracking found in the repository.
- **Status:** Repository appears to be in a stable feature-complete state for v2.2.1 core capabilities, with roadmap items partially scaffolded.
- **Related Modules:** Unknown — no sprint, milestone, or issue tracker linked.

---

## In Progress

### Mock Server Implementation

- **Status:** Partial
- **Priority:** Medium
- **Related Files:**
  - `apps/desktop/src/main/services/mock-service.ts`
  - `apps/desktop/src/main/ipc/mock.ipc.ts`
  - `apps/desktop/src/renderer/components/mock/`
- **Description:** A local HTTP mock server. The service file, IPC handler, and UI component directory all exist. Feature is listed on the roadmap as incomplete.
- **Acceptance Criteria:** Users can define routes, start/stop a local mock server, and view request logs.

---

### Plugin System Implementation

- **Status:** Partial
- **Priority:** Medium
- **Related Files:**
  - `apps/desktop/src/main/services/plugin-service.ts`
  - `apps/desktop/src/main/ipc/plugin.ipc.ts`
  - `apps/desktop/src/renderer/components/plugins/`
- **Description:** A modular plugin architecture for third-party extensions. Service, IPC handler, and UI directory exist. Feature is listed on the roadmap as incomplete.
- **Acceptance Criteria:** Plugins can be loaded, listed, enabled/disabled. Plugin API is defined and documented.

---

## Completed

### Core HTTP Request Engine

- **Status:** Complete
- **Implemented:** Full HTTP method support (GET, POST, PUT, DELETE, etc.), headers, query params, all body types (JSON, form-data, URL-encoded, binary)
- **Related Files:**
  - `apps/desktop/src/main/runtime/runtime-engine.ts`
  - `apps/desktop/src/main/runtime/request-executor.ts`
  - `apps/desktop/src/main/services/request-engine.ts`
  - `apps/desktop/src/renderer/components/request/`
  - `apps/desktop/src/renderer/components/response/`

---

### Collections and Folder Management

- **Status:** Complete
- **Implemented:** Nested collections and folders, CRUD operations, item reordering, duplication, move
- **Related Files:**
  - `apps/desktop/src/main/services/collection-service.ts`
  - `apps/desktop/src/main/ipc/collection.ipc.ts`
  - `apps/desktop/src/renderer/components/collections/`
  - `apps/desktop/src/renderer/store/collection-store.ts`

---

### Environment and Variable Management

- **Status:** Complete
- **Implemented:** Local, global, and environment-scoped variables; `{{variable}}` substitution; variable resolver
- **Related Files:**
  - `apps/desktop/src/main/services/environment-service.ts`
  - `apps/desktop/src/main/runtime/variable-resolver.ts`
  - `apps/desktop/src/main/runtime/environment-manager.ts`
  - `apps/desktop/src/renderer/components/environments/`
  - `apps/desktop/src/renderer/store/environment-store.ts`

---

### GraphQL Support

- **Status:** Complete
- **Implemented:** GraphQL query execution and schema introspection
- **Related Files:**
  - `apps/desktop/src/main/services/graphql-service.ts`
  - `apps/desktop/src/main/ipc/protocol.ipc.ts`

---

### WebSocket Support

- **Status:** Complete
- **Implemented:** WebSocket connection lifecycle (connect, send, disconnect, message log)
- **Related Files:**
  - `apps/desktop/src/main/services/websocket-service.ts`
  - `apps/desktop/src/renderer/components/protocols/`

---

### Server-Sent Events (SSE) Support

- **Status:** Complete
- **Implemented:** SSE connection lifecycle and event streaming
- **Related Files:**
  - `apps/desktop/src/main/services/sse-service.ts`
  - `apps/desktop/src/renderer/components/protocols/`

---

### Collection Runner

- **Status:** Complete
- **Implemented:** Sequential request execution, delay control, iteration support, pass/fail reporting
- **Related Files:**
  - `apps/desktop/src/main/runtime/collection-runner.ts`
  - `apps/desktop/src/main/runtime/folder-runner.ts`
  - `apps/desktop/src/main/runtime/iteration-data-manager.ts`
  - `apps/desktop/src/main/runtime/report-generator.ts`
  - `apps/desktop/src/main/services/runner-service.ts`
  - `apps/desktop/src/renderer/components/runner/`

---

### Script Engine (Pre-request + Test Scripts)

- **Status:** Complete
- **Implemented:** Postman-compatible `pm.*` API, pre-request and test script execution, sandbox isolation
- **Related Files:**
  - `apps/desktop/src/main/runtime/script-engine/`
  - `apps/desktop/src/main/services/script-sandbox.ts`
  - `apps/desktop/src/renderer/components/scripts/`

---

### Import / Export

- **Status:** Complete
- **Implemented:** Postman and OpenAPI format import/export; cURL import
- **Related Files:**
  - `apps/desktop/src/main/services/import-export-service.ts`
  - `apps/desktop/src/main/ipc/import-export.ipc.ts`
  - `apps/desktop/src/renderer/components/import-export/`
  - `apps/desktop/src/renderer/components/import-curl/`

---

### Code Generation

- **Status:** Complete
- **Implemented:** HTTP client code generation for multiple target languages/libraries
- **Related Files:**
  - `apps/desktop/src/main/services/codegen-service.ts`
  - `apps/desktop/src/main/ipc/codegen.ipc.ts`
  - `apps/desktop/src/renderer/components/codegen/`

---

### Request History

- **Status:** Complete
- **Implemented:** Persistent request history with search and delete
- **Related Files:**
  - `apps/desktop/src/main/services/history-service.ts`
  - `apps/desktop/src/main/ipc/history.ipc.ts`
  - `apps/desktop/src/renderer/components/history/`

---

### Local SQLite Storage with Migrations

- **Status:** Complete
- **Implemented:** sql.js in-memory DB, auto-save, 4 schema migrations, data migration from previous app name
- **Related Files:**
  - `apps/desktop/src/main/storage/database.ts`
  - `apps/desktop/src/main/storage/migrations/`

---

### Internationalization (i18n)

- **Status:** Complete (infrastructure exists)
- **Implemented:** i18next + react-i18next integration, language store
- **Related Files:**
  - `apps/desktop/src/renderer/i18n/`
  - `apps/desktop/src/renderer/store/language-store.ts`

---

### Cross-Platform Packaging

- **Status:** Complete
- **Implemented:** macOS (dmg x64/arm64), Windows (NSIS x64), Linux (AppImage, deb)
- **Related Files:** `apps/desktop/package.json` (build section)

---

### Data Migration (everest → Everest)

- **Status:** Complete
- **Implemented:** Automatic migration of user data from previous `everest-desktop` app name on first launch
- **Related Files:** `apps/desktop/src/main/main.ts` (migration block)

---

## Planned

### Cloud Sync (Optional)

- **Priority:** Low
- **Reason:** Listed on README roadmap — optional cross-device collection sync
- **Dependencies:** Backend infrastructure (not yet started); would require authentication system

---

### CI/CD Integration — CLI Runner

- **Priority:** Low
- **Reason:** Listed on README roadmap — run collections from CI pipelines
- **Dependencies:** Plugin system or standalone CLI package; runner engine already exists

---

### Team Collaboration (Local Network)

- **Priority:** Low
- **Reason:** Listed on README roadmap — workspace sharing within local networks
- **Dependencies:** Network discovery mechanism; no current implementation visible

---

## Blocked / Unknown

### Test Suite

- **Problem:** No test runner, test configuration, or test files found anywhere in the repository. The `lint` script only runs `tsc --noEmit`.
- **Required Decision:** Choose a test framework (e.g., vitest, jest) and define testing strategy before any test tasks can be created.

---

### Plugin API Definition

- **Problem:** `plugin-service.ts` exists but the public plugin API contract (what a plugin can do, how it integrates) is unknown without deeper inspection.
- **Required Decision:** Define plugin interface and sandbox boundary before implementation can be verified or extended.

---

### Mock Server Route Persistence

- **Problem:** `mock-service.ts` exists but it is unknown whether mock routes are persisted to the database or held in memory only. Migration `004-runtime-state.sql` may be related but was not inspected.
- **Required Decision:** Confirm persistence strategy for mock routes before implementation is extended.

---

### Styling Architecture

- **Problem:** `apps/desktop/src/renderer/styles/` was not inspected. CSS framework, design system, and theming implementation are unknown.
- **Required Decision:** Document before making any UI changes to avoid breaking existing styles.

---

## Next AI Session

**Current recommended next action:**

Populate `.ai/06_DECISIONS.md` with confirmed architectural decisions already visible in the codebase (sql.js choice, contextIsolation enforcement, IPC constant pattern, monorepo structure, Postman compatibility target). This requires no new file inspection — all evidence is already documented in `02_ARCHITECTURE.md`.
