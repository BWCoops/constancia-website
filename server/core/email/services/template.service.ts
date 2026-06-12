/**
 * Email Template Service
 * 
 * Renders email templates with Constancia branding.
 * Contains all email HTML templates and subject line logic.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { IEmailTemplateService } from '../interfaces';
import { 
  EmailTemplate, 
  type OtpEmailData,
  type ContactEmailData,
  type LeadNotificationData,
  type ContactVerificationData,
} from '../types';
import {
  generateEmailHeader,
  generateEmailFooter,
  generateEmailWrapper,
  generateNotificationHeader,
  generateOtpBox,
  generateCtaButton,
  generateWarningBox,
  generateSuccessBox,
  generateInfoCard,
  EMAIL_BRAND,
  EMAIL_CONTACT,
} from '../components';

const DEFAULT_OTP_EXPIRY_MINUTES = 10;

/**
 * Template service implementation
 */
export class TemplateService implements IEmailTemplateService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://constancia.io') {
    this.baseUrl = baseUrl;
  }

  getSubject(template: EmailTemplate, data: unknown): string {
    const d = data as Record<string, unknown>;
    switch (template) {
      case EmailTemplate.OTP_VERIFICATION:
        return 'Your Constancia Resource Access Code';
      
      case EmailTemplate.CONTACT_CONFIRMATION:
        return `New Contact Form Submission from ${d.firstName} ${d.lastName}`;
      
      case EmailTemplate.CONTACT_VERIFICATION:
        return 'Verify your email - Constancia Contact';
      
      case EmailTemplate.LEAD_NOTIFICATION:
        return `New Verified Lead: ${d.firstName} ${d.lastName} from ${d.company}`;
      
      case EmailTemplate.RESOURCE_DOWNLOAD:
        return `Resource Download: ${d.firstName} ${d.lastName}`;
      
      case EmailTemplate.NEWSLETTER_WELCOME:
        return 'Welcome to Constancia Insights';
      
      case EmailTemplate.PASSWORD_RESET:
        return 'Reset Your Constancia Password';
      
      default:
        return 'Constancia Notification';
    }
  }

  renderHtml(template: EmailTemplate, data: unknown): string {
    switch (template) {
      case EmailTemplate.OTP_VERIFICATION:
        return this.renderOtpTemplate(data as OtpEmailData);
      
      case EmailTemplate.CONTACT_CONFIRMATION:
        return this.renderContactConfirmationTemplate(data as ContactEmailData);
      
      case EmailTemplate.CONTACT_VERIFICATION:
        return this.renderContactVerificationTemplate(data as ContactVerificationData);
      
      case EmailTemplate.LEAD_NOTIFICATION:
        return this.renderLeadNotificationTemplate(data as LeadNotificationData);
      
      default:
        throw new Error(`Unknown template: ${template}`);
    }
  }

  getAvailableTemplates(): EmailTemplate[] {
    return [
      EmailTemplate.OTP_VERIFICATION,
      EmailTemplate.CONTACT_CONFIRMATION,
      EmailTemplate.CONTACT_VERIFICATION,
      EmailTemplate.LEAD_NOTIFICATION,
      EmailTemplate.RESOURCE_DOWNLOAD,
    ];
  }

  /**
   * Render OTP verification email template
   */
  private renderOtpTemplate(data: OtpEmailData): string {
    const expiryMinutes = data.expiryMinutes ?? DEFAULT_OTP_EXPIRY_MINUTES;
    
    const header = generateEmailHeader({ variant: 'light' });
    
    const body = `
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; margin: 0 0 20px 0;">Hi ${this.escapeHtml(data.firstName)},</p>
      
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for your interest in Constancia resources. Please use the following code to access your download:
      </p>
      
      ${generateOtpBox(this.escapeHtml(data.otp))}
      
      <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; margin: 0;">This code expires in ${expiryMinutes} minutes.</p>
    `;
    
    const footer = generateEmailFooter({ variant: 'dark', showFinanceCompass: true });
    
    return generateEmailWrapper(header, body, footer);
  }

  /**
   * Render contact form confirmation email (sent to team)
   */
  private renderContactConfirmationTemplate(data: ContactEmailData): string {
    const header = generateNotificationHeader({ title: 'New Contact Form Submission', subtitle: 'Constancia Website' });
    
    const contactTable = `
      <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Contact Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray}; width: 120px;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.firstName)} ${this.escapeHtml(data.lastName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${this.escapeHtml(data.email)}" style="color: ${EMAIL_BRAND.deepMint};">${this.escapeHtml(data.email)}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Company:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.company)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Job Title:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.jobTitle)}</td>
        </tr>
        ${data.phone ? `
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Phone:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.phone)}</td>
        </tr>
        ` : ''}
      </table>
    `;
    
    const messageSection = data.message ? `
      <div style="background: ${EMAIL_BRAND.white}; padding: 20px; border: 1px solid ${EMAIL_BRAND.mediumGray}; border-radius: 8px; margin-top: 20px;">
        <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Message</h2>
        <p style="color: ${EMAIL_BRAND.darkGray}; line-height: 1.6; white-space: pre-wrap;">${this.escapeHtml(data.message)}</p>
      </div>
    ` : '';

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${header}
        ${generateInfoCard(contactTable)}
        ${messageSection}
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 12px; text-align: center;">
          This notification was sent from the Constancia website contact form.
          <br>
          Submitted: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>
    `;
  }

  /**
   * Render contact verification email (sent to user)
   */
  private renderContactVerificationTemplate(data: ContactVerificationData): string {
    const verificationLink = `${this.baseUrl}/api/contact/verify?token=${data.verificationToken}`;
    
    const header = generateEmailHeader({ variant: 'dark' });
    
    const body = `
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; margin: 0 0 20px 0;">Hi ${this.escapeHtml(data.firstName)},</p>
      
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for contacting Constancia. Please verify your email address to confirm your enquiry.
      </p>
      
      ${generateCtaButton('Verify Email Address', verificationLink)}
      
      <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 14px; margin: 25px 0 10px 0;">
        If the button above doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: ${EMAIL_BRAND.deepMint}; font-size: 13px; word-break: break-all; background-color: ${EMAIL_BRAND.lightGray}; padding: 12px; border-radius: 4px; margin: 0 0 25px 0;">
        ${verificationLink}
      </p>
      
      ${generateWarningBox('<strong>Note:</strong> This link expires in 24 hours. After expiration, you\'ll need to submit a new contact request.')}
      
      <p style="color: ${EMAIL_BRAND.darkGray}; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
        Once verified, our team will review your enquiry and get back to you shortly.
      </p>
    `;
    
    const footer = generateEmailFooter({ variant: 'dark', showFinanceCompass: true });
    
    return generateEmailWrapper(header, body, footer);
  }

  /**
   * Render lead notification email (sent to team)
   */
  private renderLeadNotificationTemplate(data: LeadNotificationData): string {
    const hasFingerprintData = data.screenResolution || data.timezone || data.language || data.referrer || data.pageUrl;
    
    const fingerprintSection = hasFingerprintData ? `
      <div style="background: #edf5f1; padding: 15px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #7FB8A3;">
        <h3 style="color: #5E8D7A; margin: 0 0 10px 0; font-size: 14px; letter-spacing: 0.04em;">Browser Fingerprint Data</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          ${data.screenResolution ? `
          <tr>
            <td style="padding: 4px 0; color: #5E8D7A; width: 120px;"><strong>Screen:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.screenResolution)}</td>
          </tr>` : ''}
          ${data.timezone ? `
          <tr>
            <td style="padding: 4px 0; color: #5E8D7A;"><strong>Timezone:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.timezone)}</td>
          </tr>` : ''}
          ${data.language ? `
          <tr>
            <td style="padding: 4px 0; color: #5E8D7A;"><strong>Language:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.language)}</td>
          </tr>` : ''}
          ${data.referrer ? `
          <tr>
            <td style="padding: 4px 0; color: #5E8D7A;"><strong>Referrer:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.referrer)}</td>
          </tr>` : ''}
          ${data.pageUrl ? `
          <tr>
            <td style="padding: 4px 0; color: #5E8D7A;"><strong>Page URL:</strong></td>
            <td style="padding: 4px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.pageUrl)}</td>
          </tr>` : ''}
        </table>
      </div>
    ` : '';

    const leadDetailsTable = `
      <h2 style="color: ${EMAIL_BRAND.charcoal}; margin-top: 0;">Lead Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray}; width: 120px;"><strong>Name:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.firstName)} ${this.escapeHtml(data.lastName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${this.escapeHtml(data.email)}" style="color: ${EMAIL_BRAND.deepMint};">${this.escapeHtml(data.email)}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Company:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.company)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Job Title:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.jobTitle)}</td>
        </tr>
        ${data.resourceTitle ? `
        <tr>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.mutedGray};"><strong>Resource:</strong></td>
          <td style="padding: 8px 0; color: ${EMAIL_BRAND.darkGray};">${this.escapeHtml(data.resourceTitle)}</td>
        </tr>
        ` : ''}
      </table>
    `;

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${generateNotificationHeader({ title: 'New Verified Lead', subtitle: 'Resource Download' })}
        
        ${generateInfoCard(leadDetailsTable)}
        
        ${fingerprintSection}
        
        ${generateSuccessBox('This lead has verified their email address via OTP and downloaded a resource.')}
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: ${EMAIL_BRAND.mutedGray}; font-size: 12px; text-align: center;">
          This notification was sent automatically from the Constancia website.
          <br>
          Verified: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
  }
}
