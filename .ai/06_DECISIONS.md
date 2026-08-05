# Everest Decision Log

---

## 1. Project Foundation Decisions

---

### Decision: Desktop Application over Web Application

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Everest's core value proposition is local-first, offline operation with no cloud dependency. A web app would require hosting and impose browser security restrictions on file system and network access.
- **Decision:** Ship as a native desktop application using Electron.
- **Alternatives Considered:** Web app (browser-based), native OS app (Swift/Kotlin)
- **Consequences:**
  - (+) Full file system and OS API access in main process
  - (+) Works completely offline
  - (+) Can be distributed as a self-contained installer
  - (-) Larger distribution size due to bundled Chromium + Node.js
  - (-) Electron update cycle must be tracked for security patches

---

### Decision: TypeScript as Primary Language

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Both main process (Node.js) and renderer (React) share domain types. TypeScript enables a single type system across the full app boundary.
- **Decision:** TypeScript 6.x across `apps/desktop` (main + renderer) and `packages/core`.
- **Alternatives Considered:** JavaScript only
- **Consequences:**
  - (+) Shared types between main and renderer via `@api-platform/core`
  - (+) Compile-time safety on IPC call signatures
  - (-) Two separate `tsconfig` files required (main and renderer have different targets/module systems)

---

### Decision: npm Workspaces as Monorepo Tool

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Project needs a shared package (`packages/core`) consumed by the desktop app without a separate publish step. npm workspaces handles this natively.
- **Decision:** npm workspaces monorepo. No additional monorepo tooling (no Turborepo, Nx, Lerna).
- **Alternatives Considered:** Turborepo, Nx, Lerna, yarn workspaces
- **Consequences:**
  - (+) Zero extra tooling dependencies
  - (+) `@api-platform/core` resolved via symlink at `"*"` version
  - (-) No incremental build caching (each build rebuilds everything)
  - (-) `packages/core` must be built before `apps/desktop` in CI

---

### Decision: electron-builder for Packaging

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Need cross-platform installers (dmg, NSIS, AppImage, deb) from a single build command.
- **Decision:** electron-builder 26.x with targets: macOS (dmg, x64+arm64), Windows (nsis, x64), Linux (AppImage + deb).
- **Alternatives Considered:** electron-forge, manual packaging scripts
- **Consequences:**
  - (+) Single config in `package.json` for all platforms
  - (+) ASAR packaging enabled for asset protection
  - (-) electron-builder has known issues with native modules (mitigated: no native modules used)

---

## 2. Architecture Decisions

---

### Decision: Monorepo with apps/packages Separation

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Business logic types and constants need to be shared between the Electron main process and the React renderer, which run in separate V8 contexts.
- **Decision:** `packages/core` holds all shared types, IPC channel constants, and utilities. `apps/desktop` holds app-specific code for both processes.
- **Alternatives Considered:** Duplicated types in main and renderer, single flat package
- **Consequences:**
  - (+) Single source of truth for domain types
  - (+) `ElectronAPI` interface and `IPC_CHANNELS` constants are always in sync
  - (-) `packages/core` must be built (or pre-bundled) before `apps/desktop` dev server starts

---

### Decision: All Business Logic in Main Process

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Renderer runs in a sandboxed Chromium context with no Node.js access. Business logic requiring file system, network, or database access must live in main.
- **Decision:** IPC handlers → Services → Runtime Engine → Storage all reside in `apps/desktop/src/main/`.
- **Alternatives Considered:** Business logic in renderer (requires nodeIntegration), shared worker
- **Consequences:**
  - (+) Renderer is thin — only UI concerns
  - (+) Security: renderer cannot directly access OS APIs
  - (-) All operations require an IPC round-trip, adding latency to user interactions

---

### Decision: Preload Script as Typed API Surface

- **Status:** Accepted
- **Date:** Unknown
- **Context:** `contextBridge` is the secure method for exposing main process capabilities to renderer. A typed `ElectronAPI` interface ensures compile-time safety on both sides.
- **Decision:** Single `preload.ts` exposes `window.api` via `contextBridge`. All exposed methods are typed against `ElectronAPI` from `@api-platform/core`.
- **Alternatives Considered:** Direct `ipcRenderer` access in renderer (requires `nodeIntegration: true`)
- **Consequences:**
  - (+) Renderer has a clear, typed, auditable API contract
  - (+) Follows Electron security best practices
  - (-) Every new IPC channel requires adding to: `IPC_CHANNELS`, preload bridge, and an `ipcMain.handle` registration

