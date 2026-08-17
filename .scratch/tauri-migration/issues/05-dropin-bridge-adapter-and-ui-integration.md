# 05 — Drop-in Bridge Adapter & Full UI Integration

**What to build:**
Implement the drop-in TypeScript bridge adapter `window.api` exposing the full `ElectronAPI` surface to the React frontend in the Tauri workspace. Wire all React Zustand stores (`collectionStore`, `historyStore`, `environmentStore`, `requestStore`, `runnerStore`, `mockStore`), script execution engine, and Import/Export parsers without modifying UI component code. Verify that all UI panels (HTTP, GraphQL, WebSocket, SSE, Mock Server, Runner, History, Environments, Codegen, Settings) function seamlessly with live data.

**Blocked by:** 04 — Real-time Protocols (WebSocket & SSE) and Local Mock Server

**Status:** done

- [x] Create `tauri-bridge.ts` implementing `ElectronAPI` via `@tauri-apps/api/core` and `@tauri-apps/api/event`
- [x] Bind `window.api` before React initialization
- [x] Connect collection runner with live test progress and item result events
- [x] Integrate Import/Export parsers (Postman v2.1, OpenAPI 3.0/3.1, Insomnia v4, HAR, Everest JSON)
- [x] Verify complete frontend tab walkthrough (Request, GraphQL, WS, SSE, Runner, Mock, History, Envs)
