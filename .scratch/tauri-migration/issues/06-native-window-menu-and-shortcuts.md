# 06 — Native Window Styling, Application Menu & Shortcuts

**What to build:**
Implement pixel-perfect native window appearance and application menu bar. Configure transparent/overlay titlebar with native macOS traffic lights positioned at `x: 15, y: 15`, matching `#0f0f14` theme. Build native OS application menu (File, Edit, View, Window, Help) in Rust and dispatch `menu-action` events to the webview window for keyboard shortcuts (`Cmd/Ctrl+N` for New Request, `Cmd/Ctrl+Enter` for Send, `Cmd/Ctrl+W` for Close Tab, etc.).

**Blocked by:** 05 — Drop-in Bridge Adapter & Full UI Integration

**Status:** done

- [x] Configure `tauri.conf.json` window attributes (dimensions 1400x900, min 900x600, titleBarStyle: Overlay / hidden)
- [x] Implement native application menu in Rust (`tauri::menu::Menu`) with standard shortcuts
- [x] Connect menu click handler to dispatch `menu-action` event to the webview window
- [x] Verify macOS traffic light controls, window resizing, and keyboard shortcut responsiveness