---

### Decision: IPC Channel Names as Shared Constants

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Hardcoded string channel names would create silent runtime bugs when mismatched between main and renderer. Centralizing them in `@api-platform/core` makes mismatches a compile error.
- **Decision:** All IPC channel names defined in `packages/core/src/constants.ts` as `IPC_CHANNELS` object. Both preload and IPC handlers import from this source.
- **Alternatives Considered:** Hardcoded strings per file, enums in `apps/desktop`
- **Consequences:**
  - (+) Single source of truth for channel names
  - (+) Rename is safe — TypeScript catches all usages
  - (-) Adding a channel requires touching `packages/core`, rebuilding it, and updating three locations

---

## 3. Technology Decisions

---

### Decision: sql.js (SQLite via WASM) over Native SQLite

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Native Node.js SQLite bindings (`better-sqlite3`) require compilation per Electron version and platform, creating packaging complexity. sql.js is a pure JavaScript/WASM implementation with no native compilation.
- **Decision:** sql.js 1.14.x. Database runs entirely in memory; serialized to disk as a binary file.
- **Alternatives Considered:** `better-sqlite3` (native addon), `sqlite3` (native addon), LevelDB, IndexedDB (renderer-side only)
- **Consequences:**
  - (+) Zero native compilation — works across all platforms and Electron versions
  - (+) Simple distribution — WASM file bundled as `extraResources`
  - (-) Entire database loaded into memory at startup
  - (-) `saveDatabase()` is synchronous (`fs.writeFileSync`) — blocks main process during write
  - (-) No WAL mode or concurrent access

---

### Decision: In-Memory DB with Auto-Save Strategy

- **Status:** Accepted
- **Date:** Unknown
- **Context:** sql.js has no built-in disk persistence. A save strategy is required.
- **Decision:** DB is held in memory. Dirty flag set on writes. Auto-save interval fires every 30 seconds if dirty. Forced save on `before-quit`.
- **Alternatives Considered:** Save-on-every-write, save-on-close only
- **Consequences:**
  - (+) Reduces unnecessary I/O on read-heavy usage
  - (+) Graceful cleanup on quit
  - (-) Up to 30 seconds of data loss if process crashes unexpectedly

---

### Decision: SQL Migration System

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Schema must evolve without breaking existing user databases. A migration system ensures upgrades are applied once and tracked.
- **Decision:** SQL files in `storage/migrations/` applied in alphabetical order. Applied migrations tracked in `_migrations` table inside the DB.
- **Current migrations:** `001-init`, `002-collections-environments`, `003-collection-scripts`, `004-runtime-state`
- **Alternatives Considered:** ORM with auto-migration, single schema file
- **Consequences:**
  - (+) Deterministic upgrade path
  - (+) Easy to inspect and audit
  - (-) Migration files must be copied to `dist/` during build (`build:copy-assets` script)

---

### Decision: React 19 + Zustand for UI Layer

- **Status:** Accepted
- **Date:** Unknown
- **Context:** React is the dominant UI library for Electron apps. Zustand is lightweight, has no boilerplate, and integrates cleanly with async IPC calls.
- **Decision:** React 19 for rendering, Zustand 5.x for global state.
- **Alternatives Considered:** Vue, Svelte, Redux (for state), MobX
- **Consequences:**
  - (+) Minimal state boilerplate
  - (+) Stores map cleanly to domain entities (collections, environments, tabs, runner, history)
  - (-) No strict data-flow enforcement (Zustand is flexible but unstructured)

---

### Decision: Vite for Renderer Build

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Vite provides fast HMR for development and Rollup-based production bundling. Configured with manual chunking for `react` and `zustand`.
- **Decision:** Vite 8.x. Root is `src/renderer`. Output to `dist/renderer`. Minified with Terser in production. Dev server on port 5173 (strict).
- **Alternatives Considered:** webpack, Create React App, Parcel
- **Consequences:**
  - (+) Fast dev iteration (HMR without full reload)
  - (+) Small production bundles via manual chunk splitting
  - (-) Main process compiled separately via `tsc` — two build pipelines to maintain

---

### Decision: axios for HTTP Execution

- **Status:** Accepted
- **Date:** Unknown
- **Context:** HTTP request execution needs redirect handling, timeout support, and form-data support. axios provides these with a stable API.
- **Decision:** axios 1.x in the main process (`request-executor.ts`).
- **Alternatives Considered:** `node-fetch`, built-in `http`/`https`, `got`
- **Consequences:**
  - (+) Mature API with wide protocol support
  - (+) Custom HTTP agents supported (for connection cleanup on quit)
  - (-) Additional dependency; `undici` (Node.js native) would have fewer dependencies

