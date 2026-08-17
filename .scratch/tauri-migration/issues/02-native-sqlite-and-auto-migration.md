# 02 — Native SQLite Storage Engine and Auto-Migration

**What to build:**
Implement a high-performance SQLite database storage backend in Rust for Tauri v2 that matches the Electron schema verbatim (`collections`, `collection_items`, `environments`, `global_variables`, `history`, `mock_routes`, `plugins`). Provide automatic zero-loss detection and migration of existing user data from Electron's OS storage directory (`~/Library/Application Support/Everest/data/api-platform.db` on macOS) on initial launch. Expose Tauri commands for complete CRUD on collections, items, history, environments, globals, and mock routes.

**Blocked by:** 01 — Scaffold Tauri v2 Project Workspace

**Status:** done

- [x] Implement Rust SQLite manager with `rusqlite`
- [x] Create exact matching schema and migration scripts
- [x] Implement seamless auto-migration reading from Electron app data directory if local Tauri DB doesn't exist
- [x] Expose Tauri IPC commands for collections (get, create, update, delete, duplicate, add_item, update_item, delete_item, move_item, reorder)
- [x] Expose Tauri IPC commands for history (get_all, search, delete, clear)
- [x] Expose Tauri IPC commands for environments and globals (get, create, update, delete, get_globals, set_globals)
- [x] Add unit tests verifying SQLite CRUD operations and migration integrity
