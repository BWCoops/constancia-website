/**
 * Email Core Module
 * 
 * Pure business logic for email operations.
 * Contains no HTTP or database dependencies.
 * 
 * @generated-by-ai (human-reviewed)
 */

// Types
export * from './types';

// Interfaces
export * from './interfaces';

// Services
export { EmailService, createDefaultEmailConfig } from './services/email.service';
export { TemplateService } from './services/template.service';
