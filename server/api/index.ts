/**
 * API Layer Index
 * 
 * Exports all API route handlers and middleware.
 * 
 * This layer is responsible for:
 * - HTTP request parsing
 * - Request validation
 * - Calling core services
 * - Response formatting
 * - Error handling
 * 
 * This layer should NOT contain business logic.
 * 
 * @generated-by-ai (human-reviewed)
 */

// Context and middleware
export { buildApiContext, buildPublicApiContext, attachContextMiddleware } from './context';
export type { ApiContext, PublicApiContext } from './context';

// Shared utilities
export * from './utils';

// Route registration functions
export { registerFeatureFlagsRoutes } from './feature-flags';
export { registerAnalyticsRoutes } from './analytics';
export { registerContentRoutes } from './content';
export { registerOpenAPIRoutes, openAPISpec } from './openapi';
