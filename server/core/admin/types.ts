/**
 * Admin Domain Types
 * 
 * Pure domain types for admin operations, audit logging, dashboard stats,
 * and GDPR compliance. These types represent business concepts without
 * any infrastructure concerns.
 */

/**
 * Admin user role
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

/**
 * Admin user domain entity
 */
export interface AdminUser {
  id: string;
  replitId: string;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  role: AdminRole;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

/**
 * Admin user session data
 */
export interface AdminSession {
  id: string;
  adminId: string;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  authenticated: boolean;
}

/**
 * Audit action types
 */
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'DOWNLOAD'
  | 'ERASURE_REQUEST'
  | 'RETENTION_CLEANUP'
  | 'CONFIG_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'BULK_DELETE'
  | 'BULK_UPDATE';

/**
 * Resource types that can be audited
 */
export type AuditResourceType =
  | 'blog_post'
  | 'resource_file'
  | 'lead'
  | 'contact_submission'
  | 'admin_user'
  | 'security_event'
  | 'config'
  | 'session'
  | 'marketing_asset'
  | 'guardrail_rule'
  | 'gdpr_request';

/**
 * Audit log entry domain entity
 */
export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  resourceType: AuditResourceType;
  resourceId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Actor performing an auditable action
 */
export interface AuditActor {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

/**
 * Dashboard stats overview
 */
export interface DashboardStats {
  blogPosts: number;
  publishedPosts: number;
  resources: number;
  totalLeads: number;
  verifiedLeads: number;
  recentDownloads: number;
  totalScans: number;
  pageViews30d: number;
  sessions30d: number;
}

/**
 * Recent lead summary for dashboard
 */
export interface RecentLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  jobTitle: string | null;
  verified: boolean;
  createdAt: Date;
}

/**
 * Recent activity item for dashboard
 */
export interface RecentActivity {
  id: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  actorEmail: string;
  description: string;
  createdAt: Date;
}

/**
 * Recent scan summary for dashboard
 */
export interface RecentScan {
  blogPostId: string | null;
  resourceId: string | null;
  title: string;
  contentType: string;
  aiScore: number;
  plagiarismScore: number;
  seoScore: number;
  completedAt: Date;
}

/**
 * GDPR erasure request
 */
export interface GDPRRequest {
  email: string;
  requestType: 'erasure' | 'export' | 'access';
  requestedAt: Date;
  requestedBy: AuditActor;
}

/**
 * GDPR erasure result
 */
export interface ErasureResult {
  email: string;
  emailHash: string;
  deletedRecords: {
    resourceLeads: number;
    contactSubmissions: number;
    resourceSessions: number;
    resourceDownloads: number;
    resourceOtps: number;
  };
  totalDeleted: number;
  completedAt: Date;
  auditLogId: string | null;
}

/**
 * GDPR data export result
 */
export interface DataExportResult {
  exportedAt: Date;
  dataSubject: {
    emailHash: string;
  };
  leads: unknown[];
  contactSubmissions: unknown[];
  activeSessions: number;
  downloads: unknown[];
}

/**
 * GDPR user data summary
 */
export interface UserDataSummary {
  leads: number;
  contactSubmissions: number;
  sessions: number;
  downloads: number;
}

/**
 * Data retention configuration
 */
export interface RetentionConfig {
  resourceType: string;
  retentionMonths: number;
  lastCleanupAt: Date | null;
}

/**
 * Retention cleanup summary
 */
export interface CleanupSummary {
  resourceType: string;
  deletedCount: number;
  cutoffDate: Date;
}

/**
 * Feature flag domain entity
 */
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  enabledForPercentage: number;
  allowedEmails: string[];
  allowedIps: string[];
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date | null;
}

/**
 * Feature flag evaluation context
 */
export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  customAttributes?: Record<string, unknown>;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagResult {
  enabled: boolean;
  reason: 'default' | 'percentage' | 'allowlist' | 'disabled';
}

/**
 * Audit log filters for querying
 */
export interface AuditLogFilters {
  resourceType?: AuditResourceType;
  resourceId?: string;
  actorId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit log search query
 */
export interface AuditLogSearchQuery {
  query: string;
  resourceTypes?: AuditResourceType[];
  actions?: AuditAction[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}
