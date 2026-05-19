import { Request, Response, NextFunction } from "express";
import { getPool } from "../db-pool";
import * as crypto from "crypto";
import { sanitizeInput } from "@shared/utils";
import { createChildLogger } from "../lib/logger";

const pool = getPool();
const secLog = createChildLogger("security");

const RATE_LIMITS = {
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  otp: { limit: 3, windowMs: 10 * 60 * 1000 }, // 3 OTP requests per 10 minutes
  hubspot: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 syncs per hour
  login: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 login attempts per 15 minutes
  contact: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 contact forms per hour
  ad_click: { limit: 20, windowMs: 60 * 1000 }, // 20 ad clicks per minute per IP
} as const;

const MAX_LEAD_ATTEMPTS = 10;
const LEAD_LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Test bypass accounts - ONLY active in development mode
// In production, all accounts are subject to rate limiting
const TEST_BYPASS_ACCOUNTS = process.env.NODE_ENV === "production" 
  ? new Set<string>() 
  : new Set([
    "test@constancia.com",
    "demo@constancia.com"
  ]);

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex');
}

export { sanitizeInput } from "@shared/utils";

export function isPathTraversalAttempt(input: string): boolean {
  const traversalPatterns = [
    /\.\./,
    /^\.\//,
    /%2e%2e/i,
    /%5c/i,
    /\\/,
    /\0/,
  ];
  
  if (traversalPatterns.some(pattern => pattern.test(input))) {
    return true;
  }
  
  const withoutProtocol = input.replace(/^https?:\/\//, '');
  if (/\/\//.test(withoutProtocol)) {
    return true;
  }
  
  if (/%2f/i.test(withoutProtocol)) {
    return true;
  }
  
  return false;
}

export function isValidResourceId(id: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const simpleIdPattern = /^[a-zA-Z0-9_-]+$/;
  return uuidPattern.test(id) || (simpleIdPattern.test(id) && id.length <= 64);
}

export async function logSecurityEvent(
  eventType: string,
  severity: 'info' | 'warning' | 'critical',
  req: Request,
  identifier?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent']?.slice(0, 500) || null;
    
    const detailsWithPath = {
      ...details,
      path: req.path,
      method: req.method,
    };
    
    await pool.query(
      `INSERT INTO security_events (event_type, severity, ip_address, user_agent, identifier, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventType, severity, ipAddress, userAgent, identifier || null, JSON.stringify(detailsWithPath)]
    );
    
    if (severity === 'critical') {
      secLog.warn({
        eventType,
        ip: ipAddress,
        identifier,
        path: req.path,
      }, "Critical security event");
    }
  } catch (error) {
    secLog.error({ err: error }, 'Failed to log security event');
  }
}

export async function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  if (TEST_BYPASS_ACCOUNTS.has(identifier.toLowerCase())) {
    return { allowed: true, remaining: Infinity, resetAt: new Date() };
  }
  
  const { limit, windowMs } = RATE_LIMITS[limitType];
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  
  try {
    const result = await pool.query(
      `SELECT count, reset_at FROM rate_limits 
       WHERE identifier = $1 AND limit_type = $2`,
      [identifier, limitType]
    );
    
    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO rate_limits (identifier, limit_type, count, reset_at)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (identifier, limit_type) DO UPDATE SET count = 1, reset_at = $3`,
        [identifier, limitType, resetAt]
      );
      return { allowed: true, remaining: limit - 1, resetAt };
    }
    
    const record = result.rows[0];
    const recordResetAt = new Date(record.reset_at);
    
    if (now > recordResetAt) {
      await pool.query(
        `UPDATE rate_limits SET count = 1, reset_at = $1 
         WHERE identifier = $2 AND limit_type = $3`,
        [resetAt, identifier, limitType]
      );
      return { allowed: true, remaining: limit - 1, resetAt };
    }
    
    if (record.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: recordResetAt };
    }
    
    await pool.query(
      `UPDATE rate_limits SET count = count + 1 
       WHERE identifier = $1 AND limit_type = $2`,
      [identifier, limitType]
    );
    
    return { 
      allowed: true, 
      remaining: limit - record.count - 1, 
      resetAt: recordResetAt 
    };
  } catch (error) {
    secLog.error({ err: error }, 'Rate limit check failed');
    return { allowed: true, remaining: limit, resetAt };
  }
}

export async function checkLeadLockout(
  leadId: string
): Promise<{ locked: boolean; remainingAttempts: number }> {
  if (TEST_BYPASS_ACCOUNTS.has(leadId.toLowerCase())) {
    return { locked: false, remainingAttempts: Infinity };
  }
  
  try {
    const result = await pool.query(
      `SELECT total_attempts, locked_until FROM lead_attempts WHERE lead_id = $1`,
      [leadId]
    );
    
    if (result.rows.length === 0) {
      return { locked: false, remainingAttempts: MAX_LEAD_ATTEMPTS };
    }
    
    const record = result.rows[0];
    const now = new Date();
    
    if (record.locked_until && new Date(record.locked_until) > now) {
      return { locked: true, remainingAttempts: 0 };
    }
    
    if (record.locked_until && new Date(record.locked_until) <= now) {
      await pool.query(`DELETE FROM lead_attempts WHERE lead_id = $1`, [leadId]);
      return { locked: false, remainingAttempts: MAX_LEAD_ATTEMPTS };
    }
    
    return { 
      locked: false, 
      remainingAttempts: MAX_LEAD_ATTEMPTS - record.total_attempts 
    };
  } catch (error) {
    secLog.error({ err: error }, 'Lead lockout check failed');
    return { locked: false, remainingAttempts: MAX_LEAD_ATTEMPTS };
  }
}

