# Migration Specification: Electron to Tauri v2

## Problem Statement

Everest is currently packaged as an Electron desktop application. While fully functional, Electron applications have large bundle sizes (>150MB installer) and high runtime memory usage (~300MB+ RAM). The user wants to migrate Everest to the latest version of Tauri (Tauri v2) in a completely separate project directory on the Desktop (`/Users/aghilpadash/Desktop/Everest-Tauri`) to reduce footprint and boost performance, while keeping the Electron version intact. Crucially, the end-user must experience zero breaking changes or behavioral regressions across all existing features (REST, GraphQL, WebSocket, SSE, Mock Server, Runner, Scripting, Collections, Environments, History, Import/Export, and Menus).

## Solution

Build a standalone Tauri v2 application in `/Users/aghilpadash/Desktop/Everest-Tauri` leveraging:
1. A **Pure Rust Backend** implementing all native I/O, SQLite database management, HTTP network execution with granular timing metrics, real-time protocols (WebSocket/SSE), local mock HTTP server, and native window/menu lifecycle.
2. A **Drop-in `window.api` Bridge Adapter** that seamlessly maps all `ElectronAPI` methods to Tauri v2 `invoke()` and `listen()` calls without altering the React frontend store/component implementations.
3. An **Automatic Data Migration Layer** that detects existing Electron SQLite databases and migrates user data seamlessly on the first launch.
4. **Platform Parity** ensuring identical macOS traffic lights, titlebar overlay styling, and native system application menus.

## User Stories

1. As a developer using Everest, I want the application to launch instantaneously and consume minimal RAM so that my system remains responsive during heavy development workflows.
2. As an existing Everest user, I want my historical requests, environments, global variables, and collections to be instantly available in the Tauri app without manually exporting or importing anything.
3. As a developer, I want to send HTTP/REST requests (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD) with custom headers, query params, auth, and bodies (JSON, multipart/form-data, x-www-form-urlencoded, raw, binary) and see exact timing metrics (DNS, TCP, TLS, TTFB, total duration) without CORS restrictions.
4. As a developer, I want to cancel an in-flight HTTP request immediately when clicking Cancel.
5. As a developer, I want to query and mutate GraphQL endpoints, as well as fetch GraphQL schema introspection automatically.
6. As a developer, I want to establish WebSocket connections, send messages, and stream incoming messages in real-time.
7. As a developer, I want to establish SSE (Server-Sent Events) streams and receive live stream events.
8. As a developer, I want to create, start, and stop a local Mock Server on any available port and define custom route responses and headers.
9. As a developer, I want to execute pre-request and test scripts in a safe sandbox with full `pm.*` API support (`pm.environment`, `pm.globals`, `pm.variables`, `pm.request`, `pm.response`, `pm.test`, `pm.expect`).
10. As a developer, I want to run entire collections with the Collection Runner, including iteration data, delays, and real-time live test progress streaming.
11. As a developer, I want to organize requests into nested folders and collections, duplicate collections, and reorder items with drag-and-drop.
12. As a developer, I want to manage environment variables and global variables with 5-tier resolution hierarchy.
13. As a developer, I want to import collections and environments from Postman (v2.1), OpenAPI/Swagger (v3.0/3.1), Insomnia (v4), HAR, and cURL, as well as export collections to standard formats.
14. As a developer, I want to generate client code in 15+ target languages (cURL, Python, Go, Node.js, Rust, Java, C#, PHP, Swift, etc.).
15. As a macOS user, I want a seamless native window with `hiddenInset` traffic light styling matching the dark theme `#0f0f14`.
16. As a desktop user, I want native application menus and standard keyboard shortcuts (`Cmd/Ctrl+N`, `Cmd/Ctrl+Enter`, `Cmd/Ctrl+W`, `Cmd/Ctrl+Shift+E`, etc.) to trigger corresponding actions in the application.

## Implementation Decisions

- **Isolated Project Workspace:** The application is placed in `/Users/aghilpadash/Desktop/Everest-Tauri`. The Electron app in `/Users/aghilpadash/Desktop/Everest` remains untouched.
- **Tauri v2 Core:** Built with Tauri v2 CLI and Rust backend (`tauri = "2"`, `rusqlite`, `reqwest`, `tokio`, `tokio-tungstenite`, `axum` / `tiny_http`, `serde`, `serde_json`).
- **Database Schema:** 100% parity with Electron SQLite schema (`collections`, `collection_items`, `environments`, `global_variables`, `history`, `mock_routes`, `plugins`).
- **Frontend Architecture:** Reuses the Everest React + TypeScript UI, Vite bundler, Zustand stores, and `@api-platform/core` types/parsers.
- **Client Bridge (`window.api`):** Implements `ElectronAPI` using `@tauri-apps/api/core` `invoke` and `@tauri-apps/api/event` `listen`.
- **Automatic Migration:** Checks for `~/Library/Application Support/Everest/data/api-platform.db` on macOS (and OS equivalents on Windows/Linux) on initial boot if local Tauri DB does not exist.
- **Native Menus:** Constructed using `tauri::menu::Menu` in Rust, dispatching `menu-action` events to the webview window.

## Testing Decisions

- **Testing Seams:**
  1. *Bridge & Store Seam:* Unit and integration tests against `window.api` bridge methods verifying return types and event listener lifecycles.
  2. *Rust Backend Command Seam:* Rust unit and integration tests for SQLite CRUD, HTTP client execution with timing metrics, and mock server routing.
  3. *End-to-End Build Seam:* Full build verification with `npm run tauri build` and `npm run tauri dev`.
- **Prior Art:** Existing test suite in `packages/core` and Electron IPC handler tests.

## Out of Scope

- Modifying the existing Electron codebase in `/Users/aghilpadash/Desktop/Everest`.
- Changing existing UI themes, color tokens, or layout geometries.
- Adding brand new unrelated features not present in the Electron app.

## Further Notes

- Target Tauri version: Tauri v2 (latest stable release).
- Toolchain: Rust `1.97.1+` with Cargo, Node.js, and npm.
