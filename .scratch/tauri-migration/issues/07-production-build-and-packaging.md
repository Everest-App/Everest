# 07 — Production Build, Bundling & Release Parity

**What to build:**
Configure release packaging for macOS, Windows, and Linux. Generate native application icons (`icns`, `ico`, `png`), configure code signing / notarization stubs, bundle metadata (`com.apiplatform.app`, product name `Everest`, version `2.2.1`), and verify clean end-to-end production build (`npm run tauri build`) creating `.dmg` on macOS. Test running the final bundled application binary to guarantee zero runtime regressions.

**Blocked by:** 06 — Native Window Styling, Application Menu & Shortcuts

**Status:** done

- [x] Set up icons in `src-tauri/icons/` using `everest_app_icon.png`
- [x] Configure `tauri.conf.json` bundle targets (DMG for macOS, NSIS for Windows, AppImage/Deb for Linux)
- [x] Add build and package scripts in `package.json`
- [x] Run production build and verify `.dmg` output and executable launch
- [x] Perform end-to-end user experience check
