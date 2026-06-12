---
name: Hiding a page (Constancia)
description: All the surfaces that must be updated to fully hide a page/route on the Constancia site.
---

# Hiding a page fully

To truly hide a page (not just drop one nav link), update every surface — a link
removed in the footer still leaves the route, preload, server route metadata, and
sitemap exposing it.

**Surfaces to cover:**
- Nav drawer: `client/src/components/LibraryNavigation.tsx` (LIBRARY array) and `NAV_LINKS` in `shared/feature-flags.ts`
- Footer: `client/src/components/footer.tsx` (`SLIM_LINKS`)
- Routes: `client/src/App.tsx` (`<Route>` + the lazy import)
- Preload map: `client/src/lib/preload.ts`
- Server SPA known routes: `server/static.ts` (`KNOWN_ROUTES`)
- Sitemap: `server/services/seo.ts` (`allStaticPages`) — dynamic + flag-filtered, self-corrects.
- AI/LLM surface: `client/public/llms.txt` — **static, hand-curated, NOT flag-aware.** Must be edited manually to list only live routes (every URL there must be a real `<Route>` in App.tsx). `server/__tests__/pre-deployment.test.ts` pins that it exists and contains key literal strings (`Constancia`, `FinanceCompass`, `EPM`, and the canonical URL — now `https://constancia.io`, see canonical-domain.md) — keep those present even when trimming pages (e.g. mention FinanceCompass as a product without linking a gated page). robots.txt is generic and needs no per-page edits.

**Feature-flag vs. unflagged pages:**
- Flag-gated pages (about/services/blog/resources/etc.) hide automatically across
  nav, footer, routes (FeatureGatedRoute) and sitemap (featureKey filter) when the
  flag is false. Careers had **no** feature key, so it had to be removed manually
  from every surface above.

**Feature-flag precedence (`shared/feature-flags.ts`):** DB override > env var > code default.
- `FEATURE_RESOURCES` etc. live in `.replit` `[userenv.shared]`; edit them via the
  environment-secrets `setEnvVars({environment:"shared"})` tool, NOT by editing `.replit`
  (direct `.replit` edits are blocked).
- **Why it matters:** setting the env var false does NOT guarantee hidden if a prod
  `feature_flags` DB row overrides it back to true. To hide reliably in prod, ensure
  no DB override re-enables it.

**Server-side 404 gating for disabled pages (production only):** Excluding a page
from nav/footer/sitemap is NOT enough — the prod SPA server still served disabled
routes as indexable HTTP 200. `server/static.ts` now flag-gates: its `/*` catch-all
and `/blog/:slug` SSR handler call `getServerFeatureFlags()` + `isRouteEnabled()`
and return a real **404** (no meta injected) for any disabled-feature route, so
reachable+indexable pages stay in sync with the flag-filtered sitemap.
- `getFeatureForRoute` uses prefix matching, so all `/finance-compass/*` sub-routes
  inherit the `financeCompass` flag automatically.
- **Dev caveat:** in development, routing is handled by Vite middleware
  (`server/vite.ts`, which is forbidden to edit), so it returns 200 for ALL routes
  and the 404 gating CANNOT be observed in dev. Verify the gating logic directly
  (e.g. `tsx` calling `isRouteEnabled` with prod flag values) or on the live site
  after deploy — not via curling localhost.
