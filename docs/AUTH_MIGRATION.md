# Auth migration — Replit OIDC + OTP + custom admin → Clerk

**Status:** scaffolding in place. Old code paths still wired; switch over file-by-file as listed.

## What Clerk now owns

| Surface | Clerk component / route |
|---|---|
| FC user sign-in  | `/sign-in` (`<SignIn />`) |
| FC user sign-up  | `/sign-up` (`<SignUp />`) |
| Admin sign-in    | `/admin/sign-in` (`<SignIn />` + role gate) |
| Session source   | Clerk session cookie (`__session`) |
| MFA              | Clerk-managed (TOTP, SMS, passkey, social) |
| Admin role check | `publicMetadata.role === 'admin'` (set in Clerk dashboard) |

## Files to delete after the cutover lands

- `server/replitAuth.ts` — Replit OIDC strategy (Passport)
- `server/services/admin-security.ts` — email + password + TOTP
- `server/finance-compass/otp-service.ts` — email-OTP gate
- `client/src/pages/admin/AdminLogin.tsx` — custom admin login UI
- `client/src/pages/admin/AdminSecurity.tsx` — TOTP enrolment UI
- `client/src/pages/admin/AdminSecurityMfaVerify.tsx` — MFA challenge UI
- All `/api/auth/*`, `/api/otp/*`, `/api/admin/security/*` routes (audit `server/routes.ts`)

## Files to migrate (replace old middleware with Clerk)

Search for `isAuthenticated` (Replit Passport middleware) and replace with `requireAuth` from `server/middleware/clerk-auth.ts`. Same for admin gates: replace any `requireAdminAuth` / TOTP check with `requireAdmin`.

```
git grep -nE 'isAuthenticated|requireAdminAuth|verifyOtp' server/
```

Replace pattern (Express):

```ts
// before
import { isAuthenticated } from './replitAuth';
app.get('/api/me', isAuthenticated, handler);

// after
import { requireAuth } from './middleware/clerk-auth';
app.get('/api/me', requireAuth, handler);
```

For admin:
```ts
// before
import { requireAdminAuth, requireMfa } from './services/admin-security';
app.get('/api/admin/leads', requireAdminAuth, requireMfa, handler);

// after
import { requireAdmin } from './middleware/clerk-auth';
app.get('/api/admin/leads', requireAdmin, handler);
```

## Env vars to add

```
# .env (server)
CLERK_SECRET_KEY=sk_test_…
CLERK_PUBLISHABLE_KEY=pk_test_…  # mirrors VITE_ for SSR

# .env (client)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…
```

## Env vars to remove after cutover

```
REPL_ID
ISSUER_URL
SESSION_SECRET            (Clerk manages session)
AUTHORIZED_ADMIN_EMAILS   (admin role lives in Clerk publicMetadata)
```

## Mounting order in `server/index.ts`

`clerkSessionMiddleware` MUST run BEFORE any route that uses `requireAuth` / `requireAdmin` / `getUserId`. Recommended order:

```ts
import { clerkSessionMiddleware } from './middleware/clerk-auth';

app.use(helmet(...));
app.use(compression());
app.use(cookieParser());
app.use(clerkSessionMiddleware);   // ← here
// app.use(passport.initialize());  ← REMOVE
// app.use(passport.session());      ← REMOVE
// ... routes
```

## OTP-gated FC downloads → Clerk-gated downloads

Old flow: user submits email + first/last name + company + job → server emails OTP → user enters OTP → server signs cookie → download allowed.

New flow: user signs up via Clerk (any provider — Google, email, magic link) → Clerk session active → server checks `requireAuth` on download endpoint. The lead capture (firstName, lastName, company, jobTitle, email) is now Clerk's `unsafeMetadata` collected during sign-up via custom fields, OR captured server-side from `auth.user` after first auth.

## Clerk-related lead-data shape

```ts
// server-side after requireAuth
import { clerkClient } from '@clerk/express';
const user = await clerkClient.users.getUser(auth.userId);
const lead = {
  email:     user.emailAddresses[0]?.emailAddress,
  firstName: user.firstName,
  lastName:  user.lastName,
  company:   user.unsafeMetadata?.company  as string | undefined,
  jobTitle:  user.unsafeMetadata?.jobTitle as string | undefined,
  clerkId:   user.id,
};
```
