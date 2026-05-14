/**
 * FinanceCompass API Routes
 * 
 * Thin orchestration file that imports and re-exports sub-routers.
 * All routes are split into modular files for maintainability.
 */

import { publicRouter } from "./public-routes";
import { router as adminRouter } from "./admin-routes";
import { registerDevRoutes } from "./dev-routes";

// Register dev routes if in development
if (process.env.NODE_ENV === "development") {
  registerDevRoutes(publicRouter);
}

// Export both routers
export const financeCompassAdminRoutes = adminRouter;  // For /api/admin/finance-compass (requires auth)
export const financeCompassPublicRoutes = publicRouter;  // For /api/finance-compass/public (no auth)
export default adminRouter;  // Keep for backward compatibility
