/**
 * Validation Service
 * 
 * Pure business logic for input validation and sanitization.
 * Extracts validation logic from existing content-validation.ts
 * for use across the application.
 */

import { z } from 'zod';
import DOMPurify, { Config } from 'isomorphic-dompurify';
import type {
  ValidationResult,
  EmailValidationOptions,
  ContentValidationOptions,
  SanitizeOptions,
} from '../types';
import type { IValidationService } from '../interfaces';

/**
 * Disposable email domains to block
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.org',
  '10minutemail.com', '10minmail.com', 'mailinator.com', 'maildrop.cc',
  'throwaway.email', 'throwawaymail.com', 'fakeinbox.com', 'getnada.com',
  'tempail.com', 'mohmal.com', 'dispostable.com', 'mailnesia.com',
  'trashmail.com', 'trashmail.net', 'spamgourmet.com', 'mytrashmail.com',
  'sharklasers.com', 'grr.la', 'spam4.me', 'yopmail.com', 'yopmail.fr',
  'mailcatch.com', 'meltmail.com', 'mintemail.com', 'mt2009.com',
  'dropmail.me', 'emailondeck.com', 'getairmail.com', 'tempinbox.com',
  'burnermail.io', 'tempr.email', 'discard.email', 'mailsac.com',
  'harakirimail.com', '33mail.com', 'spamex.com', 'spamfree24.org',
]);

/**
 * Free email providers (non-business)
 */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'live.com', 'msn.com', 'me.com', 'inbox.com',
]);

/**
 * Profanity patterns
 */
const PROFANITY_PATTERNS = [
  /\bf+u+c+k+/i, /\bs+h+[i1]+t+/i, /\ba+s+s+(?:h+o+l+e+)?/i,
  /\bb+[i1]+t+c+h+/i, /\bd+[i1]+c+k+/i, /\bc+u+n+t+/i,
  /\bp+[i1]+s+s+/i, /\bw+h+o+r+e+/i, /\bd+a+m+n+/i,
  /\bb+a+s+t+a+r+d+/i, /\bc+r+a+p+/i, /\bh+e+l+l+/i,
  /\bn+[i1]+g+g+/i, /\bf+a+g+/i, /\br+e+t+a+r+d+/i,
  /\bs+l+u+t+/i, /\bw+a+n+k+/i, /\bt+w+a+t+/i, /\bp+r+[i1]+c+k+/i,
];

/**
 * Spam keyword patterns
 */
const SPAM_KEYWORDS = [
  /\bcasino\b/i, /\bpoker\b/i, /\bgambling\b/i, /\blottery\b/i,
  /\bviagra\b/i, /\bcialis\b/i, /\bprescription\b/i, /\bpharmacy\b/i,
  /\bcrypto\s*currency\b/i, /\bbitcoin\b/i, /\bethereum\b/i,
  /\binvestment\s*opportunity\b/i, /\bget\s*rich\s*quick\b/i,
  /\bmake\s*money\s*fast\b/i, /\bwork\s*from\s*home\b/i,
  /\bfree\s*money\b/i, /\beasy\s*money\b/i, /\bmillion\s*dollars?\b/i,
  /\bclick\s*here\b/i, /\bact\s*now\b/i, /\blimited\s*time\b/i,
  /\bfree\s*trial\b/i, /\bno\s*obligation\b/i, /\brisk\s*free\b/i,
  /\bcongratulations\b/i, /\byou\s*(?:have\s+)?won\b/i, /\bprize\b/i,
  /\bsex\b/i, /\bporn\b/i, /\bxxx\b/i, /\badult\b/i, /\bnude\b/i,
  /\bdating\b/i, /\bmeet\s*singles\b/i, /\bhookup\b/i,
  /\bweight\s*loss\b/i, /\blose\s*weight\b/i, /\bslim\s*fast\b/i,
  /\bseo\s*services?\b/i, /\blink\s*building\b/i, /\bbacklinks?\b/i,
  /\bweb\s*traffic\b/i, /\bfollowers\b/i, /\blikes\b/i,
];

