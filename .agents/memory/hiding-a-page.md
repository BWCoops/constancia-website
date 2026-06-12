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
- AI/LLM surface: `client/public/llms.txt` — **static, hand-curated, NOT flag-aware.** Must be edited manually to list only live routes (every URL there must be a real `<Route>` in App.tsx). `server/__tests__/pre-deployment.test.ts` pins that it exists and contains the literal strings `Constancia`, `FinanceCompass`, `EPM`, `https://constancia.com` — keep those present even when trimming pages (e.g. mention FinanceCompass as a product without linking a gated page). robots.txt is generic and needs no per-page edits.

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
