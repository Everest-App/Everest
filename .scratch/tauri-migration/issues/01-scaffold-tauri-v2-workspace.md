# 01 — Scaffold Tauri v2 Project Workspace

**What to build:**
Create an isolated Tauri v2 application workspace in `/Users/aghilpadash/Desktop/Everest-Tauri` with Vite, React 19, TypeScript, and the Tauri v2 Rust core. Configure the frontend build pipeline, include the shared core library `@api-platform/core`, import application styling tokens, fonts, and assets, and verify that the base desktop window launches with Everest's dark background `#0f0f14`.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Create `/Users/aghilpadash/Desktop/Everest-Tauri` project structure with `package.json`, `vite.config.ts`, `tsconfig.json`
- [x] Initialize Tauri v2 configuration (`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`)
- [x] Bundle and reference `@api-platform/core` package
- [x] Set up icons and static assets (`app-icon.png`, icons in `src-tauri/icons`)
- [x] Verify Vite dev server and `cargo check` compile successfully
