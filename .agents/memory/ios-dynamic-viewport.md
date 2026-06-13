---
name: iOS dynamic viewport (svh/dvh)
description: On iOS Safari, plain 100vh reserves the LARGE viewport so bottom-anchored content sits behind browser chrome; use svh/dvh.
---

On iOS Safari, `100vh` resolves to the *large* viewport (toolbars hidden), so
fixed/full-height shells reserve more height than is actually visible. Two
symptoms seen on this site:

- A blank strip at the bottom of full-height pages when scrolling.
- The nav drawer's bottom footer (the **Cookie Preferences** trigger) sitting
  *below* the visible area behind the address bar — making it look like "the
  cookie option is missing / doesn't work on mobile."

**Fix:** ship a progressive trio — `height: 100vh; height: 100svh; height: 100dvh;`
(or `min-height` variants) on full-height shells. Old browsers fall back to vh;
modern ones use dvh. Applied to `.holding-page`, `.marketing-page`, the global
`.min-h-screen` override, and `.library-nav-drawer`.

**Why:** the cookie-preferences modal itself is fine on mobile (portals to body,
`z-modal` 9995 ≫ drawer z-index 70). The mobile failure was purely the *trigger*
being unreachable due to the drawer's 100vh height.

**How to apply:** any new full-height/fixed shell, or any bottom-anchored control
inside one, must use svh/dvh — not plain vh. Remaining raw `100vh` lives in the
orphaned `.landing-hero__inner` (LandingHero is not routed; `/` → `holding.tsx`).
