/**
 * Lead Service
 * 
 * Pure business logic for lead management.
 * This service handles lead creation, verification, qualification, and access checks.
 * 
 * IMPORTANT: NO HTTP imports, NO database imports.
 * All dependencies are injected through interfaces.
 * 
 * @generated-by-ai (human-reviewed)
 */

import {
  Result,
  success,
  failure,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from '../../types';
import type {
  Lead,
  LeadSession,
  LeadAccessResult,
  LeadValidationResult,
  CreateLeadData,
  QualifyLeadData,
  LeadStatus,
} from '../types';
import type {
  ILeadRepository,
  IOtpRepository,
  ILeadSessionRepository,
  IRateLimitRepository,
  ILeadService,
  IOtpService,
  IEmailHashService,
  INotificationService,
} from '../interfaces';

/**
 * Lead-specific errors
 */
export class LeadAlreadyVerifiedError extends ValidationError {
  constructor(leadId: string) {
    super(`Lead ${leadId} is already verified`, { leadId: 'Lead is already verified' });
  }
}

export class OtpExpiredError extends ValidationError {
  constructor() {
    super('Verification code has expired. Please request a new code.', { otp: 'Verification code expired' });
  }
}

export class OtpInvalidError extends ValidationError {
  constructor(attemptsRemaining: number) {
    super(
      `Incorrect verification code. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
      { otp: 'Incorrect verification code' }
    );
  }
}

export class MaxOtpAttemptsError extends RateLimitError {
  constructor() {
    super('Too many incorrect attempts for this code. Please request a new code.', 60);
  }
}

export class LeadLockedOutError extends RateLimitError {
  constructor() {
    super('Too many failed attempts. Your account is locked for 30 minutes.', 1800);
  }
}

/**
 * Personal email domains that should be blocked for business leads
 */
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'msn.com', 'aol.com', 'icloud.com', 'me.com', 'mail.com',
  'protonmail.com', 'proton.me', 'zoho.com', 'yandex.com', 'gmx.com',
  'gmx.net', 'mail.ru', 'inbox.com', 'fastmail.com', 'tutanota.com',
  'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.ca', 'hotmail.co.uk',
  'live.co.uk', 'live.com.au', 'outlook.co.uk', 'googlemail.com',
];

/**
 * Disposable email domains that should be blocked
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com',
  'mailinator.com', 'maildrop.cc', 'tempail.com', 'fakeinbox.com',
  'sharklasers.com', 'yopmail.com', 'trashmail.com', 'getairmail.com',
];

/**
 * Configuration for the lead service
 */
export interface LeadServiceConfig {
  otpExpiryMinutes: number;
  maxOtpAttempts: number;
  sessionExpiryDays: number;
  requireBusinessEmail: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LeadServiceConfig = {
  otpExpiryMinutes: 10,
  maxOtpAttempts: 5,
  sessionExpiryDays: 7,
  requireBusinessEmail: true,
};

/**
 * Helper to convert validation errors from string[] to string format
 */
function flattenValidationErrors(errors: Record<string, string[]>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(errors)) {
    result[key] = messages.join('; ');
  }
  return result;
}

/**
 * Lead Service Implementation
 */
export class LeadService implements ILeadService {
  private readonly config: LeadServiceConfig;

  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly otpRepository: IOtpRepository,
    private readonly sessionRepository: ILeadSessionRepository,
    private readonly rateLimitRepository: IRateLimitRepository,
    private readonly otpService: IOtpService,
    private readonly emailHashService: IEmailHashService,
    private readonly notificationService: INotificationService,
    config: Partial<LeadServiceConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new lead
   */
  async createLead(data: CreateLeadData): Promise<Result<Lead>> {
    const validation = this.validateLeadData(data);
    if (!validation.isValid) {
      return failure(new ValidationError('Invalid lead data', flattenValidationErrors(validation.errors)));
    }

    const normalizedEmail = this.emailHashService.normalizeEmail(data.email);
    const emailHash = this.emailHashService.hashEmail(normalizedEmail);

    const existingLead = await this.leadRepository.findByEmailHash(emailHash);
    if (existingLead) {
      if (existingLead.verified) {
        return success(existingLead);
      }
      return success(existingLead);
    }

    const lead = await this.leadRepository.create({
      ...data,
      email: normalizedEmail,
      emailHash,
    });

    const otpResult = this.otpService.generateOtp();
    await this.otpRepository.create(lead.id, otpResult.hash, otpResult.expiresAt);

    await this.notificationService.sendOtpEmail(
      lead.email,
      lead.firstName,
      otpResult.otp
    );

    return success(lead);
  }

  /**
   * Verify a lead with OTP
   */
  async verifyLead(
    leadId: string,
    otp: string
  ): Promise<Result<{ lead: Lead; session: LeadSession }>> {
    const lockoutCheck = await this.rateLimitRepository.checkLockout(leadId);
    if (lockoutCheck.locked) {
      return failure(new LeadLockedOutError());
    }

    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      return failure(new NotFoundError('Lead', leadId));
    }

    if (lead.verified) {
      return failure(new LeadAlreadyVerifiedError(leadId));
    }

    const storedOtp = await this.otpRepository.findValidByLeadId(leadId);
    if (!storedOtp) {
      return failure(new OtpExpiredError());
    }

    if (storedOtp.attempts >= this.config.maxOtpAttempts) {
      await this.otpRepository.markUsed(storedOtp.id);
      return failure(new MaxOtpAttemptsError());
    }

    const isValid = this.otpService.verifyOtp(otp, storedOtp.otpHash);
    if (!isValid) {
      await this.otpRepository.incrementAttempts(storedOtp.id);
      const attemptResult = await this.rateLimitRepository.recordFailedAttempt(leadId);

      if (attemptResult.locked) {
        return failure(new LeadLockedOutError());
      }

      return failure(new OtpInvalidError(attemptResult.remainingAttempts));
    }

    await this.otpRepository.markUsed(storedOtp.id);
    const verifiedLead = await this.leadRepository.markVerified(leadId);

    if (!verifiedLead) {
      return failure(new NotFoundError('Lead', leadId));
    }

    const sessionExpiresAt = new Date(
      Date.now() + this.config.sessionExpiryDays * 24 * 60 * 60 * 1000
    );

    const session = await this.sessionRepository.create({
      leadId: verifiedLead.id,
      emailHash: verifiedLead.emailHash,
      expiresAt: sessionExpiresAt,
    });

    return success({ lead: verifiedLead, session });
  }

  /**
   * Resend OTP for a lead
   */
  async resendOtp(leadId: string): Promise<Result<void>> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      return failure(new NotFoundError('Lead', leadId));
    }

    if (lead.verified) {
      return failure(new LeadAlreadyVerifiedError(leadId));
    }

    const rateLimitCheck = await this.rateLimitRepository.checkRateLimit(
      lead.email,
      'otp_resend'
    );
    if (!rateLimitCheck.allowed) {
      return failure(
        new RateLimitError(
          'Too many verification requests. Please try again later.',
          rateLimitCheck.retryAfterSeconds
        )
      );
    }

    await this.otpRepository.invalidateForLead(leadId);

    const otpResult = this.otpService.generateOtp();
    await this.otpRepository.create(lead.id, otpResult.hash, otpResult.expiresAt);

    await this.notificationService.sendOtpEmail(
      lead.email,
      lead.firstName,
      otpResult.otp
    );

    return success(undefined);
  }

  /**
   * Qualify a lead with additional data
   */
  async qualifyLead(leadId: string, _data: QualifyLeadData): Promise<Result<Lead>> {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      return failure(new NotFoundError('Lead', leadId));
    }

    const updatedLead = await this.leadRepository.update(leadId, {
      status: 'qualified' as LeadStatus,
    });

    if (!updatedLead) {
      return failure(new NotFoundError('Lead', leadId));
    }

    return success(updatedLead);
  }

  /**
   * Check if an email has resource access
   */
  async checkLeadAccess(email: string): Promise<Result<LeadAccessResult>> {
    const normalizedEmail = this.emailHashService.normalizeEmail(email);
    const emailHash = this.emailHashService.hashEmail(normalizedEmail);

    const session = await this.sessionRepository.findByEmailHash(emailHash);

    if (!session) {
      return success({
        hasAccess: false,
        leadId: null,
        sessionId: null,
        reason: 'no_session',
      });
    }

    if (session.revoked) {
      return success({
        hasAccess: false,
        leadId: session.leadId,
        sessionId: session.id,
        reason: 'session_revoked',
      });
    }

    if (new Date(session.expiresAt) < new Date()) {
      return success({
        hasAccess: false,
        leadId: session.leadId,
        sessionId: session.id,
        reason: 'session_expired',
      });
    }

    const lead = await this.leadRepository.findById(session.leadId);
    if (!lead) {
      return success({
        hasAccess: false,
        leadId: session.leadId,
        sessionId: session.id,
        reason: 'lead_not_found',
      });
    }

    if (!lead.verified) {
      return success({
        hasAccess: false,
        leadId: lead.id,
        sessionId: session.id,
        reason: 'lead_not_verified',
      });
    }

    return success({
      hasAccess: true,
      leadId: lead.id,
      sessionId: session.id,
      reason: null,
    });
  }

  /**
   * Check lead access by session ID
   */
  async checkLeadAccessBySession(sessionId: string): Promise<Result<LeadAccessResult>> {
    const session = await this.sessionRepository.findValidSession(sessionId);

    if (!session) {
      return success({
        hasAccess: false,
        leadId: null,
        sessionId: null,
        reason: 'no_session',
      });
    }

    if (session.revoked) {
      return success({
        hasAccess: false,
        leadId: session.leadId,
        sessionId: session.id,
        reason: 'session_revoked',
      });
    }

    if (new Date(session.expiresAt) < new Date()) {
      return success({
        hasAccess: false,
        leadId: session.leadId,
        sessionId: session.id,
        reason: 'session_expired',
      });
    }

    const lead = await this.leadRepository.findById(session.leadId);
    if (!lead || !lead.verified) {
      return success({
        hasAccess: false,
        leadId: session.leadId,
        sessionId: session.id,
        reason: lead ? 'lead_not_verified' : 'lead_not_found',
      });
    }

    return success({
      hasAccess: true,
      leadId: lead.id,
      sessionId: session.id,
      reason: null,
    });
  }

  /**
   * Get a lead by ID
   */
  async getLeadById(id: string): Promise<Result<Lead>> {
    const lead = await this.leadRepository.findById(id);
    if (!lead) {
      return failure(new NotFoundError('Lead', id));
    }
    return success(lead);
  }

  /**
   * Get a lead by email
   */
  async getLeadByEmail(email: string): Promise<Result<Lead>> {
    const normalizedEmail = this.emailHashService.normalizeEmail(email);
    const lead = await this.leadRepository.findByEmail(normalizedEmail);
    if (!lead) {
      return failure(new NotFoundError('Lead', email));
    }
    return success(lead);
  }

  /**
   * Validate lead data
   */
  validateLeadData(data: CreateLeadData): LeadValidationResult {
    const errors: Record<string, string[]> = {};

    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.firstName = ['First name is required'];
    } else if (data.firstName.length > 100) {
      errors.firstName = ['First name must be 100 characters or less'];
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.lastName = ['Last name is required'];
    } else if (data.lastName.length > 100) {
      errors.lastName = ['Last name must be 100 characters or less'];
    }

    if (!data.email || data.email.trim().length === 0) {
      errors.email = ['Email is required'];
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.email = ['Please enter a valid email address'];
      } else if (this.config.requireBusinessEmail) {
        const domain = data.email.split('@')[1]?.toLowerCase();
        if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
          errors.email = ['Please use a business email address'];
        } else if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
          errors.email = ['Temporary email addresses are not accepted'];
        }
      }
    }

    if (!data.company || data.company.trim().length === 0) {
      errors.company = ['Company is required'];
    } else if (data.company.length > 200) {
      errors.company = ['Company name must be 200 characters or less'];
    }

    if (!data.jobTitle || data.jobTitle.trim().length === 0) {
      errors.jobTitle = ['Job title is required'];
    } else if (data.jobTitle.length > 100) {
      errors.jobTitle = ['Job title must be 100 characters or less'];
    }

    if (this.containsProfanity(data.firstName) ||
        this.containsProfanity(data.lastName) ||
        this.containsProfanity(data.company) ||
        this.containsProfanity(data.jobTitle)) {
      errors.content = ['Submission contains inappropriate content'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Check for profanity in text (simplified check)
   */
  private containsProfanity(text: string): boolean {
    const profanityPatterns = [
      /\bf+u+c+k/i,
      /\bs+h+i+t/i,
      /\ba+s+s+h+o+l+e/i,
      /\bb+i+t+c+h/i,
      /\bd+a+m+n/i,
    ];
    return profanityPatterns.some((pattern) => pattern.test(text));
  }
}
