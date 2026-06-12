/**
 * FinanceCompass Public Routes
 * 
 * Public API routes for the Finance Transformation Assessment Platform.
 * All routes are prefixed with /api/finance-compass/public and do not require authentication.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { createChildLogger } from "../lib/logger";
import { redactEmail } from "../utils/log-privacy";

const log = createChildLogger("fc-public-routes");
import { fcStorage } from "./storage";
import {
  FC_OTP_EXPIRY_MINUTES,
  FC_SESSION_EXPIRY_DAYS,
  getClientIp,
  isIpBlocked,
  checkFcIpRateLimit,
  checkFcOtpRateLimit,
  recordOtpFailure,
  clearOtpFailures,
  checkAiAnalysisRateLimit,
  fcOtpStore,
  sendFcOtpEmail,
} from "./otp-service";
import {
  FC_ASSESSMENT_TIERS,
  FC_ASSESSMENT_STATUSES,
  type FCAssessmentTier,
  insertFcRoiProfileSchema,
  fcReports,
  SECTOR_TO_INDUSTRY,
  type FCIndustry,
} from "@shared/finance-compass-schema";

// Helper to infer standardized industry from sector
function inferIndustryFromSector(sector?: string | null): FCIndustry | undefined {
  if (!sector) return undefined;
  const normalized = sector.toLowerCase().trim();
  return SECTOR_TO_INDUSTRY[normalized] || "other";
}
import { db } from "../db";
import { eq } from "drizzle-orm";
import { escapeHtml } from "../utils/html-escape";
import { calculateRoiMetrics } from "@shared/roi-calculator";
import { isBusinessEmail } from "@shared/schema";
import { getServerFeatureFlags } from "@shared/feature-flags";
import { generateOtp, hashOtp } from "../storage";
import { verifyTurnstileToken, getTurnstileSiteKey, isTurnstileConfigured } from "../services/turnstile";
import { getAuth, clerkClient } from "@clerk/express";
import { sendEmail } from "../services/email-sender";
import { syncLeadToHubSpot, sendLeadVerificationNotification } from "../api/routes/shared/email-helpers";
import {
  runAssessmentAnalysis,
  analyseQuickAssessment,
  analysePreAssessment,
  analyseFullAssessment,
  calculateDimensionScore,
  calculateOverallScore,
  calculateAllScoresWithWeightings,
  detectTechnologySpecialization,
  type AnalysisResult,
  type GenerationTierResult,
  type TechnologySpecialization,
  type SpecializationContext,
} from "./ai-service";
// PDF service imports removed - PDF report generation disabled
// import {
//   generateAssessmentPDF,
//   saveReportToStorage,
//   generateDynamicReport,
// } from "./pdf-service";
import {
  getNextQuestionWithAdaptive,
  generateFollowUpQuestion,
  clearCache as clearAdaptiveCache,
  getStoredAdaptiveQuestion,
  calculateQuestionRelevance,
  getQuestionDefinitions,
  type AdaptiveQuestionResult,
} from "./adaptive-engine";
import { generateWorkshopSchedule, generateEnhancedWorkshopSchedule } from "./workshop-service";
import { generateBenchmarkComparisonReport, getSectorFinancialBenchmarks } from "./benchmark-comparison";
import {
  generateExecutiveBrief,
  generateImplementationRoadmap,
  generateStakeholderNarrative,
  normalizeStakeholderNarrative,
  normalizeDimensionScores,
  clearNarrativeCache,
  getPhase14Intelligence,
  type ExecutiveBrief,
  type ImplementationRoadmap,
  type StakeholderNarrative,
  type Phase14Intelligence,
} from "./report-narrative-service";
import { UK_SECTOR_BENCHMARKS, SIC_TO_SECTOR, DIMENSION_BENCHMARKS, DIMENSION_KEY_TO_CODE, getSectorFromIndustry, INDUSTRY_TO_SECTOR } from "./benchmark-engine";
import { 
  estimatePotentialSavings, 
  generatePriorityContext, 
  generateImplementationPhases,
  getAggregatedTimeline,
  type PriorityContext,
  type TimelinePhase 
} from "./intelligence-engine";
import { getLogoTurquoise } from "../pdf-logo-constants";
import {
  triggerSlidesSpeakGeneration,
  checkSlidesSpeakStatus,
  getReportGenerationStatus,
  type SlidesSpeakStatus,
} from "./slidespeak-service";
// import { generateAssessmentPdf } from "./pdf-report-service";
import {
  standardApiLimiter,
  assessmentCreationLimiter,
  aiAnalysisLimiter,
  otpRequestLimiter,
} from "./utils/rate-limiters";
import {
  validateJourneyStage,
  canTransitionToStage,
  ensureScoreIntegrity,
  type JourneyValidationResult,
  type ScoreIntegrityResult,
} from "./utils/journey-validation-service";

/**
 * Verify that the current Express session owns the given assessment.
 * The caller must have a verified FinanceCompass session whose contactId
 * matches the assessment's contactId.
 */
function verifySessionOwnership(req: Request, assessmentContactId: string | null | undefined): boolean {
  if (!assessmentContactId) return false;
  const fcSession = (req.session as any)?.fcVerified;
  if (!fcSession?.contactId) return false;
  return fcSession.contactId === assessmentContactId;
}

// Canonical 8 dimensions - must match ASSESSMENT_DIMENSIONS in ai-service.ts
const CANONICAL_DIMENSIONS = [
  "financial_planning_analysis",
  "organisation_people",
  "data_analytics",
  "technology_systems",
  "financial_controls_compliance",
  "management_reporting",
  "consolidation_close",
  "ai_machine_learning"
] as const;

/**
 * Sanitize dimension scores to ensure all 8 dimensions have valid numeric values.
 * This prevents database errors when AI analysis returns malformed/partial results.
 */
function sanitizeDimensionScores(scores: Record<string, number> | undefined): Record<string, number> {
  const sanitized: Record<string, number> = {};
  
  for (const dim of CANONICAL_DIMENSIONS) {
    const value = scores?.[dim];
    // Ensure value is a valid number between 0-100, default to 50 if invalid
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      sanitized[dim] = Math.max(0, Math.min(100, Math.round(value)));
    } else {
      sanitized[dim] = 50; // Neutral default score for missing dimensions
    }
  }
  
  return sanitized;
}

// Helper function to check if a processing assessment is stuck and reset it
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function checkAndResetStuckProcessing(assessment: any): Promise<{ wasReset: boolean; assessment: any }> {
  if (assessment.status !== "processing") {
    return { wasReset: false, assessment };
  }
  
  const updatedAt = new Date(assessment.updatedAt).getTime();
  const now = Date.now();
  const processingDuration = now - updatedAt;
  
  if (processingDuration > PROCESSING_TIMEOUT_MS) {
    log.info({ assessmentId: assessment.id, stuckDurationSec: Math.round(processingDuration / 1000) }, "Assessment stuck in processing, resetting to completed");
    
    await fcStorage.updateAssessment(assessment.id, { status: "completed" });
    
    await fcStorage.createAuditLog({
      assessmentId: assessment.id,
      action: "assessment:auto_reset_from_stuck",
      entityType: "assessment",
      entityId: assessment.id,
      details: { 
        previousStatus: "processing",
        newStatus: "completed",
        stuckDurationMs: processingDuration,
        reason: "Processing timeout exceeded 5 minutes"
      },
    });
    
    // Return updated assessment
    const updatedAssessment = await fcStorage.getAssessmentById(assessment.id);
    return { wasReset: true, assessment: updatedAssessment || assessment };
  }
  
  return { wasReset: false, assessment };
}

import { 
  getQuestionsByTier as getQuestionsFromBank, 
  getQuestionById,
  DIMENSION_CONFIG, 
  TIER_CONFIG,
  ALL_QUESTIONS,
  type MultiSelectScoringMode,
} from "./question-bank";
import { seedQuestions, getQuestionBankCount, transformQuestionBankToApiFormat } from "./seed-questions";
import { calculateQuestionScore } from "./utils/scoring-engine";
import { calculateBaseScores } from "./utils/ai-scoring-validator";
import type { NextFunction } from "express";
import { chatbotRoutes } from "./chatbot";

export const publicRouter = Router();

// Mount chatbot routes at /chatbot
publicRouter.use("/chatbot", chatbotRoutes);

// ============================================
// AI PING TEST ENDPOINT
// ============================================

import OpenAI from "openai";
import { getOpenAIConfig } from "../config";

const openaiPingConfig = getOpenAIConfig();
const openaiPing = new OpenAI({
  apiKey: openaiPingConfig.apiKey,
  baseURL: openaiPingConfig.baseURL,
});

publicRouter.get("/ai-ping", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const response = await openaiPing.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 50,
      messages: [
        { role: "system", content: "You are a helpful assistant. Be very brief." },
        { role: "user", content: "Say 'AI connection successful' in exactly those words." }
      ]
    });
    
    const content = response.choices[0]?.message?.content || "No response";
    const latency = Date.now() - startTime;
    
    res.json({
      status: "success",
      model: "gpt-5.2",
      response: content,
      latencyMs: latency,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    log.error({ err: error }, "AI ping error");
    res.status(500).json({
      status: "error",
      model: "gpt-5.2",
      error: error.message || "Unknown error",
      latencyMs: latency,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// UTILITY: CAP DIMENSION SCORES AT 100
// ============================================

/**
 * Caps dimension scores at 100 to prevent display issues from historical data
 * with scores exceeding 100%.
 */
function capDimensionScores(scores: Record<string, number>): Record<string, number> {
  const capped: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    capped[key] = Math.min(100, Math.max(0, value));
  }
  return capped;
}

// ============================================
// UTILITY: AUTO-CREATE DEFAULT ROI PROFILE
// ============================================

/**
 * Creates a default ROI profile for an assessment if one doesn't exist.
 * Called automatically when assessments are analyzed.
 */
async function createDefaultRoiProfileIfNeeded(assessmentId: string): Promise<void> {
  try {
    // Check if ROI profile already exists
    const existingProfile = await fcStorage.getRoiProfileByAssessmentId(assessmentId);
    if (existingProfile) {
      return; // Profile already exists, nothing to do
    }
    
    const assessment = await fcStorage.getAssessmentById(assessmentId);
    if (!assessment) {
      log.info({ assessmentId }, "Cannot create ROI profile: assessment not found");
      return;
    }
    
    const company = assessment.companyId ? await fcStorage.getCompanyById(assessment.companyId) : null;
    const revenueMillions = company?.revenueMillions || 50;
    const employees = company?.totalFte || 100;
    
    // Calculate sensible defaults based on company size
    const baseLicenseCost = Math.max(50000, Math.min(500000, revenueMillions * 1000));
    const baseImplementationCost = baseLicenseCost * 1.5;
    const expectedBenefits = baseLicenseCost * 2.5;
    
    // Calculate baseline finance operating cost (rough estimate based on industry averages)
    // Typically 1.5-3% of revenue for finance function
    const estimatedFinanceCost = revenueMillions * 0.02 * 1000; // 2% of revenue in £k
    
    await fcStorage.upsertRoiProfile(assessmentId, {
      assessmentId,
      contactId: assessment.contactId,
      companyId: assessment.companyId,
      currency: "GBP",
      horizonYears: 3,
      discountRate: 10,
      baselineOperatingCost: estimatedFinanceCost, // £k - finance function annual cost
      // Implementation costs (£k) - using correct schema field names
      softwareLicenses: Math.round(baseLicenseCost / 1000), // Convert to £k
      integrationCosts: Math.round(baseImplementationCost * 0.4 / 1000), // 40% of impl
      dataMigration: Math.round(baseImplementationCost * 0.15 / 1000), // 15% of impl
      changeManagement: Math.round(baseImplementationCost * 0.15 / 1000), // 15% of impl
      internalFteCosts: Math.round(baseImplementationCost * 0.2 / 1000), // 20% of impl
      trainingCosts: Math.round(baseImplementationCost * 0.1 / 1000), // 10% of impl
      contingency: Math.round(baseLicenseCost * 0.1 / 1000), // 10% contingency
      // Annual operating costs (£k)
      runRateOpex: Math.round(baseLicenseCost * 0.2 / 1000), // 20% annual maintenance
      supportCosts: Math.round(employees * 0.5), // £500 per employee in £k
      depreciation: 0,
      // Benefit streams (£k) - annual values
      processEfficiencyPercent: 15, // 15% efficiency improvement
      headcountDelta: Math.min(3, Math.floor(employees / 50)), // 1 FTE per 50 employees, max 3
      closeAccelerationValue: Math.round(expectedBenefits * 0.2 / 1000),
      complianceRiskAvoidance: Math.round(expectedBenefits * 0.15 / 1000),
      auditEfficiencySavings: Math.round(expectedBenefits * 0.1 / 1000),
      revenueEnablement: Math.round(expectedBenefits * 0.1 / 1000),
      externalConsultingSavings: Math.round(expectedBenefits * 0.1 / 1000),
    });
    
    log.info({ assessmentId }, "Auto-created default ROI profile for assessment");
  } catch (error) {
    // Non-fatal: log but don't throw - ROI profile creation failure shouldn't break analysis
    log.error({ err: error, assessmentId }, "Failed to auto-create ROI profile");
  }
}

// ============================================
// BETA ACCESS MIDDLEWARE (FAIL CLOSED)
// ============================================

const BETA_ACCESS_ERROR_GENERIC = "FinanceCompass is in private beta. Please contact us for access.";
const BETA_ACCESS_ERROR_NOT_WHITELISTED = "FinanceCompass is in private beta. Your email is not on the access list.";
const BETA_ACCESS_ERROR_VERIFY = "Unable to verify beta access. Please try again.";

/**
 * Beta access middleware - DISABLED
 * Beta access checking is now turned off. All users can access FinanceCompass.
 * To re-enable, restore the original implementation that checks fcStorage.checkBetaAccess()
 */
async function checkBetaAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  // Beta access disabled - allow all users
  next();
}

/**
 * Beta access middleware for routes that use contactId - DISABLED
 * Beta access checking is now turned off. All users can access FinanceCompass.
 * To re-enable, restore the original implementation that checks fcStorage.checkBetaAccess()
 */
async function checkBetaAccessByContactIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Beta access disabled - allow all users
  next();
}

// Get questions for a specific tier (no session required for question structure)
publicRouter.get("/questions/:tier", async (req: Request, res: Response) => {
  try {
    const tier = req.params.tier as FCAssessmentTier;
    
    if (!FC_ASSESSMENT_TIERS.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: "Invalid assessment tier",
      });
    }
    
    const questions = getQuestionsFromBank(tier);
    const tierConfig = (TIER_CONFIG as Record<string, typeof TIER_CONFIG[keyof typeof TIER_CONFIG]>)[tier];
    
    res.json({
      success: true,
      data: {
        tier,
        tierInfo: tierConfig,
        dimensions: DIMENSION_CONFIG,
        questions: questions.map(q => ({
          id: q.id,
          dimension: q.dimension,
          order: q.order,
          questionType: q.questionType,
          questionText: q.questionText,
          helpText: q.helpText,
          required: q.required,
          options: q.options,
          sliderConfig: q.sliderConfig,
          structuredFields: q.structuredFields,
        })),
        totalQuestions: questions.length,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get questions by tier error");
    res.status(500).json({ success: false, error: "Failed to fetch questions" });
  }
});

// Beta access check endpoint - checks query param OR session email
publicRouter.get("/beta-check", async (req: Request, res: Response) => {
  try {
    // Get email from query param or session
    const queryEmail = req.query.email as string;
    const sessionEmail = (req.session as any)?.fcVerified?.email;
    const email = queryEmail || sessionEmail;
    
    if (!email) {
      return res.json({ hasAccess: false });
    }
    
    const hasAccess = await fcStorage.checkBetaAccess(email.toLowerCase().trim());
    res.json({ hasAccess });
  } catch (error) {
    log.error({ err: error }, "Beta check error");
    res.json({ hasAccess: false });
  }
});

// Session check endpoint - returns session info WITH betaAccess status (not blocked)
publicRouter.get("/session", async (req: Request, res: Response) => {
  try {
    const sessionData = (req.session as any)?.fcVerified;
    
    if (sessionData && sessionData.contactId) {
      const contact = await fcStorage.getContactById(sessionData.contactId);
      if (contact) {
        // Check beta access status for this session's email
        let betaAccess = false;
        try {
          betaAccess = await fcStorage.checkBetaAccess(contact.email);
        } catch {
          betaAccess = false;
        }
        
        return res.json({
          verified: true,
          contactId: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          expiresAt: sessionData.expiresAt,
          hasFullAssessmentAccess: contact.hasFullAssessmentAccess ?? false,
          betaAccess,
        });
      }
    }
    
    res.json({ verified: false, betaAccess: false });
  } catch (error) {
    log.error({ err: error }, "Session check error");
    res.json({ verified: false, betaAccess: false });
  }
});

// Get assessments for the current verified session user
publicRouter.get("/my-assessments", async (req: Request, res: Response) => {
  try {
    const sessionData = (req.session as any)?.fcVerified;
    
    if (!sessionData || !sessionData.contactId) {
      return res.status(401).json({
        success: false,
        error: "Session not verified",
      });
    }
    
    const contactId = sessionData.contactId;
    const assessments = await fcStorage.getAssessmentsByContactId(contactId);
    
    // Calculate actual progress for each assessment and check for stuck processing
    const assessmentsWithProgress = await Promise.all(
      assessments.map(async (a) => {
        // Check for stuck processing and auto-reset if needed
        let assessment = a;
        const resetResult = await checkAndResetStuckProcessing(a);
        if (resetResult.wasReset) {
          assessment = resetResult.assessment;
        }
        
        const responses = await fcStorage.getResponsesByAssessmentId(assessment.id);
        const questions = await fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier);
        
        // Calculate effective total by accounting for skipped questions
        const questionDefinitions = getQuestionDefinitions(assessment.tier as FCAssessmentTier);
        const answeredQuestionIds = new Set<string>();
        for (const response of responses) {
          const qDef = questionDefinitions.find(q => {
            const dbQ = questions.find(dbq => dbq.id === response.questionId);
            return dbQ?.questionKey === q.id || q.id === response.questionId;
          });
          if (qDef) answeredQuestionIds.add(qDef.id);
          answeredQuestionIds.add(response.questionId);
        }
        
        let skippedCount = 0;
        for (const qDef of questionDefinitions) {
          if (answeredQuestionIds.has(qDef.id)) continue;
          const relevance = calculateQuestionRelevance(qDef, responses, assessment.tier);
          if (relevance.shouldSkip) skippedCount++;
        }
        
        const effectiveTotal = questionDefinitions.length - skippedCount;
        const progress = effectiveTotal > 0 ? Math.round((responses.length / effectiveTotal) * 100) : 0;
        
        return {
          id: assessment.id,
          tier: assessment.tier,
          status: assessment.status,
          startedAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          questionsAnswered: responses.length,
          totalQuestions: effectiveTotal,
          progress: Math.min(progress, 100),
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        assessments: assessmentsWithProgress,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get my assessments error");
    res.status(500).json({ success: false, error: "Failed to fetch assessments" });
  }
});

const qualifyLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  companyName: z.string().min(1, "Company name is required").max(200),
  companyDescription: z.string().max(1000).optional(), // What the company does - for AI context
  jobTitle: z.string().min(1, "Job title is required").max(200),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  turnstileToken: z.string().nullish(),
  transformationPriorities: z.array(z.string()).optional().default([]), // Ranked list of priority IDs
});

publicRouter.post("/qualify", otpRequestLimiter, checkBetaAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    const data = qualifyLeadSchema.parse(req.body);
    
    // Check if IP is blocked due to excessive failures
    if (isIpBlocked(clientIp)) {
      return res.status(429).json({
        success: false,
        error: "Too many failed attempts. Please try again later.",
      });
    }
    
    // Check IP rate limit first
    const ipRateLimit = checkFcIpRateLimit(clientIp);
    if (!ipRateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again in 10 minutes.",
      });
    }
    
    // Check if Turnstile is enabled and require token
    if (isTurnstileConfigured()) {
      if (!data.turnstileToken) {
        return res.status(400).json({
          success: false,
          error: "Security verification is required. Please complete the verification.",
        });
      }
      
      const turnstileResult = await verifyTurnstileToken(
        data.turnstileToken,
        clientIp
      );
      if (!turnstileResult.success) {
        return res.status(400).json({ 
          success: false, 
          error: turnstileResult.error || "Bot verification failed. Please try again." 
        });
      }
    }
    
    // Check if business email is required (can be toggled via admin)
    const featureFlags = await getServerFeatureFlags();
    if (featureFlags.requireBusinessEmail && !isBusinessEmail(data.email)) {
      return res.status(400).json({ 
        success: false, 
        error: "Please use your business email address. Personal email providers are not accepted." 
      });
    }
    
    // Check OTP rate limit per email
    const rateLimit = checkFcOtpRateLimit(data.email);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many verification attempts. Please try again in 10 minutes.",
      });
    }
    
    const emailHash = crypto.createHash('sha256').update(data.email.toLowerCase()).digest('hex');
    
    let contact = await fcStorage.getContactByEmail(data.email.toLowerCase());
    
    if (!contact) {
      const company = await fcStorage.createCompany({
        name: data.companyName,
        sector: data.industry,
        sizeBand: data.companySize,
        description: data.companyDescription || undefined,
        industry: inferIndustryFromSector(data.industry),
      });
      
      contact = await fcStorage.createContact({
        companyId: company.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        emailHash,
        roleTitle: data.jobTitle,
        phone: data.phone,
        priorities: data.transformationPriorities || [],
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
      });
    }
    
    // Generate and send OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = Date.now() + FC_OTP_EXPIRY_MINUTES * 60 * 1000;
    
    // Store OTP (keyed by contactId)
    fcOtpStore.set(contact.id, { hash: otpHash, expiresAt, attempts: 0 });
    
    // Send OTP email
    const emailSent = await sendFcOtpEmail(data.email, data.firstName, otp);
    if (!emailSent) {
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({
          success: false,
          error: "Failed to send verification email. Please try again.",
        });
      }
      // Dev: email delivery not configured — OTP was printed to server logs
      log.warn({ contactId: contact.id }, "DEV: email send failed — OTP visible in server logs");
    }
    
    await fcStorage.createAuditLog({
      contactId: contact.id,
      action: "otp:sent",
      entityType: "contact",
      entityId: contact.id,
      details: { industry: data.industry, companySize: data.companySize },
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      success: true,
      data: {
        contactId: contact.id,
        email: data.email,
        message: "Verification code sent to your email",
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Qualify lead error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to qualify lead" });
  }
});

