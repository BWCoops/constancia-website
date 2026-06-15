---
name: Holding page (home) performance facts
description: Non-obvious facts for Lighthouse/perf work on the constancia.io home page (client/src/pages/holding.tsx).
---

For perf work on the public home page (`/` → `client/src/pages/holding.tsx`):

- **LCP element is the launch-film poster** (`client/public/launch-film-poster.jpg`),
  which is `<link rel=preload>`'d in `index.html`. Shrinking/recompressing it is
  the most direct LCP lever. The autoplay MP4 (`/launch-film.mp4`) sits behind it.
- **Wordmark display size is capped small:** `.holding-wordmark img` is
  `width: clamp(200px, 52vw, 320px)`, so the logo never renders wider than 320px.
  Asset only needs ~640px (2x retina); anything larger is wasted bytes that
  Lighthouse flags under "improve image delivery". Keep the `<img>` width/height
  attributes in sync with the actual asset ratio to avoid CLS.
- **recharts is NOT in the home graph.** It's code-split into the `charts` chunk
  (vite manualChunks) and only pulled by admin/finance/blog pages. If a Lighthouse
  run shows `charts.js` loading on the home page, suspect a *stale deployment* or a
  delayed route preload — not a missing split. `preloadHeavyRoutes()` is already a
  deliberate no-op; `preloadPriorityRoutes()` only warms `/contact` after ~8s.

**Why:** these saved repeated re-investigation during a Lighthouse pass.
**How to apply:** start perf work from the poster + logo sizing; don't chase
charts.js as if recharts leaked into the entry bundle.
