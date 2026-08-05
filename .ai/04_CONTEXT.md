# Everest AI Context

## 1. Current Project State

- **Status:** Active development
- **Version:** 2.2.1 (from `apps/desktop/package.json`)
- **Current branch:** `main`
- **Recent commits:**
  - `9d0994c` — Add Everest website and deployment workflow
  - `75568ac` — Initial commit: Add Everest platform source code
- **Build status:** Unknown (no CI status visible locally)
- **Test status:** No test runner configured

---

## 2. Project Identity

- **Name:** Everest
- **Type:** Cross-platform desktop application
- **Purpose:** Local-first API testing and development platform
- **One-liner:** A privacy-first, offline-capable Postman alternative built with Electron
- **Target users:** Developers, QA engineers, API testers, security-conscious/enterprise teams
- **Inspired by:** Postman (explicitly referenced in README and script API compatibility)

---

## 3. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop framework | Electron | 42.4.0 |
| Language | TypeScript | 6.x |
| UI framework | React | 19.x |
| Renderer build | Vite | 8.x |
| State management | Zustand | 5.x |
| HTTP client | axios | 1.x |
| Database | sql.js (SQLite via WASM) | 1.14.x |
| WebSocket | ws | 8.x |
| i18n | i18next + react-i18next | 26.x / 17.x |
| ID generation | uuid | 14.x |
| Packaging | electron-builder | 26.x |
| Runtime (main) | Node.js | 18+ (required) |

---

## 4. Current Architecture Snapshot

- **Type:** Multi-process Electron app inside an npm monorepo
- **Monorepo workspaces:**
  - `apps/desktop` — Electron app (main + preload + renderer)
  - `packages/core` — shared types, IPC constants, utilities (`@api-platform/core`)
- **Key layers:**
  - **Renderer** — React UI + Zustand state, no direct Node.js access
  - **Preload** — `contextBridge` exposes typed `window.api` surface
  - **Main** — all business logic: IPC routing → services → runtime engine → sql.js DB
- **Security model:** `contextIsolation: true`, `nodeIntegration: false`
- **Storage:** In-memory sql.js DB, auto-saved to `<userData>/data/api-platform.db` every 30s
- **IPC pattern:** All channel names are constants in `@api-platform/core`

---

## 5. Active Development Focus

- **Current objective:** Not defined yet
- **Recent work (from git log):** Website and deployment workflow addition
- **Related modules:** Unknown — no task tracking visible in repository

---

## 6. Important Constraints

- **No native Node addons:** sql.js chosen specifically to avoid native compilation (cross-platform safety)
- **Renderer is sandboxed:** No Node.js or Electron APIs in renderer — all calls go through `window.api`
- **All IPC channels must use constants from `@api-platform/core`** — do not hardcode channel name strings
- **Do not modify `packages/core` types without understanding renderer + main consumers** — types are shared across both processes
- **Main process handles all I/O** — file system and network access must never move to renderer
- **DB write is synchronous** (`fs.writeFileSync`) — avoid calling `saveDatabase()` in hot paths
- **Monorepo dependency:** `@api-platform/core` is a workspace package (`"*"`) — it must be built before `apps/desktop` in CI

---

## 7. Known Issues

| Issue | Impact | Status |
|---|---|---|
| No test suite | No automated regression safety net | Unknown / Not addressed |
| Synchronous DB save | Blocks main process during write | Known limitation |
| `packages/core` ships both `.ts` and `.js` source files | Unclear build/publish boundary | Needs investigation |
| Plugin system exists in code but is a roadmap item | Stability/maturity unknown | In progress |
| Mock server exists in code but is a roadmap item | Stability/maturity unknown | In progress |

---

## 8. Recent Changes

```
Date:           Unknown (git timestamps not checked)
Change:         Added Everest website and deployment workflow
Commit:         9d0994c
Files affected: Unknown — not inspected

Date:           Unknown
Change:         Initial source code commit
Commit:         75568ac
Files affected: Full repository
```

---

## 9. Next Recommended Actions

- **Documentation:** Complete `.ai/05_TASKS.md` with active development tasks
- **Documentation:** Complete `.ai/06_DECISIONS.md` with key architectural decisions
- **Documentation:** Complete `.ai/07_HANDOFF.md` with current handoff state
- **Investigation:** Inspect `renderer/styles/` to understand CSS/styling approach
- **Investigation:** Inspect `main/types/` and `main/utils/` — not yet documented
- **Investigation:** Clarify plugin and mock server implementation maturity
- **Technical debt:** No test framework — consider adding vitest or jest
- **Technical debt:** Synchronous `saveDatabase()` should be evaluated for async replacement

---

## 10. AI Session Notes

Context initialized. No previous AI session history.

Sessions will be appended here in reverse-chronological order.

```
[2026-07-16] — Initial .ai workspace created.
              Files created: 00_PROJECT.md, 01_AGENTS.md, 02_ARCHITECTURE.md,
                             03_MODULES.md, 04_CONTEXT.md
              Source analyzed: README.md, package.json (root + desktop),
                               main process structure, preload, storage, runtime,
                               renderer components and stores.
```