---

### Decision: Postman-Compatible Script API (`pm.*`)

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Target users are migrating from Postman. Reusing existing test scripts without rewriting them is a key adoption advantage.
- **Decision:** Script engine implements a Postman-compatible `pm.*` API including `pm.test`, `pm.expect`, `pm.environment.set`, `pm.globals.set`, etc.
- **Related Files:** `runtime/script-engine/pm-api.ts`, `runtime/script-engine/expect-chain.ts`, `runtime/script-engine/sandbox.ts`
- **Alternatives Considered:** Custom proprietary scripting API
- **Consequences:**
  - (+) Users can reuse Postman test scripts without modification
  - (+) Reduced learning curve for migrating teams
  - (-) Must track Postman API changes to maintain compatibility

---

## 4. Everest Product Decisions

---

### Decision: Local-First, Offline Architecture

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Enterprise and security-sensitive teams cannot send API credentials to cloud services. Offline operation is a hard requirement.
- **Decision:** All data (collections, environments, history, variables) stored locally. No cloud dependency in core product. Cloud sync is an optional future add-on.
- **Consequences:**
  - (+) Complete data privacy
  - (+) Works in air-gapped environments
  - (-) No built-in collaboration or sync between devices
  - (-) User responsible for their own backup

---

### Decision: Postman + OpenAPI Import/Export

- **Status:** Accepted
- **Date:** Unknown
- **Context:** Lowering migration barrier from existing tooling is a product goal. Users should not lose existing collections when switching to Everest.
- **Decision:** Support import from Postman collection format and OpenAPI spec. Support export to Postman format.
- **Related Files:** `services/import-export-service.ts`, `ipc/import-export.ipc.ts`, `components/import-export/`, `components/import-curl/`
- **Consequences:**
  - (+) Reduces switching cost from Postman
  - (-) Must track Postman and OpenAPI format changes

---

### Decision: Data Migration from Previous App Identity

- **Status:** Accepted
- **Date:** Unknown
- **Context:** The application was previously distributed under the name `api-platform-desktop` / `API Platform`. Users upgrading would lose their data without a migration path.
- **Decision:** On first launch, `main.ts` checks for data in known previous `userData` paths and copies it to the new Everest `userData` location. A `.migrated` flag prevents re-running.
- **Consequences:**
  - (+) Seamless upgrade for existing users
  - (-) Migration code must remain until all users have upgraded

---

## 5. Rejected Alternatives

---

**Decision:** Native SQLite addon (`better-sqlite3`)
**Rejected reason:** Requires native compilation per Electron version and OS; breaks cross-platform packaging.
**Impact:** sql.js chosen instead; trade-off is in-memory model with synchronous disk saves.

---

**Decision:** `nodeIntegration: true` in renderer
**Rejected reason:** Violates Electron security model; exposes Node.js directly to renderer which may load untrusted content.
**Impact:** All Node.js access routed through contextBridge + IPC.

---

**Decision:** Zustand → Redux for state management
**Rejected reason:** Redux requires significant boilerplate; Zustand is sufficient for the number of stores and data flows in Everest.
**Impact:** State management is less strictly structured but far simpler to maintain.

---

**Decision:** Webpack as renderer build tool
**Rejected reason:** Not selected — Vite chosen for faster HMR and simpler config.
**Impact:** Dev experience is faster; some Webpack-specific plugins not available.

---

## 6. Constraints

- **No native Node.js addons:** Packaging and cross-platform support require pure JavaScript/WASM modules.
- **Renderer must not access Node.js APIs directly:** `contextIsolation: true` and `nodeIntegration: false` are non-negotiable.
- **All IPC channels must use `IPC_CHANNELS` constants:** No hardcoded string channel names anywhere.
- **`packages/core` must be built before `apps/desktop`:** Workspace dependency ordering must be respected in all build and CI scripts.
- **sql.js WASM must be bundled as `extraResources`:** The `.wasm` file cannot be inlined; electron-builder copies it from `node_modules/sql.js/dist/`.
- **SQL migration files must be copied to `dist/migrations/`:** The `build:copy-assets` script handles this; if skipped, migrations will not run.
- **No test framework is currently configured:** Any testing strategy must be established from scratch.
- **Node.js 18+ required:** Documented in README; lower versions are unsupported.
