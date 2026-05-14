/**
 * Dashboard Service
 * 
 * Business logic for admin dashboard statistics and KPIs.
 * Provides aggregated metrics for the admin overview panel.
 * 
 * This service is pure business logic and uses repository interfaces
 * for data access, making it testable and independent of infrastructure.
 */

import type { Result } from '../../types';
import { success, failure, ValidationError } from '../../types';
import type {
  DashboardStats,
  RecentLead,
  RecentActivity,
  RecentScan,
  AuditLogEntry,
} from '../types';
import type {
  IDashboardService,
  IDashboardRepository,
  IAuditLogRepository,
} from '../interfaces';
import { createChildLogger } from '../../../lib/logger';

const log = createChildLogger('dashboard-service');

const DEFAULT_DAYS_RANGE = 30;
const DEFAULT_RECENT_LIMIT = 10;

export class DashboardService implements IDashboardService {
  constructor(
    private readonly dashboardRepository: IDashboardRepository,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  async getStats(): Promise<Result<DashboardStats>> {
    try {
      const thirtyDaysAgo = this.getDaysAgo(DEFAULT_DAYS_RANGE);

      const [
        blogPosts,
        publishedPosts,
        resources,
        totalLeads,
        verifiedLeads,
        recentDownloads,
        totalScans,
        pageViews30d,
        sessions30d,
      ] = await Promise.all([
        this.dashboardRepository.getBlogPostCount(),
        this.dashboardRepository.getPublishedBlogPostCount(),
        this.dashboardRepository.getResourceCount(),
        this.dashboardRepository.getLeadCount(),
        this.dashboardRepository.getVerifiedLeadCount(),
        this.dashboardRepository.getRecentDownloadCount(thirtyDaysAgo),
        this.dashboardRepository.getScanCount(),
        this.dashboardRepository.getPageViewCount(thirtyDaysAgo),
        this.dashboardRepository.getSessionCount(thirtyDaysAgo),
      ]);

      const stats: DashboardStats = {
        blogPosts,
        publishedPosts,
        resources,
        totalLeads,
        verifiedLeads,
        recentDownloads,
        totalScans,
        pageViews30d,
        sessions30d,
      };

      return success(stats);
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to fetch stats');
      return failure(new ValidationError('Failed to fetch dashboard statistics'));
    }
  }

  async getRecentLeads(limit: number = DEFAULT_RECENT_LIMIT): Promise<Result<RecentLead[]>> {
    try {
      const leads = await this.dashboardRepository.getRecentLeads(limit);
      return success(leads);
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to fetch recent leads');
      return failure(new ValidationError('Failed to fetch recent leads'));
    }
  }

  async getRecentActivity(limit: number = DEFAULT_RECENT_LIMIT): Promise<Result<RecentActivity[]>> {
    try {
      const auditEntries = await this.auditLogRepository.findByFilters({
        limit,
        offset: 0,
      });

      const activities: RecentActivity[] = auditEntries.map(entry => ({
        id: entry.id,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        actorEmail: entry.actorEmail,
        description: this.formatActivityDescription(entry),
        createdAt: entry.createdAt,
      }));

      return success(activities);
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to fetch recent activity');
      return failure(new ValidationError('Failed to fetch recent activity'));
    }
  }

  async getRecentScans(limit: number = 5): Promise<Result<RecentScan[]>> {
    try {
      const scans = await this.dashboardRepository.getRecentScans(limit);
      return success(scans);
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to fetch recent scans');
      return failure(new ValidationError('Failed to fetch recent scans'));
    }
  }

  private getDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private formatActivityDescription(entry: AuditLogEntry): string {
    const actionVerbs: Record<string, string> = {
      CREATE: 'created',
      READ: 'viewed',
      UPDATE: 'updated',
      DELETE: 'deleted',
      LOGIN: 'logged in',
      LOGOUT: 'logged out',
      EXPORT: 'exported',
      IMPORT: 'imported',
      DOWNLOAD: 'downloaded',
      ERASURE_REQUEST: 'processed erasure request for',
      RETENTION_CLEANUP: 'ran retention cleanup on',
      CONFIG_CHANGE: 'changed configuration for',
      PERMISSION_CHANGE: 'changed permissions on',
      BULK_DELETE: 'bulk deleted',
      BULK_UPDATE: 'bulk updated',
    };

    const resourceNames: Record<string, string> = {
      blog_post: 'blog post',
      resource_file: 'resource',
      lead: 'lead',
      contact_submission: 'contact',
      admin_user: 'admin user',
      security_event: 'security event',
      config: 'configuration',
      session: 'session',
      marketing_asset: 'marketing asset',
      guardrail_rule: 'guardrail rule',
      gdpr_request: 'GDPR request',
    };

    const verb = actionVerbs[entry.action] || entry.action.toLowerCase();
    const resource = resourceNames[entry.resourceType] || entry.resourceType;

    if (entry.resourceId) {
      return `${verb} ${resource} (${entry.resourceId.slice(0, 8)}...)`;
    }

    return `${verb} ${resource}`;
  }
}

/**
 * Factory function to create DashboardService with dependencies
 */
export function createDashboardService(
  dashboardRepository: IDashboardRepository,
  auditLogRepository: IAuditLogRepository
): IDashboardService {
  return new DashboardService(dashboardRepository, auditLogRepository);
}
