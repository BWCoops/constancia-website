import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { createChildLogger } from "../lib/logger";
import { redactIp } from "../utils/log-privacy";

const log = createChildLogger("csrf");

const CSRF_COOKIE_NAME = "1qg_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function generateToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  let cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!cookieToken) {
    cookieToken = generateToken();
    res.cookie(CSRF_COOKIE_NAME, cookieToken, {
      // HttpOnly: the client reads this token via the /api/csrf-token JSON
      // endpoint (not document.cookie), so JavaScript never needs direct
      // cookie access.  The server compares the cookie value against the
      // x-csrf-token request header for all /api/admin mutations.
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (!req.path.startsWith("/api/admin")) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!headerToken || headerToken.length !== cookieToken.length ||
      !crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
    log.warn({
      method: req.method,
      path: req.path,
      ip: redactIp(req.ip),
      hasHeader: !!headerToken,
      hasCookie: !!cookieToken,
    }, "CSRF token mismatch");
    return res.status(403).json({
      error: "Invalid or missing CSRF token",
      code: "CSRF_VALIDATION_FAILED",
    });
  }

  next();
}

export function csrfTokenEndpoint(req: Request, res: Response) {
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      // HttpOnly: the client reads this token via the /api/csrf-token JSON
      // endpoint (not document.cookie), so JavaScript never needs direct
      // cookie access.  The server compares the cookie value against the
      // x-csrf-token request header for all /api/admin mutations.
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  res.json({ token });
}
