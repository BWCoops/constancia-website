/**
 * Leads Domain Core Module
 * 
 * Exports all types, interfaces, and services for lead management.
 * This module provides the business logic layer for:
 * - Lead capture and management
 * - Contact form submissions
 * - OTP-based email verification
 * - Session management for gated content access
 * 
 * @generated-by-ai (human-reviewed)
 */

export * from './types';
export * from './interfaces';
export { LeadService, LeadServiceConfig } from './services/lead.service';
export { 
  LeadAlreadyVerifiedError,
  OtpExpiredError,
  OtpInvalidError,
  MaxOtpAttemptsError,
  LeadLockedOutError,
} from './services/lead.service';
export { 
  OtpService, 
  OtpServiceConfig,
  EmailHashService,
  InMemoryRateLimiter,
  RateLimitConfig,
  OtpVerificationHelper,
} from './services/otp.service';
