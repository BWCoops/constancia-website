/**
 * Content Domain Module
 * 
 * This module contains pure business logic for content management:
 * - Blog posts and categories
 * - Downloadable resources
 * - Gated content access control
 * 
 * IMPORT RULES:
 * - This module MUST NOT import from /api or /db directly
 * - Uses repository interfaces for data access
 * - /api and /db MAY import from this module
 * 
 * @generated-by-ai (human-reviewed)
 */

export * from './types';
export * from './interfaces';
export { ContentService, ContentAccessError } from './services/content.service';
export type { ContentServiceDependencies } from './services/content.service';
