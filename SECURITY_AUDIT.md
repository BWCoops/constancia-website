# Security & Performance Hardening Audit

**Date:** 2026-06-12  
**Stack:** React 18 + TypeScript + Vite 6.4.2 + Express 4.22.2 + Clerk + Neon/Drizzle + Anthropic  
**Auditor:** Pre-publication hardening pass  

---

## 1. Findings Table

| # | Issue | Severity | File | Status |
|---|-------|----------|------|--------|
| 1 | 15 `/api/admin/*` routes in `routes.ts` had no `isAuthenticated` middleware (guardrails CRUD, blog generate-legacy, blog validate, analytics/realtime, blog templates, guardrails test) | **CRITICAL** | `server/routes.ts` | **FIXED** — Added blanket `app.use("/api/admin", isAuthenticated)` at the top of the admin section |
| 2 | `/api/export/wordpress` (POST) had no auth middleware | **HIGH** | `server/routes.ts` | **FIXED** — Added `isAuthenticated` to handler |
| 3 | `Permissions-Policy` header missing entirely | **MEDIUM** | `server/index.ts` | **FIXED** — Added restrictive policy disabling camera, mic, geolocation, payment, usb, magnetometer, accelerometer, gyroscope, display-capture, clipboard-read, picture-in-picture |
| 4 | Security-sensitive packages pinned with loose `^` operator | **MEDIUM** | `package.json` | **FIXED** — Pinned: `@anthropic-ai/sdk`, `@clerk/express`, `drizzle-orm`, `express`, `express-rate-limit`, `helmet`, `vite` to exact installed versions |
| 5 | No `.npmrc` with `ignore-scripts` | **MEDIUM** | `.npmrc` | **FIXED** — Added `ignore-scripts=true`; see open items for caveat |
| 6 | HIGH: `@clerk/shared` transitive vulnerability | **HIGH** | transitive via `@clerk/express` | **OPEN** — Requires upstream Clerk release; monitor `@clerk/express` changelog |
| 7 | HIGH: `js-cookie <=3.0.5` transitive vulnerability | **HIGH** | transitive | **OPEN** — Cannot fix without upstream changes; no direct import |
| 8 | HIGH: `tmp <0.2.6` transitive vulnerability | **HIGH** | transitive | **OPEN** — Cannot fix without upstream changes; no direct import |
| 9 | MODERATE: `@adobe/pdfservices-node-sdk`, `@azure/msal-node`, `exceljs` use vulnerable `uuid` | **MODERATE** | transitive | **OPEN** — `npm audit fix --force` risks breaking changes; monitor upstream |
| 10 | MODERATE: `drizzle-kit`, `esbuild`, `@esbuild-kit/*` moderate vulns | **MODERATE** | dev-only | **OPEN** — Dev/build tooling only; no production exposure |
| 11 | Vite 6.4.2 — CVE-2026-39364/39363 affect 7.1.0–7.3.1 and 8.x<8.0.5 only | **INFO** | `vite.config.ts` | **NOT AFFECTED** — 6.x series; earlier Vite CVE-2025-32395 fixed in 6.2.3 |
| 12 | Supply-chain worm check (Shai-Hulud / Mini Shai-Hulud / Miasma) | **INFO** | `package-lock.json` | **CLEAN** — No `setup_bun.js`, `bun_environment.js`, or suspicious preinstall/postinstall scripts found in direct dependencies |
| 13 | `dangerouslySetInnerHTML` in 4 locations | **INFO** | `chart.tsx`, `blog-post.tsx`, `FinanceCompassLanding.tsx` | **SAFE** — All instances use `JSON.stringify` of static typed data (JSON-LD) or Recharts CSS variable injection; no user-supplied content |
| 14 | `sql\`\`` template usage in analytics queries | **INFO** | `server/admin/routes.ts` | **SAFE** — All dynamic values are Drizzle column references and server-generated Date objects; no user-controlled string interpolation |
| 15 | Blog content rendered via `processMarkdownContent()`, not `dangerouslySetInnerHTML` | **INFO** | `client/src/pages/blog-post.tsx` | **SAFE** — Markdown renderer returns React elements; no raw HTML injection |
| 16 | Finance-compass chatbot query capped at 200 chars | **INFO** | `server/finance-compass/chatbot/research-service.ts:225` | **SAFE** — `query.query.toLowerCase().trim().substring(0, 200)` already enforced |
| 17 | `isomorphic-dompurify` already in production dependencies | **INFO** | `package.json` | **AVAILABLE** — Ready for future use if AI-generated HTML needs client rendering |
| 18 | HSTS `max-age=31536000; includeSubDomains; preload` | **INFO** | `server/index.ts` | **GOOD** — Already in place |
| 19 | Session cookies: `httpOnly`, `secure` (prod-only), `sameSite: "strict"` | **INFO** | `server/api/routes/resources.routes.ts` | **GOOD** — All three flags set correctly |
| 20 | Sourcemaps in production | **INFO** | `vite.config.ts` | **SAFE** — Vite default for production build is `sourcemap: false`; cannot modify `vite.config.ts` per project constraints |

