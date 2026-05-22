/**
 * FinanceCompass Chatbot Security Utilities
 * 
 * Comprehensive security layer for API data protection:
 * - PII sanitisation before external API calls
 * - Request/response validation
 * - Security audit logging
 * - Data retention controls
 */

import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-chatbot-security");

// PII patterns to detect and sanitise
// Note: These patterns are for USER INPUT only, not AI responses
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  // Phone pattern - more specific to avoid false positives on dates/percentages
  // Must start with + or have clear phone format with country/area code
  phone: /\b(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/gi,
  // Removed nationalId - too many false positives on regular numbers
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  postcode: /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/gi,
};

// Sensitive field names to redact
const SENSITIVE_FIELDS = [
  'password', 'secret', 'token', 'apiKey', 'api_key',
  'authorization', 'auth', 'credential', 'private',
  'ssn', 'nationalId', 'passport', 'dob', 'dateOfBirth',
  'bankAccount', 'accountNumber', 'sortCode', 'routingNumber',
];

export interface SanitisationResult {
  sanitised: string;
  piiDetected: boolean;
  piiTypes: string[];
  originalLength: number;
  sanitisedLength: number;
}

export interface SecurityAuditEvent {
  eventType: 'api_call' | 'pii_detected' | 'injection_blocked' | 'rate_limit' | 'data_access';
  severity: 'info' | 'warning' | 'critical';
  sessionId?: string;
  userId?: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Sanitise text by removing/masking PII before sending to external APIs
 */
export function sanitisePII(text: string, options?: { 
  maskChar?: string;
  preserveFormat?: boolean;
}): SanitisationResult {
  const maskChar = options?.maskChar || '*';
  const piiTypes: string[] = [];
  let sanitised = text;
  let piiDetected = false;

  // Check and mask each PII pattern
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = sanitised.match(pattern);
    if (matches && matches.length > 0) {
      piiDetected = true;
      piiTypes.push(type);
      
      if (options?.preserveFormat) {
        // Preserve format but mask digits
        sanitised = sanitised.replace(pattern, (match) => 
          match.replace(/\d/g, maskChar)
        );
      } else {
        // Replace entirely with [REDACTED]
        sanitised = sanitised.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
      }
    }
  }

  return {
    sanitised,
    piiDetected,
    piiTypes,
    originalLength: text.length,
    sanitisedLength: sanitised.length,
  };
}

/**
 * Sanitise an object by removing sensitive fields
 */
export function sanitiseObject<T extends Record<string, unknown>>(
  obj: T,
  additionalSensitiveFields: string[] = []
): Partial<T> {
  const allSensitiveFields = [...SENSITIVE_FIELDS, ...additionalSensitiveFields];
  const sanitised: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Skip sensitive fields
    if (allSensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitised[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitise nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitised[key] = sanitiseObject(value as Record<string, unknown>, additionalSensitiveFields);
    } else if (typeof value === 'string') {
      // Sanitise string values for PII
      const result = sanitisePII(value);
      sanitised[key] = result.sanitised;
    } else {
      sanitised[key] = value;
    }
  }

  return sanitised as Partial<T>;
}

/**
 * Validate and sanitise user input before processing
 */
export function validateAndSanitiseInput(input: string): {
  isValid: boolean;
  sanitised: string;
  issues: string[];
} {
  const issues: string[] = [];
  let sanitised = input.trim();

  // Check length limits
  if (sanitised.length > 10000) {
    issues.push('Input exceeds maximum length');
    sanitised = sanitised.substring(0, 10000);
  }

  if (sanitised.length < 1) {
    issues.push('Input is empty');
    return { isValid: false, sanitised: '', issues };
  }

  // Remove null bytes and control characters (except newlines)
  sanitised = sanitised.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Sanitise HTML/script injection attempts
  sanitised = sanitised
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  // Check for excessive repetition (potential DoS)
  const repetitionPattern = /(.)\1{50,}/;
  if (repetitionPattern.test(sanitised)) {
    issues.push('Excessive character repetition detected');
    sanitised = sanitised.replace(/(.)\1{50,}/g, '$1$1$1');
  }

  return {
    isValid: issues.length === 0,
    sanitised,
    issues,
  };
}

/**
 * Sanitise API response before storing or displaying
 */