// Clerk OAuth qualification — creates/retrieves FC contact from a verified Clerk Google account
// and sets an FC session, bypassing the email OTP flow.
publicRouter.post("/qualify-clerk", standardApiLimiter, async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({
        success: false,
        error: "Not signed in. Please sign in with Google to continue.",
      });
    }

    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const primaryEmailObj = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    ) ?? clerkUser.emailAddresses[0];
    const email = primaryEmailObj?.emailAddress;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "No email address found on your Google account.",
      });
    }

    const firstName = clerkUser.firstName || "";
    const lastName = clerkUser.lastName || "";
    const emailHash = crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");

    let contact = await fcStorage.getContactByEmail(email.toLowerCase());
    if (!contact) {
      const company = await fcStorage.createCompany({
        name: email.split("@")[0],
        sector: "Other",
        sizeBand: "Not specified",
      });
      contact = await fcStorage.createContact({
        companyId: company.id,
        firstName,
        lastName,
        email: email.toLowerCase(),
        emailHash,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString(),
        userAgent: req.headers["user-agent"],
      });
    }

    const expiresAt = new Date(Date.now() + FC_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    (req.session as any).fcVerified = {
      contactId: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      expiresAt: expiresAt.toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          log.error({ err }, "Session save error in qualify-clerk");
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await fcStorage.createAuditLog({
      contactId: contact.id,
      action: "clerk:google_verified",
      entityType: "contact",
      entityId: contact.id,
      details: { provider: "google", clerkUserId: auth.userId },
      ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString(),
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      success: true,
      data: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Qualify-clerk error");
    return res.status(500).json({ success: false, error: "Failed to set up your account. Please try again." });
  }
});

// OTP verification endpoint (protected by beta access via contactId lookup)
const verifyOtpSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

publicRouter.post("/verify-otp", checkBetaAccessByContactIdMiddleware, async (req: Request, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    
    // Check if IP is blocked due to excessive failures across sessions
    if (isIpBlocked(clientIp)) {
      return res.status(429).json({
        success: false,
        error: "Too many failed verification attempts. Please try again later.",
      });
    }
    
    const { contactId, otp } = verifyOtpSchema.parse(req.body);
    
    const storedOtp = fcOtpStore.get(contactId);
    if (!storedOtp) {
      // Record as potential brute-force attempt
      recordOtpFailure(clientIp);
      return res.status(400).json({
        success: false,
        error: "No verification code found. Please request a new one.",
      });
    }
    
    // Check expiry
    if (Date.now() > storedOtp.expiresAt) {
      fcOtpStore.delete(contactId);
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Please request a new one.",
      });
    }
    
    // Check attempts
    if (storedOtp.attempts >= 5) {
      fcOtpStore.delete(contactId);
      recordOtpFailure(clientIp);
      return res.status(400).json({
        success: false,
        error: "Too many incorrect attempts. Please request a new code.",
      });
    }
    
    const isDevBypass = process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP_BYPASS === "true" && otp === "000000";
    
    const inputHash = hashOtp(otp);
    const hashesMatch = inputHash.length === storedOtp.hash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedOtp.hash));
    if (!isDevBypass && !hashesMatch) {
      storedOtp.attempts++;
      recordOtpFailure(clientIp);
      return res.status(400).json({
        success: false,
        error: `Incorrect code. ${5 - storedOtp.attempts} attempts remaining.`,
      });
    }
    
    // OTP verified successfully - clear IP failure tracking
    clearOtpFailures(clientIp);
    fcOtpStore.delete(contactId);
    
    const contact = await fcStorage.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: "Contact not found.",
      });
    }
    
    // Store verification in session
    const expiresAt = new Date(Date.now() + FC_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    (req.session as any).fcVerified = {
      contactId: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      expiresAt: expiresAt.toISOString(),
    };
    
    // Explicitly save session to ensure it persists
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          log.error({ err }, "Session save error");
          reject(err);
        } else {
          log.info({ contactId: contact.id }, "Session saved for contact");
          resolve();
        }
      });
    });
    
    await fcStorage.createAuditLog({
      contactId: contact.id,
      action: "otp:verified",
      entityType: "contact",
      entityId: contact.id,
      details: { verified: true },
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
    });
    
    // Auto-enroll in newsletter/marketing consent (idempotent - only if not already consented)
    if (!contact.consentMarketing) {
      await fcStorage.updateContact(contact.id, { consentMarketing: true });
      
      await fcStorage.createAuditLog({
        contactId: contact.id,
        action: "newsletter:subscribed",
        entityType: "contact",
        entityId: contact.id,
        details: { 
          source: "otp_verification",
          autoEnrolled: true,
        },
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
      });
      
      log.info({ contactId: contact.id }, "Contact auto-enrolled in newsletter via OTP verification");
    }
    
    // Send HubSpot sync and email notification for new verified lead (background, non-blocking)
    (async () => {
      try {
        // Get company info for the notification
        const company = contact.companyId ? await fcStorage.getCompanyById(contact.companyId) : null;
        const companyName = company?.name || "Unknown Company";
        const jobTitle = contact.roleTitle || "Not specified";
        const industry = company?.sector || "Not specified";
        const companySize = company?.sizeBand || "Not specified";
        const phone = contact.phone || "";
        const priorities = (contact.priorities as string[] | null) || [];
        
        // Sync to HubSpot with all available fields
        const hubspotResult = await syncLeadToHubSpot({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          company: companyName,
          jobTitle,
          phone: phone || undefined,
          industry: industry !== "Not specified" ? industry : undefined,
          companySize: companySize !== "Not specified" ? companySize : undefined,
          transformationPriorities: priorities.length > 0 ? priorities : undefined,
          subscribeNewsletter: contact.consentMarketing ?? true,
          referrer: "FinanceCompass Assessment",
          pageUrl: "/finance-compass",
        });
        
        let hubspotSuccess = hubspotResult.success;
        if (hubspotSuccess) {
          log.info({ email: redactEmail(contact.email), hubspotContactId: hubspotResult.contactId }, "HubSpot sync successful");
        } else {
          log.warn({ email: redactEmail(contact.email) }, "HubSpot sync failed, will send email fallback");
        }
        
        // Always send email notification to Constancia team as primary notification (and HubSpot fallback)
        try {
          // Send detailed FinanceCompass lead notification email
          const prioritiesText = priorities.length > 0 
            ? priorities.join(", ") 
            : "None specified";
            
          await sendEmail({
            to: "info@constancia.io",
            subject: `New FinanceCompass Lead: ${contact.firstName} ${contact.lastName} from ${companyName}`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #12161D 0%, #8E4F67 100%); border-radius: 8px;">
                  <h1 style="color: #7FB8A3; margin: 0;">New FinanceCompass Lead</h1>
                  <p style="color: #fff; margin: 5px 0;">Verified Assessment User</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #12161D; margin-top: 0;">Contact Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Name:</strong></td>
                      <td style="padding: 8px 0; color: #333;">${escapeHtml(contact.firstName)} ${escapeHtml(contact.lastName)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                      <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(contact.email)}" style="color: #8E4F67;">${escapeHtml(contact.email)}</a></td>
                    </tr>
                    ${phone ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
                      <td style="padding: 8px 0; color: #333;">${escapeHtml(phone)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 8px 0; color: #666;"><strong>Job Title:</strong></td>
                      <td style="padding: 8px 0; color: #333;">${escapeHtml(jobTitle)}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #12161D; margin-top: 0;">Company Information</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Company:</strong></td>
                      <td style="padding: 8px 0; color: #333;">${escapeHtml(companyName)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;"><strong>Industry:</strong></td>
                      <td style="padding: 8px 0; color: #333;">${escapeHtml(industry)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;"><strong>Company Size:</strong></td>
                      <td style="padding: 8px 0; color: #333;">${escapeHtml(companySize)}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #8E4F67;">
                  <h3 style="color: #12161D; margin: 0 0 10px 0; font-size: 14px;">Transformation Priorities</h3>
                  <p style="color: #333; margin: 0;">${escapeHtml(prioritiesText)}</p>
                </div>
                
                <div style="background: ${hubspotSuccess ? '#edf5f1' : '#f9f3e8'}; padding: 15px; border-radius: 4px; border: 1px solid ${hubspotSuccess ? '#7FB8A3' : '#dedad2'};">
                  <p style="color: ${hubspotSuccess ? '#5E8D7A' : '#7a6a50'}; margin: 0; font-weight: 500; font-size: 14px;">
                    ${hubspotSuccess 
                      ? 'HubSpot Status: This lead has been synced to HubSpot successfully.' 
                      : 'HubSpot Status: Sync failed - please add this lead manually.'}
                  </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                  This notification was sent automatically from FinanceCompass.
                  <br>
                  Verified: ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
                </p>
              </div>
            `,
          });
          
          log.info({ email: redactEmail(contact.email) }, "Lead notification email sent");
        } catch (emailError) {
          log.error({ err: emailError }, "Email notification failed");
        }
      } catch (notifyError) {
        log.error({ err: notifyError }, "Lead notification error (non-blocking)");
      }
    })();
    
    res.json({
      success: true,
      data: {
        verified: true,
        contactId: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "OTP verification error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to verify code" });
  }
});

// Resend OTP endpoint (protected by beta access via contactId lookup)
publicRouter.post("/resend-otp", otpRequestLimiter, checkBetaAccessByContactIdMiddleware, async (req: Request, res: Response) => {
  try {
    const { contactId } = z.object({ contactId: z.string() }).parse(req.body);
    
    const contact = await fcStorage.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: "Contact not found.",
      });
    }
    
    // Check rate limit
    const rateLimit = checkFcOtpRateLimit(contact.email);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many verification attempts. Please try again in 10 minutes.",
      });
    }
    
    // Generate new OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = Date.now() + FC_OTP_EXPIRY_MINUTES * 60 * 1000;
    
    fcOtpStore.set(contactId, { hash: otpHash, expiresAt, attempts: 0 });
    
    const emailSent = await sendFcOtpEmail(contact.email, contact.firstName, otp);
    if (!emailSent) {
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({
          success: false,
          error: "Failed to send verification email. Please try again.",
        });
      }
      log.warn({ contactId }, "DEV: resend email failed — OTP visible in server logs");
    }
    
    res.json({
      success: true,
      message: "New verification code sent to your email",
    });
  } catch (error: any) {
    log.error({ err: error }, "Resend OTP error");
    res.status(500).json({ success: false, error: "Failed to resend code" });
  }
});

// Tracking metadata schema for capturing analytics data
const trackingMetadataSchema = z.object({
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet", "unknown"]).optional(),
  browser: z.string().max(100).optional(),
  operatingSystem: z.string().max(100).optional(),
  screenResolution: z.string().max(50).optional(),
}).optional();

const startAssessmentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required"),
  company: z.string().min(1, "Company name is required").max(200),
  jobTitle: z.string().min(1, "Job title is required").max(200),
  tier: z.enum(FC_ASSESSMENT_TIERS),
  consentMarketing: z.boolean().optional().default(false),
  tracking: trackingMetadataSchema,
});

// Helper to extract tracking data from request
function extractTrackingData(req: Request, bodyTracking?: z.infer<typeof trackingMetadataSchema>) {
  const userAgent = req.headers['user-agent'] || '';
  const refererHeader = req.headers['referer'] || req.headers['referrer'] || '';
  const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader;
  
  // Detect device type from user agent if not provided
  const detectDeviceType = (): "desktop" | "mobile" | "tablet" | "unknown" => {
    if (/mobile/i.test(userAgent)) return "mobile";
    if (/tablet|ipad/i.test(userAgent)) return "tablet";
    if (/windows|macintosh|linux/i.test(userAgent)) return "desktop";
    return "unknown";
  };
  
  // Detect browser from user agent
  const detectBrowser = (): string => {
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Edg")) return "Edge";
    return "Other";
  };
  
  // Detect OS from user agent
  const detectOS = (): string => {
    if (/windows/i.test(userAgent)) return "Windows";
    if (/macintosh|mac os/i.test(userAgent)) return "macOS";
    if (/linux/i.test(userAgent)) return "Linux";
    if (/android/i.test(userAgent)) return "Android";
    if (/iphone|ipad/i.test(userAgent)) return "iOS";
    return "Unknown";
  };
  
  // Determine source channel from UTM or referrer
  const detectSourceChannel = (utmSource?: string, utmMedium?: string, referrer?: string): string => {
    if (utmMedium === "cpc" || utmMedium === "ppc") return "paid_search";
    if (utmMedium === "display") return "display";
    if (utmMedium === "social" || utmSource?.includes("linkedin") || utmSource?.includes("twitter")) return "social";
    if (utmMedium === "email") return "email";
    if (utmSource === "direct" || (!referrer && !utmSource)) return "direct";
    if (referrer && (referrer.includes("google") || referrer.includes("bing"))) return "organic_search";
    if (referrer) return "referral";
    return "unknown";
  };
  
  const tracking = bodyTracking || {};
  const referrer: string = tracking.referrer || referer || '';
  
  return {
    utmSource: tracking.utmSource,
    utmMedium: tracking.utmMedium,
    utmCampaign: tracking.utmCampaign,
    utmContent: tracking.utmContent,
    utmTerm: tracking.utmTerm,
    referrer: referrer ? referrer.substring(0, 500) : undefined,
    deviceType: tracking.deviceType || detectDeviceType(),
    browser: tracking.browser || detectBrowser(),
    operatingSystem: tracking.operatingSystem || detectOS(),
    screenResolution: tracking.screenResolution,
    sourceChannel: detectSourceChannel(tracking.utmSource, tracking.utmMedium, referrer),
    ipHash: crypto.createHash('sha256').update(req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown').digest('hex').substring(0, 16),
  };
}

publicRouter.post("/assessments/start", assessmentCreationLimiter, checkBetaAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const data = startAssessmentSchema.parse(req.body);
    
    // Check if business email is required (can be toggled via admin)
    const featureFlags = await getServerFeatureFlags();
    if (featureFlags.requireBusinessEmail && !isBusinessEmail(data.email)) {
      return res.status(400).json({ 
        success: false, 
        error: "Please use your business email address. Personal email providers (Gmail, Yahoo, Hotmail, etc.) are not accepted." 
      });
    }
    
    const emailHash = crypto.createHash('sha256').update(data.email.toLowerCase()).digest('hex');
    
    let contact = await fcStorage.getContactByEmail(data.email.toLowerCase());
    
    if (!contact) {
      const company = await fcStorage.createCompany({
        name: data.company,
        industry: "other",  // Default when sector not provided
      });
      
      contact = await fcStorage.createContact({
        companyId: company.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        emailHash,
        roleTitle: data.jobTitle,
        consentMarketing: data.consentMarketing,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
      });
    }
    
    // Extract tracking data from request and body
    const trackingData = extractTrackingData(req, data.tracking);
    
    const assessment = await fcStorage.createAssessment({
      companyId: contact.companyId,
      contactId: contact.id,
      tier: data.tier,
      status: "in_progress",
      currentStep: 0,
      // Tracking fields
      utmSource: trackingData.utmSource,
      utmMedium: trackingData.utmMedium,
      utmCampaign: trackingData.utmCampaign,
      utmContent: trackingData.utmContent,
      utmTerm: trackingData.utmTerm,
      referrer: trackingData.referrer,
      deviceType: trackingData.deviceType,
      browser: trackingData.browser,
      operatingSystem: trackingData.operatingSystem,
      screenResolution: trackingData.screenResolution,
      sourceChannel: trackingData.sourceChannel,
      ipHash: trackingData.ipHash,
      widgetVersion: "1.0",
      startedAt: new Date(),
    });
    
    await fcStorage.createAuditLog({
      contactId: contact.id,
      assessmentId: assessment.id,
      action: "assessment:started",
      entityType: "assessment",
      entityId: assessment.id,
      details: { tier: data.tier, sourceChannel: trackingData.sourceChannel },
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      success: true,
      data: {
        assessmentId: assessment.id,
        tier: assessment.tier,
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Start assessment error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to start assessment" });
  }
});

// Check for existing assessment of same tier
const checkExistingSchema = z.object({
  tier: z.enum(FC_ASSESSMENT_TIERS),
});

publicRouter.post("/assessments/check-existing", checkBetaAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const fcSession = (req.session as any).fcVerified;
    if (!fcSession || !fcSession.contactId) {
      return res.status(401).json({ success: false, error: "Please verify your email first." });
    }
    
    const { tier } = checkExistingSchema.parse(req.body);
    
    const existingAssessments = await fcStorage.getAssessmentsByContactId(fcSession.contactId);
    const assessmentsOfTier = existingAssessments.filter((a) => a.tier === tier);
    
    if (assessmentsOfTier.length === 0) {
      return res.json({ success: true, data: { hasExisting: false } });
    }
    
    // Priority order: in_progress first (for resume), then most recent completed/analysed
    // Include all statuses that represent a completed or viewable assessment
    const completedStatuses = [
      "completed", 
      "analysed", 
      "report_generated", 
      "initial_complete",
      "pending_analysis",
      "awaiting_review", 
      "ready_for_analysis"
    ];
    const resumableStatuses = ["in_progress", "paused"];
    const resumableAssessment = assessmentsOfTier.find(a => resumableStatuses.includes(a.status));
    const completedAssessments = assessmentsOfTier
      .filter(a => completedStatuses.includes(a.status))
      .sort((a, b) => new Date(b.updatedAt || b.startedAt).getTime() - new Date(a.updatedAt || a.startedAt).getTime());
    
    // Return resumable (in_progress/paused) if exists, otherwise most recent completed
    const primaryAssessment = resumableAssessment || completedAssessments[0];
    
    if (primaryAssessment) {
      const responses = await fcStorage.getResponsesByAssessmentId(primaryAssessment.id);
      const questions = await fcStorage.getQuestionsByTier(tier as FCAssessmentTier);
      
      return res.json({
        success: true,
        data: {
          hasExisting: true,
          assessment: {
            id: primaryAssessment.id,
            tier: primaryAssessment.tier,
            status: primaryAssessment.status,
            startedAt: primaryAssessment.startedAt,
            completedAt: primaryAssessment.completedAt,
            questionsAnswered: responses.length,
            totalQuestions: questions.length,
            overallMaturityScore: primaryAssessment.overallMaturityScore,
          },
          // Include info about other assessments if multiple exist
          hasMultiple: assessmentsOfTier.length > 1,
          hasInProgress: !!resumableAssessment,
          hasCompleted: completedAssessments.length > 0,
          latestCompletedId: completedAssessments[0]?.id || null,
        },
      });
    }
    
    res.json({ success: true, data: { hasExisting: false } });
  } catch (error: any) {
    log.error({ err: error }, "Check existing assessment error");
    res.status(500).json({ success: false, error: "Failed to check existing assessments" });
  }
});

// Start assessment for verified users (no form needed)
const startVerifiedSchema = z.object({
  tier: z.enum(FC_ASSESSMENT_TIERS),
  action: z.enum(["start", "resume", "delete_and_start", "retake"]).optional().default("start"),
  tracking: trackingMetadataSchema,
});

publicRouter.post("/assessments/start-verified", assessmentCreationLimiter, checkBetaAccessMiddleware, async (req: Request, res: Response) => {
  try {
    // Check session verification
    const fcSession = (req.session as any).fcVerified;
    if (!fcSession || !fcSession.contactId) {
      return res.status(401).json({
        success: false,
        error: "Please verify your email first to start an assessment.",
      });
    }
    
    // Check session expiry
    if (fcSession.expiresAt && new Date(fcSession.expiresAt) < new Date()) {
      return res.status(401).json({
        success: false,
        error: "Your session has expired. Please verify your email again.",
      });
    }
    
    const { tier, action, tracking } = startVerifiedSchema.parse(req.body);
    const trackingData = extractTrackingData(req, tracking);
    
    const contact = await fcStorage.getContactById(fcSession.contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: "Contact not found. Please start a new session.",
      });
    }
    
    // Get existing assessments of same tier
    const existingAssessments = await fcStorage.getAssessmentsByContactId(contact.id);
    const existingOfTier = existingAssessments.find((a) => a.tier === tier);
    
    // Handle resume action
    if (action === "resume" && existingOfTier) {
      return res.json({
        success: true,
        data: {
          assessmentId: existingOfTier.id,
          tier: existingOfTier.tier,
          resumed: true,
        },
      });
    }
    
    // Handle retake action - reset completed assessment for re-answering with prefilled responses
    if (action === "retake" && existingOfTier) {
      const resetAssessment = await fcStorage.resetAssessmentForRetake(existingOfTier.id);
      
      await fcStorage.createAuditLog({
        contactId: contact.id,
        assessmentId: existingOfTier.id,
        action: "assessment:retake",
        entityType: "assessment",
        entityId: existingOfTier.id,
        details: { tier, reason: "user_requested_retake" },
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
      });
      
      return res.json({
        success: true,
        data: {
          assessmentId: existingOfTier.id,
          tier: existingOfTier.tier,
          retake: true,
        },
      });
    }
    
    // Handle delete_and_start action
    if (action === "delete_and_start" && existingOfTier) {
      // Delete the existing assessment (cascades to responses, reports, etc.)
      await fcStorage.deleteAssessment(existingOfTier.id);
      
      await fcStorage.createAuditLog({
        contactId: contact.id,
        action: "assessment:deleted",
        entityType: "assessment",
        entityId: existingOfTier.id,
        details: { tier, reason: "user_requested_fresh_start" },
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
      });
    }
    
    // For "start" action, check if user already has an assessment of this tier
    if (action === "start" && existingOfTier) {
      return res.status(409).json({
        success: false,
        error: "existing_assessment",
        data: {
          assessmentId: existingOfTier.id,
          status: existingOfTier.status,
          message: "You already have an assessment of this type. Please choose to resume or start fresh.",
        },
      });
    }
    
    // Create new assessment with tracking data
    const assessment = await fcStorage.createAssessment({
      companyId: contact.companyId,
      contactId: contact.id,
      tier,
      status: "in_progress",
      currentStep: 0,
      // Tracking fields
      utmSource: trackingData.utmSource,
      utmMedium: trackingData.utmMedium,
      utmCampaign: trackingData.utmCampaign,
      utmContent: trackingData.utmContent,
      utmTerm: trackingData.utmTerm,
      referrer: trackingData.referrer,
      deviceType: trackingData.deviceType,
      browser: trackingData.browser,
      operatingSystem: trackingData.operatingSystem,
      screenResolution: trackingData.screenResolution,
      sourceChannel: trackingData.sourceChannel,
      ipHash: trackingData.ipHash,
      widgetVersion: "1.0",
      startedAt: new Date(),
    });
    
    await fcStorage.createAuditLog({
      contactId: contact.id,
      assessmentId: assessment.id,
      action: "assessment:started",
      entityType: "assessment",
      entityId: assessment.id,
      details: { tier, verifiedStart: true, action, sourceChannel: trackingData.sourceChannel },
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      success: true,
      data: {
        assessmentId: assessment.id,
        tier: assessment.tier,
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Start verified assessment error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to start assessment" });
  }
});

publicRouter.get("/assessments/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const details = await fcStorage.getAssessmentWithDetails(id);
    
    if (!details) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const { assessment, company, contact } = details;

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Extract pre-assessment data from preAssessmentData field or company data
    const preAssessmentData = assessment.preAssessmentData as Record<string, any> || {};
    const companyData = company ? {
      financeFte: company.financeFte,
      financeCostThousands: company.financeCostThousands,
      financeCostPercentage: company.financeCostPercentage,
      revenueMillions: company.revenueMillions,
      entities: company.entities,
      businessUnits: company.businessUnits,
      sector: company.sector,
      sizeBand: company.sizeBand,
    } : null;
    
    // Get dimension scores and AI analysis
    const dimensionScores = assessment.dimensionScores as Record<string, number> || {};
    const aiAnalysis = assessment.aiAnalysis as Record<string, any> || null;
    
    // Calculate weighted maturity score if we have dimension scores
    let overallMaturityScore = assessment.overallMaturityScore || 0;
    let weightedBreakdown = null;
    
    // For weighted score calculation, we need to get scores from the correct sources:
    // - For a FULL assessment: pre-assessment scores come from a SEPARATE pre_assessment record
    // - For a PRE_ASSESSMENT: dimension scores come from this assessment's dimensionScores field
    let preAssessmentDimensionScores: Record<string, number> | null = null;
    let fullAssessmentDimensionScores: Record<string, number> | null = null;
    
    if (assessment.tier === 'full') {
      // This is a full assessment - look up the contact's pre-assessment record for pre-assessment scores
      fullAssessmentDimensionScores = Object.keys(dimensionScores).length > 0 ? dimensionScores : null;
      
      // Find the contact's most recent analysed pre_assessment
      if (contact) {
        const allAssessments = await fcStorage.getAssessmentsByContactId(contact.id);
        const preAssessment = allAssessments.find(a => 
          (a.tier === 'pre_assessment' || a.tier === 'quick_assessment') && 
          (a.status === 'analysed' || a.status === 'report_generated')
        );
        if (preAssessment && preAssessment.dimensionScores) {
          preAssessmentDimensionScores = preAssessment.dimensionScores as Record<string, number>;
        }
      }
    } else if (assessment.tier === 'pre_assessment' || assessment.tier === 'quick_assessment') {
      preAssessmentDimensionScores = Object.keys(dimensionScores).length > 0 ? dimensionScores : null;
    }
    
    // Calculate weighted maturity score using the new function
    if (preAssessmentDimensionScores || fullAssessmentDimensionScores) {
      const { calculateWeightedMaturityScore } = await import("./ai-service");
      const weightedResult = calculateWeightedMaturityScore(
        preAssessmentDimensionScores,
        fullAssessmentDimensionScores
      );
      
      if (weightedResult.overallScore > 0) {
        overallMaturityScore = weightedResult.overallScore;
        weightedBreakdown = weightedResult.tierBreakdown;
      }
    }
    
    // Run score integrity validation through the AI validation pipeline
    // This detects and auto-fixes stale scores (e.g., overallMaturityScore=0 with valid dimension scores)
    const scoreIntegrity = await ensureScoreIntegrity(assessment, {
      applyDatabaseFix: true,
    });
    
    if (scoreIntegrity.wasRepaired) {
      overallMaturityScore = scoreIntegrity.correctedOverallScore;
      log.info({ assessmentId: id, issues: scoreIntegrity.issues.map(i => i.code) }, "Validation pipeline repaired scores");
    }
    
    // Get responses for this assessment
    const responses = await fcStorage.getResponsesByAssessmentId(id);
    
    // Generate dynamic implementation phases based on company size and sector
    const sizeBand = company?.sizeBand || undefined;
    const sector = company?.sector || undefined;
    const timeline = getAggregatedTimeline(sizeBand, sector);
    const implementationPhases = generateImplementationPhases(sizeBand, undefined, dimensionScores, sector);
    
    // Map phases to frontend-friendly format for Benefits Realisation
    const phasedBenefits = implementationPhases.map((phase, index) => ({
      phase: `Phase ${index + 1}: ${phase.name}`,
      timeline: `Months ${phase.monthRange.start}-${phase.monthRange.end}`,
      timelineMonths: { start: phase.monthRange.start, end: phase.monthRange.end },
      percentage: phase.typicalBenefitPercentage,
      benefits: phase.keyActivities.slice(0, 4),
    }));
    
    res.json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          tier: assessment.tier,
          status: assessment.status,
          currentStep: assessment.currentStep,
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          completedAt: assessment.completedAt,
          preAssessmentData,
          dimensionScores,
          aiAnalysis,
          overallMaturityScore,
          weightedBreakdown,
          epmReadinessScore: assessment.epmReadinessScore,
          quickWins: assessment.quickWins,
          recommendations: assessment.recommendations,
        },
        company: companyData,
        contact: contact ? {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          roleTitle: contact.roleTitle,
        } : null,
        responses: responses.map(r => ({
          id: r.id,
          questionId: r.questionId,
          response: r.response,
          rawValue: r.rawValue,
        })),
        implementationTimeline: {
          totalMonths: timeline.typical,
          minMonths: timeline.min,
          maxMonths: timeline.max,
          industryMultiplier: timeline.industryMultiplier,
          industryRationale: timeline.industryRationale,
          phases: phasedBenefits,
        },
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get assessment error");
    res.status(500).json({ success: false, error: "Failed to fetch assessment" });
  }
});

publicRouter.get("/assessments/:id/questions", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Batch independent queries with Promise.all for better performance
    const [questions, responses] = await Promise.all([
      fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier),
      fcStorage.getResponsesByAssessmentId(id),
    ]);
    
    // Map responses by questionId for quick lookup
    const responseMap = new Map(responses.map(r => [r.questionId, r]));
    
    res.json({
      success: true,
      data: {
        questions: questions.map(q => ({
          id: q.id,
          questionKey: q.questionKey,
          tier: q.tier,
          dimension: q.dimension,
          area: q.area,
          sequence: q.sequence,
          prompt: q.prompt,
          helpText: q.helpText,
          type: q.type,
          options: q.options,
          validation: q.validation,
          isRequired: q.isRequired,
          isAdaptive: q.isAdaptive,
          dependsOn: q.dependsOn,
          response: responseMap.get(q.id)?.response ?? null,
        })),
        totalQuestions: questions.length,
        answeredQuestions: responses.length,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get assessment questions error");
    res.status(500).json({ success: false, error: "Failed to fetch questions" });
  }
});

const saveResponseSchema = z.object({
  questionId: z.string(),
  response: z.any(),
  rawValue: z.string().optional(),
});

publicRouter.post("/assessments/:id/responses", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = saveResponseSchema.parse(req.body);
    
    const assessment = await fcStorage.getAssessmentById(id);
    
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    if (assessment.status === "completed" || assessment.status === "analysed" || assessment.status === "report_generated") {
      return res.status(400).json({ success: false, error: "Assessment is already completed" });
    }
    
    const question = await fcStorage.getQuestionById(data.questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }
    
    const response = await fcStorage.upsertResponse({
      assessmentId: id,
      questionId: data.questionId,
      tier: assessment.tier,
      response: data.response,
      rawValue: data.rawValue,
    });
    
    res.json({
      success: true,
      data: {
        responseId: response.id,
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Save response error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: "Invalid response data" });
    }
    res.status(500).json({ success: false, error: "Failed to save response" });
  }
});

// Update a single response and recalculate scores (for editing answers on completed assessments)
const updateSingleResponseSchema = z.object({
  response: z.any(),
  rawValue: z.string().optional(),
});

publicRouter.patch("/assessments/:id/responses/:questionId", async (req: Request, res: Response) => {
  try {
    const { id, questionId } = req.params;
    const data = updateSingleResponseSchema.parse(req.body);
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    // Verify session with dev bypass
    const sessionData = (req.session as any)?.fcVerified;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev) {
      if (!sessionData?.contactId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }
      if (assessment.contactId !== sessionData.contactId) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    } else if (sessionData?.contactId && assessment.contactId !== sessionData.contactId) {
      // In dev mode, still check ownership if session exists
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Only allow editing on completed/analysed/report_generated assessments
    const allowedStatuses = ["completed", "analysed", "report_generated"];
    if (!allowedStatuses.includes(assessment.status)) {
      return res.status(400).json({ 
        success: false, 
        error: "Answer editing is only available on completed assessments" 
      });
    }
    
    const question = await fcStorage.getQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }
    
    // Update the response
    await fcStorage.upsertResponse({
      assessmentId: id,
      questionId: questionId,
      tier: assessment.tier,
      response: data.response,
      rawValue: data.rawValue,
    });
    
    // Recalculate dimension scores using weighted scoring with correlations
    const allResponses = await fcStorage.getResponsesByAssessmentId(id);
    const allQuestions = await fcStorage.getQuestionsByTier(assessment.tier);
    
    // Find all dimensions that have responses
    const dimensionsSet = new Set<string>();
    for (const resp of allResponses) {
      const q = allQuestions.find(qu => qu.id === resp.questionId);
      if (q && q.dimension && q.dimension !== 'qualification' && q.dimension !== 'sizing') {
        dimensionsSet.add(q.dimension);
      }
    }
    
    // Use the weighted scoring function with correlations
    const { dimensionScores, overallScore } = await calculateAllScoresWithWeightings(
      allResponses,
      allQuestions,
      Array.from(dimensionsSet)
    );
    
    // Update assessment with new scores
    await fcStorage.updateAssessment(id, {
      dimensionScores,
      overallMaturityScore: overallScore,
      epmReadinessScore: overallScore,
    });
    
    // Mark any cached reports as stale by clearing PDF path
    const report = await fcStorage.getReportByAssessmentId(id);
    if (report) {
      await db.update(fcReports).set({ 
        pdfPath: null, // Clear cached PDF to trigger regeneration
      }).where(eq(fcReports.assessmentId, id));
    }
    
    // Run journey validation in background for score recalculation audit (non-blocking)
    // Map tier to validation stage - handle all tier types explicitly
    let validationStage: 'registration' | 'pre_assessment' | 'full';
    switch (assessment.tier) {
      case 'full':
        validationStage = 'full';
        break;
      case 'pre_assessment':
      case 'quick_assessment':
        validationStage = 'pre_assessment';
        break;
      default:
        validationStage = 'registration';
    }
    let validationResult: JourneyValidationResult | null = null;
    try {
      validationResult = await validateJourneyStage(id, validationStage as any, {
        runAIAnalysis: false, // Skip AI for inline edits (faster)
        applyAutoFixes: true,
        sendAdminReport: false, // Only send admin reports for major issues
      });
      log.info({ assessmentId: id, autoFixed: validationResult.autoFixedCount }, "Inline edit validation completed");
    } catch (err) {
      log.error({ err }, "Inline edit validation error (non-blocking)");
    }
    
    res.json({
      success: true,
      data: {
        dimensionScores,
        overallScore,
        message: "Response updated and scores recalculated",
        validation: validationResult ? {
          autoFixedCount: validationResult.autoFixedCount,
          totalIssues: validationResult.totalIssues,
        } : null,
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Update single response error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: "Invalid response data" });
    }
    res.status(500).json({ success: false, error: "Failed to update response" });
  }
});

const updateProgressSchema = z.object({
  currentStep: z.number().min(0),
});

publicRouter.patch("/assessments/:id/progress", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateProgressSchema.parse(req.body);

    // Fetch the assessment first so we can verify ownership
    const existingAssessment = await fcStorage.getAssessmentById(id);
    if (!existingAssessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, existingAssessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    const assessment = await fcStorage.updateAssessment(id, {
      currentStep: data.currentStep,
    });
    
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    res.json({
      success: true,
      data: {
        currentStep: assessment.currentStep,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Update progress error");
    res.status(500).json({ success: false, error: "Failed to update progress" });
  }
});

// ============================================
// ADAPTIVE QUESTION ENDPOINTS
// ============================================

// Helper to format question for API response, extracting sliderConfig and structuredFields from validation
function formatQuestionForResponse(question: any): any {
  if (!question) return null;
  
  const validation = question.validation as Record<string, any> || {};
  
  // Extract sliderConfig from validation
  // The seed function stores it as validation.sliderConfig, so check there first
  let sliderConfig = null;
  if (validation.sliderConfig) {
    // Stored nested under sliderConfig (from seedQuestions)
    sliderConfig = {
      min: validation.sliderConfig.min ?? 1,
      max: validation.sliderConfig.max ?? 5,
      labels: validation.sliderConfig.labels || {},
      step: validation.sliderConfig.step ?? 1,
    };
  } else if (validation.min !== undefined || validation.max !== undefined || validation.labels) {
    // Legacy format: stored directly on validation object
    sliderConfig = {
      min: validation.min ?? 1,
      max: validation.max ?? 5,
      labels: validation.labels || {},
      step: validation.step ?? 1,
    };
  }
  
  // Extract structuredFields from validation
  const structuredFields = validation.structuredFields || null;
  
  return {
    ...question,
    sliderConfig,
    structuredFields,
  };
}

publicRouter.get("/assessments/:id/next-question", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const startFromFirst = req.query.startFromFirst === 'true';
    
    log.info({ assessmentId: id, startFromFirst, query: req.query }, "next-question called");
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Handle all "finished" states - completed, analysed, report_generated, and processing (analysis in progress)
    // But if startFromFirst is true (retake mode), skip this check and show the first question
    if (!startFromFirst && (assessment.status === "completed" || assessment.status === "analysed" || 
        assessment.status === "report_generated" || assessment.status === "processing")) {
      return res.json({
        success: true,
        data: {
          isComplete: true,
          isProcessing: assessment.status === "processing", // Indicate if analysis is still running
          question: null,
          progress: { answered: 0, total: 0, percentage: 100 },
          totalQuestions: 0,
          answeredQuestions: 0,
          skippedQuestionIds: [],
          isGenerated: false,
        },
      });
    }
    
    // If startFromFirst is true (retake mode), request the first question (sequence 1)
    // getNextQuestionWithAdaptive(assessmentId, lastResponse?, requestedNextSequence?)
    const result = startFromFirst 
      ? await getNextQuestionWithAdaptive(id, undefined, 1)
      : await getNextQuestionWithAdaptive(id);
    
    // ALWAYS fetch saved response so users can see their previous answers (not just in retake mode)
    // This is critical for multi-select, number, and text inputs to show their saved values
    // Check by both DB UUID and questionKey for legacy response compatibility
    let savedResponse = null;
    if (result.question) {
      const responses = await fcStorage.getResponsesByAssessmentId(id);
      const questionId = result.question.id;
      const questionKey = result.question.questionKey;
      // Match by database UUID first, then fall back to questionKey for legacy rows
      const existingResponse = responses.find(r => 
        r.questionId === questionId || (questionKey && r.questionId === questionKey)
      );
      if (existingResponse) {
        savedResponse = {
          value: existingResponse.response,
          rawValue: existingResponse.rawValue,
        };
      }
    }
    
    // Format the question with extracted sliderConfig and structuredFields
    const formattedResult = {
      ...result,
      question: formatQuestionForResponse(result.question),
      ...(savedResponse && { savedResponse }),
    };
    
    res.json({
      success: true,
      data: formattedResult,
    });
  } catch (error) {
    log.error({ err: error }, "Get next question error");
    res.status(500).json({ success: false, error: "Failed to get next question" });
  }
});

// Get a specific question by sequence number (for back navigation)
publicRouter.get("/assessments/:id/question-by-sequence/:sequence", async (req: Request, res: Response) => {
  try {
    const { id, sequence } = req.params;
    const sequenceNum = parseInt(sequence, 10);
    
    if (isNaN(sequenceNum) || sequenceNum < 1) {
      return res.status(400).json({ success: false, error: "Invalid sequence number" });
    }
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Use the existing getNextQuestion with requestedNextSequence to fetch the question
    const { getNextQuestion } = await import("./adaptive-engine");
    const result = await getNextQuestion(id, sequenceNum);
    
    if (!result.question) {
      return res.status(404).json({ success: false, error: "Question not found for sequence" });
    }
    
    // Fetch the saved response for this question (if any)
    // Check by both DB UUID and questionKey for legacy response compatibility
    const responses = await fcStorage.getResponsesByAssessmentId(id);
    const questionId = result.question.id;
    const questionKey = result.question.questionKey;
    // Match by database UUID first, then fall back to questionKey for legacy rows
    const savedResponse = responses.find(r => 
      r.questionId === questionId || (questionKey && r.questionId === questionKey)
    );
    
    // Format the question with extracted sliderConfig and structuredFields
    const formattedResult = {
      ...result,
      question: formatQuestionForResponse(result.question),
      savedResponse: savedResponse ? {
        value: savedResponse.response,
        rawValue: savedResponse.rawValue,
      } : null,
    };
    
    res.json({
      success: true,
      data: formattedResult,
    });
  } catch (error) {
    log.error({ err: error }, "Get question by sequence error");
    res.status(500).json({ success: false, error: "Failed to get question" });
  }
});

// Get all answered questions for inline editing during assessment
publicRouter.get("/assessments/:id/answered-questions", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Get all responses for this assessment
    const responses = await fcStorage.getResponsesByAssessmentId(id);
    
    // Get question details for each response
    const answeredQuestions = await Promise.all(
      responses.map(async (response) => {
        const question = await fcStorage.getQuestionById(response.questionId);
        if (!question) return null;
        
        // Format response value for display
        let displayValue = "";
        try {
          const respValue = response.response;
          if (typeof respValue === "string") {
            displayValue = respValue;
          } else if (Array.isArray(respValue)) {
            displayValue = respValue.join(", ");
          } else if (typeof respValue === "number") {
            displayValue = String(respValue);
          } else if (typeof respValue === "object" && respValue !== null) {
            if ("selections" in respValue && Array.isArray(respValue.selections)) {
              displayValue = respValue.selections.join(", ");
            } else {
              displayValue = JSON.stringify(respValue);
            }
          }
        } catch {
          displayValue = "Response saved";
        }
        
        // Truncate display value if too long
        if (displayValue.length > 60) {
          displayValue = displayValue.substring(0, 57) + "...";
        }
        
        return {
          questionId: question.id,
          questionKey: question.questionKey,
          prompt: question.prompt,
          dimension: question.dimension,
          sequence: question.sequence,
          displayValue,
          rawValue: response.rawValue,
          response: response.response,
          answeredAt: response.createdAt,
        };
      })
    );
    
    // Filter out nulls and sort by sequence
    const validAnswers = answeredQuestions
      .filter((q): q is NonNullable<typeof q> => q !== null)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    
    res.json({
      success: true,
      data: {
        answeredQuestions: validAnswers,
        totalAnswered: validAnswers.length,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get answered questions error");
    res.status(500).json({ success: false, error: "Failed to get answered questions" });
  }
});

const adaptiveResponseSchema = z.object({
  questionId: z.string(),
  response: z.any(),
  rawValue: z.string().optional(),
  requestFollowUp: z.boolean().optional().default(false),
  requestedNextSequence: z.number().optional(),
});

publicRouter.post("/assessments/:id/adaptive-response", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Debug log the incoming request
    log.info({ assessmentId: id, questionId: req.body?.questionId }, "adaptive-response called");
    
    const data = adaptiveResponseSchema.parse(req.body);
    
    // Fetch assessment first - needed for both validation and processing
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      log.info({ assessmentId: id }, "Assessment not found");
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    if (assessment.status === "completed" || assessment.status === "analysed" || assessment.status === "report_generated") {
      return res.status(400).json({ success: false, error: "Assessment is already completed" });
    }
    
    // Require the caller to own this assessment — no unauthenticated fallback
    if (!verifySessionOwnership(req, assessment.contactId)) {
      log.info({
        assessmentId: id,
        hasSession: !!req.session,
        sessionId: req.session?.id,
        hasFcVerified: !!(req.session as any)?.fcVerified,
        cookieHeader: req.headers.cookie ? 'present' : 'missing',
      }, "Access denied for adaptive-response: session missing or does not own assessment");
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Validate question exists - try multiple lookup strategies
    log.info({ questionId: data.questionId }, "Looking up question");
    let question = await fcStorage.getQuestionById(data.questionId);
    let isAdaptiveQuestion = false;
    let resolvedQuestionId = data.questionId;
    
    if (!question) {
      log.info({ questionId: data.questionId }, "Question not found by ID, trying questionKey lookup");
      // Try looking up by questionKey
      question = await fcStorage.getQuestionByKey(data.questionId);
      if (question) {
        log.info({ questionDbId: question.id }, "Found question by questionKey");
        resolvedQuestionId = question.id; // Use the actual database ID
      }
    }
    
    if (!question) {
      log.info({ questionId: data.questionId }, "Question not found by questionKey, checking adaptive cache");
      // Check if it's a cached adaptive question
      const adaptiveQuestion = await getStoredAdaptiveQuestion(id, data.questionId);
      if (adaptiveQuestion) {
        log.info({ questionId: data.questionId }, "Found in adaptive cache");
        isAdaptiveQuestion = true;
        question = { isAdaptive: true } as any;
      } else {
        log.info({ questionId: data.questionId }, "Question not found anywhere - returning 404");
        return res.status(404).json({ 
          success: false, 
          error: "Question not found" 
        });
      }
    } else {
      isAdaptiveQuestion = question.isAdaptive || false;
    }
    
    // Save the response using the resolved question ID (actual DB ID if found)
    const savedResponse = await fcStorage.upsertResponse({
      assessmentId: id,
      questionId: resolvedQuestionId,
      tier: assessment.tier,
      response: data.response,
      rawValue: data.rawValue,
      isAdaptiveResponse: isAdaptiveQuestion,
    });
    
    // Create audit log for adaptive response
    await fcStorage.createAuditLog({
      assessmentId: id,
      action: "response:adaptive_submitted",
      entityType: "response",
      entityId: savedResponse.id.toString(),
      details: {
        questionId: resolvedQuestionId,
        originalQuestionId: data.questionId !== resolvedQuestionId ? data.questionId : undefined,
        isAdaptiveQuestion: isAdaptiveQuestion,
        tier: assessment.tier,
      },
    });
    
    // Get next question (with potential AI-generated follow-up)
    // Pass requestedNextSequence for linear navigation support
    const nextResult = await getNextQuestionWithAdaptive(id, savedResponse, data.requestedNextSequence);
    
    // If user explicitly requested follow-up and we don't have one, try to generate
    let followUpQuestion = null;
    if (data.requestFollowUp && !nextResult.isGenerated && savedResponse) {
      try {
        followUpQuestion = await generateFollowUpQuestion(id, savedResponse);
        
        // Log follow-up question generation
        if (followUpQuestion) {
          await fcStorage.createAuditLog({
            assessmentId: id,
            action: "question:adaptive_generated",
            entityType: "question",
            entityId: followUpQuestion.id,
            details: {
              generatedFromQuestionId: data.questionId,
              dimension: followUpQuestion.dimension,
            },
          });
        }
      } catch (err) {
        log.info({ assessmentId: id }, "Follow-up generation failed, continuing with static flow");
      }
    }
    
    // Fetch the saved response for the next question (for retake mode prefilling)
    // Check by both DB UUID and questionKey for legacy response compatibility
    let nextQuestionSavedResponse = null;
    if (nextResult.question && !followUpQuestion) {
      const allResponses = await fcStorage.getResponsesByAssessmentId(id);
      const nextQuestionId = nextResult.question.id;
      const nextQuestionKey = nextResult.question.questionKey;
      // Match by database UUID first, then fall back to questionKey for legacy rows
      const existingResponse = allResponses.find(r => 
        r.questionId === nextQuestionId || (nextQuestionKey && r.questionId === nextQuestionKey)
      );
      if (existingResponse) {
        nextQuestionSavedResponse = {
          value: existingResponse.response,
          rawValue: existingResponse.rawValue,
        };
      }
    }
    
    // Format the next question response
    const nextQuestionData = followUpQuestion ? {
      question: formatQuestionForResponse(followUpQuestion),
      isGenerated: true,
      isComplete: false,
      totalQuestions: nextResult.totalQuestions,
      answeredQuestions: nextResult.answeredQuestions,
    } : {
      ...nextResult,
      question: formatQuestionForResponse(nextResult.question),
      ...(nextQuestionSavedResponse && { savedResponse: nextQuestionSavedResponse }),
    };
    
    res.json({
      success: true,
      data: {
        saved: true,
        responseId: savedResponse.id,
        nextQuestion: nextQuestionData,
      },
    });
  } catch (error: any) {
    log.error({ err: error, assessmentId: req.params.id, questionId: req.body?.questionId }, "Adaptive response error");
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: "Invalid response data" });
    }
    res.status(500).json({ success: false, error: "Failed to save adaptive response" });
  }
});

publicRouter.post("/assessments/:id/complete", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentById(id);
    
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Validate all required questions are answered
    // Batch independent queries with Promise.all for better performance
    const [questions, responses] = await Promise.all([
      fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier),
      fcStorage.getResponsesByAssessmentId(id),
    ]);
    
    // Create a set of answered question IDs
    const answeredQuestionIds = new Set(responses.map(r => r.questionId));
    
    // Find required questions that are not answered
    const missingRequiredQuestions = questions
      .filter(q => q.isRequired && !answeredQuestionIds.has(q.id))
      .map(q => ({
        id: q.id,
        questionKey: q.questionKey,
        prompt: q.prompt,
        dimension: q.dimension,
      }));
    
    if (missingRequiredQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        error: "All required questions must be answered before completing the assessment",
        missingQuestions: missingRequiredQuestions,
        missingCount: missingRequiredQuestions.length,
      });
    }
    
    // Run 6-layer journey validation before completing
    // Map tier to validation stage - handle all tier types explicitly
    let validationStage: 'registration' | 'pre_assessment' | 'full';
    switch (assessment.tier) {
      case 'full':
        validationStage = 'full';
        break;
      case 'pre_assessment':
      case 'quick_assessment':
        validationStage = 'pre_assessment';
        break;
      default:
        validationStage = 'registration';
    }
    
    let journeyValidation: JourneyValidationResult | null = null;
    let transitionCheck: { canTransition: boolean; blockers: string[] } | null = null;
    try {
      // First check if stage transition is valid (enforce sequential flow)
      const nextStage = validationStage === 'pre_assessment' ? 'full' : 'report';
      transitionCheck = await canTransitionToStage(id, nextStage as any);
      
      if (!transitionCheck.canTransition && transitionCheck.blockers.length > 0) {
        // Only block if there are actual transition issues (not just prerequisites for next stage)
        log.info({ assessmentId: id, blockerCount: transitionCheck.blockers.length }, "Stage transition check");
      }
      
      journeyValidation = await validateJourneyStage(id, validationStage as any, {
        runAIAnalysis: true,
        applyAutoFixes: true,
        sendAdminReport: true,
      });
      
      // Log validation result
      log.info({ assessmentId: id, valid: journeyValidation.isValid, issues: journeyValidation.totalIssues, autoFixed: journeyValidation.autoFixedCount }, "Journey validation completed");
      
      // Block completion if critical issues exist
      if (journeyValidation.criticalIssues > 0 && !journeyValidation.isValid) {
        const criticalIssues = journeyValidation.issues.filter(i => i.severity === 'critical');
        return res.status(400).json({
          success: false,
          error: "Assessment validation failed with critical issues",
          validation: {
            isValid: false,
            criticalIssues: criticalIssues.map(i => ({ code: i.code, message: i.message })),
            totalIssues: journeyValidation.totalIssues,
            autoFixedCount: journeyValidation.autoFixedCount,
          },
        });
      }
    } catch (validationError) {
      log.error({ err: validationError }, "Journey validation error (non-blocking)");
      // Continue with completion even if validation fails - don't block user
    }
    
    const completedAssessment = await fcStorage.completeAssessmentTier(id, assessment.tier as FCAssessmentTier);
    
    await fcStorage.createAuditLog({
      assessmentId: id,
      action: "assessment:completed",
      entityType: "assessment",
      entityId: id,
      details: { 
        tier: assessment.tier,
        validationPassed: journeyValidation?.isValid ?? true,
        autoFixedCount: journeyValidation?.autoFixedCount ?? 0,
      },
    });
    
    res.json({
      success: true,
      data: {
        id: completedAssessment?.id,
        status: completedAssessment?.status,
        validation: journeyValidation ? {
          isValid: journeyValidation.isValid,
          totalIssues: journeyValidation.totalIssues,
          autoFixedCount: journeyValidation.autoFixedCount,
          completionPercent: journeyValidation.dataCompleteness.completionPercent,
        } : null,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Complete assessment error");
    res.status(500).json({ success: false, error: "Failed to complete assessment" });
  }
});

// Async function to run analysis and send email notification when complete
async function runAnalysisAsync(
  assessmentId: string, 
  tier: string, 
  responses: any[], 
  questions: any[],
  contact: { firstName: string; lastName: string; email: string } | null
): Promise<void> {
  try {
    log.info({ assessmentId, tier }, "Starting async analysis");
    
    // Run the appropriate analysis based on tier
    let analysisResult: AnalysisResult | GenerationTierResult;
    
    switch (tier) {
      case "quick_assessment": // Legacy support
      case "pre_assessment":
        // @ts-ignore - assessment type compatibility
        analysisResult = await analysePreAssessment({ id: assessmentId, tier }, responses, questions);
        break;
      case "full":
        // @ts-ignore - assessment type compatibility
        analysisResult = await analyseFullAssessment({ id: assessmentId, tier }, responses, questions);
        break;
      default:
        log.error({ assessmentId, tier }, "Unknown tier for async analysis");
        // @ts-ignore - assessment type compatibility
        analysisResult = await analysePreAssessment({ id: assessmentId, tier }, responses, questions);
    }
    
    // Save results to assessment record
    const updateData: any = {
      status: "analysed",
      analysedAt: new Date(),
    };
    
    if ("epmReadinessScore" in analysisResult) {
      // GenerationTierResult (quick assessment)
      updateData.epmReadinessScore = analysisResult.epmReadinessScore;
      updateData.overallMaturityScore = analysisResult.epmReadinessScore; // Keep both in sync
      updateData.quickWins = (analysisResult as any).quickWins;
      updateData.recommendations = (analysisResult as any).topChallenges || [];
      if ((analysisResult as any).dimensionRatings) {
        const dimScores: Record<string, number> = {};
        for (const dr of (analysisResult as any).dimensionRatings) {
          dimScores[dr.dimension] = dr.score;
        }
        // Sanitize to ensure all 8 dimensions have valid numeric values
        updateData.dimensionScores = sanitizeDimensionScores(dimScores);
      } else {
        // Use neutral scores if no dimension ratings available
        updateData.dimensionScores = sanitizeDimensionScores(undefined);
      }
    } else {
      // AnalysisResult (pre/full assessment)
      updateData.epmReadinessScore = analysisResult.overallScore;
      updateData.overallMaturityScore = analysisResult.overallScore; // Keep both in sync
      // Sanitize to ensure all 8 dimensions have valid numeric values
      updateData.dimensionScores = sanitizeDimensionScores(analysisResult.dimensionScores);
      updateData.quickWins = analysisResult.nextSteps;
      updateData.recommendations = analysisResult.prioritisedRecommendations?.map((r: any) => r.description) || [];
    }
    
    // For pre_assessment and quick_assessment tiers, also save dimension scores to preAssessmentData
    // This ensures the weighted score calculation can find pre-assessment scores when retrieving the assessment
    if ((tier === 'pre_assessment' || tier === 'quick_assessment') && updateData.dimensionScores) {
      const currentAssessment = await fcStorage.getAssessmentById(assessmentId);
      const existingPreData = currentAssessment?.preAssessmentData as Record<string, any> || {};
      updateData.preAssessmentData = {
        ...existingPreData,
        dimensionScores: updateData.dimensionScores
      };
    }
    
    await fcStorage.updateAssessment(assessmentId, updateData);
    
    // Auto-create default ROI profile for the assessment
    await createDefaultRoiProfileIfNeeded(assessmentId);
    
    log.info({ assessmentId, score: updateData.epmReadinessScore }, "Async analysis completed");
    
    await fcStorage.createAuditLog({
      assessmentId,
      action: "assessment:auto_analysed",
      entityType: "assessment",
      entityId: assessmentId,
      details: { tier, score: updateData.epmReadinessScore },
    });
    
    // Send email notification to user
    if (contact?.email) {
      try {
        const tierName = tier === "full" ? "Full Assessment" : "Pre-Assessment";
        const score = updateData.epmReadinessScore || 0;
        const resultsUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://constancia.co.uk'}/finance-compass/results/${assessmentId}`;
        
        const htmlContent = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 40px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #12161D; margin: 0;">FinanceCompass</h1>
                <p style="color: #666; margin-top: 8px;">Your Assessment Results Are Ready</p>
              </div>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(contact.firstName)},</p>
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Great news! Your ${tierName} has been analysed and your results are now ready to view.
              </p>
              
              <div style="background-color: #12161D; background: linear-gradient(135deg, #12161D 0%, #8E4F67 100%); padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
                <p style="color: #7FB8A3; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your EPM Readiness Score</p>
                <p style="font-size: 48px; font-weight: bold; color: #ffffff; margin: 0;">${score}%</p>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resultsUrl}" style="display: inline-block; background: #8E4F67; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  View Your Full Results
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Your personalised report includes dimension-by-dimension analysis, quick wins, 
                and strategic recommendations to guide your finance transformation journey.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; text-align: center;">
                Need help interpreting your results? Our expert consultants are here to help.<br>
                <a href="mailto:info@constancia.io" style="color: #8E4F67;">Contact us</a> to schedule a consultation.<br><br>
                &copy; Constancia Ltd. All rights reserved.
              </p>
            </div>
          </div>
        `;
        
        await sendEmail({
          to: contact.email,
          subject: `Your FinanceCompass ${tierName} Results Are Ready`,
          htmlContent,
        });
        
        log.info({ email: redactEmail(contact.email) }, "Results notification email sent");
      } catch (emailError) {
        log.error({ err: emailError }, "Failed to send results email");
        // Don't fail the analysis if email fails
      }
    }
    
    // Pre-generate AI narratives for pre_assessment and full assessments in background
    // This makes the results page load instantly instead of waiting for AI generation
    if ((tier === "full" || tier === "pre_assessment") && updateData.dimensionScores) {
      try {
        log.info({ assessmentId }, "Pre-generating AI narratives");
        
        // Fetch required data - get updated assessment first to get companyId
        const updatedAssessment = await fcStorage.getAssessmentById(assessmentId);
        if (!updatedAssessment) {
          throw new Error("Assessment not found after update");
        }
        
        const [company, allResponses, contact] = await Promise.all([
          updatedAssessment.companyId ? fcStorage.getCompanyById(updatedAssessment.companyId) : Promise.resolve(null),
          fcStorage.getResponsesByAssessmentId(assessmentId),
          updatedAssessment.contactId ? fcStorage.getContactById(updatedAssessment.contactId) : Promise.resolve(null),
        ]);
        
        // Normalize dimension scores for narrative generation
        const overallScore = updateData.epmReadinessScore || 0;
        const estimatedRoi = estimatePotentialSavings(company, overallScore, updatedAssessment.sizeBand || undefined);
        
        const metrics = {
          dimensionScores: normalizeDimensionScores(updateData.dimensionScores),
          overallScore,
          roiMetrics: {
            potentialAnnualSavings: estimatedRoi.potentialAnnualSavings,
            estimatedSavings: estimatedRoi.potentialAnnualSavings,
            paybackMonths: estimatedRoi.estimatedPaybackMonths,
            paybackPeriod: estimatedRoi.estimatedPaybackMonths,
            efficiencyGainPercent: estimatedRoi.efficiencyGainPercent,
            confidenceLevel: estimatedRoi.confidenceLevel,
            calculationBasis: estimatedRoi.calculationBasis,
          },
        };
        
        // Build dimension score map for value journey integration
        const dimensionScoreMap: Record<string, number> = {};
        for (const [dim, data] of Object.entries(metrics.dimensionScores)) {
          dimensionScoreMap[dim] = (data as any)?.score || 0;
        }
        
        // Generate priority context from contact's transformation priorities
        const userPriorities = (contact?.priorities as string[] | null) || [];
        const industryBenchmarks: Record<string, number> = {};
        // Use default benchmarks of 55 for most dimensions
        for (const dim of Object.keys(dimensionScoreMap)) {
          industryBenchmarks[dim] = 55;
        }
        const priorityContext = userPriorities.length > 0 
          ? generatePriorityContext(userPriorities, dimensionScoreMap, industryBenchmarks)
          : null;
        
        // Generate all narratives in parallel with priority context
        const [executiveBrief, implementationRoadmap, cfoNarrative, fpaDirectorNarrative, itDirectorNarrative] = await Promise.all([
          generateExecutiveBrief(updatedAssessment, allResponses, company, metrics, null, priorityContext),
          generateImplementationRoadmap(updatedAssessment, company, "moderate", null, allResponses, dimensionScoreMap),
          generateStakeholderNarrative(updatedAssessment, allResponses, company, metrics, "cfo", priorityContext),
          generateStakeholderNarrative(updatedAssessment, allResponses, company, metrics, "fpa_director", priorityContext),
          generateStakeholderNarrative(updatedAssessment, allResponses, company, metrics, "it_director", priorityContext),
        ]);
        
        // Cache the pre-generated narratives
        await fcStorage.saveReportNarrative(assessmentId, {
          structure: {} as any,
          executiveSummary: {} as any,
          dimensionNarratives: [] as any,
          keyFindings: [] as any,
          actionPlan: {} as any,
          benchmarks: {} as any,
          dataSynthesis: {
            aiNarratives: {
              executiveBrief,
              implementationRoadmap,
              stakeholderNarratives: {
                cfo: cfoNarrative,
                fpaDirector: fpaDirectorNarrative,
                itDirector: itDirectorNarrative,
              },
              generatedAt: new Date().toISOString(),
            }
          } as any,
          isFallback: false,
        });
        
        log.info({ assessmentId }, "AI narratives pre-generated and cached");
      } catch (narrativeError) {
        log.error({ err: narrativeError }, "Failed to pre-generate narratives (non-fatal)");
        // Don't fail the analysis if narrative pre-generation fails - user can trigger on-demand
      }
    }
    
  } catch (analysisError) {
    log.error({ err: analysisError }, "Async analysis failed");
    // Set status back to completed so user can retry
    await fcStorage.updateAssessment(assessmentId, { status: "completed" });
  }
}

publicRouter.get("/assessments/:id/results", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const details = await fcStorage.getAssessmentWithDetails(id);
    
    if (!details) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    let { assessment, company, contact, responses } = details;

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Check for stuck processing and auto-reset if needed
    const resetResult = await checkAndResetStuckProcessing(assessment);
    if (resetResult.wasReset) {
      assessment = resetResult.assessment;
    }
    
    const questions = await fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier);
    
    // Calculate effective total questions by accounting for adaptively skipped questions
    const questionDefinitions = getQuestionDefinitions(assessment.tier as FCAssessmentTier);
    const sortedQuestions = [...questionDefinitions].sort((a, b) => a.order - b.order);
    
    // Identify skipped questions based on adaptive logic
    const answeredQuestionIds = new Set<string>();
    for (const response of responses) {
      const qDef = questionDefinitions.find(q => {
        const dbQ = questions.find(dbq => dbq.id === response.questionId);
        return dbQ?.questionKey === q.id || q.id === response.questionId;
      });
      if (qDef) answeredQuestionIds.add(qDef.id);
      answeredQuestionIds.add(response.questionId);
    }
    
    let skippedCount = 0;
    for (const qDef of sortedQuestions) {
      if (answeredQuestionIds.has(qDef.id)) continue;
      const relevance = calculateQuestionRelevance(qDef, responses, assessment.tier);
      if (relevance.shouldSkip) skippedCount++;
    }
    
    const totalQuestions = questionDefinitions.length - skippedCount;
    const answeredQuestions = responses.length;
    // Cap at 100% to avoid display issues when responses exceed expected questions
    const completionPercentage = totalQuestions > 0 ? Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100)) : 0;
    
    // Check if analysis is currently processing (only after checking for stuck state)
    // PROGRESSIVE LOADING: Return scores that were saved even while AI narratives are being generated
    if (assessment.status === "processing") {
      // Get any scores that have been saved already
      const savedDimScores = assessment.dimensionScores as Record<string, number> || null;
      const savedOverallScore = assessment.overallMaturityScore || assessment.epmReadinessScore || null;
      
      return res.json({
        success: true,
        data: {
          assessment: {
            id: assessment.id,
            tier: assessment.tier,
            status: "processing",
            completedAt: assessment.completedAt,
            epmReadinessScore: savedOverallScore,
            dimensionScores: savedDimScores,
            overallMaturityScore: savedOverallScore,
            quickWins: null,
            recommendations: null,
          },
          contact: contact ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
          } : null,
          company: company ? {
            name: company.name,
          } : null,
          summary: {
            totalQuestions,
            answeredQuestions,
            completionPercentage,
          },
          report: null,
          processing: true,
          processingMessage: savedDimScores 
            ? "Your scores are ready! AI insights are being generated in the background."
            : "Your assessment is being analysed by our AI. This typically takes 30-60 seconds.",
        },
      });
    }
    
    // Auto-trigger analysis if assessment is complete but not analysed
    const needsAnalysis = completionPercentage >= 100 && 
      assessment.epmReadinessScore === null && 
      assessment.status !== "analysed" && 
      assessment.status !== "report_generated" &&
      assessment.status !== "processing";
    
    if (needsAnalysis) {
      log.info({ assessmentId: id }, "Starting async analysis for assessment");
      
      // For registration tier, skip analysis
      if (assessment.tier === "registration") {
        return res.json({
          success: true,
          data: {
            assessment: {
              id: assessment.id,
              tier: assessment.tier,
              status: assessment.status,
              completedAt: assessment.completedAt,
              epmReadinessScore: null,
              dimensionScores: {},
              overallMaturityScore: null,
              quickWins: [],
              recommendations: [],
            },
            contact: contact ? {
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
            } : null,
            company: company ? {
              name: company.name,
            } : null,
            summary: {
              totalQuestions,
              answeredQuestions,
              completionPercentage,
            },
            report: null,
            processing: false,
          },
        });
      }
      
      // PROGRESSIVE LOADING: Calculate scores synchronously so user sees results immediately
      // AI narratives will be generated in the background
      log.info({ assessmentId: id }, "Calculating scores synchronously");
      
      // Convert FcResponse format to expected format for calculateBaseScores
      const responsesForScoring = responses.map(r => ({
        ...r,
        response: r.response,
      }));
      
      const { dimensionScores: calculatedScores } = calculateBaseScores(
        responsesForScoring as any,
        ALL_QUESTIONS
      );
      
      // Calculate overall score (average of dimension scores, capped at 100)
      const scoreValues = Object.values(calculatedScores);
      const calculatedOverallScore = scoreValues.length > 0 
        ? Math.min(100, Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length))
        : 0;
      
      // Save scores immediately so user sees them
      await fcStorage.updateAssessment(id, { 
        status: "processing",
        dimensionScores: calculatedScores,
        overallMaturityScore: calculatedOverallScore,
        epmReadinessScore: calculatedOverallScore,
      });
      
      // Start async AI narrative generation (don't await - fire and forget with error handling)
      runAnalysisAsync(
        id, 
        assessment.tier, 
        responses, 
        questions,
        contact ? { firstName: contact.firstName, lastName: contact.lastName, email: contact.email } : null
      ).catch(async (error) => {
        log.error({ err: error, assessmentId: id }, "Async analysis failed for assessment");
        // Reset status to completed so user can retry
        try {
          await fcStorage.updateAssessment(id, { status: "completed" });
          await fcStorage.createAuditLog({
            assessmentId: id,
            action: "assessment:analysis_failed",
            entityType: "assessment",
            entityId: id,
            details: { error: String(error) },
          });
        } catch (resetError) {
          log.error({ err: resetError, assessmentId: id }, "Failed to reset status after analysis error");
        }
      });
      
      // Return scores immediately - AI narratives are being generated in background
      return res.json({
        success: true,
        data: {
          assessment: {
            id: assessment.id,
            tier: assessment.tier,
            status: "processing",
            completedAt: assessment.completedAt,
            epmReadinessScore: calculatedOverallScore,
            dimensionScores: calculatedScores,
            overallMaturityScore: calculatedOverallScore,
            quickWins: null,
            recommendations: null,
          },
          contact: contact ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
          } : null,
          company: company ? {
            name: company.name,
          } : null,
          summary: {
            totalQuestions,
            answeredQuestions,
            completionPercentage,
          },
          report: null,
          processing: true,
          processingMessage: "Your scores are ready! AI insights are being generated in the background.",
        },
      });
    }
    
    // Get dimension scores
    const dimensionScores = assessment.dimensionScores as Record<string, number | { score: number }> || {};
    
    // Normalize dimension scores to simple number format and cap at 100
    const rawDimensionScores: Record<string, number> = {};
    for (const [key, value] of Object.entries(dimensionScores)) {
      if (typeof value === 'number') {
        rawDimensionScores[key] = value;
      } else if (value && typeof value === 'object' && 'score' in value && typeof value.score === 'number') {
        rawDimensionScores[key] = value.score;
      }
    }
    const normalizedDimensionScores = capDimensionScores(rawDimensionScores);
    
    // Calculate weighted maturity score if appropriate
    let overallMaturityScore = assessment.overallMaturityScore || assessment.epmReadinessScore || 0;
    let weightedBreakdown = null;
    
    // Get pre-assessment and full-assessment scores for weighted calculation
    let preAssessmentDimensionScores: Record<string, number> | null = null;
    let fullAssessmentDimensionScores: Record<string, number> | null = null;
    
    if (assessment.tier === 'full') {
      fullAssessmentDimensionScores = Object.keys(normalizedDimensionScores).length > 0 ? normalizedDimensionScores : null;
      
      if (contact) {
        const allAssessments = await fcStorage.getAssessmentsByContactId(contact.id);
        const preAssessment = allAssessments.find(a => 
          (a.tier === 'pre_assessment' || a.tier === 'quick_assessment') && 
          (a.status === 'analysed' || a.status === 'report_generated')
        );
        if (preAssessment && preAssessment.dimensionScores) {
          const preDimScores = preAssessment.dimensionScores as Record<string, number | { score: number }>;
          preAssessmentDimensionScores = {};
          for (const [key, value] of Object.entries(preDimScores)) {
            if (typeof value === 'number') {
              preAssessmentDimensionScores[key] = value;
            } else if (value && typeof value === 'object' && 'score' in value && typeof value.score === 'number') {
              preAssessmentDimensionScores[key] = value.score;
            }
          }
        }
      }
    } else if (assessment.tier === 'pre_assessment' || assessment.tier === 'quick_assessment') {
      preAssessmentDimensionScores = Object.keys(normalizedDimensionScores).length > 0 ? normalizedDimensionScores : null;
    }
    
    // Calculate weighted maturity score using the new function
    if (preAssessmentDimensionScores || fullAssessmentDimensionScores) {
      const { calculateWeightedMaturityScore } = await import("./ai-service");
      const weightedResult = calculateWeightedMaturityScore(
        preAssessmentDimensionScores,
        fullAssessmentDimensionScores
      );
      
      if (weightedResult.overallScore > 0) {
        overallMaturityScore = weightedResult.overallScore;
        weightedBreakdown = weightedResult.tierBreakdown;
      }
    }
    
    // Get existing report if any
    const report = await fcStorage.getReportByAssessmentId(id);
    const aiAnalysis = assessment.aiAnalysis as Record<string, any> || null;
    
    // Calculate score transparency (per-question breakdown) - this uses the latest scoring logic
    // including inverse benchmark scoring for range-type questions like budgeting cycle
    const { calculateAllDimensionTransparency, calculateWeightedOverallScore, getIndustryDimensionWeights } = await import("./ai-service");
    const scoreTransparency = calculateAllDimensionTransparency(responses, questions);
    
    // CRITICAL: Use recalculated scores from transparency data instead of cached database values
    // This ensures the latest scoring logic (including inverse benchmark scoring) is applied
    const recalculatedDimensionScores: Record<string, number> = {};
    for (const [dimension, transparency] of Object.entries(scoreTransparency)) {
      recalculatedDimensionScores[dimension] = transparency.percentage;
    }
    
    // Merge with stored scores (for dimensions not in transparency, keep stored values)
    const finalDimensionScores = {
      ...normalizedDimensionScores,
      ...recalculatedDimensionScores,
    };
    
    // Calculate industry-linked weighted overall score
    const sector = company?.sector || null;
    const industryWeightedResult = calculateWeightedOverallScore(finalDimensionScores, sector);
    const industryWeights = getIndustryDimensionWeights(sector);
    
    // Run score integrity validation through the AI validation pipeline
    // Pass computed dimension scores so validation works even if stored scores are empty/partial
    const scoreIntegrity = await ensureScoreIntegrity(assessment, {
      applyDatabaseFix: true,
      industryWeights: industryWeights || undefined,
      computedDimensionScores: finalDimensionScores, // Use recalculated scores from responses
    });
    
    if (scoreIntegrity.wasRepaired) {
      // Use industry-weighted score if available, otherwise use the corrected score
      overallMaturityScore = industryWeightedResult.score > 0 
        ? industryWeightedResult.score 
        : scoreIntegrity.correctedOverallScore;
      log.info({ assessmentId: id, issues: scoreIntegrity.issues.map(i => i.code) }, "Validation pipeline repaired scores");
    }
    
    // Detect EPM/ERP specialization based on dimension scores and responses
    const specializationContext = detectTechnologySpecialization(finalDimensionScores, responses, questions);
    
    // Generate dynamic implementation phases based on company size and sector
    const sizeBand = company?.sizeBand ?? undefined;
    const timeline = getAggregatedTimeline(sizeBand, sector ?? undefined);
    const implementationPhases = generateImplementationPhases(sizeBand, undefined, finalDimensionScores, sector ?? undefined);
    
    // Map phases to frontend-friendly format for Benefits Realisation
    const phasedBenefits = implementationPhases.map((phase, index) => ({
      phase: `Phase ${index + 1}: ${phase.name}`,
      timeline: `Months ${phase.monthRange.start}-${phase.monthRange.end}`,
      timelineMonths: { start: phase.monthRange.start, end: phase.monthRange.end },
      percentage: phase.typicalBenefitPercentage,
      benefits: phase.keyActivities.slice(0, 4),
    }));
    
    res.json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          tier: assessment.tier,
          status: assessment.status,
          completedAt: assessment.completedAt,
          epmReadinessScore: assessment.epmReadinessScore,
          dimensionScores: finalDimensionScores,
          overallMaturityScore,
          weightedBreakdown,
          quickWins: assessment.quickWins,
          recommendations: assessment.recommendations,
          scoreTransparency,
          industryWeightedScore: industryWeightedResult.score,
          industryWeightBreakdown: industryWeightedResult.weightedBreakdown,
          industryWeights,
          technologyFocus: specializationContext.specialization,
          specializationContext: {
            primaryFocus: specializationContext.primaryFocus,
            secondaryFocus: specializationContext.secondaryFocus,
            narrativeContext: specializationContext.narrativeContext,
            epmIndicators: specializationContext.epmIndicators,
            erpIndicators: specializationContext.erpIndicators,
          },
        },
        contact: contact ? {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
        } : null,
        company: company ? {
          name: company.name,
          sector: company.sector,
        } : null,
        summary: {
          totalQuestions,
          answeredQuestions,
          completionPercentage,
        },
        report: report ? {
          id: report.id,
          pdfPath: report.pdfPath,
          executiveSummary: report.executiveSummary,
        } : null,
        aiAnalysis: aiAnalysis ? {
          summary: aiAnalysis.summary || aiAnalysis.executiveSummary,
          keyInsights: aiAnalysis.keyInsights || aiAnalysis.topChallenges,
          recommendations: aiAnalysis.recommendations || aiAnalysis.quickWins,
          aiReadinessSummary: aiAnalysis.aiReadinessSummary,
          dimensionInsights: aiAnalysis.dimensionInsights,
          technologyFocus: aiAnalysis.technologyFocus,
          specializationContext: aiAnalysis.specializationContext,
        } : null,
        implementationTimeline: {
          totalMonths: timeline.typical,
          minMonths: timeline.min,
          maxMonths: timeline.max,
          industryMultiplier: timeline.industryMultiplier,
          industryRationale: timeline.industryRationale,
          phases: phasedBenefits,
        },
        processing: false,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get results error");
    res.status(500).json({ success: false, error: "Failed to fetch results" });
  }
});

// Workshop schedule endpoint
publicRouter.get("/assessments/:id/workshops/schedule", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const sessionData = (req.session as any)?.fcVerified;
    if (!sessionData || !sessionData.contactId) {
      return res.status(401).json({
        success: false,
        error: "Session not verified",
      });
    }
    
    const details = await fcStorage.getAssessmentWithDetails(id);
    
    if (!details) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const { assessment, company } = details;

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Workshop schedules are static once generated - cache for 5 minutes
    res.set('Cache-Control', 'private, max-age=300');
    
    // Use enhanced workshop schedule when company context is available
    const workshopSchedule = generateEnhancedWorkshopSchedule(
      id,
      assessment.dimensionScores as Record<string, number> | null,
      assessment.overallMaturityScore,
      {
        sector: company?.sector || null,
        revenueMillions: company?.revenueMillions || null,
        financeCostPercentage: company?.financeCostPercentage || null,
        financeFte: company?.financeFte || null,
        overallMaturityScore: assessment.overallMaturityScore
      }
    );
    
    res.json({
      success: true,
      data: workshopSchedule,
    });
  } catch (error) {
    log.error({ err: error }, "Get workshop schedule error");
    res.status(500).json({ success: false, error: "Failed to fetch workshop schedule" });
  }
});

// Status check endpoint for polling
publicRouter.get("/assessments/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentById(id);
    
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    const isProcessing = assessment.status === "processing";
    const isReady = assessment.status === "analysed" || assessment.status === "report_generated";
    
    res.json({
      success: true,
      data: {
        id: assessment.id,
        status: assessment.status,
        isProcessing,
        isReady,
        epmReadinessScore: assessment.epmReadinessScore,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get status error");
    res.status(500).json({ success: false, error: "Failed to fetch status" });
  }
});

// Dedicated dimension overview endpoint - returns all dimension scores with metadata
publicRouter.get("/assessments/:id/dimensions", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const details = await fcStorage.getAssessmentWithDetails(id);
    
    if (!details) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const { assessment, contact, company, responses } = details;

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // For processing assessments, return empty dimensions
    if (assessment.status === "processing") {
      return res.json({
        success: true,
        data: {
          dimensions: [],
          processing: true,
          tier: assessment.tier,
        },
      });
    }
    
    const aiAnalysis = assessment.aiAnalysis as Record<string, any> || {};
    const dimensionInsights = aiAnalysis?.dimensionInsights || {};
    
    // CRITICAL: Recalculate dimension scores using latest scoring logic (including inverse benchmarks)
    const questions = await fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier);
    const { calculateAllDimensionTransparency } = await import("./ai-service");
    const scoreTransparency = calculateAllDimensionTransparency(responses, questions);
    
    // Build recalculated scores from transparency data
    const recalculatedScores: Record<string, number> = {};
    for (const [dimension, transparency] of Object.entries(scoreTransparency)) {
      recalculatedScores[dimension] = transparency.percentage;
    }
    
    // Get pre-assessment and full-assessment scores for weighted calculation
    let preAssessmentDimensionScores: Record<string, number> | null = null;
    let fullAssessmentDimensionScores: Record<string, number> | null = null;
    
    // Use recalculated scores instead of cached database values
    const normalizedScores: Record<string, number> = recalculatedScores;
    
    if (assessment.tier === 'full') {
      fullAssessmentDimensionScores = Object.keys(normalizedScores).length > 0 ? normalizedScores : null;
      
      if (contact) {
        const allAssessments = await fcStorage.getAssessmentsByContactId(contact.id);
        const preAssessment = allAssessments.find(a => 
          (a.tier === 'pre_assessment' || a.tier === 'quick_assessment') && 
          (a.status === 'analysed' || a.status === 'report_generated')
        );
        if (preAssessment && preAssessment.dimensionScores) {
          const preDimScores = preAssessment.dimensionScores as Record<string, number | { score: number }>;
          preAssessmentDimensionScores = {};
          for (const [key, value] of Object.entries(preDimScores)) {
            if (typeof value === 'number') {
              preAssessmentDimensionScores[key] = value;
            } else if (value && typeof value === 'object' && 'score' in value && typeof value.score === 'number') {
              preAssessmentDimensionScores[key] = value.score;
            }
          }
        }
      }
    } else if (assessment.tier === 'pre_assessment' || assessment.tier === 'quick_assessment') {
      preAssessmentDimensionScores = Object.keys(normalizedScores).length > 0 ? normalizedScores : null;
    }
    
    // Calculate weighted dimension scores if we have both tiers
    let weightedDimensionScores: Record<string, number> = normalizedScores;
    
    if (preAssessmentDimensionScores || fullAssessmentDimensionScores) {
      const { calculateWeightedMaturityScore } = await import("./ai-service");
      const weightedResult = calculateWeightedMaturityScore(
        preAssessmentDimensionScores,
        fullAssessmentDimensionScores
      );
      
      if (Object.keys(weightedResult.weightedDimensionScores).length > 0) {
        weightedDimensionScores = weightedResult.weightedDimensionScores;
      }
    }
    
    // Build dimension array with metadata
    const dimensions = Object.entries(DIMENSION_CONFIG).map(([key, config]) => {
      const score = weightedDimensionScores[key] ?? normalizedScores[key] ?? null;
      const insight = dimensionInsights[key] || null;
      
      // Calculate maturity level for this dimension
      let maturityLevel = "Not Assessed";
      if (score !== null) {
        if (score >= 80) maturityLevel = "Optimised";
        else if (score >= 60) maturityLevel = "Managed";
        else if (score >= 40) maturityLevel = "Developing";
        else if (score >= 20) maturityLevel = "Emerging";
        else maturityLevel = "Initial";
      }
      
      return {
        key,
        name: config.name,
        shortName: config.shortName,
        icon: config.icon,
        color: config.color,
        description: config.description,
        score,
        maturityLevel,
        insight,
        hasData: score !== null,
      };
    });
    
    res.json({
      success: true,
      data: {
        dimensions,
        processing: false,
        tier: assessment.tier,
        hasBothTiers: !!(preAssessmentDimensionScores && fullAssessmentDimensionScores),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get dimensions error");
    res.status(500).json({ success: false, error: "Failed to fetch dimensions" });
  }
});

// Dedicated maturity score endpoint - returns overall weighted score and tier breakdown
publicRouter.get("/assessments/:id/maturity-score", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const details = await fcStorage.getAssessmentWithDetails(id);
    
    if (!details) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const { assessment, contact, company } = details;

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, assessment.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // For processing assessments, return null scores
    if (assessment.status === "processing") {
      return res.json({
        success: true,
        data: {
          overallScore: null,
          rawTierScore: null,
          tier: assessment.tier,
          status: assessment.status,
          tierBreakdown: null,
          maturityLevel: null,
          processing: true,
        },
      });
    }
    
    const dimensionScores = assessment.dimensionScores as Record<string, number> || {};
    const rawTierScore = assessment.epmReadinessScore || 0;
    
    // Get pre-assessment and full-assessment scores for weighted calculation
    let preAssessmentDimensionScores: Record<string, number> | null = null;
    let fullAssessmentDimensionScores: Record<string, number> | null = null;
    
    if (assessment.tier === 'full') {
      fullAssessmentDimensionScores = Object.keys(dimensionScores).length > 0 ? dimensionScores : null;
      
      if (contact) {
        const allAssessments = await fcStorage.getAssessmentsByContactId(contact.id);
        const preAssessment = allAssessments.find(a => 
          (a.tier === 'pre_assessment' || a.tier === 'quick_assessment') && 
          (a.status === 'analysed' || a.status === 'report_generated')
        );
        if (preAssessment && preAssessment.dimensionScores) {
          preAssessmentDimensionScores = preAssessment.dimensionScores as Record<string, number>;
        }
      }
    } else if (assessment.tier === 'pre_assessment' || assessment.tier === 'quick_assessment') {
      preAssessmentDimensionScores = Object.keys(dimensionScores).length > 0 ? dimensionScores : null;
    }
    
    // Calculate weighted maturity score
    let overallScore = rawTierScore;
    let tierBreakdown = { pre: 0, full: 0, hasPreData: false, hasFullData: false };
    
    if (preAssessmentDimensionScores || fullAssessmentDimensionScores) {
      const { calculateWeightedMaturityScore } = await import("./ai-service");
      const weightedResult = calculateWeightedMaturityScore(
        preAssessmentDimensionScores,
        fullAssessmentDimensionScores
      );
      
      if (weightedResult.overallScore > 0) {
        overallScore = weightedResult.overallScore;
        tierBreakdown = weightedResult.tierBreakdown;
      }
    }
    
    // Determine maturity level label
    let maturityLevel = "Initial";
    if (overallScore >= 80) maturityLevel = "Optimised";
    else if (overallScore >= 60) maturityLevel = "Managed";
    else if (overallScore >= 40) maturityLevel = "Developing";
    else if (overallScore >= 20) maturityLevel = "Emerging";
    
    res.json({
      success: true,
      data: {
        overallScore,
        rawTierScore,
        tier: assessment.tier,
        status: assessment.status,
        tierBreakdown,
        maturityLevel,
        processing: false,
        companyName: company?.name || null,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get maturity score error");
    res.status(500).json({ success: false, error: "Failed to fetch maturity score" });
  }
});

publicRouter.post("/assessments/:id/upgrade", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newTier } = z.object({ newTier: z.enum(FC_ASSESSMENT_TIERS) }).parse(req.body);

    // Fetch first so we can verify ownership before mutating
    const existing = await fcStorage.getAssessmentById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Require the caller to own this assessment
    if (!verifySessionOwnership(req, existing.contactId)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    const assessment = await fcStorage.upgradeAssessmentTier(id, newTier);
    
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    await fcStorage.createAuditLog({
      assessmentId: id,
      action: "assessment:upgraded",
      entityType: "assessment",
      entityId: id,
      details: { newTier },
    });
    
    res.json({
      success: true,
      data: {
        assessmentId: assessment.id,
        tier: assessment.tier,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Upgrade tier error");
    res.status(500).json({ success: false, error: "Failed to upgrade assessment" });
  }
});

// ============================================
// AI ANALYSIS ENDPOINT
// ============================================

publicRouter.post("/assessments/:id/analyse", aiAnalysisLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const forceRegenerate = req.query.force === "true" || req.body?.force === true;
    
    // Verify session
    const fcSession = (req.session as any)?.fcVerified;
    if (!fcSession?.contactId) {
      return res.status(401).json({ success: false, error: "Session required. Please verify your email first." });
    }
    
    // Get assessment
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    // Verify the verified session actually owns this assessment
    if (fcSession.contactId !== assessment.contactId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Check if assessment is completed
    if (assessment.status === "in_progress" || assessment.status === "draft") {
      return res.status(400).json({ success: false, error: "Assessment must be completed before analysis" });
    }
    
    // Handle stuck "processing" status - reset to completed and continue
    if (assessment.status === "processing") {
      log.info({ assessmentId: id }, "Resetting stuck processing status for assessment");
      await fcStorage.updateAssessment(id, { status: "completed" });
    }
    
    // Check if already analysed - return cached results unless force regenerate
    if (!forceRegenerate && (assessment.status === "analysed" || assessment.status === "report_generated")) {
      return res.json({
        success: true,
        data: {
          assessmentId: id,
          tier: assessment.tier,
          status: assessment.status,
          epmReadinessScore: assessment.epmReadinessScore,
          dimensionScores: assessment.dimensionScores,
          quickWins: assessment.quickWins,
          recommendations: assessment.recommendations,
          alreadyAnalysed: true,
        },
      });
    }
    
    if (forceRegenerate) {
      log.info({ assessmentId: id }, "Force regenerating AI analysis for assessment");
    }
    
    // Registration tier doesn't need AI analysis
    if (assessment.tier === "registration") {
      return res.json({
        success: true,
        data: {
          assessmentId: id,
          tier: assessment.tier,
          epmReadinessScore: null,
          quickWins: [],
          recommendations: [],
          dimensionScores: {},
          message: "Registration tier does not require analysis",
        },
      });
    }
    
    // Check AI analysis rate limit ONLY when we're about to call the AI (5 per hour per contact)
    const rateLimit = checkAiAnalysisRateLimit(fcSession.contactId);
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
      return res.status(429).json({ 
        success: false, 
        error: `Analysis rate limit exceeded. Please try again in ${resetMinutes} minutes.`,
        retryAfter: Math.ceil(rateLimit.resetIn / 1000),
      });
    }
    
    log.info({ assessmentId: id, tier: assessment.tier }, "Starting AI analysis for assessment");
    
    // Get responses and questions for analysis
    const responses = await fcStorage.getResponsesByAssessmentId(id);
    const questions = await fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier);
    
    // Run the appropriate analysis based on tier
    let analysisResult: AnalysisResult | GenerationTierResult;
    
    switch (assessment.tier) {
      case "quick_assessment": // Legacy support
      case "pre_assessment":
        analysisResult = await analysePreAssessment(assessment, responses, questions);
        break;
      case "full":
        analysisResult = await analyseFullAssessment(assessment, responses, questions);
        break;
      default:
        return res.status(400).json({ success: false, error: `Unknown assessment tier: ${assessment.tier}` });
    }
    
    // Save results to assessment record
    const updateData: any = {
      status: "analysed",
      analysedAt: new Date(),
    };
    
    if ("epmReadinessScore" in analysisResult) {
      updateData.epmReadinessScore = analysisResult.epmReadinessScore;
      updateData.overallMaturityScore = analysisResult.epmReadinessScore; // Keep both in sync
      updateData.quickWins = (analysisResult as any).quickWins;
      updateData.recommendations = [(analysisResult as any).upgradeRecommendation];
    } else {
      updateData.epmReadinessScore = analysisResult.overallScore;
      updateData.overallMaturityScore = analysisResult.overallScore; // Keep both in sync
      updateData.dimensionScores = analysisResult.dimensionScores;
      updateData.recommendations = analysisResult.prioritisedRecommendations?.map((r: any) => r.description) || [];
    }
    
    await fcStorage.updateAssessment(id, updateData);
    
    // Auto-create default ROI profile for the assessment
    await createDefaultRoiProfileIfNeeded(id);
    
    // Create audit log
    await fcStorage.createAuditLog({
      assessmentId: id,
      action: "assessment:analysed",
      entityType: "assessment",
      entityId: id,
      details: { 
        tier: assessment.tier,
        score: updateData.epmReadinessScore,
      },
    });
    
    log.info({ assessmentId: id }, "AI analysis completed for assessment");
    
    res.json({
      success: true,
      data: {
        assessmentId: id,
        tier: assessment.tier,
        analysis: analysisResult,
        alreadyAnalysed: false,
      },
    });
  } catch (error) {
    log.error({ err: error }, "AI analysis error");
    res.status(500).json({ success: false, error: "Failed to analyse assessment. Please try again later." });
  }
});

// ============================================
// PDF REPORT DOWNLOAD ENDPOINT - REMOVED
// ============================================
// PDF report generation has been removed from this application

// ============================================
// SLIDESPEAK PRESENTATION GENERATION ENDPOINTS
// NOTE: These endpoints have been moved to admin routes.
// See: server/finance-compass/admin-routes.ts
// Admin routes: /api/admin/finance-compass/assessments/:id/slidespeak/*
// ============================================

// [DEPRECATED - Moved to Admin Routes]
// POST /assessments/:id/slidespeak/generate -> /api/admin/finance-compass/assessments/:id/slidespeak/generate
// GET /assessments/:id/slidespeak/status -> /api/admin/finance-compass/assessments/:id/slidespeak/status
// GET /assessments/:id/slidespeak/download -> /api/admin/finance-compass/assessments/:id/slidespeak/download

// ============================================
// ROI PROFILE ENDPOINTS
// ============================================

// Get ROI profile for an assessment
publicRouter.get("/assessments/:id/roi", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify the user has access to this assessment via session
    const fcSession = (req.session as any)?.fcVerified;
    if (!fcSession?.contactId) {
      return res.status(401).json({ success: false, error: "Session required" });
    }
    
    // Get the assessment to verify ownership
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    if (assessment.contactId !== fcSession.contactId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Get the ROI profile
    const profile = await fcStorage.getRoiProfileByAssessmentId(id);
    
    if (!profile) {
      return res.json({
        success: true,
        data: {
          profile: null,
          metrics: null,
        },
      });
    }
    
    // Calculate metrics
    const metrics = calculateRoiMetrics(profile);
    
    res.json({
      success: true,
      data: {
        profile,
        metrics,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get ROI profile error");
    res.status(500).json({ success: false, error: "Failed to fetch ROI profile" });
  }
});

// Update/create ROI profile for an assessment
publicRouter.put("/assessments/:id/roi", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verify the user has access to this assessment via session
    const fcSession = (req.session as any)?.fcVerified;
    if (!fcSession?.contactId) {
      return res.status(401).json({ success: false, error: "Session required" });
    }
    
    // Get the assessment to verify ownership
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    if (assessment.contactId !== fcSession.contactId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Validate input
    const validatedData = insertFcRoiProfileSchema.partial().parse(req.body);
    
    // Calculate metrics
    const metrics = calculateRoiMetrics({
      ...validatedData,
      horizonYears: validatedData.horizonYears ?? 3,
    });
    
    // Upsert the profile with calculated metrics
    const profile = await fcStorage.upsertRoiProfile(id, {
      ...validatedData,
      contactId: fcSession.contactId,
      companyId: assessment.companyId,
      totalImplementationCost: metrics.totalImplementationCost,
      totalAnnualBenefits: metrics.totalAnnualBenefits,
      totalAnnualCosts: metrics.totalAnnualCosts,
      roiPercent: metrics.roiPercent,
      totalCostOfOwnership: metrics.totalCostOfOwnership,
      paybackMonths: metrics.paybackMonths,
      npvValue: metrics.npvValue,
      benefitCostRatio: metrics.benefitCostRatio,
    });
    
    res.json({
      success: true,
      data: {
        profile,
        metrics,
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Update ROI profile error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to update ROI profile" });
  }
});

// ============================================
// BENCHMARK COMPARISON ENDPOINTS (Public)
// ============================================

// Get benchmark comparison report for an assessment
publicRouter.get("/assessments/:id/benchmark-comparison", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the assessment first
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    // Verify the user has access to this assessment via session (with dev bypass)
    const fcSession = (req.session as any)?.fcVerified;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev) {
      if (!fcSession?.contactId) {
        return res.status(401).json({ success: false, error: "Session required" });
      }
      if (assessment.contactId !== fcSession.contactId) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    } else if (fcSession?.contactId && assessment.contactId !== fcSession.contactId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Benchmark comparison is available for both pre_assessment and full tiers
    if (!["pre_assessment", "full"].includes(assessment.tier)) {
      return res.status(400).json({ 
        success: false, 
        error: "Benchmark comparison is only available for pre-assessment and full assessments" 
      });
    }
    
    // For full assessments, require dimension scores; for pre_assessment, allow without
    if (assessment.tier === "full" && (!assessment.dimensionScores || Object.keys(assessment.dimensionScores as object).length === 0)) {
      return res.status(400).json({ 
        success: false, 
        error: "Assessment must be analysed before benchmark comparison is available" 
      });
    }
    
    // Get company data
    const company = assessment.companyId 
      ? await fcStorage.getCompanyById(assessment.companyId)
      : null;
    
    // Get responses for recalculation and industry lookup
    const responses = await fcStorage.getResponsesByAssessmentId(id);
    
    // For pre_assessment, try to get sector from industry question response
    let effectiveSector = company?.sector || null;
    if (!effectiveSector) {
      // Try to get industry from the q2_industry_sector response
      const industryResponse = responses.find((r: { questionId: string }) => r.questionId === "q2_industry_sector");
      if (industryResponse?.response) {
        const industryValue = typeof industryResponse.response === "string" 
          ? industryResponse.response 
          : (industryResponse.response as any)?.value;
        effectiveSector = getSectorFromIndustry(industryValue);
      }
    }
    
    // CRITICAL: Recalculate dimension scores using latest scoring logic (including inverse benchmarks)
    const questions = await fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier);
    const { calculateAllDimensionTransparency } = await import("./ai-service");
    const scoreTransparency = calculateAllDimensionTransparency(responses, questions);
    
    // Build recalculated scores from transparency data
    const recalculatedDimensionScores: Record<string, number> = {};
    for (const [dimension, transparency] of Object.entries(scoreTransparency)) {
      recalculatedDimensionScores[dimension] = transparency.percentage;
    }
    
    // Benchmark data is relatively static once generated - cache for 5 minutes
    res.set('Cache-Control', 'private, max-age=300');
    
    // Generate benchmark comparison report using recalculated scores
    const report = await generateBenchmarkComparisonReport({
      id: assessment.id,
      companyName: company?.name || "Your Company",
      sector: effectiveSector,
      sicCode: company?.sicCode || null,
      sizeBand: company?.sizeBand || assessment.sizeBand || null,
      dimensionScores: recalculatedDimensionScores,
      overallMaturityScore: assessment.overallMaturityScore,
    });
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    log.error({ err: error }, "Get benchmark comparison error");
    res.status(500).json({ success: false, error: "Failed to generate benchmark comparison" });
  }
});

// Get AI narrative report content for an assessment
publicRouter.get("/assessments/:id/narratives", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isDev = process.env.NODE_ENV === 'development';
    
    // Get the assessment first
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    // Verify the user has access to this assessment via session (or dev bypass)
    const fcSession = (req.session as any)?.fcVerified;
    if (!isDev && !fcSession?.contactId) {
      return res.status(401).json({ success: false, error: "Session required" });
    }
    
    // In production, verify ownership. In dev, allow access to any existing assessment
    if (!isDev && fcSession?.contactId && assessment.contactId !== fcSession.contactId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Available for pre_assessment and full tiers that are analysed
    if (assessment.tier !== "full" && assessment.tier !== "pre_assessment") {
      return res.status(400).json({ 
        success: false, 
        error: "AI narrative report is only available for pre-assessment and full assessments" 
      });
    }
    
    if (!assessment.dimensionScores || Object.keys(assessment.dimensionScores as object).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Assessment must be analysed before AI narrative report is available" 
      });
    }
    
    // Check if regeneration is in progress
    const cachedNarrative = await fcStorage.getReportNarrative(id);
    const dataSynthesis = cachedNarrative?.dataSynthesis as any;
    if (dataSynthesis?.narrativeStatus === "processing") {
      return res.json({
        success: true,
        processing: true,
        message: "AI narratives are being regenerated. Please check back in 1-2 minutes.",
      });
    }
    
    // Return cached narratives if they exist - simple read, no regeneration
    // Regeneration only happens via explicit POST to /narratives/regenerate
    if (cachedNarrative?.dataSynthesis && (cachedNarrative.dataSynthesis as any)?.aiNarratives) {
      const aiNarratives = (cachedNarrative.dataSynthesis as any).aiNarratives;
      
      // If we have valid cached narratives with the essential fields, return them immediately
      if (aiNarratives.executiveBrief || aiNarratives.implementationRoadmap || aiNarratives.stakeholderNarratives) {
        // Normalize stakeholder narratives to ensure new structured fields are present
        const normalizedStakeholderNarratives = {
          cfo: aiNarratives.stakeholderNarratives?.cfo 
            ? normalizeStakeholderNarrative(aiNarratives.stakeholderNarratives.cfo)
            : aiNarratives.stakeholderNarratives?.cfo,
          fpaDirector: aiNarratives.stakeholderNarratives?.fpaDirector
            ? normalizeStakeholderNarrative(aiNarratives.stakeholderNarratives.fpaDirector)
            : aiNarratives.stakeholderNarratives?.fpaDirector,
          itDirector: aiNarratives.stakeholderNarratives?.itDirector
            ? normalizeStakeholderNarrative(aiNarratives.stakeholderNarratives.itDirector)
            : aiNarratives.stakeholderNarratives?.itDirector,
        };
        
        // Add cache header for browser caching
        res.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
        
        // Generate Phase 1-4 Intelligence on-the-fly (computed from assessment data, not AI-generated)
        const [cachedCompany, cachedResponses] = await Promise.all([
          assessment.companyId ? fcStorage.getCompanyById(assessment.companyId) : Promise.resolve(null),
          fcStorage.getResponsesByAssessmentId(id),
        ]);
        const cachedMetrics = {
          dimensionScores: normalizeDimensionScores(assessment.dimensionScores),
          overallScore: assessment.epmReadinessScore || assessment.overallMaturityScore || 0,
        };
        const phase14Intelligence = getPhase14Intelligence(
          assessment,
          cachedMetrics.dimensionScores,
          cachedCompany,
          cachedResponses
        );
        
        return res.json({
          success: true,
          processing: false,
          data: {
            executiveBrief: aiNarratives.executiveBrief,
            implementationRoadmap: aiNarratives.implementationRoadmap,
            stakeholderNarratives: normalizedStakeholderNarratives,
            phase14Intelligence,
            cachedAt: aiNarratives.generatedAt,
          },
        });
      }
    }
    
    // No cache exists - generate narratives for the first time
    
    // Get company and contact data
    const [company, contact] = await Promise.all([
      assessment.companyId ? fcStorage.getCompanyById(assessment.companyId) : Promise.resolve(null),
      assessment.contactId ? fcStorage.getContactById(assessment.contactId) : Promise.resolve(null),
    ]);
    
    // Get responses for additional context
    const responses = await fcStorage.getResponsesByAssessmentId(id);
    
    // Build metrics object for narrative generation
    // Normalize dimension scores from database format ({ dim: number }) to expected format ({ dim: { score: number } })
    const metrics = {
      dimensionScores: normalizeDimensionScores(assessment.dimensionScores),
      overallScore: assessment.epmReadinessScore || assessment.overallMaturityScore || 0,
      roiMetrics: (assessment as any).roiMetrics || {},
    };
    
    // Build dimension score map for value journey integration
    const dimensionScoreMap: Record<string, number> = {};
    for (const [dim, data] of Object.entries(metrics.dimensionScores)) {
      dimensionScoreMap[dim] = (data as any)?.score || 0;
    }
    
    // Generate priority context from contact's transformation priorities
    const userPriorities = (contact?.priorities as string[] | null) || [];
    const industryBenchmarks: Record<string, number> = {};
    for (const dim of Object.keys(dimensionScoreMap)) {
      industryBenchmarks[dim] = 55;
    }
    const priorityContext = userPriorities.length > 0 
      ? generatePriorityContext(userPriorities, dimensionScoreMap, industryBenchmarks)
      : null;
    
    // Generate all narratives in parallel with priority context
    const [executiveBrief, implementationRoadmap, cfoNarrative, fpaDirectorNarrative, itDirectorNarrative] = await Promise.all([
      generateExecutiveBrief(assessment, responses, company, metrics, null, priorityContext),
      generateImplementationRoadmap(assessment, company, "moderate", null, responses, dimensionScoreMap),
      generateStakeholderNarrative(assessment, responses, company, metrics, "cfo", priorityContext),
      generateStakeholderNarrative(assessment, responses, company, metrics, "fpa_director", priorityContext),
      generateStakeholderNarrative(assessment, responses, company, metrics, "it_director", priorityContext),
    ]);
    
    // Save the narratives to cache
    try {
      const existingNarrative = await fcStorage.getReportNarrative(id);
      await fcStorage.saveReportNarrative(id, {
        structure: existingNarrative?.reportStructure || {} as any,
        executiveSummary: existingNarrative?.executiveSummary || {} as any,
        dimensionNarratives: existingNarrative?.dimensionNarratives || [] as any,
        keyFindings: existingNarrative?.keyFindings || {} as any,
        actionPlan: existingNarrative?.actionPlan || {} as any,
        benchmarks: existingNarrative?.benchmarks || {} as any,
        dataSynthesis: {
          ...(existingNarrative?.dataSynthesis || {}),
          aiNarratives: {
            executiveBrief,
            implementationRoadmap,
            stakeholderNarratives: {
              cfo: cfoNarrative,
              fpaDirector: fpaDirectorNarrative,
              itDirector: itDirectorNarrative,
            },
            generatedAt: new Date().toISOString(),
          }
        } as any,
        isFallback: false,
      });
    } catch (saveError) {
      log.error({ err: saveError }, "Failed to cache AI narratives");
      // Continue - don't fail the request if caching fails
    }
    
    // Generate Phase 1-4 Intelligence data
    const phase14Intelligence = getPhase14Intelligence(
      assessment,
      metrics.dimensionScores,
      company,
      responses
    );
    
    res.json({
      success: true,
      processing: false,
      data: {
        executiveBrief,
        implementationRoadmap,
        stakeholderNarratives: {
          cfo: cfoNarrative,
          fpaDirector: fpaDirectorNarrative,
          itDirector: itDirectorNarrative,
        },
        phase14Intelligence,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get AI narratives error");
    res.status(500).json({ success: false, error: "Failed to generate AI narrative report" });
  }
});

// Regenerate AI narrative report for an assessment (force regeneration, skip cache)
// Returns immediately with regenerating: true, does generation in background
publicRouter.post("/assessments/:id/narratives/regenerate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isDev = process.env.NODE_ENV === 'development';
    
    // Get the assessment first
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    // Verify the user has access to this assessment via session (or dev bypass)
    const fcSession = (req.session as any)?.fcVerified;
    if (!isDev && !fcSession?.contactId) {
      return res.status(401).json({ success: false, error: "Session required" });
    }
    
    // In production, verify ownership. In dev, allow access to any existing assessment
    if (!isDev && fcSession?.contactId && assessment.contactId !== fcSession.contactId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Available for pre_assessment and full tiers that are analysed
    if (assessment.tier !== "full" && assessment.tier !== "pre_assessment") {
      return res.status(400).json({ 
        success: false, 
        error: "AI narrative report is only available for pre-assessment and full assessments" 
      });
    }
    
    if (!assessment.dimensionScores || Object.keys(assessment.dimensionScores as object).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Assessment must be analysed before AI narrative report is available" 
      });
    }
    
    // Set processing status BEFORE returning
    try {
      const existingNarrative = await fcStorage.getReportNarrative(id);
      await fcStorage.saveReportNarrative(id, {
        structure: existingNarrative?.reportStructure || {} as any,
        executiveSummary: existingNarrative?.executiveSummary || {} as any,
        dimensionNarratives: existingNarrative?.dimensionNarratives || [] as any,
        keyFindings: existingNarrative?.keyFindings || {} as any,
        actionPlan: existingNarrative?.actionPlan || {} as any,
        benchmarks: existingNarrative?.benchmarks || {} as any,
        dataSynthesis: {
          ...(existingNarrative?.dataSynthesis || {}),
          narrativeStatus: "processing",
          regenerationRequestedAt: new Date().toISOString(),
        } as any,
        isFallback: false,
      });
    } catch (statusError) {
      log.error({ err: statusError }, "Failed to set processing status");
    }
    
    // Return immediately - generation happens in background
    res.json({
      success: true,
      regenerating: true,
    });
    
    // Run the actual generation in background (fire-and-forget)
    (async () => {
      try {
        log.info({ assessmentId: id }, "Starting background regeneration for assessment");
        
        // Clear the in-memory narrative cache to force fresh AI generation
        clearNarrativeCache(id);
        log.info({ assessmentId: id }, "Cleared narrative cache for assessment");
        
        // Batch independent lookups with Promise.all for better performance
        const [company, contact, responses] = await Promise.all([
          assessment.companyId ? fcStorage.getCompanyById(assessment.companyId) : Promise.resolve(null),
          assessment.contactId ? fcStorage.getContactById(assessment.contactId) : Promise.resolve(null),
          fcStorage.getResponsesByAssessmentId(id),
        ]);
        
        // Build metrics object for narrative generation
        // Normalize dimension scores from database format ({ dim: number }) to expected format ({ dim: { score: number } })
        const metrics = {
          dimensionScores: normalizeDimensionScores(assessment.dimensionScores),
          overallScore: assessment.epmReadinessScore || assessment.overallMaturityScore || 0,
          roiMetrics: (assessment as any).roiMetrics || {},
        };
        
        // Build dimension score map for value journey integration
        const dimensionScoreMap: Record<string, number> = {};
        for (const [dim, data] of Object.entries(metrics.dimensionScores)) {
          dimensionScoreMap[dim] = (data as any)?.score || 0;
        }
        
        // Generate priority context from contact's transformation priorities
        const userPriorities = (contact?.priorities as string[] | null) || [];
        const industryBenchmarks: Record<string, number> = {};
        for (const dim of Object.keys(dimensionScoreMap)) {
          industryBenchmarks[dim] = 55;
        }
        const priorityContext = userPriorities.length > 0 
          ? generatePriorityContext(userPriorities, dimensionScoreMap, industryBenchmarks)
          : null;
        
        // Force regenerate all narratives in parallel with priority context
        const [executiveBrief, implementationRoadmap, cfoNarrative, fpaDirectorNarrative, itDirectorNarrative] = await Promise.all([
          generateExecutiveBrief(assessment, responses, company, metrics, null, priorityContext),
          generateImplementationRoadmap(assessment, company, "moderate", null, responses, dimensionScoreMap),
          generateStakeholderNarrative(assessment, responses, company, metrics, "cfo", priorityContext),
          generateStakeholderNarrative(assessment, responses, company, metrics, "fpa_director", priorityContext),
          generateStakeholderNarrative(assessment, responses, company, metrics, "it_director", priorityContext),
        ]);
        
        // Set generatedAt AFTER narratives are generated
        const generatedAt = new Date().toISOString();
        
        // Save the regenerated narratives to cache with status "complete"
        try {
          const existingNarrative = await fcStorage.getReportNarrative(id);
          await fcStorage.saveReportNarrative(id, {
            structure: existingNarrative?.reportStructure || {} as any,
            executiveSummary: existingNarrative?.executiveSummary || {} as any,
            dimensionNarratives: existingNarrative?.dimensionNarratives || [] as any,
            keyFindings: existingNarrative?.keyFindings || {} as any,
            actionPlan: existingNarrative?.actionPlan || {} as any,
            benchmarks: existingNarrative?.benchmarks || {} as any,
            dataSynthesis: {
              ...(existingNarrative?.dataSynthesis || {}),
              narrativeStatus: "complete",
              aiNarratives: {
                executiveBrief,
                implementationRoadmap,
                stakeholderNarratives: {
                  cfo: cfoNarrative,
                  fpaDirector: fpaDirectorNarrative,
                  itDirector: itDirectorNarrative,
                },
                generatedAt,
              }
            } as any,
            isFallback: false,
          });
          log.info({ assessmentId: id }, "Background regeneration saved for assessment");
        } catch (saveError) {
          log.error({ err: saveError }, "Failed to cache regenerated AI narratives");
        }
        
        // Send email notification AFTER generation is complete
        if (contact?.email) {
          try {
            const logoBase64 = getLogoTurquoise();
            const companyName = company?.name || "Your Company";
            const resultsUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://constancia.com'}/finance-compass/results/${id}`;
            
            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #EFEAE0;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #EFEAE0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #12161D 0%, #8E4F67 100%); padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <img src="${logoBase64}" alt="Constancia" style="height: 40px; width: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="color: #12161D; font-size: 24px; margin: 0 0 20px 0;">Your AI Report is Ready</h1>
              
              <p style="color: #252826; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear ${contact.firstName || 'Valued Customer'},
              </p>
              
              <p style="color: #252826; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your FinanceCompass AI narrative report for <strong>${companyName}</strong> has been regenerated and is now ready for review.
              </p>
              
              <p style="color: #252826; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                The report includes an updated executive brief, implementation roadmap, and stakeholder-specific narratives tailored to your finance transformation journey.
              </p>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resultsUrl}" style="display: inline-block; background-color: #7FB8A3; color: #12161D; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                      View Your Report
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                If you have any questions about your assessment results, please don't hesitate to contact us.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #12161D; padding: 20px 40px; border-radius: 0 0 8px 8px;">
              <p style="color: #F6F3EE; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Constancia Group. All rights reserved.
              </p>
              <p style="color: #8E4F67; font-size: 12px; margin: 10px 0 0 0; text-align: center;">
                <a href="https://constancia.com" style="color: #7FB8A3; text-decoration: none;">constancia.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
            
            await sendEmail({
              to: contact.email,
              subject: "Your FinanceCompass AI Report is Ready",
              htmlContent: emailHtml,
            });
            
            log.info({ email: redactEmail(contact.email) }, "Regeneration email sent");
          } catch (emailError) {
            log.error({ err: emailError }, "Failed to send regeneration email");
          }
        }
        
        log.info({ assessmentId: id }, "Background regeneration complete for assessment");
      } catch (bgError) {
        log.error({ err: bgError }, "Background regeneration error");
      }
    })();
    
  } catch (error) {
    log.error({ err: error }, "Regenerate AI narratives error");
    res.status(500).json({ success: false, error: "Failed to regenerate AI narrative report" });
  }
});

