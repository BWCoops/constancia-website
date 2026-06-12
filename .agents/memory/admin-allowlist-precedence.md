---
name: Admin authorization allowlist precedence
description: How admin login authorization is gated (DB whitelist vs env fallback) and the lockout failure mode when both are empty.
---

# Admin allowlist precedence (Clerk admin auth)

`isEmailAuthorized()` (server/clerkAuth.ts) decides admin access AFTER a valid
Clerk session, by checking the authorized-email allowlist in this order:

1. **DB table `admin_authorized_emails`** is the source of truth *when it has ≥1
   active row* (`getAuthorizedEmails()` / `isEmailInWhitelist()`).
2. **`AUTHORIZED_ADMIN_EMAILS` env var** (comma-separated) is consulted *only when
   the DB table is empty* — the bootstrap path.
3. If both are empty → every authenticated admin gets HTTP 403
   `email_not_authorized` and is bounced out. Total lockout.

**Why this matters:** Production admin login broke because the prod
`admin_authorized_emails` table was empty AND `AUTHORIZED_ADMIN_EMAILS` was unset,
so no email could authorize regardless of spelling. Dev was unaffected because its
DB whitelist was populated. Dev and prod use **separate databases**, so this table
can differ between them — always check the *production* DB for prod login issues.

**How to apply / gotchas:**
- Bootstrap prod access by setting `AUTHORIZED_ADMIN_EMAILS` in the **production**
  env scope, then **republish** (deployment picks up env changes only on redeploy).
- Precedence trap: adding even ONE row to `admin_authorized_emails` (via the admin
  UI) flips the source of truth to the DB and the env fallback is *ignored* — that
  can re-lock anyone not in the DB. So either rely solely on the env var, or put
  *all* admin emails in the DB table. Don't mix half-and-half.
- Emails are lowercased + trimmed by the code, so case/whitespace are safe.
- Platform tooling can set env vars but NOT secrets; `AUTHORIZED_ADMIN_EMAILS` is a
  plain env var, so it can be set directly via setEnvVars.
