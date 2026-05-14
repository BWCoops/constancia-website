/**
 * Admin Service Interfaces
 * 
 * Defines contracts for admin management business logic services.
 * These interfaces enable dependency injection and testability.
 * 
 * IMPORTANT: Core services MUST NOT import from /api or /db directly.
 * They receive dependencies through these interfaces.
 */

import type { Result, PaginatedResult, PaginationParams } from '../types';
import type {
  AdminUser,
  AdminRole,
  AdminSession,
  AuditLogEntry,
  AuditAction,
  AuditResourceType,
  AuditActor,
  AuditLogFilters,
  AuditLogSearchQuery,
  DashboardStats,
  RecentLead,
  RecentActivity,
  RecentScan,
  GDPRRequest,
  ErasureResult,
  DataExportResult,
  UserDataSummary,
  RetentionConfig,
  CleanupSummary,
  FeatureFlag,
  FeatureFlagContext,
  FeatureFlagResult,
} from './types';

/**
 * Admin User Repository Interface
 * Abstracts data access for admin users
 */
export interface IAdminUserRepository {
  findById(id: string): Promise<AdminUser | null>;
  findByReplitId(replitId: string): Promise<AdminUser | null>;
  findByEmail(email: string): Promise<AdminUser | null>;
  findAll(params?: PaginationParams): Promise<PaginatedResult<AdminUser>>;
  create(data: CreateAdminUserData): Promise<AdminUser>;
  update(id: string, data: UpdateAdminUserData): Promise<AdminUser | null>;
  updateLastLogin(id: string): Promise<void>;
  delete(id: string): Promise<boolean>;
}

/**
 * Data for creating an admin user
 */
export interface CreateAdminUserData {
  replitId: string;
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  role?: AdminRole;
}

/**
 * Data for updating an admin user
 */
export interface UpdateAdminUserData {
  displayName?: string;
  profileImageUrl?: string;
  role?: AdminRole;
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
}

/**
 * Audit Log Repository Interface
 * Abstracts data access for audit logs
 */
export interface IAuditLogRepository {
  create(entry: CreateAuditLogData): Promise<AuditLogEntry>;
  findById(id: string): Promise<AuditLogEntry | null>;
  findByFilters(filters: AuditLogFilters): Promise<AuditLogEntry[]>;
  findByResourceId(resourceType: AuditResourceType, resourceId: string): Promise<AuditLogEntry[]>;
  search(query: AuditLogSearchQuery): Promise<AuditLogEntry[]>;
  count(filters?: AuditLogFilters): Promise<number>;
  deleteOlderThan(cutoffDate: Date): Promise<number>;
}

/**
 * Data for creating an audit log entry
 */
