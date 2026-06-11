---
name: FC Clerk rewire pattern
description: Two-phase effect pattern for FinanceCompassLanding step transitions after switching from OTP to Clerk Google OAuth
---

# FC Login — Clerk Google OAuth pattern

Two effects in `FinanceCompassLanding.tsx` handle step transitions:

**Effect 1** (session check, fires once on mount):
- `fetch("/api/finance-compass/public/session")` with credentials
- If `data.verified && data.contactId`: set step "verified", store session
- `finally { setFcChecked(true) }` — always sets the gate

**Effect 2** (Clerk gate, deps: `[fcChecked, isClerkLoaded, isSignedIn]`):
- Guards on both `fcChecked` AND `isClerkLoaded`
- Guards if step is already "verified" or "qualifying"
- If signed in: calls `handleClerkQualify()` (POSTs to `/api/finance-compass/public/qualify-clerk`)
- If not signed in: `setStep("sign-in")` → shows "Continue with Google" button

**Backend:** `POST /api/finance-compass/public/qualify-clerk` (in `server/finance-compass/public-routes.ts` line 709)
- Uses `getAuth(req)` from `@clerk/express` to get userId
- Fetches user from `clerkClient.users.getUser(userId)`
- Creates or finds FC contact by email
- Sets `req.session.fcVerified` and session expiry
- Returns `{ success: true, data: { contactId, email, firstName, lastName, expiresAt } }`

**Why:** The old flow used email OTP (send email, verify 6-digit code). The new flow delegates identity to Clerk, which handles Google OAuth. The backend still owns the FC session (independent of Clerk session).
