# 04 — Real-time Protocols (WebSocket & SSE) and Local Mock Server

**What to build:**
Implement real-time streaming protocols and local mock server in Rust. For WebSocket, use `tokio-tungstenite` to connect, send text/binary frames, receive incoming messages, and emit events to the webview. For Server-Sent Events, stream incoming events and emit them over Tauri channels. For the Mock Server, implement an embedded HTTP server (`axum` / `tiny_http`) that listens on a specified port, matches requested method/path against configured mock routes, serves configured responses, and logs requests to the webview in real-time.

**Blocked by:** 03 — High-Performance Native HTTP Request Engine & Cancellation

**Status:** done

- [x] Implement Rust WebSocket client manager (connect, send, disconnect, message streaming)
- [x] Implement Rust SSE stream manager (connect, disconnect, event listener)
- [x] Implement Rust Mock Server engine (start, stop, status, routes CRUD, matching engine, live request log emission)
- [x] Add unit tests verifying socket connectivity, SSE parsing, and mock server routing
