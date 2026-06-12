/**
 * Clerk-based authentication for Constancia.
 *
 * Replaces the Passport/Replit OIDC flow with Clerk session validation.
 * Keeps the same export surface (`setupAuth`, `isAuthenticated`) so the
 * rest of the codebase (routes.ts, admin/routes.ts) doesn't need to change.
 *
 * Required environment variables:
 *  - CLERK_PUBLISHABLE_KEY       — exposed to client too (as VITE_*)
 *  - CLERK_SECRET_KEY            — server only
 *  - AUTHORIZED_ADMIN_EMAILS     — comma-separated allowlist (fallback when
 *                                  the DB whitelist is empty)
 */

import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express";
import pino from "pino";
import * as AdminSecurity from "./services/admin-security";
import { getSession } from "./session";

/**
 * Decode the Clerk frontend API hostname from a publishable key.
 * pk_test_<base64>$ / pk_live_<base64>$ → the hostname string.
 * Used for diagnostic logging only.
 */
function clerkFrontendHost(pubKey: string): string | null {
  try {
    const parts = pubKey.split("_");
    if (parts.length < 3) return null;
    return Buffer.from(parts[2], "base64").toString("utf-8").replace(/\$$/, "");
  } catch {
    return null;
  }
}

const authLog = pino({ name: "clerk-auth" });

function getAuthorizedEmailsFromEnv(): string[] {
  const emailsEnv = process.env.AUTHORIZED_ADMIN_EMAILS || "";
  return emailsEnv.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
}

async function isEmailAuthorized(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;

  // Database whitelist is the source of truth when populated
  const dbEmails = await AdminSecurity.getAuthorizedEmails();
  if (dbEmails.length > 0) {
    const ok = await AdminSecurity.isEmailInWhitelist(email);
    if (!ok) authLog.warn({ email }, "Email not in database whitelist");
    return ok;
  }

  // Empty DB → fall back to env var (bootstrap path)
  const envEmails = getAuthorizedEmailsFromEnv();
  if (envEmails.length > 0 && envEmails.includes(email.toLowerCase())) {
    authLog.info({ email }, "Using env var fallback (database whitelist empty)");
    return true;
  }

  authLog.warn({ email }, "Email not authorized");
  return false;
}

/**
 * Install Clerk middleware globally so every request has `req.auth` populated.
 * Routes that need auth check it via the `isAuthenticated` middleware below.
 */