export function sanitiseApiResponse(response: string): string {
  // Remove any accidentally leaked API keys or tokens
  // NOTE: We do NOT apply full PII sanitisation to AI responses
  // because the AI generates legitimate numeric content (dates, percentages, etc.)
  // PII sanitisation should only be applied to USER INPUT going TO external APIs
  let sanitised = response;
  
  // Common API key patterns - these should never appear in responses
  const apiKeyPatterns = [
    /sk-[a-zA-Z0-9]{20,}/g, // OpenAI-style keys
    /pk-[a-zA-Z0-9]{20,}/g,
    /pplx-[a-zA-Z0-9]{20,}/g, // Perplexity keys
    /api[_-]?key[=:]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi,
    /bearer\s+[a-zA-Z0-9._-]{20,}/gi,
    /token[=:]\s*["']?[a-zA-Z0-9._-]{20,}["']?/gi,
  ];

  for (const pattern of apiKeyPatterns) {
    sanitised = sanitised.replace(pattern, '[API_KEY_REDACTED]');
  }

  // Only sanitise clear email patterns in responses (unlikely but possible)
  sanitised = sanitised.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    (match) => {
      // Don't redact common example emails or Constancia contact
      if (match.toLowerCase().includes('example') || 
          match.toLowerCase() === 'info@constancia.io') {
        return match;
      }
      return '[EMAIL_REDACTED]';
    }
  );
  
  // Remove em dashes - replace with regular hyphen surrounded by spaces
  sanitised = sanitised.replace(/—/g, ' - ');
  
  return sanitised;
}

/**
 * Log security audit event
 */
export async function logSecurityAudit(event: SecurityAuditEvent): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO security_events (event_type, severity, identifier, details, created_at)
      VALUES (
        ${`chatbot_${event.eventType}`},
        ${event.severity},
        ${event.sessionId || event.userId || 'anonymous'},
        ${JSON.stringify({
          action: event.action,
          ...event.details,
          timestamp: event.timestamp.toISOString(),
        })},
        NOW()
      )
    `);
  } catch (error) {
    // Log to console but don't throw - security logging should not break main flow
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to log audit event");
  }
}

/**
 * Log API call for security monitoring (without sensitive data)
 */
export async function logApiCall(
  sessionId: string,
  apiName: string,
  action: string,
  success: boolean,
  durationMs: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const sanitisedMetadata = metadata ? sanitiseObject(metadata) : {};
  
  await logSecurityAudit({
    eventType: 'api_call',
    severity: success ? 'info' : 'warning',
    sessionId,
    action: `${apiName}:${action}`,
    details: {
      success,
      durationMs,
      ...sanitisedMetadata,
    },
    timestamp: new Date(),
  });
}

/**
 * Data retention: Delete old chat sessions
 */
export async function cleanupOldSessions(retentionDays: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db.execute(sql`
      WITH deleted_messages AS (
        DELETE FROM fc_chat_messages
        WHERE session_id IN (
          SELECT id FROM fc_chat_sessions
          WHERE created_at < ${cutoffDate.toISOString()}
        )
        RETURNING 1
      ),
      deleted_sessions AS (
        DELETE FROM fc_chat_sessions
        WHERE created_at < ${cutoffDate.toISOString()}
        RETURNING 1
      )
      SELECT 
        (SELECT COUNT(*) FROM deleted_messages) as messages_deleted,
        (SELECT COUNT(*) FROM deleted_sessions) as sessions_deleted
    `);

    const deletedCount = (result as any)?.rows?.[0]?.sessions_deleted || 0;
    
    log.info({ deletedCount, retentionDays }, "Data retention cleanup complete");
    
    return deletedCount;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Failed to cleanup old sessions");
    return 0;
  }
}

/**
 * Rate limiting check for chat sessions
 */
export async function checkRateLimit(
  sessionId: string,
  maxMessagesPerMinute: number = 10
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  try {
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60000);
    
    // Get message count AND the oldest message timestamp in the window
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as message_count,
        MIN(created_at) as oldest_message_at
      FROM fc_chat_messages
      WHERE session_id = ${sessionId}
        AND created_at > ${oneMinuteAgo.toISOString()}
        AND role = 'user'
    `);

    const messageCount = parseInt((result as any)?.rows?.[0]?.message_count || '0', 10);
    const oldestMessageAt = (result as any)?.rows?.[0]?.oldest_message_at;
    
    const remaining = Math.max(0, maxMessagesPerMinute - messageCount);
    const allowed = messageCount < maxMessagesPerMinute;

    // Calculate reset time: when the oldest message in the window expires (falls outside the 1-minute window)
    let resetIn = 60; // Default to 60 seconds if no messages
    if (oldestMessageAt && !allowed) {
      const oldestTime = new Date(oldestMessageAt).getTime();
      const expiresAt = oldestTime + 60000; // When it will be older than 1 minute
      resetIn = Math.max(1, Math.ceil((expiresAt - now) / 1000));
    }

    if (!allowed) {
      await logSecurityAudit({
        eventType: 'rate_limit',
        severity: 'warning',
        sessionId,
        action: 'message_rate_exceeded',
        details: { messageCount, limit: maxMessagesPerMinute, resetIn },
        timestamp: new Date(),
      });
    }

    return {
      allowed,
      remaining,
      resetIn,
    };
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Rate limit check failed");
    // Fail open - allow the request but log the error
    return { allowed: true, remaining: maxMessagesPerMinute, resetIn: 60 };
  }
}

