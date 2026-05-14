/**
 * Leads Service Interfaces
 * 
 * Defines contracts for lead management business logic services.
 * These interfaces enable dependency injection and testability.
 * 
 * IMPORTANT: Core services MUST NOT import from /api or /db directly.
 * They receive dependencies through these interfaces.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Result, PaginatedResult, PaginationParams } from '../types';
import type {
  Lead,
  LeadWithFingerprint,
  LeadSession,
  LeadStatus,
  LeadSource,
  ContactSubmission,
  ContactSubmissionWithFingerprint,
  OtpVerification,
  OtpGenerationResult,
  OtpVerificationResult,
  LeadAccessResult,
  LeadValidationResult,
  ContactValidationResult,
  RateLimitResult,
  CreateLeadData,
  CreateContactData,
  QualifyLeadData,
  EmailVerificationToken,
  HubSpotLeadData,
} from './types';

/**
 * Lead Repository Interface
 * Abstracts data access for leads
 */
export interface ILeadRepository {
  findById(id: string): Promise<Lead | null>;
  findByEmail(email: string): Promise<Lead | null>;
  findByEmailHash(emailHash: string): Promise<Lead | null>;
  findAll(params?: PaginationParams & LeadFilters): Promise<PaginatedResult<Lead>>;
  create(data: CreateLeadData & { emailHash: string }): Promise<Lead>;
  update(id: string, data: UpdateLeadData): Promise<Lead | null>;
  markVerified(id: string): Promise<Lead | null>;
  updateHubSpotSync(id: string, contactId: string): Promise<void>;
  delete(id: string): Promise<boolean>;
}

/**
 * Filters for querying leads
 */
export interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  verified?: boolean;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Data for updating a lead
 */
export interface UpdateLeadData {
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  status?: LeadStatus;
  subscribeNewsletter?: boolean;
}

/**
 * Contact Repository Interface
 * Abstracts data access for contact submissions
 */
export interface IContactRepository {
  findById(id: string): Promise<ContactSubmission | null>;
  findByEmail(email: string): Promise<ContactSubmission[]>;
  findByEmailHash(emailHash: string): Promise<ContactSubmission[]>;
  findAll(params?: PaginationParams & ContactFilters): Promise<PaginatedResult<ContactSubmission>>;
  create(data: CreateContactData & { emailHash?: string }): Promise<ContactSubmission>;
  update(id: string, data: UpdateContactData): Promise<ContactSubmission | null>;
  markVerified(id: string): Promise<ContactSubmission | null>;
  markEmailSent(id: string): Promise<void>;
  markHubSpotSynced(id: string): Promise<void>;
}

/**
 * Filters for querying contact submissions
 */
