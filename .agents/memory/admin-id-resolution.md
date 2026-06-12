---
name: Admin id resolution for audit logging
description: The two admin-id helpers in server/admin/routes.ts and how admin_users rows get created
---

# Admin id resolution (admin_users) for audit logging

There is no login hook that inserts into `admin_users`. Rows are provisioned
lazily by `getAdminIdFromDb(req)` in `server/admin/routes.ts` on the first
privileged action, from the (already `isAuthenticated`-gated) Clerk claims.

Two helpers exist and are NOT interchangeable:
- `getAdminId(req)` → returns the raw Clerk `claims.sub` string (or "unknown").
- `getAdminIdFromDb(req)` → returns the internal `admin_users.id` UUID,
  provisioning the row (insert .onConflictDoUpdate on `replit_id`, plus a
  unique-email recovery path) if it doesn't exist yet.

**Why:** Security/MFA/IP-allowlist/authorized-email handlers and `auditLog`
expect the internal UUID. Before lazy provisioning existed, an empty
`admin_users` table made `getAdminIdFromDb` throw "Admin user not found",
returning 400 on every `/api/admin/security/*` mutation (e.g. deleting an
authorized email).

**How to apply:** Any new admin handler that needs an id for audit logging or
to satisfy an admin FK must call `getAdminIdFromDb` (resolves + provisions),
never `getAdminId`. `admin_users.email` and `replit_id` are both unique — keep
the email-conflict recovery branch when touching this function.
