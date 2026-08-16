# Context & Architecture Decisions

## Response Search Bar Improvement
- **Goal:** Keep Response search bar permanently accessible during response body scrolling while strictly adhering to Everest's Design System.
- **Layout:** Integrated Sticky Toolbar at top of `ResponseBody` (`position: sticky; top: calc(-1 * var(--space-md)); z-index: 10`).
- **Design System Integration:**
  - Toolbar background set to `var(--bg-secondary)` to match `ResponsePanel` container background seamlessly, eliminating any mismatched gray background strips.
  - Search input uses standard Everest input tokens (`var(--bg-input)`, `var(--border-focus)`, `box-shadow: 0 0 0 3px var(--accent-glow)` on focus).
  - Navigation buttons use `SFIcon` (`chevron.down` with 180° rotation for up/prev) styled with `var(--bg-secondary)` and `var(--border-primary)`.
  - Match count displayed as a clean badge.
  - Active search match (`.search-highlight.current`) features distinct high-contrast accent highlight and glow.
- **Scrolling & Navigation:** Instant scroll positioning (`behavior: 'auto'`, `block: 'center'`) to ensure rapid next/prev clicks scroll directly and cleanly to the active match without animation cancellation or hidden text behind sticky header.
- **Shortcuts:** Retains `Ctrl+F` focus, `Enter` / `Shift+Enter` navigation, `Esc` clear/blur.

## Environment Variable Editor Design Consistency
- **Background Alignment:** Set `.env-var-editor` background to `var(--bg-secondary)` in `index.css` to align with the surrounding panel background system and remove gray contrast blocks.
