/**
 * Clerk auth middleware for the Constancia API.
 *
 * Replaces:
 *   ✗ server/replitAuth.ts (Replit OIDC + Passport)
 *   ✗ server/services/admin-security.ts (email + password + TOTP)
 *   ✗ server/finance-compass/otp-service.ts (email-OTP gating)
 *
 * Required env:
 *   CLERK_SECRET_KEY        — sk_live_… or sk_test_…
 *   CLERK_PUBLISHABLE_KEY   — pk_live_… or pk_test_… (mirrors VITE_ for SSR)
 *
 * Usage:
 *   import { requireAuth, requireAdmin } from './middleware/clerk-auth';
 *   app.get('/api/me',           requireAuth,  handler);
 *   app.get('/api/admin/whoami', requireAdmin, handler);
 *
 * Admin role: set publicMetadata.role = 'admin' in the Clerk dashboard.
 */

import { clerkMiddleware, getAuth, requireAuth as clerkRequireAuth } from '@clerk/express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export const CLERK_ENABLED = Boolean(process.env.CLERK_SECRET_KEY);

/**
 * Mount once near the top of the express app — runs on every request,
 * resolves Clerk session if any but does NOT enforce auth.
 */
export const clerkSessionMiddleware: RequestHandler = CLERK_ENABLED
  ? clerkMiddleware()
  : ((_req, _res, next) => next());

/**
 * Require any signed-in Clerk user. 401 if not authenticated.
 * Use for FinanceCompass-protected endpoints (downloads, assessments, etc).
 */
export const requireAuth: RequestHandler = CLERK_ENABLED
  ? clerkRequireAuth({ signInUrl: '/sign-in' })
  : ((_req, res, _next) => {
      res.status(503).json({ error: 'Authentication is not configured (CLERK_SECRET_KEY missing).' });
    });

/**
 * Require a Clerk user whose publicMetadata.role === 'admin'.
 * 403 if signed in but not admin; 401 if not signed in at all.
 */
export const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!CLERK_ENABLED) {
    res.status(503).json({ error: 'Admin authentication is not configured (CLERK_SECRET_KEY missing).' });
    return;
  }
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const role = (auth.sessionClaims?.metadata as { role?: string } | undefined)?.role
            ?? (auth.sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
};

/**
 * Helper: get the signed-in user's ID, or null. No throw.
 */
export function getUserId(req: Request): string | null {
  if (!CLERK_ENABLED) return null;
  return getAuth(req).userId ?? null;
}