/**
 * URL patterns to detect
 */
const URL_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\.[a-z]{2,}\//i,
  /\[url\]/i,
  /\[link\]/i,
  /<a\s+href/i,
  /\.(com|org|net|io|co|uk|de|fr|info|biz)\b/i,
];

/**
 * Suspicious patterns in names
 */
const SUSPICIOUS_NAME_PATTERNS = [
  /\d{3,}/,
  /[<>{}[\]\\]/,
  /@/,
  /^\s*$/,
  /^[^a-zA-Z]/,
  /[a-zA-Z]{20,}/,
];

/**
 * Valid phone number patterns
 */
const VALID_PHONE_PATTERNS = [
  /^(?:\+44|0044|44)?[0-9\s\-().]{10,14}$/,
  /^\+?[1-9]\d{6,14}$/,
];

/**
 * HTML sanitization config
 */
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
  'article', 'section', 'header', 'footer',
];

const ALLOWED_ATTRS = [
  'href', 'title', 'alt', 'src', 'class', 'id',
  'target', 'rel', 'width', 'height',
  'colspan', 'rowspan', 'scope',
  'data-testid',
];

const FORBID_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed',
  'form', 'input', 'button', 'textarea', 'select',
  'svg', 'math', 'canvas', 'video', 'audio',
];

const FORBID_ATTRS = [
  'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur',
  'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
  'style',
];

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validation service implementation
 */
export class ValidationService implements IValidationService {
  /**
   * Validate an email address
   */
  validateEmail(email: string, options: EmailValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const trimmed = email?.trim().toLowerCase() || '';
    
    if (!trimmed) {
      errors.push('Email address is required');
      return { isValid: false, errors, warnings };
    }
    
    if (!EMAIL_REGEX.test(trimmed)) {
      errors.push('Invalid email format');
      return { isValid: false, errors, warnings };
    }
    
    const domain = trimmed.split('@')[1];
    
    if (!options.allowDisposable && this.isDisposableEmail(trimmed)) {
      errors.push('Disposable email addresses are not allowed');
    }
    
    if (options.requireBusinessEmail && FREE_EMAIL_DOMAINS.has(domain)) {
      errors.push('Please use a business email address');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: trimmed,
    };
  }
  
  /**
   * Validate input against a Zod schema
   */
  validateInput<T>(input: unknown, schema: z.ZodType<T>): { valid: boolean; data?: T; errors?: string[] } {
    const result = schema.safeParse(input);
    
    if (result.success) {
      return { valid: true, data: result.data };
    }
    
    const errors = result.error.errors.map(e => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    });
    
