/**
 * Audit Service
 * 
 * Business logic for audit logging operations.
 * Provides comprehensive audit trail functionality for admin actions.
 * 
 * This service is pure business logic and uses repository interfaces
 * for data access, making it testable and independent of infrastructure.
 */

import type { Result } from '../../types';
import { success, failure, NotFoundError, ValidationError } from '../../types';
import type {
  AuditLogEntry,
  AuditAction,
  AuditResourceType,
  AuditActor,
  AuditLogFilters,
  AuditLogSearchQuery,
} from '../types';
import type {
  IAuditService,
  IAuditLogRepository,
  AuditContext,
} from '../interfaces';
import { createChildLogger } from '../../../lib/logger';

const logger = createChildLogger('audit-service');

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'totpSecret',
  'totp_secret',
  'backupCodes',
  'backup_codes',
  'otpHash',
  'otp_hash',
  'encryptedEmail',
];

export class AuditService implements IAuditService {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  async logAction(
    actor: AuditActor,
    action: AuditAction,
    resourceType: AuditResourceType,
    resourceId: string | null,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
    context: AuditContext
  ): Promise<Result<string>> {
    try {
      const redactedBefore = this.redactSensitiveFields(beforeState);
      const redactedAfter = this.redactSensitiveFields(afterState);

      const changes = action === 'UPDATE' 
        ? this.computeChanges(redactedBefore, redactedAfter) 
        : null;

      const entry = await this.auditLogRepository.create({
        action,
        actorId: actor.id,
        actorEmail: actor.email,
        resourceType,
        resourceId,
        beforeState: redactedBefore,
        afterState: redactedAfter,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent?.slice(0, 500) || null,
        sessionId: context.sessionId || null,
        metadata: context.metadata 
          ? { ...context.metadata, changes } 
          : changes ? { changes } : null,
      });

      if (this.isHighRiskAction(action)) {
        logger.info({ action, actorEmail: actor.email, resourceType, resourceId, ipAddress: context.ipAddress }, 'High-risk audit action');
      }

      return success(entry.id);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to log action');
      return failure(new ValidationError('Failed to create audit log entry'));
    }
  }

  async getAuditLog(filters: AuditLogFilters): Promise<Result<AuditLogEntry[]>> {
    try {
      const entries = await this.auditLogRepository.findByFilters(filters);
      return success(entries);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to fetch audit logs');
      return failure(new ValidationError('Failed to fetch audit logs'));
    }
  }

  async getAuditLogById(id: string): Promise<Result<AuditLogEntry>> {
    try {
      const entry = await this.auditLogRepository.findById(id);
      
      if (!entry) {
        return failure(new NotFoundError('AuditLogEntry', id));
      }
      
      return success(entry);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to fetch audit log');
      return failure(new ValidationError('Failed to fetch audit log entry'));
    }
  }

  async searchLogs(query: AuditLogSearchQuery): Promise<Result<AuditLogEntry[]>> {
    try {
      const entries = await this.auditLogRepository.search(query);
      return success(entries);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to search audit logs');
      return failure(new ValidationError('Failed to search audit logs'));
    }
  }

  async getResourceHistory(
    resourceType: AuditResourceType,
    resourceId: string
  ): Promise<Result<AuditLogEntry[]>> {
    try {
      const entries = await this.auditLogRepository.findByResourceId(
        resourceType,
        resourceId
      );
      return success(entries);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to fetch resource history');
      return failure(new ValidationError('Failed to fetch resource history'));
    }
  }

  private redactSensitiveFields(
    obj: Record<string, unknown> | null
  ): Record<string, unknown> | null {
    if (!obj) return null;

    const redacted = { ...obj };

    for (const key of Object.keys(redacted)) {
      if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      }
      if (
        typeof redacted[key] === 'object' &&
        redacted[key] !== null &&
        !Array.isArray(redacted[key])
      ) {
        redacted[key] = this.redactSensitiveFields(
          redacted[key] as Record<string, unknown>
        );
      }
    }

    return redacted;
  }

  private computeChanges(
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null
  ): Record<string, { from: unknown; to: unknown }> | null {
    if (!before && !after) return null;
    if (!before || !after) return null;

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const allKeys = Array.from(
      new Set([...Object.keys(before), ...Object.keys(after)])
    );

    for (const key of allKeys) {
      const fromVal = before[key];
      const toVal = after[key];

      if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        changes[key] = { from: fromVal, to: toVal };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private isHighRiskAction(action: AuditAction): boolean {
    return [
      'DELETE',
      'ERASURE_REQUEST',
      'PERMISSION_CHANGE',
      'BULK_DELETE',
      'CONFIG_CHANGE',
    ].includes(action);
  }
}

/**
 * Factory function to create AuditService with dependencies
 */
export function createAuditService(
  auditLogRepository: IAuditLogRepository
): IAuditService {
  return new AuditService(auditLogRepository);
}
