/**
 * Feature Flags API Module
 * 
 * Exports route registration function and all feature-flag-related handlers.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Express } from 'express';
import {
  getFeatureFlags,
  getAdminFeatureFlags,
  updateFeatureFlagOverride,
  deleteFeatureFlagOverride,
} from './handlers';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger('feature-flags');

export {
  getFeatureFlags,
  getAdminFeatureFlags,
  updateFeatureFlagOverride,
  deleteFeatureFlagOverride,
};

/**
 * Register feature flag routes on the Express app
 * 
 * Routes registered:
 * - GET /api/feature-flags - Public endpoint to get effective feature flags
 * - GET /api/admin/feature-flags - Admin endpoint to get all flags with override status
 * - PATCH /api/admin/feature-flags/:featureKey - Update a flag override
 * - DELETE /api/admin/feature-flags/:featureKey - Remove a flag override
 */
export function registerFeatureFlagsRoutes(app: Express): void {
  app.get('/api/feature-flags', getFeatureFlags);
  
  app.get('/api/admin/feature-flags', getAdminFeatureFlags);
  
  app.patch('/api/admin/feature-flags/:featureKey', updateFeatureFlagOverride);
  
  app.delete('/api/admin/feature-flags/:featureKey', deleteFeatureFlagOverride);
  
  log.info('Routes registered');
}