export interface ContactFilters {
  verified?: boolean;
  hubspotSynced?: boolean;
  emailSent?: boolean;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Data for updating a contact submission
 */
export interface UpdateContactData {
  emailSent?: boolean;
  hubspotSynced?: boolean;
}

/**
 * OTP Repository Interface
 * Abstracts data access for OTP records
 */
export interface IOtpRepository {
  create(leadId: string, otpHash: string, expiresAt: Date): Promise<OtpVerification>;
  findValidByLeadId(leadId: string): Promise<OtpVerification | null>;
  incrementAttempts(otpId: string): Promise<number>;
  markUsed(otpId: string): Promise<void>;
  invalidateForLead(leadId: string): Promise<void>;
}

/**
 * Lead Session Repository Interface
 * Manages session-based access for verified leads
 */
export interface ILeadSessionRepository {
  findById(id: string): Promise<LeadSession | null>;
  findByEmailHash(emailHash: string): Promise<LeadSession | null>;
  findValidSession(sessionId: string): Promise<LeadSession | null>;
  create(data: CreateLeadSessionData): Promise<LeadSession>;
  revoke(id: string): Promise<void>;
  revokeAllForLead(leadId: string): Promise<void>;
  refreshExpiry(id: string, newExpiresAt: Date): Promise<void>;
  cleanupExpired(): Promise<number>;
}

/**
 * Data for creating a lead session
 */
export interface CreateLeadSessionData {
  leadId: string;
  emailHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Email Verification Token Repository Interface
 */
export interface IEmailVerificationTokenRepository {
  create(data: CreateEmailVerificationTokenData): Promise<EmailVerificationToken>;
  findByToken(token: string): Promise<EmailVerificationToken | null>;
  markUsed(tokenId: string): Promise<void>;
  invalidateForLead(leadId: string): Promise<void>;
  invalidateForContact(contactId: string): Promise<void>;
}

/**
 * Data for creating an email verification token
 */
export interface CreateEmailVerificationTokenData {
  leadId?: string;
  contactSubmissionId?: string;
  token: string;
  expiresAt: Date;
}

/**
 * Rate Limit Repository Interface
 * Manages rate limiting state
 */
export interface IRateLimitRepository {
  checkRateLimit(identifier: string, action: string): Promise<RateLimitResult>;
  recordAttempt(identifier: string, action: string): Promise<void>;
  checkLockout(identifier: string): Promise<{ locked: boolean; remainingAttempts: number }>;
  recordFailedAttempt(identifier: string): Promise<{ locked: boolean; remainingAttempts: number }>;
  clearLockout(identifier: string): Promise<void>;
}

/**
 * OTP Service Interface
 * Business logic for OTP generation and verification
 */
export interface IOtpService {
  generateOtp(length?: number): OtpGenerationResult;
  hashOtp(otp: string): string;
  verifyOtp(otp: string, hash: string): boolean;
  isExpired(expiresAt: Date): boolean;
  getExpiryTime(minutes?: number): Date;
}

/**
 * Email Hash Service Interface
 * Business logic for email hashing
 */
export interface IEmailHashService {
  hashEmail(email: string): string;
  normalizeEmail(email: string): string;
}

/**
 * Lead Service Interface
 * High-level business logic for lead management
 */
export interface ILeadService {
  createLead(data: CreateLeadData): Promise<Result<Lead>>;
  verifyLead(leadId: string, otp: string): Promise<Result<{ lead: Lead; session: LeadSession }>>;
  resendOtp(leadId: string): Promise<Result<void>>;
  qualifyLead(leadId: string, data: QualifyLeadData): Promise<Result<Lead>>;
  checkLeadAccess(email: string): Promise<Result<LeadAccessResult>>;
  checkLeadAccessBySession(sessionId: string): Promise<Result<LeadAccessResult>>;
  getLeadById(id: string): Promise<Result<Lead>>;
  getLeadByEmail(email: string): Promise<Result<Lead>>;
  validateLeadData(data: CreateLeadData): LeadValidationResult;
}

/**
 * Contact Service Interface
 * High-level business logic for contact submissions
 */
export interface IContactService {
  createContact(data: CreateContactData): Promise<Result<ContactSubmission>>;
  verifyContact(token: string): Promise<Result<ContactSubmission>>;
  getContactById(id: string): Promise<Result<ContactSubmission>>;
  validateContactData(data: CreateContactData): ContactValidationResult;
}

/**
 * HubSpot Sync Service Interface
 * Business logic for HubSpot integration
 */
export interface IHubSpotSyncService {
  syncLead(data: HubSpotLeadData): Promise<Result<{ contactId: string }>>;
  syncContact(data: CreateContactData): Promise<Result<{ contactId: string }>>;
  isRateLimited(email: string): Promise<boolean>;
}

/**
 * Notification Service Interface
 * Business logic for sending notifications
 */
export interface INotificationService {
  sendOtpEmail(email: string, firstName: string, otp: string): Promise<boolean>;
  sendContactVerificationEmail(email: string, firstName: string, token: string): Promise<boolean>;
  sendLeadNotification(lead: HubSpotLeadData): Promise<boolean>;
  sendContactNotification(contact: CreateContactData): Promise<boolean>;
}