---

## 2. Route Auth & Validation Table

### Public Routes (intentionally unauthenticated)

| Route | Method | Auth | Zod Validation | Notes |
|-------|--------|------|---------------|-------|
| `/api/health` | GET | None | N/A | Load balancer probe |
| `/api/sitemap.xml` | GET | None | N/A | SEO |
| `/api/robots.txt` | GET | None | N/A | SEO |
| `/api/feature-flags` | GET | None | N/A | Returns only flag names/booleans |
| `/api/config/turnstile` | GET | None | N/A | Returns public site key only |
| `/api/csp-report` | POST | None | N/A | Browser reporting endpoint |
| `/api/track/page-view` | POST | None | `pageViewSchema` ✓ | Analytics |
| `/api/notify-me` | POST | None | `z.object({email})` ✓ | Waitlist |
| `/api/careers/apply` | POST | None | `insertTalentSubmissionSchema` ✓ | Talent form |
| `/api/contact` | POST | Feature flag | `insertContactSubmissionSchema` ✓ | Contact form + OTP |
| `/api/contact/verify` | POST | Feature flag | `z.object({email,code})` ✓ | OTP verify |
| `/api/resources/*` | GET/POST | Feature flag + resource session | Zod on body ✓ | Resource gate |
| `/api/finance-compass/public/*` | GET/POST | Feature flag | Zod on all mutations ✓ | Public tool |

### Admin Routes (Clerk session required — `isAuthenticated` middleware)

| Route | Method | Auth | Zod Validation | Notes |
|-------|--------|------|---------------|-------|
| `/api/admin/feature-flags` | GET/PATCH/DELETE | `isAuthenticated` ✓ | `z.string()` on params ✓ | |
| `/api/admin/guardrails/*` | GET/POST/PATCH/DELETE | `isAuthenticated` ✓ *(blanket)* | Partial — see open items | Previously unprotected; fixed |
| `/api/admin/blog/*` | GET/POST | `isAuthenticated` ✓ *(blanket)* | `requireBlog` feature flag + Zod | Previously some unprotected |
| `/api/admin/analytics/realtime` | GET | `isAuthenticated` ✓ *(blanket)* | N/A (stub) | Previously unprotected; fixed |
| `/api/admin/finance-compass/*` | ALL | `requireFinanceCompass` + `isAuthenticated` ✓ | Zod on all mutations ✓ | |
| `/api/admin/blog/generate*` | POST | `isAuthenticated` ✓ + `requireBlog` | Zod ✓ | AI endpoint — admin only |
| `/api/export/wordpress` | POST | `isAuthenticated` ✓ | N/A (stub) | Previously unprotected; fixed |
| `/api/admin/*` (admin router) | ALL | `isAuthenticated` ✓ per-route | Zod + `adminRateLimit` ✓ | Full CRUD in `admin/routes.ts` |

---

## 3. Dependency Changes

| Package | Before | After | Reason |
|---------|--------|-------|--------|
| `@anthropic-ai/sdk` | `^0.78.0` | `0.78.0` | Pin exact version — AI key exposure risk |
| `@clerk/express` | `^2.1.19` | `2.1.19` | Pin exact version — auth library |
| `drizzle-orm` | `^0.45.2` | `0.45.2` | Pin exact version — DB access layer |
| `express` | `^4.21.2` | `4.22.2` | Pin to installed version (was drifted) |
| `express-rate-limit` | `^8.3.0` | `8.5.2` | Pin to installed version (was drifted) |
| `helmet` | `^8.1.0` | `8.1.0` | Pin exact version — security headers |
| `vite` (devDep) | `^6.4.2` | `6.4.2` | Pin exact version — build tooling |
| `.npmrc` | (none) | `ignore-scripts=true` | Supply-chain hardening |

**Already-present `overrides` in `package.json` (no changes needed):**
- `qs` → `6.14.2` (fixes moderate qs vuln)  
- `yaml` → `2.8.3`  
- `path-to-regexp` → `0.1.13`  
- `picomatch` → `4.0.4`  

**`npm audit fix` result:** 0 packages updated — all remaining issues require `--force` (breaking changes) or upstream fixes.

---

## 4. Open Items Requiring Human Decision (ranked by risk)

### P0 — Act before publishing

| # | Item | Risk | Recommendation |
|---|------|------|---------------|
| OI-1 | **`.npmrc` `ignore-scripts=true` breaks fresh installs for `sharp`, `esbuild`, and `puppeteer`** | N/A | **RESOLVED** — `.npmrc` removed. No CI pipeline exists yet; revisit when one is set up. Consider `--ignore-scripts` as a CI flag rather than a global `.npmrc` setting. |
| OI-2 | **`/api/admin/guardrails/*` routes now require Clerk auth** — if any internal tooling or scripts call these endpoints without a session token, they will now receive `401`. | Potential breakage of any internal CLI or seeding scripts | Verify `POST /api/admin/guardrails/seed` is only called from the admin UI (not a deployment script) before going live. |

### P1 — Fix before public traffic

