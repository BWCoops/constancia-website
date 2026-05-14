/**
 * Feature Flags API Handlers
 * 
 * Thin HTTP handlers that:
 * 1. Parse request parameters
 * 2. Use DI context to access feature flag services
 * 3. Format and return the response using standard utilities
 * 
 * These handlers contain NO business logic - they only bridge HTTP and domain.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendError } from '../utils/index';
import { buildApiContext, buildPublicApiContext } from '../context';
import { storage } from '../../storage';
import { 
  getServerFeatureFlags, 
  getEnvFeatureFlags, 
  invalidateFeatureFlagsCache,
  FEATURE_KEYS 
} from '@shared/feature-flags';
import { reloadFeatureFlags } from '../../middleware/feature-flags';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger('feature-flags-handlers');

/**
 * Helper to get feature flag repository from context with storage fallback
 * Logs deprecation warning when falling back to storage
 */
function getFeatureFlagRepo(ctx: ReturnType<typeof buildApiContext>) {
  const repo = ctx.admin?.featureFlagRepo;
  if (!repo) {
    log.warn('DEPRECATION: Falling back to direct storage access. Wire featureFlagRepo in context.');
    return null;
  }
  return repo;
}

/**
 * GET /api/feature-flags
 * Public endpoint to get effective feature flags
 * Optimized with HTTP caching to reduce critical path blocking
 */
export const getFeatureFlags = asyncHandler(async (req: Request, res: Response) => {
  const ctx = buildPublicApiContext(req);
  
  // Set aggressive caching headers - flags rarely change
  // Cache for 60 seconds on CDN/browser, stale-while-revalidate for 5 minutes
  res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
  
  const flags = await getServerFeatureFlags();
  sendSuccess(res, flags);
});

/**
 * GET /api/admin/feature-flags
 * Admin endpoint to get all flags with override status
 */
export const getAdminFeatureFlags = asyncHandler(async (req: Request, res: Response) => {
  const ctx = buildApiContext(req);
  const repo = getFeatureFlagRepo(ctx);
  
  const envFlags = getEnvFeatureFlags();
  
  let overrides: { featureKey: string; isEnabled: boolean; updatedBy: string | null; updatedAt: Date | null }[];
  if (repo) {
    const domainFlags = await repo.findAll();
    overrides = domainFlags.map(flag => ({
      featureKey: flag.key,
      isEnabled: flag.enabled,
      updatedBy: null,
      updatedAt: flag.updatedAt ?? null,
    }));
  } else {
    overrides = await storage.getFeatureFlagOverrides();
  }
  
  const mergedFlags = await getServerFeatureFlags();
  
  const flagDetails = FEATURE_KEYS.map(key => {
    const override = overrides.find(o => o.featureKey === key);
    return {
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      envDefault: envFlags[key],
      hasOverride: !!override,
      overrideValue: override?.isEnabled ?? null,
      effectiveValue: mergedFlags[key],
      updatedBy: override?.updatedBy ?? null,
      updatedAt: override?.updatedAt ?? null,
    };
  });
  
  sendSuccess(res, { flags: flagDetails });
});

/**
 * PATCH /api/admin/feature-flags/:featureKey
 * Update a feature flag override
 */
export const updateFeatureFlagOverride = asyncHandler(async (req: Request, res: Response) => {
  const ctx = buildApiContext(req);
  const { featureKey } = req.params;
  const { isEnabled, updatedBy } = req.body;
  
  if (!FEATURE_KEYS.includes(featureKey as any)) {
    return sendError(res, 'INVALID_FEATURE_KEY', 'Invalid feature key', 400);
  }
  
  if (typeof isEnabled !== 'boolean') {
    return sendError(res, 'INVALID_VALUE', 'isEnabled must be a boolean', 400);
  }
  
  const repo = getFeatureFlagRepo(ctx);
  let result;
  
  if (repo) {
    const created = await repo.create({
      key: featureKey,
      name: featureKey,
      enabled: isEnabled,
    });
    result = {
      featureKey: created.key,
      isEnabled: created.enabled,
      updatedBy: updatedBy || 'admin',
      updatedAt: created.updatedAt,
    };
  } else {
    result = await storage.upsertFeatureFlagOverride({
      featureKey,
      isEnabled,
      updatedBy: updatedBy || 'admin',
    });
  }
  
  invalidateFeatureFlagsCache();
  reloadFeatureFlags();
  
  log.info({ requestId: ctx.requestId, featureKey, isEnabled, updatedBy: updatedBy || 'admin' }, 'Feature flag updated');
  
  sendSuccess(res, { override: result });
});

/**
 * DELETE /api/admin/feature-flags/:featureKey
 * Remove a feature flag override (revert to env default)
 */
export const deleteFeatureFlagOverride = asyncHandler(async (req: Request, res: Response) => {
  const ctx = buildApiContext(req);
  const { featureKey } = req.params;
  
  if (!FEATURE_KEYS.includes(featureKey as any)) {
    return sendError(res, 'INVALID_FEATURE_KEY', 'Invalid feature key', 400);
  }
  
  const repo = getFeatureFlagRepo(ctx);
  let deleted: boolean;
  
  if (repo) {
    deleted = await repo.delete(featureKey);
  } else {
    deleted = await storage.deleteFeatureFlagOverride(featureKey);
  }
  
  invalidateFeatureFlagsCache();
  reloadFeatureFlags();
  
  log.info({ requestId: ctx.requestId, featureKey }, 'Feature flag override removed');
  
  sendSuccess(res, { deleted });
});
