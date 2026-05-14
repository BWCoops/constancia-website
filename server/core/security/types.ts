/**
 * Security Domain Types
 * 
 * Core types for security-related operations including rate limiting,
 * input validation, security events, and session management.
 */

import { z } from 'zod';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * Predefined rate limit types
 */
export type RateLimitType = 'api' | 'otp' | 'hubspot' | 'login' | 'contact' | 'ad_click';

/**
 * Rate limit configuration presets
 */
export const RATE_LIMIT_PRESETS: Record<RateLimitType, RateLimitConfig> = {
  api: { limit: 100, windowMs: 60 * 1000 },
  otp: { limit: 3, windowMs: 10 * 60 * 1000 },
  hubspot: { limit: 10, windowMs: 60 * 60 * 1000 },
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  contact: { limit: 3, windowMs: 60 * 60 * 1000 },
  ad_click: { limit: 20, windowMs: 60 * 1000 },
};

/**
 * Validation result for a single field or input
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: string;
}

/**
 * Validation error with field context
 */
export interface FieldValidationError {
  field: string;
  code: string;
  message: string;
}

/**
 * Aggregated validation result for forms
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  fieldErrors: FieldValidationError[];
}

/**
 * Security event severity levels
 */
export type SecurityEventSeverity = 'info' | 'warning' | 'critical';

/**
 * Security event types for audit logging
 */
export type SecurityEventType = 
  | 'rate_limit_exceeded'
  | 'invalid_input'
  | 'authentication_failed'
  | 'authentication_success'
  | 'session_created'
  | 'session_revoked'
  | 'ip_blocked'
  | 'suspicious_activity'
  | 'otp_generated'
  | 'otp_verified'
  | 'otp_failed';

/**
 * Security event for audit logging
 */
export interface SecurityEvent {
  id?: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  ipAddress: string;
  userAgent?: string;
  identifier?: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Input for creating a security event
 */
export interface CreateSecurityEventInput {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  ipAddress: string;
  userAgent?: string;
  identifier?: string;
  details?: Record<string, unknown>;
}

/**
 * IP block status result
 */
export interface IPBlockResult {
  blocked: boolean;
  reason?: string;
  blockedUntil?: Date;
  remainingAttempts?: number;
}

/**
 * Session validation result
 */
export interface SessionValidation {
  valid: boolean;
  sessionId?: string;
  userId?: string;
  expiresAt?: Date;
  reason?: string;
}

/**
 * Session data structure
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

/**
 * OTP verification result
 */
export interface OTPVerificationResult {
  valid: boolean;
  reason?: string;
  attemptsRemaining?: number;
}

/**
 * Email validation options
 */
export interface EmailValidationOptions {
  requireBusinessEmail?: boolean;
  allowDisposable?: boolean;
  checkFormat?: boolean;
}

/**
 * Content validation options
 */
export interface ContentValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowUrls?: boolean;
  allowHtml?: boolean;
  checkProfanity?: boolean;
  checkSpam?: boolean;
}

/**
 * HTML sanitization options
 */
export interface SanitizeOptions {
  allowLinks?: boolean;
  allowImages?: boolean;
  allowTables?: boolean;
  stripAllHtml?: boolean;
}

/**
 * Zod schema for security event creation
 */
export const securityEventSchema = z.object({
  eventType: z.enum([
    'rate_limit_exceeded',
    'invalid_input',
    'authentication_failed',
    'authentication_success',
    'session_created',
    'session_revoked',
    'ip_blocked',
    'suspicious_activity',
    'otp_generated',
    'otp_verified',
    'otp_failed',
  ]),
  severity: z.enum(['info', 'warning', 'critical']),
  ipAddress: z.string().min(1),
  userAgent: z.string().optional(),
  identifier: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export type SecurityEventInput = z.infer<typeof securityEventSchema>;