    return { valid: false, errors };
  }
  
  /**
   * Validate a name field
   */
  validateName(name: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const trimmed = name?.trim() || '';
    
    if (!trimmed) {
      errors.push('Name cannot be empty');
      return { isValid: false, errors, warnings };
    }
    
    if (trimmed.length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    if (trimmed.length > 100) {
      errors.push('Name cannot exceed 100 characters');
    }
    
    if (this.containsUrls(trimmed)) {
      errors.push('Name cannot contain URLs or web addresses');
    }
    
    if (this.containsProfanity(trimmed)) {
      errors.push('Name contains inappropriate language');
    }
    
    if (SUSPICIOUS_NAME_PATTERNS.some(p => p.test(trimmed))) {
      warnings.push('Name contains suspicious characters');
    }
    
    const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < trimmed.length * 0.5) {
      warnings.push('Name should primarily contain letters');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: trimmed,
    };
  }
  
  /**
   * Validate a message/text content
   */
  validateMessage(message: string, options: ContentValidationOptions = {}): ValidationResult {
    const minLength = options.minLength ?? 10;
    const maxLength = options.maxLength ?? 5000;
    const errors: string[] = [];
    const warnings: string[] = [];
    const trimmed = message?.trim() || '';
    
    if (!trimmed) {
      errors.push('Message cannot be empty');
      return { isValid: false, errors, warnings };
    }
    
    if (trimmed.length < minLength) {
      errors.push(`Message must be at least ${minLength} characters`);
    }
    
    if (trimmed.length > maxLength) {
      errors.push(`Message cannot exceed ${maxLength} characters`);
    }
    
    if (options.checkProfanity !== false && this.containsProfanity(trimmed)) {
      errors.push('Message contains inappropriate language');
    }
    
    if (options.checkSpam !== false && this.containsSpam(trimmed)) {
      errors.push('Message appears to contain spam content');
    }
    
    if (!options.allowUrls) {
      const linkCount = (trimmed.match(/https?:\/\//gi) || []).length;
      if (linkCount > 3) {
        warnings.push('Message contains many links');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: trimmed,
    };
  }
  
  /**
   * Validate a company name
   */
  validateCompany(company: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const trimmed = company?.trim() || '';
    
    if (!trimmed) {
      errors.push('Company name cannot be empty');
      return { isValid: false, errors, warnings };
    }
    
    if (trimmed.length < 2) {
      errors.push('Company name must be at least 2 characters');
    }
    
    if (trimmed.length > 200) {
      errors.push('Company name cannot exceed 200 characters');
    }
    
    if (this.containsProfanity(trimmed)) {
      errors.push('Company name contains inappropriate language');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: trimmed,
    };
  }
  
  /**
   * Validate a phone number
   */
  validatePhone(phone: string | null | undefined): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!phone) {
      return { isValid: true, errors, warnings };
    }
    
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, '');
    
    if (digits.length < 7) {
      errors.push('Phone number is too short');
    }
    
    if (digits.length > 15) {
      errors.push('Phone number is too long');
    }
    
    const isValidFormat = VALID_PHONE_PATTERNS.some(p => p.test(trimmed));
    if (!isValidFormat && digits.length >= 7) {
      warnings.push('Phone number format may be invalid');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: trimmed,
    };
  }
  
  /**
   * Sanitize HTML input
   */
  sanitize(html: string, options: SanitizeOptions = {}): string {
    if (!html) return '';
    
    if (options.stripAllHtml) {
      return String(DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }));
    }
    
    let allowedTags = [...ALLOWED_TAGS];
    
    if (!options.allowLinks) {
      allowedTags = allowedTags.filter(tag => tag !== 'a');
    }
    
    if (!options.allowImages) {
      allowedTags = allowedTags.filter(tag => !['img', 'figure', 'figcaption'].includes(tag));
    }
    
    if (!options.allowTables) {
      allowedTags = allowedTags.filter(tag =>
        !['table', 'thead', 'tbody', 'tr', 'th', 'td'].includes(tag)
      );
    }
    
    const config: Config = {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: [...ALLOWED_ATTRS],
      FORBID_TAGS: [...FORBID_TAGS],
      FORBID_ATTR: [...FORBID_ATTRS],
      ALLOW_DATA_ATTR: false,
      USE_PROFILES: { html: true },
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
    };
    
    return String(DOMPurify.sanitize(html, config));
  }
  
  /**
   * Check if text contains profanity
   */
  containsProfanity(text: string): boolean {
    if (!text) return false;
    return PROFANITY_PATTERNS.some(pattern => pattern.test(text));
  }
  
  /**
   * Check if text contains spam patterns
   */
  containsSpam(text: string): boolean {
    if (!text) return false;
    const matches = SPAM_KEYWORDS.filter(pattern => pattern.test(text));
    return matches.length >= 2;
  }
  
  /**
   * Check if text contains URLs
   */
  containsUrls(text: string): boolean {
    if (!text) return false;
    return URL_PATTERNS.some(pattern => pattern.test(text));
  }
  
  /**
   * Check if email is from a disposable domain
   */
  isDisposableEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return DISPOSABLE_EMAIL_DOMAINS.has(domain);
  }
}

/**
 * Create a validation service instance
 */
export function createValidationService(): ValidationService {
  return new ValidationService();
}