export async function recordLeadAttempt(
  leadId: string
): Promise<{ locked: boolean; remainingAttempts: number }> {
  if (TEST_BYPASS_ACCOUNTS.has(leadId.toLowerCase())) {
    return { locked: false, remainingAttempts: Infinity };
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO lead_attempts (lead_id, total_attempts, last_attempt_at)
       VALUES ($1, 1, NOW())
       ON CONFLICT (lead_id) DO UPDATE SET 
         total_attempts = lead_attempts.total_attempts + 1,
         last_attempt_at = NOW()
       RETURNING total_attempts`,
      [leadId]
    );
    
    const totalAttempts = result.rows[0].total_attempts;
    
    if (totalAttempts >= MAX_LEAD_ATTEMPTS) {
      const lockoutUntil = new Date(Date.now() + LEAD_LOCKOUT_DURATION_MS);
      await pool.query(
        `UPDATE lead_attempts SET locked_until = $1 WHERE lead_id = $2`,
        [lockoutUntil, leadId]
      );
      return { locked: true, remainingAttempts: 0 };
    }
    
    return { 
      locked: false, 
      remainingAttempts: MAX_LEAD_ATTEMPTS - totalAttempts 
    };
  } catch (error) {
    secLog.error({ err: error }, 'Record lead attempt failed');
    return { locked: false, remainingAttempts: MAX_LEAD_ATTEMPTS };
  }
}

export async function clearLeadAttempts(leadId: string): Promise<void> {
  try {
    await pool.query(`DELETE FROM lead_attempts WHERE lead_id = $1`, [leadId]);
  } catch (error) {
    secLog.error({ err: error }, 'Clear lead attempts failed');
  }
}

export async function storeOtp(
  identifier: string,
  otpHash: string,
  expiresAt: Date
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO otp_storage (identifier, otp_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (identifier) DO UPDATE SET 
         otp_hash = $2, expires_at = $3, attempts = 0`,
      [identifier, otpHash, expiresAt]
    );
  } catch (error) {
    secLog.error({ err: error }, 'Store OTP failed');
    throw error;
  }
}

export async function verifyOtp(
  identifier: string,
  otpHash: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const result = await pool.query(
      `SELECT otp_hash, expires_at, attempts FROM otp_storage WHERE identifier = $1`,
      [identifier]
    );
    
    if (result.rows.length === 0) {
      return { valid: false, reason: 'No OTP found' };
    }
    
    const record = result.rows[0];
    
    if (new Date(record.expires_at) < new Date()) {
      await pool.query(`DELETE FROM otp_storage WHERE identifier = $1`, [identifier]);
      return { valid: false, reason: 'OTP expired' };
    }
    
    if (record.attempts >= 5) {
      return { valid: false, reason: 'Too many attempts' };
    }
    
    if (record.otp_hash !== otpHash) {
      await pool.query(
        `UPDATE otp_storage SET attempts = attempts + 1 WHERE identifier = $1`,
        [identifier]
      );
      return { valid: false, reason: 'Invalid OTP' };
    }
    
    await pool.query(`DELETE FROM otp_storage WHERE identifier = $1`, [identifier]);
    return { valid: true };
  } catch (error) {
    secLog.error({ err: error }, 'Verify OTP failed');
    return { valid: false, reason: 'Verification error' };
  }
}

export function apiRateLimitMiddleware(
  limitType: keyof typeof RATE_LIMITS = 'api'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    
    try {
      const { allowed, remaining, resetAt } = await checkRateLimit(ip, limitType);
      
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetAt.toISOString());
      
      if (!allowed) {
        await logSecurityEvent('rate_limit_exceeded', 'warning', req, ip, {
          limitType,
          resetAt: resetAt.toISOString()
        });
        
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000)
        });
      }
      
      next();
    } catch (error) {
      secLog.error({ err: error }, 'Rate limit middleware error');
      next();
    }
  };
}

export function validateJsonMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (req.headers['content-type']?.includes('application/json')) {
      if (typeof req.body !== 'object' || req.body === null) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request body must be valid JSON'
        });
      }
    }
  }
  next();
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // AI training opt-out signal
  res.setHeader('X-Robots-Tag', 'noai, noimageai');
  
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  
  next();
}

export async function cleanupExpiredRecords(): Promise<void> {
  try {
    const now = new Date();
    
    await pool.query(`DELETE FROM rate_limits WHERE reset_at < $1`, [now]);
    await pool.query(`DELETE FROM otp_storage WHERE expires_at < $1`, [now]);
    await pool.query(
      `DELETE FROM lead_attempts WHERE locked_until IS NOT NULL AND locked_until < $1`,
      [now]
    );
    
    secLog.info('Cleaned up expired security records');
  } catch (error) {
    secLog.error({ err: error }, 'Cleanup expired records failed');
  }
}

setInterval(cleanupExpiredRecords, 60 * 60 * 1000);

export function redactPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\b\d{10,}\b/g, '[PHONE]')
    .replace(/\b(?:\d{4}[- ]?){3}\d{4}\b/g, '[CARD]');
}

export function safeErrorResponse(error: unknown, includeDetails = false): { 
  error: string; 
  message: string; 
  details?: string 
} {
  const baseResponse = {
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.'
  };
  
  if (includeDetails && error instanceof Error) {
    return {
      ...baseResponse,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
  
  return baseResponse;
}