// ============================================
// SCORE BREAKDOWN ENDPOINT (Public)
// ============================================

// Helper function to normalize response value (copied from ai-service.ts)
function normalizeResponseValue(value: unknown): unknown {
  if (typeof value === 'string') {
    let result = value.trim();
    while (result.startsWith('"') && result.endsWith('"') && result.length > 1) {
      result = result.slice(1, -1).trim();
    }
    return result;
  }
  return value;
}

// Get score breakdown showing how dimension scores are calculated
publicRouter.get("/assessments/:id/score-breakdown", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get the assessment first
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    // Verify the user has access to this assessment via session
    // Dev bypass: Skip session check in development mode for testing
    const fcSession = (req.session as any)?.fcVerified;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev) {
      if (!fcSession?.contactId) {
        return res.status(401).json({ success: false, error: "Session required" });
      }
      if (assessment.contactId !== fcSession.contactId) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
    } else if (fcSession?.contactId && assessment.contactId !== fcSession.contactId) {
      // In dev mode, still check ownership if session exists
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    // Score breakdown is relatively static once assessment is complete - cache for 5 minutes
    res.set('Cache-Control', 'private, max-age=300');
    
    // Get responses and questions for this assessment from database
    const responses = await fcStorage.getResponsesByAssessmentId(id);
    const tier = assessment.tier as FCAssessmentTier;
    
    // Fetch ALL questions from database (across all tiers) to show complete picture
    // The report should show all 124 questions for full assessment, not just 74 from current tier
    const dbQuestions = await fcStorage.getAllQuestions();
    
    // Filter to questions that have responses (answered questions across all completed tiers)
    const respondedQuestionIds = new Set(responses.map(r => r.questionId));
    const relevantQuestions = dbQuestions.filter(q => respondedQuestionIds.has(q.id));
    
    log.info({ assessmentId: id, tier, responseCount: responses.length, allQuestionCount: dbQuestions.length, relevantQuestionCount: relevantQuestions.length }, "Score breakdown calculation started");
    
    // Build a map of question definitions by ID for quick lookup
    const questionMap = new Map(dbQuestions.map(q => [q.id, q]));
    
    // Get all unique dimensions from the responses
    const dimensions = new Set<string>();
    for (const response of responses) {
      const question = questionMap.get(response.questionId);
      if (question && question.dimension && 
          question.dimension !== 'qualification' && 
          question.dimension !== 'sizing') {
        dimensions.add(question.dimension);
      }
    }
    
    log.info({ dimensions: Array.from(dimensions) }, "Score breakdown found dimensions");
    
    // Log sample of response IDs that didn't match
    const unmatchedResponses = responses.filter(r => !questionMap.has(r.questionId));
    if (unmatchedResponses.length > 0) {
      log.info({ unmatchedQuestionIds: unmatchedResponses.slice(0, 5).map(r => r.questionId) }, "Score breakdown has unmatched responses");
    }
    
    // Fetch weightings for questions - use the map function for lookup
    const { getQuestionWeightingsMap, getAllQuestionCorrelations } = await import("./storage");
    const weightingMap = await getQuestionWeightingsMap();
    
    // Fetch correlations for this assessment
    const correlations = await getAllQuestionCorrelations();
    const activeCorrelations = correlations.filter(c => c.isActive);
    
    // Calculate breakdown for each dimension
    const dimensionBreakdowns: Array<{
      dimension: string;
      dimensionCode: string;
      dimensionLabel: string;
      finalScore: number;
      weightedScore: number;
      totalScoreEarned: number;
      maxPossibleScore: number;
      correlationAdjustment: number;
      overallWeight: number;
      calculation: string;
      questions: Array<{
        questionId: string;
        questionKey: string;
        questionText: string;
        questionType: string;
        options: Array<{ value: string; label: string }> | null;
        sliderConfig: { min: number; max: number; labels?: Record<number, string> } | null;
        userResponse: unknown;
        userResponseLabel: string;
        rawScore: number;
        scoreMultiplier: number;
        dimensionWeight: number;
        weightedScore: number;
        maxPossible: number;
        explanation: string;
      }>;
      appliedCorrelations: Array<{
        sourceQuestion: string;
        targetQuestion: string;
        effectType: string;
        adjustment: number;
        description: string;
      }>;
    }> = [];
    
    for (const dimension of Array.from(dimensions)) {
      // Get questions for this dimension from database
      const dimQuestions = dbQuestions.filter(q => q.dimension === dimension);
      const dimResponses = responses.filter(r => 
        dimQuestions.some(q => q.id === r.questionId)
      );
      
      if (dimResponses.length === 0) continue;
      
      let totalRawScore = 0;
      let totalWeightedScore = 0;
      let maxScore = 0;
      let dimensionOverallWeight = 1.0;
      const questionBreakdowns: Array<{
        questionId: string;
        questionKey: string;
        questionText: string;
        questionType: string;
        options: Array<{ value: string; label: string }> | null;
        sliderConfig: { min: number; max: number; labels?: Record<number, string> } | null;
        userResponse: unknown;
        userResponseLabel: string;
        rawScore: number;
        scoreMultiplier: number;
        dimensionWeight: number;
        weightedScore: number;
        maxPossible: number;
        explanation: string;
      }> = [];
      
      for (const response of dimResponses) {
        const question = dimQuestions.find(q => q.id === response.questionId);
        if (!question) continue;
        
        const rawValue = response.response;
        const responseValue = normalizeResponseValue(rawValue);
        const config = question.scoringConfig as any;
        const options = question.options as any[];
        
        // Get slider config from validation field (database format)
        // The seed function stores it as validation.sliderConfig, so check there first
        const validation = question.validation as { sliderConfig?: { min?: number; max?: number; labels?: Record<number, string> }; min?: number; max?: number; labels?: Record<number, string> } | null;
        const sliderConfig = validation?.sliderConfig ? {
          min: validation.sliderConfig.min ?? 1,
          max: validation.sliderConfig.max ?? 5,
          labels: validation.sliderConfig.labels || {},
        } : (validation?.min !== undefined || validation?.max !== undefined ? {
          min: validation.min ?? 1,
          max: validation.max ?? 5,
          labels: validation.labels || {},
        } : null);
        
        let rawScore = 0;
        let maxPossible = 0;
        let explanation = "";
        let userResponseLabel = String(responseValue);
        
        // Get weighting for this question
        const questionKey = question.questionKey || question.id;
        const weighting = weightingMap.get(questionKey);
        const scoreMultiplier = weighting?.scoreMultiplier ?? 1.0;
        const dimWeight = weighting?.dimensionWeight ?? 1.0;
        
        // Track first question's overall weight as dimension weight
        if (weighting?.overallWeight) {
          dimensionOverallWeight = weighting.overallWeight;
        }
        
        // Handle benchmark-based scoring for range type questions
        // Supports both inverse (lower = better, e.g., cycle times) and direct (higher = better, e.g., FTE count)
        if (config?.type === 'range' && config?.benchmarks && typeof responseValue === 'number') {
          const benchmarks = config.benchmarks as { leading: number; advanced: number; established: number; developing: number };
          const value = responseValue;
          const isDirectScoring = config.direction === 'direct';
          
          maxPossible = 5;
          let tierLabel = 'Lagging';
          
          if (isDirectScoring) {
            // Direct scoring: higher values score higher (e.g., FTE count - more capacity = better)
            if (value >= benchmarks.leading) {
              rawScore = 5;
              tierLabel = 'Leading';
            } else if (value >= benchmarks.advanced) {
              rawScore = 4;
              tierLabel = 'Advanced';
            } else if (value >= benchmarks.established) {
              rawScore = 3;
              tierLabel = 'Established';
            } else if (value >= benchmarks.developing) {
              rawScore = 2;
              tierLabel = 'Developing';
            } else {
              rawScore = 1;
              tierLabel = 'Lagging';
            }
            
            userResponseLabel = `${value} (${tierLabel})`;
            explanation = `Benchmark tier: ${tierLabel} (${rawScore}/5) - Leading: ≥${benchmarks.leading}, Advanced: ≥${benchmarks.advanced}, Established: ≥${benchmarks.established}, Developing: ≥${benchmarks.developing}`;
          } else {
            // Inverse scoring (default): lower values score higher (e.g., cycle times - shorter = better)
            if (value <= benchmarks.leading) {
              rawScore = 5;
              tierLabel = 'Leading';
            } else if (value <= benchmarks.advanced) {
              rawScore = 4;
              tierLabel = 'Advanced';
            } else if (value <= benchmarks.established) {
              rawScore = 3;
              tierLabel = 'Established';
            } else if (value <= benchmarks.developing) {
              rawScore = 2;
              tierLabel = 'Developing';
            } else {
              rawScore = 1;
              tierLabel = 'Lagging';
            }
            
            userResponseLabel = `${value} (${tierLabel})`;
            explanation = `Benchmark tier: ${tierLabel} (${rawScore}/5) - Leading: ≤${benchmarks.leading}, Advanced: ≤${benchmarks.advanced}, Established: ≤${benchmarks.established}, Developing: ≤${benchmarks.developing}`;
          }
        }
        // Handle slider questions (1-5 scale) - NOT number type questions
        else if (question.type === 'slider' && sliderConfig) {
          const numVal = typeof responseValue === 'number' ? responseValue : 3;
          const maxVal = sliderConfig?.max || 5;
          const minVal = sliderConfig?.min || 1;
          // Clamp value to valid range to ensure accurate calculations
          const clampedVal = Math.max(minVal, Math.min(maxVal, numVal));
          rawScore = clampedVal - minVal;
          maxPossible = maxVal - minVal;
          
          // Get label from slider config if available
          if (sliderConfig?.labels && sliderConfig.labels[numVal]) {
            userResponseLabel = sliderConfig.labels[numVal];
          }
          
          explanation = `Slider score ${numVal}/${maxVal} (scoring ${rawScore}/${maxPossible} points)`;
        }
        // Handle plain number questions without range benchmarks
        else if (typeof responseValue === 'number' && !config?.type) {
          const numVal = responseValue;
          const maxVal = config?.max || sliderConfig?.max || 100;
          const minVal = config?.min || sliderConfig?.min || 0;
          rawScore = Math.min(5, Math.max(0, (numVal - minVal) / Math.max(1, (maxVal - minVal)) * 5));
          maxPossible = 5;
          
          userResponseLabel = String(numVal);
          explanation = `Numeric value ${numVal} (scored proportionally)`;
        }
        // Handle weighted scoring from scoringConfig.weights
        else if (config?.weights && typeof responseValue === 'string') {
          const weights = config.weights as Record<string, number>;
          const weight = weights[responseValue] ?? 0;
          // Ensure weight is a number, parse if stored as string
          rawScore = typeof weight === 'number' ? weight : parseFloat(String(weight)) || 0;
          // Get all weight values as numbers (handle string storage)
          const allWeights = Object.values(weights).map(v => typeof v === 'number' ? v : parseFloat(String(v)) || 0);
          const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 5;
          maxPossible = maxWeight;
          
          // Get label from options
          const selectedOption = options?.find((opt: any) => opt.value === responseValue);
          if (selectedOption) {
            userResponseLabel = selectedOption.label;
          }
          
          explanation = `Weighted score: ${weight}/${maxWeight} points`;
        }
        // Handle single_select questions without scoringConfig
        else if (options && Array.isArray(options) && typeof responseValue === 'string') {
          const optionIndex = options.findIndex((opt: any) => opt.value === responseValue);
          if (optionIndex >= 0) {
            rawScore = optionIndex + 1;
            maxPossible = options.length;
            userResponseLabel = options[optionIndex].label;
            explanation = `Option ${optionIndex + 1} of ${options.length} (higher = better maturity)`;
          }
        }
        // Handle vendor_tier scoring (EPM vendor question) - uses unified scoring engine
        else if (config?.type === 'vendor_tier' && Array.isArray(responseValue)) {
          const questionDef = getQuestionById(question.questionKey || question.id);
          const scoreResult = calculateQuestionScore(
            question.questionKey || question.id,
            responseValue,
            questionDef || undefined
          );
          
          rawScore = scoreResult.rawScore;
          maxPossible = scoreResult.maxPossible;
          explanation = scoreResult.explanation;
          userResponseLabel = scoreResult.userResponseLabel || 'Selected vendors';
        }
        // Handle multi-select with context-aware scoring modes
        else if (Array.isArray(responseValue)) {
          const selections = responseValue.length;
          const totalOptions = options?.length || 5;
          
          // Look up the scoring mode from the question bank
          const questionDef = getQuestionById(question.questionKey || question.id);
          const scoringMode: MultiSelectScoringMode = questionDef?.multiSelectScoringMode || 'average';
          
          // Calculate weights for selected options
          let sumSelectedWeights = 0;
          const weights = config?.weights as Record<string, number> | undefined;
          const maxSingleWeight = weights 
            ? Math.max(...Object.values(weights).filter(v => typeof v === 'number'))
            : totalOptions;
          
          for (const selectedValue of responseValue) {
            if (weights && typeof selectedValue === 'string') {
              sumSelectedWeights += weights[selectedValue] ?? 0;
            } else if (typeof selectedValue === 'string' && options) {
              const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
              if (optionIndex >= 0) {
                sumSelectedWeights += optionIndex + 1;
              }
            }
          }
          
          // Calculate sum of all possible weights for cumulative mode
          let sumAllPossibleWeights = 0;
          if (weights) {
            sumAllPossibleWeights = Object.values(weights).reduce((sum, w) => sum + (typeof w === 'number' ? w : 0), 0);
          } else {
            sumAllPossibleWeights = (totalOptions * (totalOptions + 1)) / 2;
          }
          
          // Apply scoring mode algorithm
          switch (scoringMode) {
            case 'cumulative': {
              // More selections = higher score (e.g., AI use cases, capabilities)
              const pctEarned = sumAllPossibleWeights > 0 ? sumSelectedWeights / sumAllPossibleWeights : 0;
              rawScore = Math.round(pctEarned * 5 * 10) / 10; // Scale to 0-5
              maxPossible = 5;
              explanation = `${selections} items selected (more = higher maturity)`;
              break;
            }
            
            case 'penalty': {
              // More selections = lower score (e.g., fragmented systems)
              let highestSelectedWeight = 0;
              for (const selectedValue of responseValue) {
                if (weights && typeof selectedValue === 'string') {
                  highestSelectedWeight = Math.max(highestSelectedWeight, weights[selectedValue] ?? 0);
                } else if (typeof selectedValue === 'string' && options) {
                  const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
                  if (optionIndex >= 0) {
                    highestSelectedWeight = Math.max(highestSelectedWeight, optionIndex + 1);
                  }
                }
              }
              const penaltyPct = maxSingleWeight > 0 ? (highestSelectedWeight / selections) / maxSingleWeight : 0;
              rawScore = Math.round(penaltyPct * 5 * 10) / 10; // Scale to 0-5
              maxPossible = 5;
              explanation = `${selections} items selected (fragmentation penalty applied)`;
              break;
            }
            
            case 'average':
            default: {
              // Average score across selections
              const avgWeight = selections > 0 ? sumSelectedWeights / selections : 0;
              const avgPct = maxSingleWeight > 0 ? avgWeight / maxSingleWeight : 0;
              rawScore = Math.round(avgPct * 5 * 10) / 10; // Scale to 0-5
              maxPossible = 5;
              explanation = `${selections} items selected (average of priorities)`;
              break;
            }
          }
          
          // Get labels for selections
          if (options) {
            const labels = responseValue.map(v => {
              const opt = options.find((o: any) => o.value === v);
              return opt ? opt.label : v;
            });
            userResponseLabel = labels.slice(0, 3).join(", ") + (labels.length > 3 ? ` (+${labels.length - 3} more)` : "");
          }
        }
        
        // Calculate weighted score
        const weightedScore = rawScore * scoreMultiplier * dimWeight;
        
        totalRawScore += rawScore;
        totalWeightedScore += weightedScore;
        maxScore += maxPossible;
        
        // Build explanation with weighting info
        if (scoreMultiplier !== 1.0 || dimWeight !== 1.0) {
          explanation += ` [Multiplier: ${scoreMultiplier}x, Weight: ${dimWeight}x → ${weightedScore.toFixed(1)} weighted]`;
        }
        
        // Prepare slider config for edit dialog - null for range-type questions (they're not sliders)
        const isRangeType = config?.type === 'range';
        const sliderConfigForEdit = isRangeType ? null : (
          sliderConfig ? {
            min: sliderConfig.min || 1,
            max: sliderConfig.max || 5,
            labels: sliderConfig.labels || undefined,
          } : (question.type === 'slider' ? { min: 1, max: 5 } : null)
        );
        
        // Determine effective question type for frontend display
        // Range-type questions should show as 'number' not 'slider'
        const effectiveQuestionType = isRangeType ? 'number' : (question.type || 'single_select');
        
        questionBreakdowns.push({
          questionId: question.id,
          questionKey,
          questionText: question.prompt,
          questionType: effectiveQuestionType,
          options: options || null,
          sliderConfig: sliderConfigForEdit,
          userResponse: responseValue,
          userResponseLabel,
          rawScore,
          scoreMultiplier,
          dimensionWeight: dimWeight,
          weightedScore,
          maxPossible,
          explanation,
        });
      }
      
      // Find correlations that affect this dimension
      const appliedCorrelations: Array<{
        sourceQuestion: string;
        targetQuestion: string;
        effectType: string;
        adjustment: number;
        description: string;
      }> = [];
      
      let correlationAdjustment = 0;
      for (const correlation of activeCorrelations) {
        // Check if this correlation targets any question in this dimension
        const targetQuestion = dimQuestions.find(q => 
          q.questionKey === correlation.targetQuestionKey || q.id === correlation.targetQuestionKey
        );
        if (targetQuestion) {
          // Calculate a simplified correlation effect for display
          const effectValue = correlation.effectValue ?? 0;
          if (effectValue !== 0) {
            correlationAdjustment += effectValue;
            appliedCorrelations.push({
              sourceQuestion: correlation.sourceQuestionKey,
              targetQuestion: correlation.targetQuestionKey,
              effectType: correlation.effectType || 'adjust',
              adjustment: effectValue,
              description: correlation.description || `${correlation.correlationType} correlation`,
            });
          }
        }
      }
      
      // Bound correlation adjustment to ±20% of weighted score to preserve percentage math
      const maxCorrelationAdjust = totalWeightedScore * 0.2;
      correlationAdjustment = Math.max(-maxCorrelationAdjust, Math.min(maxCorrelationAdjust, correlationAdjustment));
      
      // Calculate final score, bounded to valid 0-100 range
      const finalScore = maxScore > 0 ? Math.min(100, Math.max(0, Math.round(((totalWeightedScore + correlationAdjustment) / maxScore) * 100))) : 0;
      const dimensionLabel = DIMENSION_CONFIG[dimension as keyof typeof DIMENSION_CONFIG]?.name || 
        dimension.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      // Get the dimension code (D2_PROCESS, etc.) for matching with benchmarks
      const dimensionCode = DIMENSION_KEY_TO_CODE[dimension] || dimension.toUpperCase();
      
      // Build calculation string with weighting info
      let calculation = `Raw: ${totalRawScore.toFixed(1)}/${maxScore}`;
      if (totalWeightedScore !== totalRawScore) {
        calculation += ` → Weighted: ${totalWeightedScore.toFixed(1)}`;
      }
      if (correlationAdjustment !== 0) {
        calculation += ` + Correlations: ${correlationAdjustment > 0 ? '+' : ''}${correlationAdjustment.toFixed(1)}`;
      }
      calculation += ` = ${finalScore}%`;
      
      dimensionBreakdowns.push({
        dimension,
        dimensionCode,
        dimensionLabel,
        finalScore,
        weightedScore: totalWeightedScore,
        totalScoreEarned: totalRawScore,
        maxPossibleScore: maxScore,
        correlationAdjustment,
        overallWeight: dimensionOverallWeight,
        calculation,
        questions: questionBreakdowns,
        appliedCorrelations,
      });
    }
    
    // Sort by dimension label for consistent ordering
    dimensionBreakdowns.sort((a, b) => a.dimensionLabel.localeCompare(b.dimensionLabel));
    
    res.json({
      success: true,
      data: {
        assessmentId: id,
        tier: assessment.tier,
        dimensions: dimensionBreakdowns,
        methodology: {
          description: "Your scores are calculated using Constancia's proprietary Finance Transformation Framework with a 6-layer AI-validated scoring system, developed with 40+ years of combined finance transformation experience.",
          benchmarkSource: "Constancia Benchmark Database",
          benchmarkDescription: "Industry benchmarks are derived from anonymised data across Constancia's client base, segmented by sector, company size, and finance function maturity. Our benchmarks are refreshed quarterly to reflect evolving best practices.",
          assessmentStructure: {
            description: "Your final report combines insights from both assessment tiers to provide a comprehensive view of your finance transformation readiness.",
            tiers: [
              {
                tier: "Pre-Assessment",
                questionCount: 50,
                focus: "Strategic context and current state",
                description: "Captures organisational context, current tools and technologies, pain points, and strategic priorities to establish your baseline."
              },
              {
                tier: "Full Assessment",
                questionCount: 74,
                focus: "Deep-dive capability analysis",
                description: "Detailed questions across all 8 dimensions to measure maturity levels, process efficiency, and transformation readiness."
              }
            ],
            combined: "Both tiers contribute to your final scores, with pre-assessment providing context for interpreting full assessment results and identifying root causes."
          },
          validationPipeline: {
            name: "6-Layer AI Validation Pipeline",
            description: "Every assessment passes through our rigorous validation system to ensure accurate, consistent, and actionable insights.",
            layers: [
              {
                layer: 1,
                name: "Base Scoring Engine",
                description: "Context-aware scoring with cumulative, penalty, and weighted modes for different question types"
              },
              {
                layer: 2,
                name: "Fragmentation Detection",
                description: "Identifies multi-vendor fragmentation and mixed-tier tool usage that may impact transformation complexity"
              },
              {
                layer: 2.5,
                name: "Correlation Intelligence",
                description: "8x8 dimension correlation matrix adjusts scores based on interdependencies between capabilities"
              },
              {
                layer: 3,
                name: "Business Rules Validation",
                description: "Validates scores against vendor benchmarks, implementation timelines, and industry standards"
              },
              {
                layer: 4,
                name: "AI Advisory Layer",
                description: "GPT-powered validation with 95% confidence threshold for auto-updates and anomaly detection"
              },
              {
                layer: 5,
                name: "Phase 2-4 Intelligence",
                description: "Enhanced root cause analysis with remediation paths, respondent confidence scoring, and stakeholder-specific insights"
              }
            ]
          },
          framework: {
            name: "Constancia Finance Transformation Framework",
            dimensions: [
              { code: "D1", name: "Financial Planning & Analysis", description: "Budgeting, forecasting, scenario planning capabilities" },
              { code: "D2", name: "Management Reporting", description: "Report quality, timeliness, and insight generation" },
              { code: "D3", name: "Consolidation & Close", description: "Financial close, consolidation, and period-end processes" },
              { code: "D4", name: "Technology & Systems", description: "EPM/ERP platform maturity and integration" },
              { code: "D5", name: "Data & Analytics", description: "Data quality, governance, and analytical capabilities" },
              { code: "D6", name: "Financial Controls", description: "Internal controls, compliance, and risk management" },
              { code: "D7", name: "Organisation & People", description: "Skills, structure, and change readiness" },
              { code: "D8", name: "AI & Machine Learning", description: "AI/ML capabilities and readiness for intelligent automation" },
            ],
            maturityLevels: [
              { level: 1, name: "Foundational", range: "1.0-2.0", description: "Manual processes, limited automation", timeline: "24 months to transform" },
              { level: 2, name: "Transitional", range: "2.0-3.0", description: "Partial automation, building capabilities", timeline: "18 months to transform" },
              { level: 3, name: "Good Baseline", range: "3.0-4.0", description: "Solid foundation, ready for advanced capabilities", timeline: "12 months to transform" },
              { level: 4, name: "Advanced", range: "4.0-5.0", description: "Best-in-class, continuous improvement focus", timeline: "6 months to optimise" },
            ],
            benchmarkTiers: [
              { tier: "Typical", description: "Baseline/median performance across UK enterprises" },
              { tier: "Constancia Good", description: "Top quartile - what good looks like" },
              { tier: "Constancia Best", description: "Digital world-class performance" },
            ],
          },
          weightingSystem: {
            description: "Scores are adjusted using a three-tier weighting system and cross-question correlations for more nuanced maturity assessment.",
            tiers: [
              {
                name: "Score Multiplier",
                description: "Applied directly to raw question scores to emphasise or de-emphasise specific questions",
                default: 1.0,
                example: "A multiplier of 1.5 increases the impact of a critical question by 50%"
              },
              {
                name: "Dimension Weight", 
                description: "Controls how much each question contributes to its dimension's overall score",
                default: 1.0,
                example: "Questions with higher dimension weights have greater influence on the dimension score"
              },
              {
                name: "Overall Weight",
                description: "Determines how much each dimension contributes to the final overall maturity score",
                default: 1.0,
                example: "Dimensions with higher overall weights are more important to the total assessment"
              }
            ],
            correlations: {
              description: "Cross-question correlations capture interdependencies between capabilities",
              effectTypes: [
                { type: "boost", description: "Adds points when both capabilities are strong" },
                { type: "reduce", description: "Reduces points when a dependency is weak" },
                { type: "adjust", description: "Fine-tunes scores based on related answers" },
                { type: "multiply", description: "Scales the effect based on response strength" }
              ],
              example: "If your technology automation score is high, it can boost your process efficiency dimension through correlation effects"
            },
            formula: "Final Score = Σ(Question Score × Score Multiplier × Dimension Weight) + Correlation Adjustments"
          },
          scoringTypes: [
            { 
              type: "Slider", 
              explanation: "Score based on position on 1-5 scale (higher = better maturity)",
              example: "Example: If you rate your forecasting accuracy as 4/5, you earn 3 points (4 minus the minimum of 1) out of a maximum 4 points.",
              calculation: "Score = (Your Rating - Minimum) ÷ (Maximum - Minimum)"
            },
            { 
              type: "Weighted", 
              explanation: "Pre-defined weights assigned to each option based on maturity level",
              example: "Example: For close cycle duration, 'Under 5 days' earns 5 points (highest maturity), while 'Over 15 days' earns 1 point.",
              calculation: "Score = Assigned Weight for Selected Option"
            },
            { 
              type: "Single Select", 
              explanation: "Options ordered from lowest to highest maturity, position determines score",
              example: "Example: If 4 options exist and you select the 3rd option, you earn 3/4 points (75%).",
              calculation: "Score = Option Position ÷ Total Options"
            },
            { 
              type: "Multi Select", 
              explanation: "More selections typically indicate more challenges, resulting in lower score",
              example: "Example: Selecting 2 pain points earns 3/5 points; selecting 5+ pain points earns 0/5 points.",
              calculation: "Score = Maximum(0, 5 - Number of Selections)"
            },
          ],
          trustIndicators: [
            "40+ years combined EPM and finance transformation experience",
            "Benchmarks derived from UK enterprise implementations",
            "Scoring framework developed by certified finance professionals",
            "Updated quarterly to reflect evolving best practices"
          ],
        },
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get score breakdown error");
    res.status(500).json({ success: false, error: "Failed to generate score breakdown" });
  }
});

// Get available sectors with their benchmark data
publicRouter.get("/benchmarks/sectors", async (req: Request, res: Response) => {
  try {
    // Static reference data - cache for 1 hour
    res.set('Cache-Control', 'public, max-age=3600');
    
    const sectors = Object.entries(UK_SECTOR_BENCHMARKS).map(([sector, benchmarks]) => ({
      sector,
      benchmarks: {
        closeCycleDays: benchmarks.closeCycleDays,
        operatingMargin: benchmarks.operatingMargin,
        assetTurnover: benchmarks.assetTurnover,
      },
    }));
    
    res.json({
      success: true,
      data: {
        sectors,
        totalSectors: sectors.length,
        sicMapping: SIC_TO_SECTOR,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get sectors error");
    res.status(500).json({ success: false, error: "Failed to fetch sector benchmarks" });
  }
});

// Get tenant branding (public - for white-label frontend)
publicRouter.get("/branding/:slug", async (req: Request, res: Response) => {
  try {
    const tenant = await fcStorage.getTenantBySlug(req.params.slug);
    
    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }
    
    res.json({
      success: true,
      data: {
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        fontFamily: tenant.fontFamily,
        customCss: tenant.customCss,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Get branding error");
    res.status(500).json({ success: false, error: "Failed to fetch branding" });
  }
});