export interface CreateAuditLogData {
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Feature Flag Repository Interface
 * Abstracts data access for feature flags
 */
export interface IFeatureFlagRepository {
  findById(id: string): Promise<FeatureFlag | null>;
  findByKey(key: string): Promise<FeatureFlag | null>;
  findAll(): Promise<FeatureFlag[]>;
  create(data: CreateFeatureFlagData): Promise<FeatureFlag>;
  update(id: string, data: UpdateFeatureFlagData): Promise<FeatureFlag | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Data for creating a feature flag
 */
export interface CreateFeatureFlagData {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  enabledForPercentage?: number;
  allowedEmails?: string[];
  allowedIps?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Data for updating a feature flag
 */
export interface UpdateFeatureFlagData {
  name?: string;
  description?: string;
  enabled?: boolean;
  enabledForPercentage?: number;
  allowedEmails?: string[];
  allowedIps?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Dashboard Repository Interface
 * Abstracts data access for dashboard statistics
 */
export interface IDashboardRepository {
  getBlogPostCount(): Promise<number>;
  getPublishedBlogPostCount(): Promise<number>;
  getResourceCount(): Promise<number>;
  getLeadCount(): Promise<number>;
  getVerifiedLeadCount(): Promise<number>;
  getRecentDownloadCount(since: Date): Promise<number>;
  getScanCount(): Promise<number>;
  getPageViewCount(since: Date): Promise<number>;
  getSessionCount(since: Date): Promise<number>;
  getRecentLeads(limit: number): Promise<RecentLead[]>;
  getRecentScans(limit: number): Promise<RecentScan[]>;
}

/**
 * GDPR Repository Interface
 * Abstracts data access for GDPR operations
 */
export interface IGDPRRepository {
  findUserData(email: string): Promise<UserDataSummary>;
  exportUserData(email: string): Promise<DataExportResult>;
  deleteUserData(email: string): Promise<ErasureResult['deletedRecords']>;
  getRetentionConfig(): Promise<RetentionConfig[]>;
  updateRetentionPeriod(resourceType: string, months: number): Promise<boolean>;
  runCleanup(resourceType: string, cutoffDate: Date): Promise<number>;
  updateLastCleanup(resourceType: string): Promise<void>;
}

/**
 * Admin Auth Service Interface
 * Business logic for admin authentication and authorization
 */
export interface IAdminAuthService {
  authenticate(replitId: string, email: string): Promise<Result<AdminSession>>;
  authorize(adminId: string, requiredRole: AdminRole): Promise<Result<boolean>>;
  hasPermission(adminId: string, permission: AdminPermission): Promise<Result<boolean>>;
  getSession(replitId: string): Promise<Result<AdminSession | null>>;
  validateMfa(adminId: string, code: string): Promise<Result<boolean>>;
}

/**
 * Admin permissions
 */
export type AdminPermission =
  | 'admin.read'
  | 'admin.write'
  | 'blog.read'
  | 'blog.write'
  | 'blog.publish'
  | 'blog.delete'
  | 'resource.read'
  | 'resource.write'
  | 'resource.delete'
  | 'lead.read'
  | 'lead.write'
  | 'lead.export'
  | 'lead.delete'
  | 'audit.read'
  | 'gdpr.read'
  | 'gdpr.execute'
  | 'feature_flag.read'
  | 'feature_flag.write'
  | 'security.read'
  | 'security.write';

/**
 * Audit Service Interface
 * Business logic for audit logging
 */
export interface IAuditService {
  logAction(
    actor: AuditActor,
    action: AuditAction,
    resourceType: AuditResourceType,
    resourceId: string | null,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null,
    context: AuditContext
  ): Promise<Result<string>>;
  
  getAuditLog(filters: AuditLogFilters): Promise<Result<AuditLogEntry[]>>;
  
  getAuditLogById(id: string): Promise<Result<AuditLogEntry>>;
  
  searchLogs(query: AuditLogSearchQuery): Promise<Result<AuditLogEntry[]>>;
  
  getResourceHistory(
    resourceType: AuditResourceType,
    resourceId: string
  ): Promise<Result<AuditLogEntry[]>>;
}

/**
 * Context for audit logging
 */
export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * GDPR Service Interface
 * Business logic for GDPR compliance
 */
export interface IGDPRService {
  processErasureRequest(
    request: GDPRRequest,
    context: AuditContext
  ): Promise<Result<ErasureResult>>;
  
  exportData(email: string): Promise<Result<DataExportResult>>;
  
  findUserData(email: string): Promise<Result<UserDataSummary>>;
  
  getRetentionPolicy(): Promise<Result<RetentionConfig[]>>;
  
  updateRetentionPolicy(
    resourceType: string,
    months: number
  ): Promise<Result<void>>;
  
  runRetentionCleanup(actor: AuditActor): Promise<Result<CleanupSummary[]>>;
}

/**
 * Feature Flag Service Interface
 * Business logic for feature flag management
 */
export interface IFeatureFlagService {
  getFlags(): Promise<Result<FeatureFlag[]>>;
  
  getFlag(key: string): Promise<Result<FeatureFlag>>;
  
  setFlag(key: string, enabled: boolean): Promise<Result<FeatureFlag>>;
  
  createFlag(data: CreateFeatureFlagData): Promise<Result<FeatureFlag>>;
  
  updateFlag(id: string, data: UpdateFeatureFlagData): Promise<Result<FeatureFlag>>;
  
  deleteFlag(id: string): Promise<Result<void>>;
  
  isEnabled(key: string, context?: FeatureFlagContext): Promise<Result<FeatureFlagResult>>;
}

/**
 * Dashboard Service Interface
 * Business logic for dashboard statistics
 */
export interface IDashboardService {
  getStats(): Promise<Result<DashboardStats>>;
  
  getRecentLeads(limit?: number): Promise<Result<RecentLead[]>>;
  
  getRecentActivity(limit?: number): Promise<Result<RecentActivity[]>>;
  
  getRecentScans(limit?: number): Promise<Result<RecentScan[]>>;
}
