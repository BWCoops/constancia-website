/**
 * Services Layer Tests
 * 
 * Tests for core services including:
 * - Encryption
 * - Audit Logger
 * - SEO
 */

import { describe, test, expect } from 'vitest';

describe('Encryption Service', () => {
  test('should export encryptField and decryptField functions', async () => {
    const encryption = await import('../services/encryption');
    expect(typeof encryption.encryptField).toBe('function');
    expect(typeof encryption.decryptField).toBe('function');
  });

  test('should encrypt and decrypt a string correctly', async () => {
    const { encryptField, decryptField } = await import('../services/encryption');
    const original = 'test-secret-data';
    const encrypted = encryptField(original);
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(original);
  });

  test('should produce different encrypted output each time (due to IV)', async () => {
    const { encryptField } = await import('../services/encryption');
    const data = 'same-data';
    const encrypted1 = encryptField(data);
    const encrypted2 = encryptField(data);
    expect(encrypted1).not.toBe(encrypted2);
  });
});

describe('Audit Logger Service', () => {
  test('should export logAuditEvent function', async () => {
    const auditLogger = await import('../services/audit-logger');
    expect(typeof auditLogger.logAuditEvent).toBe('function');
  });

  test('should export AuditAction type', async () => {
    const auditLogger = await import('../services/audit-logger');
    expect(auditLogger).toBeDefined();
    expect(typeof auditLogger.logAuditEvent).toBe('function');
  });
});

describe('Logger Service', () => {
  test('should export logger instance', async () => {
    const loggerModule = await import('../services/logger');
    expect(loggerModule.logger).toBeDefined();
  });

  test('logger should have info, error, warn methods', async () => {
    const { logger } = await import('../services/logger');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });
});

describe('SEO Service', () => {
  test('should export generateSitemap function', async () => {
    const seoService = await import('../services/seo');
    expect(typeof seoService.generateSitemap).toBe('function');
  });
});

describe('Operations Service', () => {
  test('should export operations tracking functions', async () => {
    const operations = await import('../services/operations');
    expect(operations).toBeDefined();
  });
});

describe('GDPR Compliance Service', () => {
  test('should export GDPR functions', async () => {
    const gdpr = await import('../services/gdpr-compliance');
    expect(gdpr).toBeDefined();
  });
});

describe('Turnstile Service', () => {
  test('should export verifyTurnstileToken function', async () => {
    const turnstile = await import('../services/turnstile');
    expect(typeof turnstile.verifyTurnstileToken).toBe('function');
  });
});
