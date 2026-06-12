---
name: Clerk Express middleware scope
description: Why clerkMiddleware must NOT be applied globally in @clerk/express v2.x
---

## Rule
Apply `clerkMiddleware()` only to the API routes that need token validation (`/api/admin`, `/api/auth`). **Never** mount it as a global `app.use()`.

## Why
In `@clerk/express` v2.x, `clerkMiddleware` performs server-side handshake redirects (307 to `accounts.dev/v1/client/handshake`) for any page request that has a stale `__client_uat` cookie but no valid `__session` cookie. When mounted globally, this breaks every page on the site — including public routes — because Clerk's accounts.dev returns `host_invalid` if the workspace domain isn't registered as a trusted origin in the Clerk dashboard.

## How to apply
```typescript
// GOOD: scoped to protected API routes only
app.use(["/api/admin", "/api/auth"], clerkHandler);

// BAD: breaks all public pages with host_invalid redirects
app.use(clerkHandler);
```

The `/admin/login` page uses the client-side `<SignIn />` component which manages its own auth flow — it does NOT need the server middleware.

## Keys
- `CLERK_PUBLIC_KEY` → aliased via `env-bootstrap.ts` to `CLERK_PUBLISHABLE_KEY` (what `@clerk/express` reads)
- Both are read before any modules import Clerk because `env-bootstrap` is imported as a side-effect at the top of `server/index.ts`

## Remaining known gap
If mobile Safari blocks third-party cookies from `accounts.dev`, a Clerk proxy is needed. The proxy URL must be registered in the Clerk dashboard (`dashboard.clerk.com`) under "Trusted Origins" before it can be used — otherwise `host_invalid` recurs. User action required for this step.
