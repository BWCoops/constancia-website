/**
 * Security Domain Interfaces
 * 
 * Service interfaces for security operations. These interfaces define
 * the contracts that security services must implement.
 */

import { z } from 'zod';
import type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitType,
  ValidationResult,
  FormValidationResult,
  SecurityEvent,
  CreateSecurityEventInput,
  SecurityEventType,
  SecurityEventSeverity,
  IPBlockResult,
  SessionValidation,
  SessionData,
  OTPVerificationResult,
  EmailValidationOptions,
  ContentValidationOptions,
  SanitizeOptions,
} from './types';

/**
 * Rate limit repository interface for storage abstraction
 */
export interface IRateLimitRepository {
  getAttempts(key: string): Promise<{ count: number; resetAt: Date } | null>;
  incrementAttempts(key: string, resetAt: Date): Promise<number>;
  resetAttempts(key: string): Promise<void>;
}

/**
 * Rate limiting service interface
 */
export interface IRateLimitService {
  /**
   * Check if the rate limit has been exceeded
   * @param key - Unique identifier (e.g., IP address, user ID)
   * @param config - Rate limit configuration
   */
  checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  
  /**
   * Check if rate limit exceeded using a preset type
   * @param key - Unique identifier
   * @param type - Preset rate limit type
   */
  checkLimitByType(key: string, type: RateLimitType): Promise<RateLimitResult>;
  
  /**
   * Record an attempt and return updated status
   * @param key - Unique identifier
   * @param config - Rate limit configuration
   */
  recordAttempt(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  
  /**
   * Get remaining attempts before rate limit is exceeded
   * @param key - Unique identifier
   * @param config - Rate limit configuration
   */
  getRemainingAttempts(key: string, config: RateLimitConfig): Promise<number>;
  
  /**
   * Check if a key is currently blocked
   * @param key - Unique identifier
   * @param config - Rate limit configuration
   */
  isBlocked(key: string, config: RateLimitConfig): Promise<boolean>;
  
  /**
   * Reset rate limit for a key
   * @param key - Unique identifier
   */
  reset(key: string): Promise<void>;
}

/**
 * Validation service interface
 */
export interface IValidationService {
  /**
   * Validate an email address
   * @param email - Email to validate
   * @param options - Validation options
   */
  validateEmail(email: string, options?: EmailValidationOptions): ValidationResult;
  
  /**
   * Validate input against a Zod schema
   * @param input - Input to validate
   * @param schema - Zod schema
   */
  validateInput<T>(input: unknown, schema: z.ZodType<T>): { valid: boolean; data?: T; errors?: string[] };
  
  /**
   * Validate a name field
   * @param name - Name to validate
   */
  validateName(name: string): ValidationResult;
  
  /**
   * Validate a message/text content
   * @param message - Message to validate
   * @param options - Content validation options
   */
  validateMessage(message: string, options?: ContentValidationOptions): ValidationResult;
  
  /**
   * Validate a company name
   * @param company - Company name to validate
   */
  validateCompany(company: string): ValidationResult;
  
  /**
   * Validate a phone number
   * @param phone - Phone number to validate
   */
  validatePhone(phone: string | null | undefined): ValidationResult;
  
  /**
   * Sanitize HTML input
   * @param html - HTML to sanitize
   * @param options - Sanitization options
   */
  sanitize(html: string, options?: SanitizeOptions): string;
  
  /**
   * Check if text contains profanity
   * @param text - Text to check
   */
  containsProfanity(text: string): boolean;
  
  /**
   * Check if text contains spam patterns
   * @param text - Text to check
   */
  containsSpam(text: string): boolean;
  
  /**
   * Check if text contains URLs
   * @param text - Text to check
   */
  containsUrls(text: string): boolean;
  
  /**
   * Check if email is from a disposable domain
   * @param email - Email to check
   */
  isDisposableEmail(email: string): boolean;
}

/**
 * Security event repository interface
 */
export interface ISecurityEventRepository {
  create(event: CreateSecurityEventInput): Promise<SecurityEvent>;
  findByIdentifier(identifier: string, limit?: number): Promise<SecurityEvent[]>;
  findByIpAddress(ipAddress: string, limit?: number): Promise<SecurityEvent[]>;
  findByType(eventType: SecurityEventType, limit?: number): Promise<SecurityEvent[]>;
  findRecent(limit?: number): Promise<SecurityEvent[]>;
}

/**
 * Security audit service interface
 */
export interface ISecurityAuditService {
  /**
   * Log a security event
   * @param event - Event to log
   */
  logEvent(event: CreateSecurityEventInput): Promise<SecurityEvent>;
  