export async function setupAuth(app: Express): Promise<void> {
  if (!process.env.CLERK_SECRET_KEY) {
    authLog.warn(
      "CLERK_SECRET_KEY is not set — Clerk auth disabled. " +
      "Admin routes will return 503 until the secret is added to Replit Secrets."
    );
    app.use(getSession());
    app.use(["/api/admin", "/api/auth"], (_req: Request, res: Response) => {
      res.status(503).json({ error: "auth_unavailable", message: "CLERK_SECRET_KEY not configured" });
    });
    return;
  }

  // Mirror CLERK_PUBLIC_KEY (Replit-managed name) → canonical names
  if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  }
  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    authLog.warn("CLERK_PUBLISHABLE_KEY not set — falling back to secret-only mode.");
  }

  // Log the frontend host for diagnostics (decoded from publishable key)
  const pubKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLIC_KEY || "";
  const frontendHost = clerkFrontendHost(pubKey);
  if (frontendHost) {
    authLog.info({ frontendHost }, "Clerk frontend API host");
  }

  app.use(getSession());

  // Apply clerkMiddleware ONLY to the API routes that actually need token
  // validation. Applying it globally causes server-side handshake redirects
  // for every page request (including public pages), which trips `host_invalid`
  // on Clerk's handshake endpoint when the workspace domain isn't yet registered
  // as a trusted origin. The /admin/login page uses the client-side <SignIn />
  // component exclusively — it doesn't need server Clerk middleware.
  const _clerkMw = clerkMiddleware();
  const clerkHandler = (req: Request, res: Response, next: NextFunction): void => {
    _clerkMw(req, res, (err?: unknown) => {
      if (err) {
        authLog.warn(
          { reason: (err as Error).message },
          "Clerk middleware error — clearing stale session cookies and continuing unauthenticated"
        );
        for (const name of [
          "__session",
          "__client_uat",
          "__client",
          "__clerk_db_jwt",
          "__clerk_active_org",
          "__clerk_handshake",
        ]) {
          res.clearCookie(name);
          res.clearCookie(name, { path: "/", sameSite: "strict", secure: true });
        }
        return next();
      }
      next();
    });
  };
  app.use(["/api/admin", "/api/auth"], clerkHandler);

  // Public config endpoint — client fetches publishable key + proxyUrl on
  // boot when VITE_CLERK_PUBLISHABLE_KEY isn't available at build time.
  app.get("/api/config/clerk", (_req: Request, res: Response) => {
    res.json({
      publishableKey:
        process.env.CLERK_PUBLISHABLE_KEY ||
        process.env.VITE_CLERK_PUBLISHABLE_KEY ||
        process.env.CLERK_PUBLIC_KEY ||
        null,
    });
  });

  // Diagnostic endpoint — confirms the server's Clerk wiring is OK and
  // surfaces the frontend API host so a stuck client knows what URL the
  // browser is trying (or failing) to load. Safe to expose publicly: no
  // secrets, only environment-derived hostnames.
  app.get("/api/health/clerk", async (_req: Request, res: Response) => {
    const pubKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "";
    let frontendHost: string | null = null;
    try {
      // Clerk pk_test_<host-base64> / pk_live_<host-base64>
      const body = pubKey.split("_").slice(2).join("_");
      if (body) frontendHost = Buffer.from(body, "base64").toString("utf-8").replace(/\$$/, "");
    } catch { /* ignore */ }
    let upstreamReachable: boolean | null = null;
    if (frontendHost) {
      try {
        const r = await fetch(`https://${frontendHost}/v1/environment`, { method: "HEAD" });
        upstreamReachable = r.status < 500;
      } catch { upstreamReachable = false; }
    }
    res.json({
      serverHasSecretKey: Boolean(process.env.CLERK_SECRET_KEY),
      serverHasPublishableKey: Boolean(process.env.CLERK_PUBLISHABLE_KEY),
      clientPublishableKeyVar: Boolean(process.env.VITE_CLERK_PUBLISHABLE_KEY),
      publishableKeyPreview: pubKey ? pubKey.slice(0, 10) + "…" + pubKey.slice(-4) : null,
      frontendHost,
      upstreamReachable,
      cspIncludesClerkOrigin: true, // we set this in server/index.ts; flip if you remove
      sessionMiddlewareInstalled: true,
    });
  });

  // Session probe endpoint — the admin client polls this on load.
  //
  // Possible response shapes (always HTTP 200 — clients should branch on
  // the `reason` field, not the status code):
  //   { authenticated: true,  user: {...} }
  //   { authenticated: false }                                no Clerk session
  //   { authenticated: false, reason: "email_not_authorized", email: "..." }
  //   { authenticated: false, reason: "clerk_fetch_failed" }  transient — retry
  //   { authenticated: false, reason: "session_expired" }     stale token
  app.get("/api/admin/auth/session", async (req: Request, res: Response) => {
    let auth;
    try {
      auth = getAuth(req);
    } catch (err) {
      authLog.warn({ err: (err as Error).message }, "getAuth threw (likely stale token)");
      return res.json({ authenticated: false, reason: "session_expired" });
    }

    const userId = auth?.userId;
    if (!userId) return res.json({ authenticated: false });

    try {
      const user = await clerkClient.users.getUser(userId);
      const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
        ?? user.emailAddresses[0]?.emailAddress
        ?? null;

      const allowed = await isEmailAuthorized(primaryEmail);
      if (!allowed) {
        return res.json({ authenticated: false, reason: "email_not_authorized", email: primaryEmail });
      }
      return res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: primaryEmail,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        },
      });
    } catch (err) {
      // Clerk API call failed (network / 5xx / rate-limited). Return 200 with
      // an informational reason so the client can retry without hitting an
      // error boundary. The user's auth state is unknown here, NOT "definitely
      // unauthenticated" — clients must NOT redirect on this response.
      authLog.error({ err }, "Failed to load Clerk user — clerk_fetch_failed (transient)");
      return res.json({ authenticated: false, reason: "clerk_fetch_failed" });
    }
  });

  // Legacy compatibility — old client code redirects to /api/login on un-auth.
  // Clerk handles sign-in via the React component, so just bounce to the admin
  // login page where the <SignIn /> component lives.
  app.get("/api/login", (_req, res) => res.redirect("/admin/login"));

  app.get("/api/logout", (_req, res) => {
    // Sign-out is handled client-side by Clerk's useClerk().signOut(); this
    // route just exists for parity with the old API surface.
    res.redirect("/admin/login");
  });

  // Legacy /api/auth/user — preserved for any consumer that still queries it.
  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "unauthenticated" });
    try {
      const user = await clerkClient.users.getUser(userId);
      const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ?? null;
      return res.json({ id: user.id, email, firstName: user.firstName, lastName: user.lastName });
    } catch (err) {
      authLog.error({ err }, "Failed /api/auth/user");
      return res.status(500).json({ error: "clerk_fetch_failed" });
    }
  });
}

/**
 * Middleware for any /api/admin/* route: requires a valid Clerk session AND
 * an email on the allowlist. Mirrors the contract of the old replitAuth's
 * isAuthenticated so call-sites don't need to change.
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    authLog.info("Request not authenticated — returning 401");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
      ?? user.emailAddresses[0]?.emailAddress
      ?? null;

    const allowed = await isEmailAuthorized(email);
    if (!allowed) {
      authLog.warn({ userId, email }, "Authenticated but email not in allowlist");
      return res.status(403).json({ message: "Forbidden", reason: "email_not_authorized" });
    }

    // Match the old shape: req.user.claims.{sub,email} is what downstream code reads.
    (req as any).user = {
      claims: {
        sub: userId,
        email,
        first_name: user.firstName,
        last_name: user.lastName,
      },
    };

    return next();
  } catch (err) {
    authLog.error({ err }, "Auth middleware failed");
    return res.status(500).json({ message: "auth_check_failed" });
  }
};
