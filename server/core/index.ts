/**
 * Core Module
 * 
 * This module contains pure business logic with no dependencies on:
 * - HTTP/Express (no Request, Response, etc.)
 * - Database libraries (no Drizzle, SQL, etc.)
 * - External services directly (uses interfaces instead)
 * 
 * All external dependencies are injected through interfaces.
 * 
 * IMPORT RULES:
 * - /core MUST NOT import from /api or /db directly
 * - /core uses repository interfaces for data access
 * - /api and /db MAY import from /core
 * 
 * @generated-by-ai (human-reviewed)
 */

// Base types and errors
export * from './types';

// Domain modules
export * as FinanceCompass from './finance-compass';
export * as Content from './content';
export * as Leads from './leads';
export * as Analytics from './analytics';
export * as Email from './email';
export * as Chat from './chat';
export * as Security from './security';
export * as ComparisonTools from './comparison-tools';
export * as Admin from './admin';
