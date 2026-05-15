/**
 * Clerk auth middleware for the Constancia API.
 * ─────────────────────────────────────────────────────────────────
 * Defensive import: if @clerk/express isn't installed yet OR the env
 * vars throw at module load, the server still boots — Clerk middleware
 * just becomes a no-op and routes fall back to legacy auth.
 *
 * Required env (when enabling Clerk):
 *   CLERK_SECRET_KEY        — sk_live_… or sk_test_…
 *   CLERK_PUBLISHABLE_KEY   — pk_live_… or pk_test_…
 *
 * Usage:
 *   import { clerkSessionMiddleware, requireAdminOrFallback } from './middleware/clerk-auth';
 *   app.use(clerkSessionMiddleware);                          // mount once
 *   router.use(requireAdminOrFallback(legacyMiddleware));     // per-router
 *
 * Admin role: set publicMetadata.role = 'admin' in Clerk dashboard.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

export const CLERK_ENABLED = Boolean(process.env.CLERK_SECRET_KEY);

// ── Defensive load of @clerk/express ──────────────────────────────
// This runs at module load. If the package is missing or its top-level
// initialisation throws, we fall back to no-op handlers and log once.
type ClerkModule = typeof import('@clerk/express');
let clerk: ClerkModule | null = null;
let clerkLoadError: string | null = null;

if (CLERK_ENABLED) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clerk = require('@clerk/express') as ClerkModule;
  } catch (err) {
    clerkLoadError = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn('[clerk-auth] CLERK_SECRET_KEY set but @clerk/express failed to load:', clerkLoadError);
  }
}

const isClerkActive = CLERK_ENABLED && clerk !== null;

const noopMiddleware: RequestHandler = (_req, _res, next) => next();

/**
 * Mount once near the top of the express app — runs on every request,
 * resolves Clerk session if any but does NOT enforce auth.
 */
export const clerkSessionMiddleware: RequestHandler = isClerkActive && clerk
  ? clerk.clerkMiddleware()
  : noopMiddleware;

/**
 * Require any signed-in Clerk user. 401 if not authenticated.
 */
export const requireAuth: RequestHandler = isClerkActive && clerk
  ? clerk.requireAuth({ signInUrl: '/sign-in' })
  : ((_req, res, _next) => {
      res.status(503).json({ error: 'Authentication is not configured (CLERK_SECRET_KEY missing or Clerk failed to load).' });
    });

/**
 * Require a Clerk user whose publicMetadata.role === 'admin'.
 * 403 if signed in but not admin; 401 if not signed in at all.
 */
export const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (!isClerkActive || !clerk) {
    res.status(503).json({ error: 'Admin authentication is not configured (Clerk unavailable).' });
    return;
  }
  const auth = clerk.getAuth(req);
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
  if (!isClerkActive || !clerk) return null;
  return clerk.getAuth(req).userId ?? null;
}

/**
 * Adapter for the migration period:
 *   - If Clerk is configured + loaded: use Clerk's requireAdmin
 *   - Else: fall through to the legacy auth middleware
 */
export function requireAdminOrFallback(legacy: RequestHandler): RequestHandler {
  return (req, res, next) => {
    if (isClerkActive) {
      return requireAdmin(req, res, next);
    }
    return legacy(req, res, next);
  };
}

export function requireAuthOrFallback(legacy: RequestHandler): RequestHandler {
  return (req, res, next) => {
    if (isClerkActive) {
      return requireAuth(req, res, next);
    }
    return legacy(req, res, next);
  };
}
