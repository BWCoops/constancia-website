/**
 * Feature Flags Middleware
 * 
 * Blocks access to disabled features at the server level.
 * Returns 404 for all disabled routes - no information leakage.
 */

import { Request, Response, NextFunction } from "express";
import { 
  getServerFeatureFlags, 
  getServerFeatureFlagsSync,
  isApiRouteEnabled, 
  invalidateFeatureFlagsCache,
  FeatureFlags 
} from "@shared/feature-flags";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("feature-flags");

// Get flags synchronously (uses cached value or env defaults)
export function getFeatureFlags(): FeatureFlags {
  return getServerFeatureFlagsSync();
}

// Get flags asynchronously (fetches from database)
export async function getFeatureFlagsAsync(): Promise<FeatureFlags> {
  return await getServerFeatureFlags();
}

// Force reload flags and invalidate cache
export function reloadFeatureFlags(): void {
  invalidateFeatureFlagsCache();
  log.info("Cache invalidated, will reload on next request");
}

/**
 * Middleware to block disabled API routes
 * Returns 404 with no additional information
 */
export async function featureFlagApiMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const flags = await getFeatureFlagsAsync();
    const path = req.path.toLowerCase();
    
    // Check if this API route is enabled
    if (!isApiRouteEnabled(path, flags)) {
      log.info({ path }, "Blocked API access to disabled feature");
      return res.status(404).json({ error: "Not found" });
    }
    
    next();
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error in middleware");
    next(); // Allow request on error to prevent blocking everything
  }
}

/**
 * Create a middleware that blocks a specific feature's routes
 */
export function requireFeature(featureKey: keyof FeatureFlags) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const flags = await getFeatureFlagsAsync();
      
      if (!flags[featureKey]) {
        log.info({ featureKey }, "Blocked access to disabled feature");
        return res.status(404).json({ error: "Not found" });
      }
      
      next();
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error in requireFeature");
      next();
    }
  };
}

/**
 * Middleware specifically for FinanceCompass routes
 * Admin routes (/api/admin/finance-compass/*) are always allowed through
 * so admins can manage FinanceCompass even when the feature is disabled
 */
export async function requireFinanceCompass(req: Request, res: Response, next: NextFunction) {
  try {
    // Always allow admin routes through - admins need access to manage the feature
    const fullPath = req.baseUrl + req.path;
    if (fullPath.includes('/api/admin/finance-compass') || req.originalUrl?.includes('/api/admin/finance-compass')) {
      log.info({ path: fullPath }, "Allowing admin FinanceCompass access");
      return next();
    }
    
    const flags = await getFeatureFlagsAsync();
    
    if (!flags.financeCompass) {
      log.info({ path: req.path }, "Blocked FinanceCompass access");
      return res.status(404).json({ error: "Not found" });
    }
    
    next();
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error in requireFinanceCompass");
    next();
  }
}

/**
 * Middleware specifically for Blog routes
 */
export async function requireBlog(req: Request, res: Response, next: NextFunction) {
  try {
    const flags = await getFeatureFlagsAsync();
    
    if (!flags.blog) {
      log.info({ path: req.path }, "Blocked Blog access");
      return res.status(404).json({ error: "Not found" });
    }
    
    next();
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error in requireBlog");
    next();
  }
}

/**
 * Middleware specifically for Resources routes
 */
export async function requireResources(req: Request, res: Response, next: NextFunction) {
  try {
    const flags = await getFeatureFlagsAsync();
    
    if (!flags.resources) {
      log.info({ path: req.path }, "Blocked Resources access");
      return res.status(404).json({ error: "Not found" });
    }
    
    next();
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error in requireResources");
    next();
  }
}

/**
 * Middleware specifically for Contact routes
 */
export async function requireContact(req: Request, res: Response, next: NextFunction) {
  try {
    const flags = await getFeatureFlagsAsync();
    
    if (!flags.contact) {
      log.info({ path: req.path }, "Blocked Contact access");
      return res.status(404).json({ error: "Not found" });
    }
    
    next();
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error in requireContact");
    next();
  }
}

/**
 * Middleware specifically for Comparison Tools routes
 */
export async function requireComparisonTools(req: Request, res: Response, next: NextFunction) {
  try {
    const flags = await getFeatureFlagsAsync();
    
    if (!flags.comparisonTools) {
      log.info({ path: req.path }, "Blocked Comparison Tools access");
      return res.status(404).json({ error: "Not found" });
    }
    
    next();
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error in requireComparisonTools");
    next();
  }
}
