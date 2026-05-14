/**
 * Admin Repositories
 * 
 * Exports all admin domain repository implementations.
 * These repositories abstract data access for admin-related entities
 * following the established patterns from content and leads domains.
 */

export { AdminUserRepository, createAdminUserRepository } from './admin-user.repository';
export { AuditLogRepository, createAuditLogRepository } from './audit-log.repository';
export { FeatureFlagRepository, createFeatureFlagRepository } from './feature-flag.repository';
export { DashboardRepository, createDashboardRepository } from './dashboard.repository';
export { GDPRRepository, createGDPRRepository } from './gdpr.repository';
