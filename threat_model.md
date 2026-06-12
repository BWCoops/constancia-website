# Threat Model

## Project Overview

Constancia is a public-facing marketing site and lead-generation platform with a FinanceCompass assessment product. The stack is a React/Vite SPA served by an Express/TypeScript backend with PostgreSQL via Drizzle, Clerk-backed admin authentication, OTP-gated public flows for resource downloads and contact verification, and multiple external services including OpenAI, HubSpot, Microsoft Graph email delivery, Adobe PDF services, and SlidesSpeak.

This deployment is public on the internet. Production analysis should therefore prioritize unauthenticated endpoints, OTP/session gating, admin authorization, data exports, and server-side calls to third-party APIs. Dev-only routes and scripts are out of scope unless there is evidence they are reachable in production.

## Assets

- **Admin accounts and sessions** — Clerk sessions, allowlisted admin emails, MFA secrets, backup codes, and IP allowlist state. Compromise grants access to leads, content, analytics, and system configuration.
- **Lead and contact data** — names, business emails, company, job title, IP-derived metadata, verification state, downloads, and contact submissions. This is business-sensitive personal data.
- **FinanceCompass assessment data** — company profile details, responses, scores, generated reports, chatbot conversations, and related contact/company records.
- **Application secrets and service credentials** — database URL, Clerk secret, encryption/session secrets, HubSpot token, email provider credentials, OpenAI credentials, Adobe PDF credentials, SlidesSpeak credentials.
- **Content and export surfaces** — blog content, resource files, generated PDFs, analytics exports, GDPR exports, and admin-managed AI prompt/knowledge-base content.

## Trust Boundaries

- **Browser to Express API** — all client input is untrusted, including public pages, resource-download flows, chatbot messages, analytics events, and admin SPA requests.
- **Public to OTP/session-gated flows** — resource downloads, contact verification, and FinanceCompass public flows depend on temporary codes, cookies, or opaque identifiers and must enforce server-side possession checks.
- **Authenticated admin to privileged operations** — `/api/admin/*` and FinanceCompass admin endpoints must require both authentication and correct authorization/RBAC on every request.
- **Express to PostgreSQL** — application code has broad read/write access to business and personal data; broken access control or injection at the API layer becomes direct data compromise.
- **Express to third-party APIs** — server-side calls to OpenAI, HubSpot, Microsoft Graph, Adobe PDF, SlidesSpeak, and Turnstile cross a boundary where outbound requests, credentials, and returned data must be tightly controlled.
- **Production vs dev-only code** — scripts, tests, and explicitly dev-only routes are not production findings unless routing or build configuration makes them reachable in deployed code.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, `client/src/main.tsx`, `client/src/App.tsx`
- **Highest-risk code areas:** `server/admin/routes.ts`, `server/clerkAuth.ts`, `server/api/routes/resources.routes.ts`, `server/api/routes/contact.routes.ts`, `server/finance-compass/public-routes.ts`, `server/finance-compass/chatbot/routes.ts`, `server/finance-compass/admin-routes.ts`, `server/routes/analytics.ts`, `server/api/routes/comparison-export.routes.ts`
- **Public surfaces:** `/api/contact/*`, resource listing/download APIs, `/api/finance-compass/public/*`, `/api/finance-compass/public/chatbot/*`, comparison export, analytics collection endpoints, analytics configuration endpoints
- **Authenticated/admin surfaces:** `/api/admin/*`, `/api/admin/finance-compass/*`, feature-flag and security-management endpoints
- **Usually dev-only:** `server/scripts/*`, `server/**/__tests__/*`, `server/finance-compass/dev-routes.ts`

## Threat Categories

### Spoofing

The application relies on Clerk for admin identity and OTP/session mechanisms for public gated flows. The system must verify admin sessions server-side on every privileged route, must never trust client-declared user or role state, and must ensure OTP/session identifiers cannot be replayed or substituted to impersonate another lead, contact, or assessment user.

### Tampering

Public APIs accept rich user-controlled payloads for contact capture, assessment inputs, chatbot messages, analytics, and export generation. The system must validate structure and bounds on all inputs and must never let client-supplied identifiers, prices/scores, file names, or report content alter protected records or file access outside intended scope.

### Information Disclosure

This codebase stores and processes lead/contact PII, assessment responses, analytics, and generated reports. Public and low-privilege callers must not be able to enumerate or retrieve other users' data through guessed identifiers, export endpoints, chatbot session handles, verbose errors, or mis-scoped admin routes. Secrets and sensitive fields must not appear in logs or client-visible responses.

### Denial of Service

Several public endpoints trigger expensive work: OTP delivery, AI analysis, chatbot streaming, PDF/report generation, and third-party API calls. The system must apply effective rate limits and request bounds to these endpoints so unauthenticated users cannot exhaust compute, email quotas, or third-party credits.

### Elevation of Privilege

The main privilege boundary is between the public site, OTP-gated product flows, authenticated admins, and FinanceCompass RBAC roles. Every admin and data-export endpoint must enforce server-side authorization. Public assessment/chatbot/resource flows must not accept opaque IDs or session handles that let one user gain access to another user's data or to privileged operations.