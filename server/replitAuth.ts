import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import pg, { type Pool as PoolType } from "pg";
import { db } from "./db";
import { adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as AdminSecurity from "./services/admin-security";
import { createChildLogger } from "./lib/logger";

const authLog = createChildLogger("auth");

const { Pool } = pg;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Create a dedicated pool for session store with robust connection handling
let sessionPool: PoolType | null = null;

function getSessionPool(): PoolType {
  if (!sessionPool) {
    sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Limit connections for session store
      min: 1, // Keep at least 1 connection alive
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
    });

    // Handle pool errors gracefully
    sessionPool.on('error', (err: Error) => {
      authLog.error({ err }, "Session pool idle client error");
    });

    sessionPool.on('connect', () => {
      authLog.info("Session pool client connected");
    });
  }
  return sessionPool;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pool = getSessionPool();
  
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool, // Use shared pool instead of connection string
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
    disableTouch: false, // Enable touch to keep sessions alive
    errorLog: (error: Error) => {
      authLog.error({ err: error }, "Session store database error");
    },
  });
  
  // Handle session store errors gracefully
  sessionStore.on('error', (error: Error) => {
    authLog.error({ err: error }, "Session store connection error");
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'constancia_admin_session',
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

function getAuthorizedEmailsFromEnv(): string[] {
  const emailsEnv = process.env.AUTHORIZED_ADMIN_EMAILS || "";
  return emailsEnv.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
}

async function isEmailAuthorized(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  
  // Check if database whitelist has any entries (making it the source of truth)
  const dbEmails = await AdminSecurity.getAuthorizedEmails();
  
  if (dbEmails.length > 0) {
    // Database is the source of truth - only check database
    const isInDbWhitelist = await AdminSecurity.isEmailInWhitelist(email);
    if (!isInDbWhitelist) {
      authLog.warn({ email }, "Email not in database whitelist");
    }
    return isInDbWhitelist;
  }
  
  // Database whitelist is empty - fall back to environment variable (bootstrap mode)
  const envEmails = getAuthorizedEmailsFromEnv();
  if (envEmails.length > 0 && envEmails.includes(email.toLowerCase())) {
    authLog.info({ email }, "Using env var fallback (database whitelist empty)");
    return true;
  }
  
  authLog.warn({ email }, "Email not authorized (no db entries, not in env var)");
  return false;
}

async function checkUserAuthorization(claims: any): Promise<{ authorized: boolean; existingUser: any | null; email: string | null }> {
  const replitId = claims["sub"];
  const email = claims["email"];
  
  const existingByReplitId = await db.select().from(adminUsers).where(eq(adminUsers.replitId, replitId)).limit(1);
  if (existingByReplitId[0]) {
    return { authorized: true, existingUser: existingByReplitId[0], email };
  }
  
  if (email) {
    const existingByEmail = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (existingByEmail[0]) {
      return { authorized: true, existingUser: existingByEmail[0], email };
    }
  }
  
  const isAuthorized = await isEmailAuthorized(email);
  return { authorized: isAuthorized, existingUser: null, email };
}

async function upsertAdminUser(claims: any) {
  const replitId = claims["sub"];
  const email = claims["email"];
  const firstName = claims["first_name"];
  const lastName = claims["last_name"];
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email || `User ${replitId}`;
  const profileImageUrl = claims["profile_image_url"];

  const existingByReplitId = await db.select().from(adminUsers).where(eq(adminUsers.replitId, replitId)).limit(1);
  
  if (existingByReplitId[0]) {
    await db.update(adminUsers)
      .set({
        email,
        displayName,
        profileImageUrl,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existingByReplitId[0].id));
    return existingByReplitId[0];
  }
  
  if (email) {
    const existingByEmail = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    if (existingByEmail[0]) {
      await db.update(adminUsers)
        .set({
          replitId,
          displayName,
          profileImageUrl,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, existingByEmail[0].id));
      return existingByEmail[0];
    }
  }
  
  const [newUser] = await db.insert(adminUsers).values({
    replitId,
    email,
    displayName,
    profileImageUrl,
    role: "admin",
    isActive: true,
  }).returning();
  return newUser;
}

function getIpAddress(req: any): string {
  return req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
}

function getUserAgent(req: any): string {
  return req.headers['user-agent'] || 'Unknown';
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser(async (user: any, cb) => {
    try {
      // Load dbUser from database if we have claims
      if (user?.claims?.sub) {
        const [dbUser] = await db.select().from(adminUsers).where(eq(adminUsers.replitId, user.claims.sub)).limit(1);
        if (dbUser) {
          user.dbUser = {
            id: dbUser.id,
            role: dbUser.role,
            email: dbUser.email,
            displayName: dbUser.displayName,
          };
        }
      }
      cb(null, user);
    } catch (error) {
      authLog.error({ err: error }, "Failed to load dbUser in deserialize");
      cb(null, user);
    }
  });

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any, info: any) => {
      if (err) {
        authLog.error("Auth callback error");
        return res.redirect("/api/login");
      }
      
      if (!user) {
        authLog.error("Authentication failed");
        return res.redirect("/api/login");
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          authLog.error("Login error");
          return res.redirect("/api/login");
        }

        try {
          const claims = user.claims;
          const ipAddress = getIpAddress(req);
          const userAgent = getUserAgent(req);
          
          const authCheck = await checkUserAuthorization(claims);
          if (!authCheck.authorized) {
            authLog.warn({ email: authCheck.email || "unknown", ip: ipAddress }, "Unauthorized access attempt");
            req.logout(() => {});
            return res.redirect('/admin/access-denied');
          }
          
          const adminUser = await upsertAdminUser(claims);

          const isIpAllowed = await AdminSecurity.checkIpAllowed(ipAddress);
          if (!isIpAllowed) {
            (req.session as any).pendingAuth = { 
              adminId: adminUser.id, 
              claims,
              ipAddress,
              userAgent
            };
            return res.redirect('/admin/security/ip-blocked?returnTo=/admin');
          }

          const mfaSettings = await AdminSecurity.getMfaSettings(adminUser.id);
          if (adminUser.mfaEnabled && mfaSettings?.totpEnabled) {
            (req.session as any).pendingMfa = { 
              adminId: adminUser.id, 
              claims,
              ipAddress, 
              userAgent 
            };
            return res.redirect('/admin/security/mfa-verify?returnTo=/admin');
          }

          await AdminSecurity.recordLoginAttempt(
            adminUser.id, 
            ipAddress, 
            userAgent, 
            'standard', 
            true
          );
          
          await AdminSecurity.sendLoginNotification(
            adminUser.id, 
            adminUser.email || '', 
            adminUser.displayName || '', 
            ipAddress, 
            userAgent, 
            'Standard Login'
          );

          return res.redirect("/admin");
        } catch (securityError) {
          authLog.error({ err: securityError }, "Security check error");
          return res.redirect("/admin");
        }
      });
    })(req, res, next);
  });

  app.post("/api/admin/security/verify-emergency-access", async (req: any, res) => {
    try {
      const { token } = req.body;
      const pendingAuth = (req.session as any).pendingAuth;

      if (!pendingAuth) {
        return res.status(400).json({ error: "No pending authentication" });
      }

      const ipAddress = getIpAddress(req);
      const userAgent = getUserAgent(req);

      const result = await AdminSecurity.validateEmergencyToken(token, pendingAuth.adminId);

      if (!result.valid) {
        await AdminSecurity.recordLoginAttempt(
          pendingAuth.adminId,
          ipAddress,
          userAgent,
          'emergency_token',
          false,
          'Invalid or expired emergency access token'
        );
        return res.status(401).json({ error: "Invalid or expired emergency access token" });
      }

      const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, pendingAuth.adminId)).limit(1);

      if (adminUser?.mfaEnabled) {
        const mfaSettings = await AdminSecurity.getMfaSettings(pendingAuth.adminId);
        if (mfaSettings?.totpEnabled) {
          (req.session as any).pendingMfa = {
            adminId: pendingAuth.adminId,
            claims: pendingAuth.claims,
            ipAddress,
            userAgent,
            bypassCodeId: result.tokenId,
          };
          delete (req.session as any).pendingAuth;
          return res.json({ success: true, redirect: '/admin/security/mfa-verify?returnTo=/admin' });
        }
      }

      await AdminSecurity.recordLoginAttempt(
        pendingAuth.adminId,
        ipAddress,
        userAgent,
        'emergency_token',
        true,
        undefined,
        result.tokenId
      );

      await AdminSecurity.sendLoginNotification(
        pendingAuth.adminId,
        adminUser?.email || '',
        adminUser?.displayName || '',
        ipAddress,
        userAgent,
        'Emergency Access Token Login'
      );

      delete (req.session as any).pendingAuth;
      authLog.warn({ adminId: pendingAuth.adminId, ipAddress, tokenId: result.tokenId }, "Emergency access token used for admin login");
      res.json({ success: true, redirect: '/admin' });
    } catch (error: any) {
      authLog.error({ err: error }, "Emergency access token verification error");
      res.status(500).json({ error: "Failed to verify emergency access token" });
    }
  });

  app.post("/api/admin/security/verify-mfa", async (req: any, res) => {
    try {
      const { token, isBackupCode } = req.body;
      const pendingMfa = (req.session as any).pendingMfa;
      
      if (!pendingMfa) {
        return res.status(400).json({ error: "No pending MFA verification" });
      }
      
      let valid = false;
      
      if (isBackupCode) {
        valid = await AdminSecurity.verifyBackupCode(pendingMfa.adminId, token);
      } else {
        valid = await AdminSecurity.verifyTotpLogin(pendingMfa.adminId, token);
      }
      
      if (!valid) {
        await AdminSecurity.recordLoginAttempt(
          pendingMfa.adminId, 
          pendingMfa.ipAddress, 
          pendingMfa.userAgent, 
          'mfa', 
          false, 
          'Invalid MFA code'
        );
        return res.status(401).json({ error: "Invalid MFA code" });
      }
      
      const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, pendingMfa.adminId)).limit(1);
      
      await AdminSecurity.recordLoginAttempt(
        pendingMfa.adminId, 
        pendingMfa.ipAddress, 
        pendingMfa.userAgent, 
        'mfa', 
        true,
        undefined,
        pendingMfa.bypassCodeId
      );
      
      await AdminSecurity.sendLoginNotification(
        pendingMfa.adminId, 
        adminUser?.email || '', 
        adminUser?.displayName || '', 
        pendingMfa.ipAddress, 
        pendingMfa.userAgent, 
        isBackupCode ? 'MFA Login (Backup Code)' : 'MFA Login'
      );
      
      delete (req.session as any).pendingMfa;
      res.json({ success: true, redirect: '/admin' });
    } catch (error: any) {
      authLog.error({ err: error }, "MFA verification error");
      res.status(500).json({ error: "Failed to verify MFA" });
    }
  });

  app.get("/api/admin/security/pending-status", (req: any, res) => {
    const pendingAuth = (req.session as any).pendingAuth;
    const pendingMfa = (req.session as any).pendingMfa;
    
    res.json({
      hasPendingAuth: !!pendingAuth,
      hasPendingMfa: !!pendingMfa,
    });
  });

  app.get("/api/logout", (req, res) => {
    delete (req.session as any).pendingAuth;
    delete (req.session as any).pendingMfa;
    
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const replitId = req.user.claims.sub;
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.replitId, replitId)).limit(1);
      res.json(user);
    } catch (error) {
      authLog.error({ err: error }, "Error fetching user");
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated || typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
    authLog.info("Request not authenticated - returning 401");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // If no expires_at (legacy session), try to refresh or allow through if authenticated
  if (!user?.expires_at) {
    authLog.info("No expires_at found, handling legacy session");
    const refreshToken = user?.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        authLog.info("Legacy session refreshed successfully");
        return next();
      } catch (error) {
        // Refresh failed but user is authenticated - allow through for legacy sessions
        authLog.info("Legacy session refresh failed, allowing authenticated user");
        return next();
      }
    }
    // No refresh token but authenticated - allow through for legacy sessions
    authLog.info("No refresh token but authenticated, allowing through");
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const sessionActivityMiddleware: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (req.isAuthenticated() && user?.claims?.sub) {
    try {
      const replitId = user.claims.sub;
      const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.replitId, replitId)).limit(1);
      
      if (adminUser) {
        await AdminSecurity.updateLastActivity(adminUser.id);
      }
    } catch (error) {
      authLog.error({ err: error }, "Session activity tracking error");
    }
  }
  
  next();
};
