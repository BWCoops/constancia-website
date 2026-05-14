/**
 * Leads Domain Types
 * 
 * Pure domain types for lead capture, contact management, and OTP verification.
 * These types represent business concepts without any infrastructure concerns.
 * 
 * @generated-by-ai (human-reviewed)
 */

/**
 * Lead source - where the lead originated from
 */
export enum LeadSource {
  WEBSITE = 'website',
  CHAT = 'chat',
  RESOURCE_DOWNLOAD = 'resource_download',
  CONTACT_FORM = 'contact_form',
  FINANCE_COMPASS = 'finance_compass',
  REFERRAL = 'referral',
  DIRECT = 'direct',
}

/**
 * Lead status - current state in the lead lifecycle
 */
export enum LeadStatus {
  NEW = 'new',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFIED = 'verified',
  QUALIFIED = 'qualified',
  CONTACTED = 'contacted',
  CONVERTED = 'converted',
  DISQUALIFIED = 'disqualified',
}

/**
 * Lead domain entity
 * Represents a potential customer who has engaged with the platform
 */
export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailHash: string;
  company: string;
  jobTitle: string;
  resourceId: string | null;
  subscribeNewsletter: boolean;
  status: LeadStatus;
  source: LeadSource;
  verified: boolean;
  verifiedAt: Date | null;
  hubspotContactId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

/**
 * Lead fingerprint data for enrichment and bot detection
 */
export interface LeadFingerprint {
  screenResolution: string | null;
  timezone: string | null;
  language: string | null;
  platform: string | null;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  referrer: string | null;
  pageUrl: string | null;
  clickTimestamp: Date | null;
}

/**
 * Lead with fingerprint data
 */
export interface LeadWithFingerprint extends Lead, LeadFingerprint {}

/**
 * Contact submission domain entity
 * Represents a contact form submission
 */
export interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailHash: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  message: string;
  consentMarketing: boolean;
  verified: boolean;
  verifiedAt: Date | null;
  hubspotSynced: boolean;
  emailSent: boolean;
  createdAt: Date;
}

/**
 * Contact submission with fingerprint data
 */
export interface ContactSubmissionWithFingerprint extends ContactSubmission, LeadFingerprint {}

/**
 * OTP verification record
 */
export interface OtpVerification {
  id: string;
  leadId: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * OTP generation result
 */
export interface OtpGenerationResult {
  otp: string;
  hash: string;
  expiresAt: Date;
}

/**
 * OTP verification result
 */
export interface OtpVerificationResult {
  valid: boolean;
  reason: OtpVerificationFailReason | null;
  attemptsRemaining: number;
}

/**
 * Reasons for OTP verification failure
 */
export type OtpVerificationFailReason =
  | 'expired'
  | 'invalid_code'
  | 'max_attempts_exceeded'
  | 'already_used'
  | 'not_found';

/**
 * Lead session for gated content access
 */
export interface LeadSession {
  id: string;
  leadId: string;
  emailHash: string;
  expiresAt: Date;
  revoked: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Lead access check result
 */
export interface LeadAccessResult {
  hasAccess: boolean;
  leadId: string | null;
  sessionId: string | null;
  reason: LeadAccessDeniedReason | null;
}

/**
 * Reasons for lead access denial
 */
export type LeadAccessDeniedReason =
  | 'no_session'
  | 'session_expired'
  | 'session_revoked'
  | 'lead_not_found'
  | 'lead_not_verified';

/**
 * Data for creating a new lead
 */
export interface CreateLeadData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  resourceId?: string;
  subscribeNewsletter?: boolean;
  source?: LeadSource;
  ipAddress?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  referrer?: string;
  pageUrl?: string;
  clickTimestamp?: Date;
}

/**
 * Data for creating a contact submission
 */
export interface CreateContactData {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  message: string;
  consentMarketing?: boolean;
  ipAddress?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  referrer?: string;
  pageUrl?: string;
}

/**
 * Data for qualifying a lead
 */
export interface QualifyLeadData {
  notes?: string;
  score?: number;
  interests?: string[];
  budget?: string;
  timeline?: string;
}

/**
 * Lead validation result
 */
export interface LeadValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Contact validation result
 */
export interface ContactValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
}

/**
 * Email verification token
 */
export interface EmailVerificationToken {
  id: string;
  leadId: string | null;
  contactSubmissionId: string | null;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * HubSpot lead sync data
 */
export interface HubSpotLeadData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  resourceId?: string;
  resourceTitle?: string;
  subscribeNewsletter?: boolean;
  ipAddress?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  referrer?: string;
  pageUrl?: string;
  clickTimestamp?: string;
}