/**
 * Redact company names from text
 * Uses context to identify specific company names and redacts them
 */
function redactCompanyNames(
  text: string,
  context?: Record<string, unknown>
): { text: string; companiesRedacted: string[] } {
  let sanitised = text;
  const companiesRedacted: string[] = [];
  
  // Get company name from context if available
  const companyName = context?.companyName as string | undefined;
  if (companyName && companyName.length > 2 && companyName.length <= 200) {
    const sanitisedName = companyName.slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const companyPattern = new RegExp(sanitisedName, 'gi');
    if (companyPattern.test(sanitised)) {
      sanitised = sanitised.replace(companyPattern, '[COMPANY_REDACTED]');
      companiesRedacted.push(companyName);
    }
  }
  
  // Redact common company identifiers mentioned in natural language
  const companyIndicatorPatterns = [
    // "at [Company Name]", "for [Company Name]", "from [Company Name]"
    /(?:at|for|from|with)\s+([A-Z][A-Za-z0-9&\-']+(?:\s+(?:Ltd|Limited|Inc|Corp|Corporation|PLC|LLP|LLC|Group|Holdings|Partners))?)/g,
    // "our company [Name]", "my company [Name]"
    /(?:our|my|the)\s+company\s+([A-Z][A-Za-z0-9&\-']+)/gi,
    // Common suffixes that indicate company names
    /\b([A-Z][A-Za-z0-9&\-']+\s+(?:Ltd|Limited|Inc|Corp|Corporation|PLC|LLP|LLC|Group|Holdings|Partners|Consulting|Solutions))\b/g,
  ];
  
  for (const pattern of companyIndicatorPatterns) {
    sanitised = sanitised.replace(pattern, (match, captured) => {
      // Preserve common words that aren't company names
      const lowerCaptured = captured?.toLowerCase() || '';
      const commonWords = ['the', 'our', 'company', 'organisation', 'organization', 'business', 'firm', 'enterprise'];
      if (commonWords.includes(lowerCaptured)) {
        return match;
      }
      if (captured && captured.length > 2) {
        companiesRedacted.push(captured);
      }
      return match.replace(captured, '[COMPANY_REDACTED]');
    });
  }
  
  return { text: sanitised, companiesRedacted: Array.from(new Set(companiesRedacted)) };
}

/**
 * Prepare message for external API (sanitise PII and company names)
 */
export function prepareForExternalApi(
  message: string,
  context?: Record<string, unknown>
): { message: string; context: Record<string, unknown>; piiRemoved: boolean } {
  // First sanitise PII
  const messageResult = sanitisePII(message);
  
  // Then redact company names
  const companyResult = redactCompanyNames(messageResult.sanitised, context);
  
  const sanitisedContext = context ? sanitiseObject(context) : {};

  const piiRemoved = messageResult.piiDetected || companyResult.companiesRedacted.length > 0;
  
  if (messageResult.piiDetected) {
    log.info({ piiTypes: messageResult.piiTypes }, "PII sanitised before API call");
  }
  
  if (companyResult.companiesRedacted.length > 0) {
    log.info({ count: companyResult.companiesRedacted.length }, "Company names redacted");
  }

  return {
    message: companyResult.text,
    context: sanitisedContext as Record<string, unknown>,
    piiRemoved,
  };
}
