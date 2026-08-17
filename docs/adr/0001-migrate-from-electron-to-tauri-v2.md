# ADR 0001: Migrate Desktop App from Electron to Tauri v2

## Status
Accepted

## Context
Everest is currently packaged and distributed as an Electron desktop application (`apps/desktop`). While functional, Electron carries substantial binary size and memory overhead. We need to migrate to Tauri v2 in a dedicated separate workspace (`/Users/aghilpadash/Desktop/Everest-Tauri`) while keeping the Electron version intact in the current repo.

The primary constraint is zero end-user disruption: existing data, user interface, keyboard shortcuts, menus, window styling, and all core features (REST, GraphQL, WebSocket, SSE, Mock Server, Runner, Script sandbox, Collections, Environments, History) must function identically.

## Decisions

1. **Dedicated Project Workspace:**
   - The Tauri v2 application will be scaffolded in an isolated project folder `/Users/aghilpadash/Desktop/Everest-Tauri` on Desktop.
   - The existing Electron codebase in `apps/desktop` remains completely untouched.

2. **Native Rust Backend (No Sidecars):**
   - Implement backend capabilities in native Rust with Tauri v2 commands and plugins:
     - SQLite database storage via `rusqlite` / `tauri-plugin-sql`.
     - High-performance HTTP client using `reqwest` with timing metrics (DNS, TLS, TTFB, transfer) and request cancellation.
     - Real-time protocols via `tokio-tungstenite` (WebSocket) and `eventsource` (SSE).
     - Local mock server with lightweight Rust HTTP engine (`axum` / `tiny_http`).

3. **100% Data Continuity & Auto-Migration:**
   - The SQLite database schema in Tauri matches the Electron schema verbatim (`collections`, `collection_items`, `environments`, `global_variables`, `history`, `mock_routes`, `plugins`).
   - On initial launch, if no new Tauri database exists, the application automatically detects and copies the existing Electron SQLite database from the OS application support directory (`~/Library/Application Support/Everest/data/api-platform.db`).

4. **Drop-in Bridge Adapter for `window.api`:**
   - Provide a Tauri client bridge adapter exposing the exact `ElectronAPI` interface to `window.api`.
   - The frontend React stores, components, and hooks require zero code refactoring, eliminating UI regressions.

5. **OS Native Window Styling & Menu Parity:**
   - macOS `hiddenInset` / transparent titlebar with native traffic light positioning.
   - Full native menu bar reproducing Electron application menus and broadcasting `menu-action` events to the webview.

6. **Engine Separation of Concerns:**
   - Rust handles heavy I/O, networking (bypassing CORS), sockets, local mock server, and database persistence.
   - Core formatting logic, codegen, and import/export parsers remain in TypeScript (`@api-platform/core`) for identical serialization outputs.

## Consequences
- Significant reduction in binary size (~15MB vs ~150MB) and RAM footprint (~30-50MB vs ~200-400MB).
- Seamless transition for existing users without data loss or UI disorientation.
- Isolated development lifecycle without breaking Electron release workflows.