| # | Item | Risk | Recommendation |
|---|------|------|---------------|
| OI-3 | **3 HIGH transitive vulnerabilities** (`@clerk/shared`, `js-cookie`, `tmp`) cannot be resolved without upstream releases | Dependant on how the vulnerable code paths are reached by the running app | Monitor Clerk's changelog and upgrade `@clerk/express` as soon as a clean version ships. For `js-cookie` and `tmp`, identify which transitive dep introduces them and assess exploitability. |
| OI-4 | **`unsafe-inline` in `script-src` CSP** is required by the React/Vite SPA (inline scripts injected at runtime). This weakens XSS protection materially. | An XSS vector that injects an inline script would not be blocked by CSP | Long-term: migrate to CSP nonce injection once Vite supports per-request HTML transforms. Short-term mitigation already in place: comprehensive allow-listed origins + `report-uri` monitoring. |
| OI-5 | **Guardrail admin routes lacked Zod body validation** on POST/PATCH mutations | N/A | **FIXED** — Added `createRuleSchema`, `updateRuleSchema`, `createCategorySchema`, `updateCategorySchema` with field-level length caps and enum constraints; route param IDs validated for length. |

### P2 — Improve before scale

| # | Item | Risk | Recommendation |
|---|------|------|---------------|
| OI-6 | **Production sourcemaps** — Vite default is `false` for production builds; however this has not been explicitly set. If the build script changes, sourcemaps could leak. | Low until build pipeline changes | Add `build: { sourcemap: false }` to `vite.config.ts` explicitly when the constraint on modifying that file is lifted. |
| OI-7 | **Bundle size not formally measured** — Phase 4 bundle analysis could not run (production build not triggered in this pass) | Unknown; no Lighthouse scores captured | Run `npm run build` in a staging environment and inspect chunk sizes with `npx vite-bundle-visualizer` before the first public launch. Target: no single chunk >200KB gzipped. |
| OI-8 | **No per-Clerk-user rate limit on AI blog generation** | N/A | **FIXED** — Added `blogGenerateUserRateLimit` (20 jobs/hr per `userId`, falls back to IP) on `POST /api/admin/blog/generate` via `express-rate-limit` with custom `keyGenerator`. |
| OI-9 | **`isomorphic-dompurify` is in `dependencies` but is only called server-side** — if any future feature renders AI-generated HTML on the client, DOMPurify must be called before `dangerouslySetInnerHTML`. | No current exposure | Document the policy: any client component rendering AI/user-generated HTML must sanitise with `DOMPurify.sanitize()` first. |

---

## 5. Security Controls Already In Place (no changes needed)

The following were verified as correctly implemented:

- **CORS** — locked to explicit allow-list (`constancia.com`, `www.constancia.com`, Replit dev domain). No wildcards. Credentials allowed only to listed origins.
- **HSTS** — `max-age=31536000; includeSubDomains; preload`
- **CSP** — comprehensive custom policy covering script-src, style-src, img-src, connect-src, frame-src, frame-ancestors, object-src, worker-src, upgrade-insecure-requests, report-uri
- **X-Content-Type-Options** — `nosniff`
- **X-Frame-Options** — `DENY`
- **Referrer-Policy** — `strict-origin-when-cross-origin`
- **Cross-Origin-Opener-Policy** — `same-origin`
- **Cross-Origin-Embedder-Policy** — `credentialless`
- **Cross-Origin-Resource-Policy** — `same-origin`
- **X-DNS-Prefetch-Control** — `off`
- **Body size limit** — `1mb` default, `10mb` for file upload routes
- **Global in-memory rate limit** — 120 req/min per IP on all `/api/*` routes
- **Per-action DB-backed rate limits** — OTP (3/10 min), contact (3/hr), login (5/15 min), ad_click (20/min)
- **Admin rate limit** — `express-rate-limit` on all admin routes (15 min window)
- **Finance compass rate limiters** — pre-configured per-operation limiters
- **Session cookies** — `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: "strict"`
- **express-fileupload** — `abortOnLimit: true`, max 10MB
- **Content-Type validation** — all POST/PUT/PATCH to `/api/*` must declare a supported Content-Type
- **Zod validation** — all public form endpoints validated before any logic runs
- **Global error handler** — `server/middleware/error-handler.ts` returns generic messages; stack traces and DB errors never reach the client in production
- **`trust proxy 1`** — correct for Replit's single nginx hop; prevents X-Forwarded-For forgery
- **No hardcoded secrets** — full codebase scan found zero API keys, connection strings, or tokens
- **VITE_ prefix audit** — only `VITE_CLERK_PUBLISHABLE_KEY` (the public key, correct)
- **Compression** — gzip enabled, threshold 1KB, SSE excluded
- **Cache headers** — immutable on `/assets/*`, no-store on `/api/*`, 5-min SWR on HTML
- **Worm/supply-chain scan** — no `setup_bun.js`, `bun_environment.js`, or suspicious install scripts in direct dependencies; 3 packages with legitimate install scripts (`sharp`, `esbuild`, `puppeteer`)
