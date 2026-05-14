/**
 * Admin Core Module
 * 
 * Exports all admin domain types, interfaces, and services.
 * This module provides business logic for admin operations including
 * authentication, audit logging, GDPR compliance, feature flags, and dashboards.
 */

export * from './types';
export * from './interfaces';
export { AuditService, createAuditService } from './services/audit.service';
export { DashboardService, createDashboardService } from './services/dashboard.service';
