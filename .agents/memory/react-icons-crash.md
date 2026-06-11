---
name: react-icons v5 crash
description: react-icons v5 ESM format causes React "Invalid hook call" crash in Vite; use inline SVG instead
---

# react-icons v5 causes React crash in Vite

**Rule:** Never install or import `react-icons` in this project.

**Why:** react-icons v5 uses pure ESM that doesn't play well with Vite's dep optimization. When Vite pre-bundles it, the package ends up with duplicate React instances (one from the app, one bundled with react-icons), which violates React's "single React copy" requirement. Symptom is `Invalid hook call` / `Cannot read properties of null 'useRef'` on every page — a global crash.

**How to apply:** For Google/brand icons, use inline SVG components defined at the top of the file. The existing `GoogleIcon` SVG in `FinanceCompassLanding.tsx` is the template to follow.