  /**
   * Log with request context
   * @param eventType - Type of event
   * @param severity - Severity level
   * @param ipAddress - Client IP
   * @param details - Additional details
   */
  log(
    eventType: SecurityEventType,
    severity: SecurityEventSeverity,
    ipAddress: string,
    details?: Record<string, unknown>
  ): Promise<void>;
  
  /**
   * Get security events for an identifier
   * @param identifier - User/session identifier
   * @param limit - Maximum events to return
   */
  getEventsByIdentifier(identifier: string, limit?: number): Promise<SecurityEvent[]>;
  
  /**
   * Get security events for an IP address
   * @param ipAddress - IP address
   * @param limit - Maximum events to return
   */
  getEventsByIp(ipAddress: string, limit?: number): Promise<SecurityEvent[]>;
  
  /**
   * Get recent security events
   * @param limit - Maximum events to return
   */
  getRecentEvents(limit?: number): Promise<SecurityEvent[]>;
  
  /**
   * Get events by type
   * @param eventType - Event type filter
   * @param limit - Maximum events to return
   */
  getEventsByType(eventType: SecurityEventType, limit?: number): Promise<SecurityEvent[]>;
}

/**
 * Session repository interface
 */
export interface ISessionRepository {
  create(session: SessionData): Promise<SessionData>;
  findById(sessionId: string): Promise<SessionData | null>;
  findByUserId(userId: string): Promise<SessionData[]>;
  updateActivity(sessionId: string): Promise<void>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

/**
 * Session service interface
 */
export interface ISessionService {
  /**
   * Create a new session
   * @param userId - User identifier
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param durationMs - Session duration in milliseconds
   */
  create(
    userId: string,
    ipAddress: string,
    userAgent?: string,
    durationMs?: number
  ): Promise<SessionData>;
  
  /**
   * Validate a session
   * @param sessionId - Session identifier
   */
  validate(sessionId: string): Promise<SessionValidation>;
  
  /**
   * Revoke a session
   * @param sessionId - Session identifier
   */
  revoke(sessionId: string): Promise<void>;
  
  /**
   * Revoke all sessions for a user
   * @param userId - User identifier
   */
  revokeAll(userId: string): Promise<void>;
  
  /**
   * Extend session expiry
   * @param sessionId - Session identifier
   * @param durationMs - Additional duration
   */
  extend(sessionId: string, durationMs: number): Promise<SessionData | null>;
  
  /**
   * Update session activity timestamp
   * @param sessionId - Session identifier
   */
  touch(sessionId: string): Promise<void>;
  
  /**
   * Clean up expired sessions
   */
  cleanup(): Promise<number>;
}

/**
 * IP blocking service interface
 */
export interface IIPBlockService {
  /**
   * Check if an IP is blocked
   * @param ipAddress - IP address to check
   */
  isBlocked(ipAddress: string): Promise<IPBlockResult>;
  
  /**
   * Block an IP address
   * @param ipAddress - IP to block
   * @param reason - Reason for blocking
   * @param durationMs - Duration of block
   */
  block(ipAddress: string, reason: string, durationMs: number): Promise<void>;
  
  /**
   * Unblock an IP address
   * @param ipAddress - IP to unblock
   */
  unblock(ipAddress: string): Promise<void>;
  
  /**
   * Record a failed attempt for an IP
   * @param ipAddress - IP address
   */
  recordFailedAttempt(ipAddress: string): Promise<IPBlockResult>;
  
  /**
   * Clear failed attempts for an IP
   * @param ipAddress - IP address
   */
  clearAttempts(ipAddress: string): Promise<void>;
}

/**
 * OTP service interface
 */
export interface IOTPService {
  /**
   * Generate and store an OTP
   * @param identifier - User/email identifier
   * @param expiryMs - OTP expiry duration
   */
  generate(identifier: string, expiryMs?: number): Promise<string>;
  
  /**
   * Verify an OTP
   * @param identifier - User/email identifier
   * @param otp - OTP to verify
   */
  verify(identifier: string, otp: string): Promise<OTPVerificationResult>;
  
  /**
   * Invalidate any existing OTP
   * @param identifier - User/email identifier
   */
  invalidate(identifier: string): Promise<void>;
}
