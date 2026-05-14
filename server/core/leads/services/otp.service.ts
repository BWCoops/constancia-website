/**
 * OTP Service
 * 
 * Pure business logic for OTP generation and verification.
 * This service handles the cryptographic operations for OTP-based verification.
 * 
 * IMPORTANT: NO HTTP imports, NO database imports.
 * This is pure business logic with no side effects.
 * 
 * @generated-by-ai (human-reviewed)
 */

import crypto from 'crypto';
import type {
  OtpGenerationResult,
  OtpVerificationResult,
  RateLimitResult,
} from '../types';
import type { IOtpService, IRateLimitRepository } from '../interfaces';

/**
 * Configuration for the OTP service
 */
export interface OtpServiceConfig {
  otpLength: number;
  expiryMinutes: number;
  maxAttempts: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OtpServiceConfig = {
  otpLength: 6,
  expiryMinutes: 10,
  maxAttempts: 5,
};

/**
 * OTP Service Implementation
 * 
 * Pure cryptographic operations for OTP handling.
 * Uses HMAC-SHA256 for secure OTP hashing.
 */
export class OtpService implements IOtpService {
  private readonly config: OtpServiceConfig;

  constructor(config: Partial<OtpServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a new OTP with its hash
   */
  generateOtp(length: number = this.config.otpLength): OtpGenerationResult {
    const otp = this.generateSecureOtp(length);
    const hash = this.hashOtp(otp);
    const expiresAt = this.getExpiryTime();

    return {
      otp,
      hash,
      expiresAt,
    };
  }

  hashOtp(otp: string): string {
    const normalizedOtp = otp.trim();
    const hmacKey = process.env.SESSION_SECRET || 'otp-hash-key';
    return 'sha256:' + crypto.createHmac('sha256', hmacKey).update(normalizedOtp).digest('hex');
  }

  /**
   * Verify an OTP against a hash
   */
  verifyOtp(otp: string, hash: string): boolean {
    const computedHash = this.hashOtp(otp);
    return this.timingSafeEqual(computedHash, hash);
  }

  /**
   * Check if an OTP has expired
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt);
  }

  /**
   * Get the expiry time for a new OTP
   */
  getExpiryTime(minutes: number = this.config.expiryMinutes): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Generate a cryptographically secure OTP
   */
  private generateSecureOtp(length: number): string {
    const bytes = crypto.randomBytes(length);
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += (bytes[i] % 10).toString();
    }
    return otp;
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

/**
 * Email Hash Service Implementation
 * 
 * Handles email normalization and hashing for lead lookup
 */
export class EmailHashService {
  /**
   * Hash an email for secure storage and lookup
   */
  hashEmail(email: string): string {
    const normalizedEmail = this.normalizeEmail(email);
    return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
  }

  /**
   * Normalize an email for consistent comparison
   */
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}

/**
 * Rate Limit Service
 * 
 * Manages rate limiting for OTP operations
 */
export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 3,
  windowMinutes: 10,
  lockoutMinutes: 30,
};

/**
 * In-memory rate limiter for OTP operations
 * In production, this would use Redis or a database
 */
export class InMemoryRateLimiter implements IRateLimitRepository {
  private readonly config: RateLimitConfig;
  private readonly attempts: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly lockouts: Map<string, { lockedUntil: number; failedAttempts: number }> = new Map();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
  }

  /**
   * Check if an action is rate limited
   */
  async checkRateLimit(identifier: string, action: string): Promise<RateLimitResult> {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetAt) {
      return {
        allowed: true,
        retryAfterSeconds: 0,
        remainingAttempts: this.config.maxAttempts,
      };
    }

    if (record.count >= this.config.maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      return {
        allowed: false,
        retryAfterSeconds,
        remainingAttempts: 0,
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remainingAttempts: this.config.maxAttempts - record.count,
    };
  }

  /**
   * Record an attempt for rate limiting
   */
  async recordAttempt(identifier: string, action: string): Promise<void> {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const resetAt = now + this.config.windowMinutes * 60 * 1000;
    const record = this.attempts.get(key);

    if (!record || now > record.resetAt) {
      this.attempts.set(key, { count: 1, resetAt });
    } else {
      record.count++;
    }
  }

  /**
   * Check if an identifier is locked out
   */
  async checkLockout(identifier: string): Promise<{ locked: boolean; remainingAttempts: number }> {
    const now = Date.now();
    const lockout = this.lockouts.get(identifier);

    if (!lockout) {
      return { locked: false, remainingAttempts: this.config.maxAttempts };
    }

    if (now > lockout.lockedUntil) {
      this.lockouts.delete(identifier);
      return { locked: false, remainingAttempts: this.config.maxAttempts };
    }

    return {
      locked: true,
      remainingAttempts: 0,
    };
  }

  /**
   * Record a failed attempt and potentially trigger lockout
   */
  async recordFailedAttempt(identifier: string): Promise<{ locked: boolean; remainingAttempts: number }> {
    const now = Date.now();
    let lockout = this.lockouts.get(identifier);

    if (!lockout || now > lockout.lockedUntil) {
      lockout = {
        failedAttempts: 1,
        lockedUntil: now + this.config.lockoutMinutes * 60 * 1000,
      };
      this.lockouts.set(identifier, lockout);
    } else {
      lockout.failedAttempts++;
    }

    const remainingAttempts = Math.max(0, this.config.maxAttempts - lockout.failedAttempts);

    if (lockout.failedAttempts >= this.config.maxAttempts) {
      lockout.lockedUntil = now + this.config.lockoutMinutes * 60 * 1000;
      return { locked: true, remainingAttempts: 0 };
    }

    return { locked: false, remainingAttempts };
  }

  /**
   * Clear lockout for an identifier
   */
  async clearLockout(identifier: string): Promise<void> {
    this.lockouts.delete(identifier);
  }
}

/**
 * OTP Verification Helper
 * 
 * Combines OTP service with rate limiting for complete verification flow
 */
export class OtpVerificationHelper {
  constructor(
    private readonly otpService: OtpService,
    private readonly rateLimiter: InMemoryRateLimiter
  ) {}

  /**
   * Verify an OTP with rate limiting
   */
  async verifyWithRateLimit(
    identifier: string,
    otp: string,
    storedHash: string,
    expiresAt: Date,
    currentAttempts: number,
    maxAttempts: number
  ): Promise<OtpVerificationResult> {
    if (this.otpService.isExpired(expiresAt)) {
      return {
        valid: false,
        reason: 'expired',
        attemptsRemaining: 0,
      };
    }

    if (currentAttempts >= maxAttempts) {
      return {
        valid: false,
        reason: 'max_attempts_exceeded',
        attemptsRemaining: 0,
      };
    }

    const isValid = this.otpService.verifyOtp(otp, storedHash);

    if (!isValid) {
      const attemptsRemaining = maxAttempts - currentAttempts - 1;
      return {
        valid: false,
        reason: 'invalid_code',
        attemptsRemaining: Math.max(0, attemptsRemaining),
      };
    }

    return {
      valid: true,
      reason: null,
      attemptsRemaining: maxAttempts - currentAttempts,
    };
  }

  /**
   * Check if OTP generation is rate limited
   */
  async isRateLimited(identifier: string): Promise<boolean> {
    const result = await this.rateLimiter.checkRateLimit(identifier, 'otp_generate');
    return !result.allowed;
  }
}
