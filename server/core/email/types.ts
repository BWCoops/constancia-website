/**
 * Email Domain Types
 * 
 * Core types for email sending business logic.
 * These types are independent of the underlying email provider (MS Graph, SMTP, etc.)
 * 
 * @generated-by-ai (human-reviewed)
 */

/**
 * Email message interface for sending emails
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email templates available in the system
 */
export enum EmailTemplate {
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  CONTACT_CONFIRMATION = 'CONTACT_CONFIRMATION',
  CONTACT_VERIFICATION = 'CONTACT_VERIFICATION',
  LEAD_NOTIFICATION = 'LEAD_NOTIFICATION',
  RESOURCE_DOWNLOAD = 'RESOURCE_DOWNLOAD',
  NEWSLETTER_WELCOME = 'NEWSLETTER_WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

/**
 * Result of an email send operation
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Email configuration
 */
export interface EmailConfig {
  senderEmail: string;
  senderName?: string;
  replyTo?: string;
  baseUrl: string;
  otpExpiryMinutes: number;
}

/**
 * OTP email data
 */
export interface OtpEmailData {
  to: string;
  firstName: string;
  otp: string;
  expiryMinutes?: number;
}

/**
 * Contact data for emails
 */
export interface ContactEmailData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  message?: string;
  phone?: string;
}

/**
 * Lead notification data
 */
export interface LeadNotificationData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  resourceId?: string;
  resourceTitle?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  referrer?: string;
  pageUrl?: string;
}

/**
 * Contact verification data
 */
export interface ContactVerificationData {
  firstName: string;
  email: string;
  verificationToken: string;
}

/**
 * Template context - data passed to email templates
 */
export type TemplateContext = 
  | { template: EmailTemplate.OTP_VERIFICATION; data: OtpEmailData }
  | { template: EmailTemplate.CONTACT_CONFIRMATION; data: ContactEmailData }
  | { template: EmailTemplate.CONTACT_VERIFICATION; data: ContactVerificationData }
  | { template: EmailTemplate.LEAD_NOTIFICATION; data: LeadNotificationData }
  | { template: EmailTemplate.RESOURCE_DOWNLOAD; data: LeadNotificationData }
  | { template: EmailTemplate.NEWSLETTER_WELCOME; data: { firstName: string; email: string } }
  | { template: EmailTemplate.PASSWORD_RESET; data: { firstName: string; resetToken: string } };
