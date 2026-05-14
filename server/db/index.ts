/**
 * Database Layer Index
 * 
 * Exports all database-related functionality including:
 * - Connection management
 * - Repository implementations
 * - Type mappers
 * 
 * @generated-by-ai (human-reviewed)
 */

// Re-export the existing database connection
export { db } from '../db';
export { getPool } from '../db-pool';

// FinanceCompass repositories
export * as FinanceCompassDb from './finance-compass';

// Content domain repositories
export * as ContentDb from './content';

// Leads domain repositories
export * as LeadsDb from './leads';

// Analytics domain repositories
export * as AnalyticsDb from './analytics';

// Security domain repositories
export * as SecurityDb from './security';

// Admin domain repositories
export * as AdminDb from './admin';

// Chat domain repositories
export * as ChatDb from './chat';

// ComparisonTools domain repositories
export * as ComparisonToolsDb from './comparison-tools';
