# Everest Project Overview

## 1. Project Identity

- **Project name:** Everest
- **Product type:** Desktop application — API testing and development platform
- **One-sentence description:** A local-first, offline-capable desktop platform for testing and managing HTTP, GraphQL, WebSocket, and SSE APIs.
- **Internal monorepo name:** `everest-monorepo`
- **Current version:** 2.2.1
- **Development status:** Active development (roadmap features pending)

---

## 2. Vision

- **Long-term purpose:** Provide technical teams with a fully self-hosted, privacy-first alternative to cloud-dependent API tools like Postman.
- **Problem it solves:** Commercial API platforms require cloud connectivity, expose sensitive credentials to third-party services, and impose policy or pricing constraints on teams. Everest eliminates these dependencies.
- **Value proposition:**
  - All data stays local — no cloud sync required by default.
  - No vendor lock-in or external service dependencies.
  - Open-source and cost-free compared to commercial alternatives.
  - Extensible by design for team-specific workflows.

---

## 3. Product Overview

- Users can create, organize, and send API requests across multiple protocols.
- Requests can be grouped into collections and executed individually or as automated runs.
- Environment variables allow reusable, dynamic configurations across workspaces.
- Pre-request and test scripts enable programmatic control over request flows and response validation.
- The entire workflow is usable offline without any cloud account or internet connection.

---

## 4. Target Users

- **Developers** — building and debugging APIs during development.
- **QA engineers** — writing and running automated API test suites.
- **API testers** — manually exploring and validating API endpoints.
- **Security-conscious teams** — organizations that cannot send API credentials to cloud-hosted services.
- **Enterprise teams** — teams needing internal tooling with no external data exposure.

---

## 5. Key Capabilities

- **HTTP request management** — full support for GET, POST, PUT, DELETE, and other methods; headers, query params, body types (JSON, form-data, URLEncoded, binary).
- **Protocol support** — GraphQL, WebSocket, and Server-Sent Events (SSE) in addition to standard HTTP.
- **Collections** — organize requests into nested folders; import/export in Postman and OpenAPI formats.
- **Environments & variables** — local, global, and environment-scoped variables with live hover previews.
- **Collection Runner** — sequential execution of requests with configurable delays and iterations; real-time pass/fail reporting.
- **Script engine** — pre-request scripts and test scripts using Postman-compatible syntax (`pm.*` API).
- **Automated testing** — assertions on status codes, response times, and body content.
- **Offline-first** — fully functional without internet access.
- **Dark/Light mode** — built-in theme support.

---

## 6. Technology Overview

| Layer | Technology |
|---|---|
| Desktop framework | Electron.js |
| UI library | React.js |
| Language | TypeScript |
| Frontend build tool | Vite |
| State management | Zustand |
| Backend/OS layer | Node.js |
| Package management | npm workspaces (monorepo) |

---

## 7. Product Goals

- **Privacy & security** — keep API credentials and data entirely offline and within the user's network.
- **Developer productivity** — reduce friction in API testing with a modern, IDE-like interface.
- **Offline-first experience** — no dependency on cloud services or internet connectivity.
- **Postman compatibility** — support Postman collection formats and script syntax to ease migration.
- **Extensibility** — designed for future plugin support and team customization.
- **Cross-platform availability** — distributable on macOS, Windows, and Linux.

---

## 8. Current Scope

**Exists today:**
- Full HTTP request builder and sender.
- GraphQL, WebSocket, SSE protocol support.
- Collections with nested folders and import/export (Postman, OpenAPI).
- Environment and variable management.
- Collection Runner with iteration and delay controls.
- Pre-request and test scripting with Postman-compatible API.
- Automated assertions and test reporting.
- Dark/Light mode UI.

**Under development (roadmap):**
- Mock Server — local API simulation.
- Cloud Sync — optional cross-device collection sync.
- Plugin System — third-party developer extensions.
- CI/CD Integration — CLI runner for pipelines.
- Team Collaboration — local network workspace sharing.

**Known limitations:**
- No cloud sync in current version (by design; planned as opt-in).
- No CLI tooling yet for CI/CD pipelines.
- Plugin system not yet implemented.
