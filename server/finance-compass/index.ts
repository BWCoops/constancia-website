/**
 * FinanceCompass Module Entry Point
 * 
 * Ringfenced Finance Transformation Assessment Platform
 * Can be deployed independently from the main 1QG website.
 */

export { default as financeCompassRoutes, financeCompassAdminRoutes, financeCompassPublicRoutes } from "./routes";
export { fcStorage } from "./storage";
export {
  ensureFinanceCompassAccess,
  ensureAnyFinanceCompassPermission,
  logAuditAction,
  getAdminId,
  getAdminRole,
} from "./middleware";
export {
  runAssessmentAnalysis,
  analyseGenerationTier,
  analysePreAssessment,
  analyseFullAssessment,
  AI_PERSONAS,
  GUARDRAILS,
} from "./ai-service";
export {
  generateAssessmentPDF,
  generateGenerationReport,
  generatePreAssessmentReport,
  generateFullAssessmentReport,
  saveReportToStorage,
} from "./pdf-service";
