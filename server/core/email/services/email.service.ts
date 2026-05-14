/**
 * Email Service
 * 
 * Pure business logic for email operations.
 * Uses injected adapter for actual email sending (MS Graph, SMTP, etc.)
 * 
 * NO HTTP imports, NO database imports - pure domain logic.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { 
  IEmailService, 
  IEmailAdapter, 
  IEmailTemplateService,
  EmailServiceDependencies,
} from '../interfaces';
import type { 
  EmailMessage, 
  EmailSendResult,
  EmailConfig,
  OtpEmailData,
  ContactEmailData,
  LeadNotificationData,
  ContactVerificationData,
} from '../types';
import { EmailTemplate } from '../types';
import { createChildLogger } from '../../../lib/logger';

const log = createChildLogger('email-service');

/**
 * Email service implementation with pure business logic
 */
export class EmailService implements IEmailService {
  private adapter: IEmailAdapter;
  private templateService: IEmailTemplateService;
  private config: EmailConfig;

  constructor(dependencies: EmailServiceDependencies) {
    this.adapter = dependencies.adapter;
    this.templateService = dependencies.templateService;
    this.config = dependencies.config;
  }

  /**
   * Check if email sending is available
   */
  isAvailable(): boolean {
    return this.adapter.isConfigured();
  }

  /**
   * Send a raw email message
   */
  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Email service not configured',
        timestamp: new Date(),
      };
    }

    try {
      return await this.adapter.send(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to send email');
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send an email using a template
   */
  async sendTemplate(context: { template: EmailTemplate; data: unknown }): Promise<EmailSendResult> {
    const { template, data } = context;
    
    try {
      const subject = this.templateService.getSubject(template, data);
      const html = this.templateService.renderHtml(template, data);
      
      const d = data as { to?: string; email?: string };
      const to = d.to || d.email || this.config.senderEmail;
      
      return await this.send({
        to,
        subject,
        html,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Template rendering failed';
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Template error');
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send multiple emails in bulk
   */
  async sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    const results = await Promise.allSettled(
      messages.map((message) => this.send(message))
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        success: false,
        error: result.reason?.message || 'Unknown error',
        timestamp: new Date(),
      };
    });
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(data: OtpEmailData): Promise<EmailSendResult> {
    const subject = this.templateService.getSubject(EmailTemplate.OTP_VERIFICATION, data);
    const html = this.templateService.renderHtml(EmailTemplate.OTP_VERIFICATION, {
      ...data,
      expiryMinutes: data.expiryMinutes ?? this.config.otpExpiryMinutes,
    });

    return this.send({
      to: data.to,
      subject,
      html,
    });
  }

  /**
   * Send contact confirmation email to team
   */
  async sendContactConfirmation(data: ContactEmailData): Promise<EmailSendResult> {
    const subject = this.templateService.getSubject(EmailTemplate.CONTACT_CONFIRMATION, data);
    const html = this.templateService.renderHtml(EmailTemplate.CONTACT_CONFIRMATION, data);

    return this.send({
      to: this.config.senderEmail,
      subject,
      html,
    });
  }

  /**
   * Send contact verification email to user
   */
  async sendContactVerification(data: ContactVerificationData): Promise<EmailSendResult> {
    const subject = this.templateService.getSubject(EmailTemplate.CONTACT_VERIFICATION, data);
    const html = this.templateService.renderHtml(EmailTemplate.CONTACT_VERIFICATION, data);

    return this.send({
      to: data.email,
      subject,
      html,
    });
  }

  /**
   * Send lead notification to team
   */
  async sendLeadNotification(data: LeadNotificationData): Promise<EmailSendResult> {
    const subject = this.templateService.getSubject(EmailTemplate.LEAD_NOTIFICATION, data);
    const html = this.templateService.renderHtml(EmailTemplate.LEAD_NOTIFICATION, data);

    return this.send({
      to: this.config.senderEmail,
      subject,
      html,
    });
  }
}

/**
 * Create default email configuration
 */
export function createDefaultEmailConfig(overrides?: Partial<EmailConfig>): EmailConfig {
  return {
    senderEmail: process.env.SENDER_EMAIL || 'info@1qg.com',
    senderName: '1QG',
    baseUrl: process.env.BASE_URL || 'https://1qg.com',
    otpExpiryMinutes: 10,
    ...overrides,
  };
}
