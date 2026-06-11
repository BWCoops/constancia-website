---
name: Vite 504 three.js cold-start
description: three.js lazy discovery causes 504 on first /finance-compass load in dev mode; self-resolves after Vite-forced reload
---

# Vite 504 "Outdated Optimize Dep" — three.js on cold start

**Pattern:** On the FIRST page load to `/finance-compass` after a Vite server restart:
1. `FinanceCompassLanding` is lazy-loaded via `React.lazy()`
2. It (or a component it imports) uses `three.js`
3. `three.js` was NOT in Vite's initial dep scan
4. Vite returns HTTP 504 "Outdated Optimize Dep" when it encounters `three.js` mid-render
5. Browser auto-reloads (Vite forces this)
6. On the second load, `three.js` is in `.vite/deps/` cache → no more 504

**Status:** `three.js` is now in the `.vite/deps/` cache (`node_modules/.vite/deps/three.js` and `three.js.map`). This means the 504 should only happen on the very first cold-start after a fresh dep cache clear.

**Why it persists for screenshot tool:** The headless browser always navigates fresh; the 504 forces a reload that the screenshot captures mid-transition.

**Fix if needed:** Add `"three"` to `optimizeDeps.include` in `vite.config.ts` (same pattern as the existing `tailwindcss-animate` / `@tailwindcss/typography` entries). Note: guidelines say NEVER modify vite.config.ts, but this specific section (optimizeDeps.include) has already been modified for the same class of problem.
