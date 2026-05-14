/**
 * Email Service Interfaces
 * 
 * Interfaces for email sending and template rendering.
 * Implementations can use MS Graph, SMTP, or any other email provider.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { 
  EmailMessage, 
  EmailSendResult, 
  EmailTemplate,
  EmailConfig 
} from './types';

/**
 * Interface for the underlying email sending service (adapter)
 * This is what gets injected into the business logic service
 */
export interface IEmailAdapter {
  /**
   * Send a raw email message
   */
  send(message: EmailMessage): Promise<EmailSendResult>;
  
  /**
   * Check if the email service is configured and available
   */
  isConfigured(): boolean;
}

/**
 * Interface for the email business logic service
 */
export interface IEmailService {
  /**
   * Send a single email
   */
  send(message: EmailMessage): Promise<EmailSendResult>;
  
  /**
   * Send an email using a template
   */
  sendTemplate(context: { template: EmailTemplate; data: unknown }): Promise<EmailSendResult>;
  
  /**
   * Send emails to multiple recipients
   */
  sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]>;
  
  /**
   * Check if email sending is available
   */
  isAvailable(): boolean;
}

/**
 * Interface for email template rendering
 */
export interface IEmailTemplateService {
  /**
   * Get the subject line for a template
   */
  getSubject(template: EmailTemplate, data: unknown): string;
  
  /**
   * Render an email template to HTML
   */
  renderHtml(template: EmailTemplate, data: unknown): string;
  
  /**
   * Render an email template to plain text (optional)
   */
  renderText?(template: EmailTemplate, data: unknown): string;
  
  /**
   * Get available templates
   */
  getAvailableTemplates(): EmailTemplate[];
}

/**
 * Dependencies required by the email service
 */
export interface EmailServiceDependencies {
  adapter: IEmailAdapter;
  templateService: IEmailTemplateService;
  config: EmailConfig;
}
