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
    throw new Error(
      "CLERK_SECRET_KEY is not set. Add it to your environment (Replit Secrets / .env) before starting the server."
    );
  }

  // Replit-friendly: if only VITE_CLERK_PUBLISHABLE_KEY is set, mirror it
  // into CLERK_PUBLISHABLE_KEY so @clerk/express picks it up automatically.
  if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  }

  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    authLog.warn("CLERK_PUBLISHABLE_KEY not set — falling back to secret-only mode (still works, but recommended to set both).");
  }

  // Session middleware — needed by FinanceCompass OTP flow and any other
  // route that reads req.session.* directly. Independent of Clerk.
  app.use(getSession());

  // Wrap clerkMiddleware so a stale / mismatched session cookie (e.g. left
  // over from a previous Clerk instance, or after the publishable key
  // rotated) clears the bad cookie and continues unauthenticated instead
  // of crashing the request with a 500.
  const _clerkMw = clerkMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => {
    _clerkMw(req, res, (err?: unknown) => {
      if (err) {
        authLog.warn(
          { reason: (err as Error).message },
          "Clerk middleware error — clearing stale session cookies and continuing unauthenticated"
        );
        res.clearCookie("__session");
        res.clearCookie("__client_uat");
        return next();
      }
      next();
    });
  });

  // Session probe endpoint — the admin client polls this on load.
  app.get("/api/admin/auth/session", async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
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
      authLog.error({ err }, "Failed to load Clerk user");
      return res.status(500).json({ authenticated: false, reason: "clerk_fetch_failed" });
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
