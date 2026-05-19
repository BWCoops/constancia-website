/**
 * FinanceCompass Admin Routes
 * 
 * Admin API routes for the Finance Transformation Assessment Platform.
 * All routes are prefixed with /api/admin/finance-compass and require authentication.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { eq, sql, and, desc, asc, gte, count } from "drizzle-orm";
import ExcelJS from "exceljs";
import { db } from "../db";
import { widgetAnalytics } from "@shared/schema";
import { fcStorage } from "./storage";
import {
  ensureFinanceCompassAccess,
  ensureAnyFinanceCompassPermission,
  logAuditAction,
  getAdminId,
  getAdminEmail,
  getAdminRole,
} from "./middleware";
import {
  sanitizeForExport,
  sanitizeObjectForExport,
  sanitizeForCSV,
  sanitizeRowsForExport,
} from "./utils/export-sanitization";
import {
  FC_ASSESSMENT_TIERS,
  FC_ASSESSMENT_STATUSES,
  FC_DIMENSIONS,
  type FCAssessmentTier,
  fcAssessmentBenchmarks,
  fcIndustryBenchmarks,
  fcMacroBenchmarks,
  fcQuestionWeightings,
  fcQuestionCorrelations,
  fcQuestionWeightingAudit,
  type InsertFcQuestionWeighting,
  type InsertFcQuestionCorrelation,
} from "@shared/finance-compass-schema";
import { knowledgeBaseService } from "../services/finance-compass/knowledge-base-service";
import { scenarioService } from "../services/finance-compass/scenario-service";
import { slideSpeakService } from "../services/finance-compass/slidespeak-service";
import { 
  triggerSlidesSpeakGeneration, 
  checkSlidesSpeakStatus, 
  getReportGenerationStatus, 
  type SlidesSpeakStatus 
} from "./slidespeak-service";
import { fcReports } from "@shared/finance-compass-schema";
import { 
  ALL_QUESTIONS,
} from "./question-bank";
import { 
  dataQualityService, 
  anonymousExportService, 
  widgetQualityService,
  runStartupBackfill,
  getLastBackfillResult,
  isBackfillInProgress,
} from "./services/data-quality";
import { seedQuestions, getQuestionBankCount, transformQuestionBankToApiFormat } from "./seed-questions";
import { UK_SECTOR_BENCHMARKS, SIC_TO_SECTOR, DIMENSION_BENCHMARKS } from "./benchmark-engine";
import { clearNarrativeCache, generateAllNarratives, normalizeDimensionScores } from "./report-narrative-service";
import { calculateAllScoresWithWeightings } from "./ai-service";
import { generateBenchmarks } from "../benchmark-data/benchmark-generator";
import { getONSPublishedSectorStatistics, listAvailableDatasets } from "../benchmark-data/ons-fetcher";

import { createChildLogger } from "../lib/logger";

export const router = Router();
const logger = createChildLogger("fc-admin-routes");

// ============================================
// DASHBOARD & STATS
// ============================================

router.get("/stats", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const stats = await fcStorage.getAssessmentStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        tiers: FC_ASSESSMENT_TIERS,
        statuses: FC_ASSESSMENT_STATUSES,
        dimensions: FC_DIMENSIONS,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Stats error");
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

router.get("/dashboard", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    logger.info("Dashboard request starting...");
    const startTime = Date.now();
    
    // Fetch data with individual error handling for better diagnostics
    let stats, recentAssessmentsWithRelations, questions;
    
    try {
      stats = await fcStorage.getAssessmentStats();
      logger.info({ Date_now_startTime: Date.now() - startTime }, "Stats fetched in ms");
    } catch (statsError) {
      logger.error({ err: statsError }, "Dashboard: Failed to fetch stats");
      throw new Error("Failed to fetch assessment stats");
    }
    
    try {
      // OPTIMIZED: Use JOIN query instead of N+1 queries for assessments + relations
      recentAssessmentsWithRelations = await fcStorage.getAllAssessmentsWithRelations({ limit: 10 });
      logger.info({ Date_now_startTime: Date.now() - startTime }, "Assessments fetched in ms");
    } catch (assessmentsError) {
      logger.error({ err: assessmentsError }, "Dashboard: Failed to fetch assessments");
      throw new Error("Failed to fetch recent assessments");
    }
    
    try {
      questions = await fcStorage.getAllQuestions();
      logger.info({ Date_now_startTime: Date.now() - startTime }, "Questions fetched in ms");
    } catch (questionsError) {
      logger.error({ err: questionsError }, "Dashboard: Failed to fetch questions");
      throw new Error("Failed to fetch questions");
    }
    
    const questionBankCount = getQuestionBankCount();
    
    // Format data for response
    const recentAssessments = recentAssessmentsWithRelations.map(({ assessment, company, contact }) => ({
      ...assessment,
      company,
      contact,
    }));
    
    logger.info({ Date_now_startTime: Date.now() - startTime }, "Dashboard data prepared in ms total");
    
    res.json({
      success: true,
      data: {
        stats,
        recentAssessments,
        questionCount: questions.length,
        questionBankCount,
        needsSeeding: questions.length === 0,
        questionsByTier: {
          pre_assessment: questions.filter(q => q.tier === "pre_assessment").length,
          full: questions.filter(q => q.tier === "full").length,
        },
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Dashboard error");
    res.status(500).json({ success: false, error: error?.message || "Failed to fetch dashboard data" });
  }
});

// ============================================
// SEED QUESTIONS
// ============================================

router.post("/seed-questions", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    logger.info("Starting question seeding...");
    
    const result = await seedQuestions();
    
    await logAuditAction(req, "questions:seed", "questions", "all", {
      seeded: result.seeded,
      updated: result.updated,
      total: result.total,
    });
    
    res.json({
      success: true,
      data: result,
      message: `Successfully seeded ${result.seeded} new questions, updated ${result.updated} existing questions. Total: ${result.total}`,
    });
  } catch (error) {
    logger.error({ err: error }, "Question seeding error");
    res.status(500).json({ success: false, error: "Failed to seed questions" });
  }
});

// ============================================
// SEED CORRELATIONS
// ============================================

import { SEED_CORRELATIONS } from "./seed-correlations";

router.post("/seed-correlations", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    logger.info("Starting correlation seeding...");
    
    const allQuestions = await fcStorage.getAllQuestions();
    const questionKeySet = new Set(allQuestions.map(q => (q as any).questionKey).filter(Boolean));
    logger.info({ questionKeySet_size: questionKeySet.size }, "Found valid question keys in database");
    
    let seeded = 0;
    let skipped = 0;
    let updated = 0;
    let invalidQuestions = 0;
    
    for (const correlation of SEED_CORRELATIONS) {
      try {
        const sourceExists = questionKeySet.has(correlation.sourceQuestionKey);
        const targetExists = questionKeySet.has(correlation.targetQuestionKey);
        
        if (!sourceExists || !targetExists) {
          logger.info({ correlation_sourceQuestionKey: correlation.sourceQuestionKey, sourceExists_valid_INVALID: sourceExists ? 'valid' : 'INVALID', correlation_targetQuestionKey: correlation.targetQuestionKey, targetExists_valid_INVALID: targetExists ? 'valid' : 'INVALID' }, "Skipping correlation - invalid questions: source= (), target= ()");
          invalidQuestions++;
          continue;
        }
        
        const existing = await db
          .select()
          .from(fcQuestionCorrelations)
          .where(
            and(
              eq(fcQuestionCorrelations.sourceQuestionKey, correlation.sourceQuestionKey),
              eq(fcQuestionCorrelations.targetQuestionKey, correlation.targetQuestionKey)
            )
          )
          .limit(1);
        
        if (existing.length > 0) {
          const { force } = req.query;
          if (force === "true") {
            await db
              .update(fcQuestionCorrelations)
              .set({
                ...correlation,
                lastModifiedBy: getAdminEmail(req) || "system",
                updatedAt: new Date(),
              })
              .where(eq(fcQuestionCorrelations.id, existing[0].id));
            updated++;
          } else {
            skipped++;
          }
        } else {
          await db.insert(fcQuestionCorrelations).values({
            ...correlation,
            lastModifiedBy: getAdminEmail(req) || "system",
          });
          seeded++;
        }
      } catch (err) {
        logger.error({ err: err, correlation_sourceQuestionKey: correlation.sourceQuestionKey, correlation_targetQuestionKey: correlation.targetQuestionKey }, "Error seeding correlation ->");
      }
    }
    
    await logAuditAction(req, "correlations:seed", "question_correlations", "all", {
      seeded,
      updated,
      skipped,
      invalidQuestions,
      total: SEED_CORRELATIONS.length,
    });
    
    res.json({
      success: true,
      data: { seeded, updated, skipped, invalidQuestions, total: SEED_CORRELATIONS.length },
      message: `Seeded ${seeded} new correlations, updated ${updated}, skipped ${skipped} existing, ${invalidQuestions} had invalid question keys. Total defined: ${SEED_CORRELATIONS.length}`,
    });
  } catch (error) {
    logger.error({ err: error }, "Correlation seeding error");
    res.status(500).json({ success: false, error: "Failed to seed correlations" });
  }
});

// ============================================
// RECALCULATE ASSESSMENT SCORES
// ============================================

router.post("/recalculate-scores", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    logger.info("Starting score recalculation for all completed assessments...");
    
    const completedStatuses = ["completed", "analysed", "report_generated", "initial_complete"];
    // Use pagination with limit to avoid loading unbounded data
    const allAssessments = await fcStorage.getAllAssessments({ limit: 500 });
    const assessmentsToRecalculate = allAssessments.filter(a => completedStatuses.includes(a.status));
    
    logger.info({ assessmentsToRecalculate_length: assessmentsToRecalculate.length }, "Found completed assessments to recalculate");
    
    let recalculated = 0;
    let errors = 0;
    const results: { id: string; success: boolean; oldScore?: number; newScore?: number; error?: string }[] = [];
    
    // OPTIMIZATION: Fetch all unique question sets upfront to avoid repeated queries
    const questionsByTier = new Map<FCAssessmentTier, any[]>();
    for (const assessment of assessmentsToRecalculate) {
      if (!questionsByTier.has(assessment.tier as FCAssessmentTier)) {
        const questions = await fcStorage.getQuestionsByTier(assessment.tier as FCAssessmentTier);
        questionsByTier.set(assessment.tier as FCAssessmentTier, questions);
      }
    }
    
    for (const assessment of assessmentsToRecalculate) {
      try {
        const allResponses = await fcStorage.getResponsesByAssessmentId(assessment.id);
        // OPTIMIZATION: Reuse cached questions instead of fetching per assessment
        const allQuestions = questionsByTier.get(assessment.tier as FCAssessmentTier) || [];
        
        // Find all dimensions that have responses
        const dimensionsSet = new Set<string>();
        for (const resp of allResponses) {
          const q = allQuestions.find(qu => qu.id === resp.questionId);
          if (q && q.dimension && q.dimension !== 'qualification' && q.dimension !== 'sizing') {
            dimensionsSet.add(q.dimension);
          }
        }
        
        const oldScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
        
        // Use the weighted scoring function with correlations
        const { dimensionScores, overallScore } = await calculateAllScoresWithWeightings(
          allResponses,
          allQuestions,
          Array.from(dimensionsSet)
        );
        
        // Update assessment with new scores
        await fcStorage.updateAssessment(assessment.id, {
          dimensionScores,
          overallMaturityScore: overallScore,
          epmReadinessScore: overallScore,
        });
        
        results.push({
          id: assessment.id,
          success: true,
          oldScore,
          newScore: overallScore,
        });
        
        recalculated++;
        logger.info({ assessment_id: assessment.id, oldScore: oldScore, overallScore: overallScore }, "Recalculated assessment : ->");
      } catch (err: any) {
        logger.error({ err: err, assessment_id: assessment.id }, "Error recalculating assessment");
        results.push({
          id: assessment.id,
          success: false,
          error: err.message,
        });
        errors++;
      }
    }
    
    await logAuditAction(req, "assessments:recalculate", "assessments", "all", {
      recalculated,
      errors,
      total: assessmentsToRecalculate.length,
    });
    
    res.json({
      success: true,
      data: {
        recalculated,
        errors,
        total: assessmentsToRecalculate.length,
        results,
      },
      message: `Recalculated ${recalculated} assessments, ${errors} errors. Total: ${assessmentsToRecalculate.length}`,
    });
  } catch (error) {
    logger.error({ err: error }, "Score recalculation error");
    res.status(500).json({ success: false, error: "Failed to recalculate scores" });
  }
});

// ============================================
// ASSESSMENTS
// ============================================

const assessmentFiltersSchema = z.object({
  tier: z.enum(FC_ASSESSMENT_TIERS).optional(),
  status: z.enum(FC_ASSESSMENT_STATUSES).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

router.get("/assessments", ensureFinanceCompassAccess("fc:assessments:view"), async (req: Request, res: Response) => {
  try {
    const filters = assessmentFiltersSchema.parse(req.query);
    // OPTIMIZED: Use JOIN query instead of N+1 queries for assessments + relations
    const assessmentsWithRelations = await fcStorage.getAllAssessmentsWithRelations(filters);
    
    // Format data for response
    const assessments = assessmentsWithRelations.map(({ assessment, company, contact }) => ({
      ...assessment,
      company,
      contact,
    }));
    
    res.json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    logger.error({ err: error }, "Assessments list error");
    res.status(500).json({ success: false, error: "Failed to fetch assessments" });
  }
});

router.get("/assessments/:id", ensureFinanceCompassAccess("fc:assessments:view"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const details = await fcStorage.getAssessmentWithDetails(id);
    
    if (!details) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const questions = await fcStorage.getQuestionsByTier(details.assessment.tier as FCAssessmentTier);
    
    // Build a lookup map from ALL_QUESTIONS (code) to get sliderConfig/options
    const questionBankMap = new Map<string, any>();
    for (const q of ALL_QUESTIONS) {
      questionBankMap.set(q.id, q);
    }
    
    // Enrich questions with sliderConfig from question bank
    const enrichedQuestions = questions.map(q => {
      const qbData = questionBankMap.get(q.id);
      return {
        ...q,
        sliderConfig: qbData?.sliderConfig,
        options: q.options || qbData?.options,
      };
    });
    
    // Transform responses to match client interface expectations
    // Database uses 'response'/'rawValue', client expects 'value'/'textValue'
    const transformedResponses = (details.responses || []).map(resp => ({
      id: resp.id,
      questionId: resp.questionId,
      value: resp.response,
      textValue: resp.rawValue,
      score: resp.score,
    }));
    
    res.json({
      success: true,
      data: {
        ...details,
        responses: transformedResponses,
        questions: enrichedQuestions,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Assessment detail error");
    res.status(500).json({ success: false, error: "Failed to fetch assessment" });
  }
});

const updateAssessmentSchema = z.object({
  status: z.enum(FC_ASSESSMENT_STATUSES).optional(),
  internalNotes: z.string().optional(),
  assignedTo: z.string().optional(),
});

router.patch("/assessments/:id", ensureFinanceCompassAccess("fc:assessments:manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateAssessmentSchema.parse(req.body);
    
    const assessment = await fcStorage.updateAssessment(id, data);
    
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    await logAuditAction(req, "assessment:update", "assessment", id, data);
    
    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error({ err: error }, "Assessment update error");
    res.status(500).json({ success: false, error: "Failed to update assessment" });
  }
});

router.post("/assessments/:id/upgrade-tier", ensureFinanceCompassAccess("fc:assessments:manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newTier } = z.object({ newTier: z.enum(FC_ASSESSMENT_TIERS) }).parse(req.body);
    
    const assessment = await fcStorage.upgradeAssessmentTier(id, newTier);
    
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    await logAuditAction(req, "assessment:upgrade-tier", "assessment", id, { newTier });
    
    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    logger.error({ err: error }, "Tier upgrade error");
    res.status(500).json({ success: false, error: "Failed to upgrade tier" });
  }
});

router.delete("/assessments/:id", ensureFinanceCompassAccess("fc:assessments:manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentWithDetails(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    await fcStorage.deleteAssessment(id);
    
    await logAuditAction(req, "assessment:delete", "assessment", id, {
      tier: assessment.assessment.tier,
      company: assessment.company?.name,
      contact: assessment.contact?.email,
    });
    
    res.json({
      success: true,
      message: "Assessment deleted successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Assessment delete error");
    res.status(500).json({ success: false, error: "Failed to delete assessment" });
  }
});

// ============================================
// EXPORT ASSESSMENT RESPONSES TO EXCEL
// ============================================

router.get("/assessments/:id/responses/export", ensureFinanceCompassAccess("fc:assessments:view"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const details = await fcStorage.getAssessmentWithDetails(id);
    
    if (!details) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const questions = await fcStorage.getQuestionsByTier(details.assessment.tier as FCAssessmentTier);
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Constancia FinanceCompass";
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet("Assessment Responses");
    
    // Define columns
    worksheet.columns = [
      { header: "Question ID", key: "questionId", width: 20 },
      { header: "Dimension", key: "dimension", width: 25 },
      { header: "Question Text", key: "questionText", width: 60 },
      { header: "Response Value", key: "responseValue", width: 30 },
      { header: "Score Contribution", key: "scoreContribution", width: 18 },
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF02205B" }, // Navy
    };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    
    // Map responses to questions
    const responseMap = new Map<string, any>();
    for (const resp of details.responses || []) {
      responseMap.set(resp.questionId, resp);
    }
    
    // Build a lookup map from ALL_QUESTIONS (code) to get sliderConfig/options
    const questionBankMap = new Map<string, any>();
    for (const q of ALL_QUESTIONS) {
      questionBankMap.set(q.id, q);
    }
    
    // Format dimension name for display
    const formatDimension = (dim: string | null | undefined) => {
      if (!dim) return "General";
      return dim.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    };
    
    // Helper to get human-readable label for a response value
    const getResponseLabel = (question: any, responseVal: any): string => {
      if (responseVal === undefined || responseVal === null) return "";
      
      // For slider/Likert scale questions with sliderConfig.labels
      if (question.sliderConfig?.labels && typeof responseVal === "number") {
        const label = question.sliderConfig.labels[responseVal];
        if (label) {
          return `${responseVal} - ${label}`;
        }
      }
      
      // For multi-select or single-select with options array
      if (question.options && Array.isArray(question.options)) {
        if (Array.isArray(responseVal)) {
          // Multi-select: map each value to its label
          const labels = responseVal.map((val: string) => {
            const opt = question.options.find((o: any) => o.value === val);
            return opt?.label || val;
          });
          return labels.join("; ");
        } else {
          // Single select
          const opt = question.options.find((o: any) => o.value === responseVal);
          if (opt?.label) return opt.label;
        }
      }
      
      // For structured responses (objects), format nicely
      if (typeof responseVal === "object") {
        // Handle common patterns like { text: "..." } or { otherText: "..." }
        if (responseVal.text) return responseVal.text;
        if (responseVal.otherText) return responseVal.otherText;
        return JSON.stringify(responseVal);
      }
      
      return String(responseVal);
    };
    
    // Add data rows
    for (const question of questions) {
      const response = responseMap.get(question.id);
      
      // Merge database question with question bank data (which has sliderConfig)
      const questionBankData = questionBankMap.get(question.id);
      const enrichedQuestion = {
        ...question,
        sliderConfig: questionBankData?.sliderConfig,
        // Only use question bank options if database options is empty/null
        options: question.options || questionBankData?.options,
      };
      
      // Format response value with meaningful labels
      let responseValue = "";
      if (response?.response !== undefined && response?.response !== null) {
        responseValue = getResponseLabel(enrichedQuestion, response.response);
      } else if (response?.rawValue) {
        responseValue = response.rawValue;
      }
      
      // Calculate score contribution if available (leave blank if none)
      let scoreContribution = "";
      if (response?.score !== undefined && response?.score !== null) {
        scoreContribution = String(response.score);
      }
      
      worksheet.addRow({
        questionId: sanitizeForExport((question as any).questionKey || question.id.slice(0, 8)),
        dimension: sanitizeForExport(formatDimension((question as any).dimension)),
        questionText: sanitizeForExport((question as any).prompt || "Unknown question"),
        responseValue: sanitizeForExport(responseValue || "Not answered"),
        scoreContribution: sanitizeForExport(scoreContribution),
      });
    }
    
    // Add alternating row colors
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowNumber % 2 === 0 ? "FFF5F5F5" : "FFFFFFFF" },
        };
      }
    });
    
    // Add summary sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Field", key: "field", width: 25 },
      { header: "Value", key: "value", width: 50 },
    ];
    
    summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF02205B" },
    };
    
    summarySheet.addRow({ field: "Assessment ID", value: sanitizeForExport(details.assessment.id) });
    summarySheet.addRow({ field: "Company", value: sanitizeForExport(details.company?.name || "Unknown") });
    summarySheet.addRow({ field: "Contact", value: sanitizeForExport(details.contact ? `${details.contact.firstName} ${details.contact.lastName}` : "Unknown") });
    summarySheet.addRow({ field: "Email", value: sanitizeForExport(details.contact?.email || "") });
    summarySheet.addRow({ field: "Tier", value: sanitizeForExport(details.assessment.tier) });
    summarySheet.addRow({ field: "Status", value: sanitizeForExport(details.assessment.status) });
    summarySheet.addRow({ field: "Created", value: sanitizeForExport(new Date(details.assessment.createdAt).toLocaleString()) });
    if (details.assessment.completedAt) {
      summarySheet.addRow({ field: "Completed", value: sanitizeForExport(new Date(details.assessment.completedAt).toLocaleString()) });
    }
    if (details.assessment.epmReadinessScore !== undefined) {
      summarySheet.addRow({ field: "EPM Readiness Score", value: sanitizeForExport(details.assessment.epmReadinessScore) });
    }
    if (details.assessment.overallMaturityScore !== undefined) {
      summarySheet.addRow({ field: "Overall Maturity Score", value: sanitizeForExport(details.assessment.overallMaturityScore) });
    }
    summarySheet.addRow({ field: "Total Questions", value: sanitizeForExport(questions.length) });
    summarySheet.addRow({ field: "Total Responses", value: sanitizeForExport((details.responses || []).length) });
    summarySheet.addRow({ field: "Export Date", value: sanitizeForExport(new Date().toLocaleString()) });
    
    await logAuditAction(req, "assessment:export-responses", "assessment", id, {
      format: "xlsx",
      responseCount: (details.responses || []).length,
    });
    
    // Set response headers
    const filename = `FinanceCompass-Responses-${details.company?.name?.replace(/[^a-zA-Z0-9]/g, "_") || id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error({ err: error }, "Export responses error");
    res.status(500).json({ success: false, error: "Failed to export responses" });
  }
});

// ============================================
// CONTACT ACCESS MANAGEMENT
// ============================================

router.patch("/contacts/:id/full-access", ensureFinanceCompassAccess("fc:assessments:manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hasFullAssessmentAccess } = z.object({ hasFullAssessmentAccess: z.boolean() }).parse(req.body);
    
    const contact = await fcStorage.toggleFullAssessmentAccess(id, hasFullAssessmentAccess);
    
    if (!contact) {
      return res.status(404).json({ success: false, error: "Contact not found" });
    }
    
    await logAuditAction(req, "contact:toggle-full-access", "contact", id, { hasFullAssessmentAccess });
    
    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    logger.error({ err: error }, "Toggle full access error");
    res.status(500).json({ success: false, error: "Failed to update contact access" });
  }
});

// ============================================
// QUESTIONS
// ============================================

router.get("/questions", ensureFinanceCompassAccess("fc:questions:view"), async (req: Request, res: Response) => {
  try {
    const { tier } = req.query;
    
    let questions;
    if (tier && FC_ASSESSMENT_TIERS.includes(tier as any)) {
      questions = await fcStorage.getQuestionsByTier(tier as FCAssessmentTier);
    } else {
      questions = await fcStorage.getAllQuestions();
    }
    
    if (questions.length === 0) {
      const questionBankQuestions = tier && FC_ASSESSMENT_TIERS.includes(tier as any)
        ? ALL_QUESTIONS.filter(q => q.tier === tier).sort((a, b) => a.order - b.order)
        : ALL_QUESTIONS;
      
      return res.json({
        success: true,
        data: transformQuestionBankToApiFormat(questionBankQuestions),
        source: "question_bank",
      });
    }
    
    res.json({
      success: true,
      data: questions,
      source: "database",
    });
  } catch (error) {
    logger.error({ err: error }, "Questions list error");
    res.status(500).json({ success: false, error: "Failed to fetch questions" });
  }
});

router.get("/questions/:id", ensureFinanceCompassAccess("fc:questions:view"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const question = await fcStorage.getQuestionById(id);
    
    if (!question) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }
    
    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error({ err: error }, "Question detail error");
    res.status(500).json({ success: false, error: "Failed to fetch question" });
  }
});

const createQuestionSchema = z.object({
  tier: z.enum(FC_ASSESSMENT_TIERS),
  dimension: z.string().optional(),
  area: z.string().optional(),
  sequence: z.number(),
  questionKey: z.string(),
  prompt: z.string(),
  helpText: z.string().optional(),
  type: z.string(),
  options: z.any().optional(),
  validation: z.any().optional(),
  scoringConfig: z.any().optional(),
  benchmarkConfig: z.any().optional(),
  isRequired: z.boolean().optional(),
  isAdaptive: z.boolean().optional(),
  dependsOn: z.any().optional(),
  isActive: z.boolean().optional(),
});

router.post("/questions", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const data = createQuestionSchema.parse(req.body);
    const question = await fcStorage.createQuestion(data);
    
    await logAuditAction(req, "question:create", "question", question.id, { questionKey: data.questionKey });
    
    res.json({
      success: true,
      data: question,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Question create error");
    if (error.code === "23505") {
      return res.status(400).json({ success: false, error: "Question key already exists" });
    }
    res.status(500).json({ success: false, error: "Failed to create question" });
  }
});

router.patch("/questions/:id", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = createQuestionSchema.partial().parse(req.body);
    
    const question = await fcStorage.updateQuestion(id, data);
    
    if (!question) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }
    
    await logAuditAction(req, "question:update", "question", id, data);
    
    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error({ err: error }, "Question update error");
    res.status(500).json({ success: false, error: "Failed to update question" });
  }
});

// ============================================
// ROLE PERMISSIONS
// ============================================

router.get("/permissions", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const rolePermissions = await fcStorage.getAllRolePermissions();
    
    res.json({
      success: true,
      data: rolePermissions,
    });
  } catch (error) {
    logger.error({ err: error }, "Permissions list error");
    res.status(500).json({ success: false, error: "Failed to fetch permissions" });
  }
});

router.put("/permissions/:role", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { permissions } = z.object({ permissions: z.array(z.string()) }).parse(req.body);
    
    const updated = await fcStorage.updateRolePermissions(role, permissions);
    
    await logAuditAction(req, "permissions:update", "role_permissions", role, { permissions });
    
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ err: error }, "Permissions update error");
    res.status(500).json({ success: false, error: "Failed to update permissions" });
  }
});

// ============================================
// SESSION INFO
// ============================================

router.get("/session", async (req: Request, res: Response) => {
  try {
    const role = getAdminRole(req as any);
    const permissions = await fcStorage.getRolePermissions(role);
    
    res.json({
      success: true,
      data: {
        role,
        permissions,
        hasAccess: permissions.length > 0,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Session error");
    res.status(500).json({ success: false, error: "Failed to fetch session info" });
  }
});

// ============================================
// AUDIT LOGS
// ============================================

router.get("/audit-logs", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { assessmentId, limit } = req.query;
    
    const logs = await fcStorage.getAuditLogs({
      assessmentId: assessmentId as string,
      limit: limit ? parseInt(limit as string) : 50,
    });
    
    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    logger.error({ err: error }, "Audit logs error");
    res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
});

// ============================================
// COMPANIES
// ============================================

const companiesFiltersSchema = z.object({
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
});

router.get("/companies", ensureFinanceCompassAccess("fc:assessments:view"), async (req: Request, res: Response) => {
  try {
    // OPTIMIZED: Use pagination to prevent unbounded data loads
    const filters = companiesFiltersSchema.parse(req.query);
    const companies = await fcStorage.getAllCompaniesWithPagination(filters);
    
    res.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    logger.error({ err: error }, "Companies list error");
    res.status(500).json({ success: false, error: "Failed to fetch companies" });
  }
});

router.get("/companies/:id", ensureFinanceCompassAccess("fc:assessments:view"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const company = await fcStorage.getCompanyById(id);
    
    if (!company) {
      return res.status(404).json({ success: false, error: "Company not found" });
    }
    
    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    logger.error({ err: error }, "Company detail error");
    res.status(500).json({ success: false, error: "Failed to fetch company" });
  }
});

// ============================================
// KNOWLEDGE BASE MANAGEMENT
// ============================================

const knowledgeBaseCreateSchema = z.object({
  key: z.string().min(1, "Key is required").max(200).regex(/^[a-zA-Z0-9_-]+$/, "Key must be alphanumeric with underscores and hyphens only"),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, "Category is required").max(100),
  content: z.string().min(1, "Content is required").max(100000),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  applicableTiers: z.array(z.string().max(50)).max(10).optional().default([]),
  applicableDimensions: z.array(z.string().max(100)).max(20).optional().default([]),
  sourceCitation: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(true),
  version: z.number().int().min(1).optional().default(1),
});

const knowledgeBaseUpdateSchema = knowledgeBaseCreateSchema.partial();

const searchOptionsSchema = z.object({
  query: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  tier: z.string().max(50).optional(),
  dimension: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: z.enum(["relevance", "title", "createdAt", "updatedAt"]).optional().default("relevance"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

router.get("/knowledge-base", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit)) || 100), 500);
    const offset = Math.max(0, parseInt(String(req.query.offset)) || 0);
    const { query, category, tier, dimension, isActive, sortBy, sortOrder } = req.query;
    
    const result = await knowledgeBaseService.search({
      query: query as string,
      category: category as string,
      tier: tier as string,
      dimension: dimension as string,
      isActive: isActive === "false" ? false : isActive === "true" ? true : undefined,
      limit,
      offset,
      sortBy: sortBy as "relevance" | "title" | "createdAt" | "updatedAt",
      sortOrder: sortOrder as "asc" | "desc",
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base list error");
    res.status(500).json({ success: false, error: "Failed to fetch knowledge base entries" });
  }
});

router.get("/knowledge-base/stats", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const stats = await knowledgeBaseService.getStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base stats error");
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

router.get("/knowledge-base/categories", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const categories = await knowledgeBaseService.getCategories();
    
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base categories error");
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.get("/knowledge-base/tags", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const tags = await knowledgeBaseService.getAllTags();
    
    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base tags error");
    res.status(500).json({ success: false, error: "Failed to fetch tags" });
  }
});

router.get("/knowledge-base/search", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const searchQuerySchema = z.object({
      q: z.string().min(1, "Search query is required").max(500),
      limit: z.coerce.number().int().min(1).max(100).optional().default(10),
      category: z.string().max(100).optional(),
      tier: z.string().max(50).optional(),
    });
    
    const parseResult = searchQuerySchema.safeParse({
      q: req.query.q,
      limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined,
      category: req.query.category,
      tier: req.query.tier,
    });
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: parseResult.error.errors[0]?.message || "Validation error" 
      });
    }
    
    const { q, limit, category, tier } = parseResult.data;
    
    const results = await knowledgeBaseService.fullTextSearch(q, {
      limit,
      category,
      tier,
    });
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base search error");
    res.status(500).json({ success: false, error: "Failed to search knowledge base" });
  }
});

router.get("/knowledge-base/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = await knowledgeBaseService.getById(id);
    
    if (!entry) {
      return res.status(404).json({ success: false, error: "Knowledge base entry not found" });
    }
    
    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base get error");
    res.status(500).json({ success: false, error: "Failed to fetch entry" });
  }
});

router.post("/knowledge-base", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const parseResult = knowledgeBaseCreateSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: parseResult.error.errors[0]?.message || "Validation error" 
      });
    }
    
    const entry = await knowledgeBaseService.create(parseResult.data);
    
    await logAuditAction(req, "knowledge-base:create", "knowledge_base", entry.id, { key: entry.key });
    
    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Knowledge base create error");
    if (error.message?.includes("duplicate key")) {
      return res.status(400).json({ success: false, error: "Entry with this key already exists" });
    }
    res.status(500).json({ success: false, error: "Failed to create entry" });
  }
});

router.patch("/knowledge-base/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = knowledgeBaseUpdateSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: parseResult.error.errors[0]?.message || "Validation error" 
      });
    }
    
    const entry = await knowledgeBaseService.update(id, parseResult.data);
    
    if (!entry) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }
    
    await logAuditAction(req, "knowledge-base:update", "knowledge_base", id, { changes: Object.keys(parseResult.data) });
    
    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base update error");
    res.status(500).json({ success: false, error: "Failed to update entry" });
  }
});

router.delete("/knowledge-base/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const entry = await knowledgeBaseService.getById(id);
    if (!entry) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }
    
    await knowledgeBaseService.delete(id);
    
    await logAuditAction(req, "knowledge-base:delete", "knowledge_base", id, { key: entry.key });
    
    res.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Knowledge base delete error");
    res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
});

// ============================================
// SCENARIO MANAGEMENT
// ============================================

router.get("/scenarios", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { assessmentId, tier } = req.query;
    
    const scenarios = await scenarioService.getByAssessment(assessmentId as string);
    
    res.json({
      success: true,
      data: scenarios,
    });
  } catch (error) {
    logger.error({ err: error }, "List scenarios error");
    res.status(500).json({ success: false, error: "Failed to fetch scenarios" });
  }
});

router.get("/scenarios/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scenario = await scenarioService.getById(id);
    
    if (!scenario) {
      return res.status(404).json({ success: false, error: "Scenario not found" });
    }
    
    res.json({
      success: true,
      data: scenario,
    });
  } catch (error) {
    logger.error({ err: error }, "Get scenario error");
    res.status(500).json({ success: false, error: "Failed to fetch scenario" });
  }
});

const createScenarioSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  tier: z.enum(FC_ASSESSMENT_TIERS),
  assumptions: z.record(z.any()).optional(),
  projections: z.record(z.any()).optional(),
  isBaseline: z.boolean().optional().default(false),
});

router.post("/scenarios", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const data = createScenarioSchema.parse(req.body);
    const scenario = await scenarioService.create({
      ...data,
      baseYear: new Date().getFullYear(),
    } as any);
    
    await logAuditAction(req, "scenario:create", "scenario", scenario.id, { name: data.name });
    
    res.status(201).json({
      success: true,
      data: scenario,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Create scenario error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to create scenario" });
  }
});

router.patch("/scenarios/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = createScenarioSchema.partial().parse(req.body);
    
    const scenario = await scenarioService.update(id, data);
    
    if (!scenario) {
      return res.status(404).json({ success: false, error: "Scenario not found" });
    }
    
    await logAuditAction(req, "scenario:update", "scenario", id, { changes: Object.keys(data) });
    
    res.json({
      success: true,
      data: scenario,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Update scenario error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to update scenario" });
  }
});

router.delete("/scenarios/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const scenario = await scenarioService.getById(id);
    if (!scenario) {
      return res.status(404).json({ success: false, error: "Scenario not found" });
    }
    
    await scenarioService.delete(id);
    
    await logAuditAction(req, "scenario:delete", "scenario", id, { name: scenario.name });
    
    res.json({
      success: true,
      message: "Scenario deleted successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Delete scenario error");
    res.status(500).json({ success: false, error: "Failed to delete scenario" });
  }
});

// ============================================
// PRESENTATION GENERATION (SlideSpeak)
// ============================================

const presentationSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  documentType: z.enum(["pptx", "pdf"]).default("pptx"),
  templateId: z.string().optional(),
  includeScenarios: z.boolean().optional().default(false),
  customTitle: z.string().max(200).optional(),
});

router.post("/presentations", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const data = presentationSchema.parse(req.body);
    
    // Get assessment details
    const assessment = await fcStorage.getAssessmentById(data.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    // Start presentation generation job
    const jobId = await slideSpeakService.generateAssessmentPresentation(
      data.assessmentId,
      (req as any).user?.id || "system"
    );
    
    await logAuditAction(req, "presentation:generate", "presentation", jobId, { 
      assessmentId: data.assessmentId,
      documentType: data.documentType,
    });
    
    res.status(202).json({
      success: true,
      data: {
        jobId,
        status: "processing",
        message: "Presentation generation started",
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Create presentation error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to start presentation generation" });
  }
});

// Get presentation job status
router.get("/presentations/:jobId", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const job = await slideSpeakService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found" });
    }
    
    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        documentType: job.documentType,
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get presentation status error");
    res.status(500).json({ success: false, error: "Failed to fetch job status" });
  }
});

// List all presentation jobs for an assessment
router.get("/assessments/:id/presentations", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const jobs = await slideSpeakService.listJobsForAssessment(id);
    
    res.json({
      success: true,
      data: jobs.map(job => ({
        id: job.id,
        status: job.status,
        documentType: job.documentType,
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "List presentations error");
    res.status(500).json({ success: false, error: "Failed to fetch presentations" });
  }
});

// ============================================
// AUDIT LOG VIEWER (Admin)
// ============================================

// Get audit logs with filtering and pagination
router.get("/audit-logs", ensureAnyFinanceCompassPermission, async (req: Request, res: Response) => {
  try {
    const querySchema = z.object({
      assessmentId: z.string().max(100).optional(),
      adminId: z.string().max(100).optional(),
      contactId: z.string().max(100).optional(),
      action: z.string().max(200).optional(),
      actionPrefix: z.string().max(100).optional(),
      entityType: z.string().max(100).optional(),
      entityId: z.string().max(100).optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      limit: z.string().transform(v => Math.min(Math.max(1, parseInt(v, 10) || 100), 500)).optional(),
      offset: z.string().transform(v => Math.max(0, parseInt(v, 10) || 0)).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    });
    
    const filters = querySchema.parse(req.query);
    
    const parsedFilters = {
      ...filters,
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
      limit: filters.limit ?? 100,
      offset: filters.offset ?? 0,
    };
    
    const [logs, totalCount] = await Promise.all([
      fcStorage.getAuditLogs(parsedFilters),
      fcStorage.countAuditLogs({
        assessmentId: parsedFilters.assessmentId,
        adminId: parsedFilters.adminId,
        contactId: parsedFilters.contactId,
        action: parsedFilters.action,
        actionPrefix: parsedFilters.actionPrefix,
        entityType: parsedFilters.entityType,
        entityId: parsedFilters.entityId,
        fromDate: parsedFilters.fromDate,
        toDate: parsedFilters.toDate,
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit: parsedFilters.limit,
          offset: parsedFilters.offset,
          hasMore: parsedFilters.offset + parsedFilters.limit < totalCount,
        },
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Get audit logs error");
    res.status(500).json({ success: false, error: "Failed to fetch audit logs" });
  }
});

// Get audit log statistics
router.get("/audit-logs/stats", ensureAnyFinanceCompassPermission, async (req: Request, res: Response) => {
  try {
    const stats = await fcStorage.getAuditLogStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ err: error }, "Get audit log stats error");
    res.status(500).json({ success: false, error: "Failed to fetch audit log stats" });
  }
});

// Get distinct action types for filtering
router.get("/audit-logs/actions", ensureAnyFinanceCompassPermission, async (req: Request, res: Response) => {
  try {
    const actions = await fcStorage.getDistinctAuditActions();
    
    res.json({
      success: true,
      data: { actions },
    });
  } catch (error) {
    logger.error({ err: error }, "Get audit actions error");
    res.status(500).json({ success: false, error: "Failed to fetch audit actions" });
  }
});

// Get distinct entity types for filtering
router.get("/audit-logs/entity-types", ensureAnyFinanceCompassPermission, async (req: Request, res: Response) => {
  try {
    const entityTypes = await fcStorage.getDistinctEntityTypes();
    
    res.json({
      success: true,
      data: { entityTypes },
    });
  } catch (error) {
    logger.error({ err: error }, "Get entity types error");
    res.status(500).json({ success: false, error: "Failed to fetch entity types" });
  }
});

// Get a single audit log entry by ID
router.get("/audit-logs/:id", ensureAnyFinanceCompassPermission, async (req: Request, res: Response) => {
  try {
    const logs = await fcStorage.getAuditLogs({ limit: 1 });
    const auditLogEntry = logs.find(l => l.id === req.params.id);
    
    if (!auditLogEntry) {
      return res.status(404).json({ success: false, error: "Audit log not found" });
    }
    
    res.json({
      success: true,
      data: auditLogEntry,
    });
  } catch (error) {
    logger.error({ err: error }, "Get audit log error");
    res.status(500).json({ success: false, error: "Failed to fetch audit log" });
  }
});

// Export audit logs as CSV
router.get("/audit-logs/export/csv", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const querySchema = z.object({
      assessmentId: z.string().optional(),
      action: z.string().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    });
    
    const filters = querySchema.parse(req.query);
    
    const logs = await fcStorage.getAuditLogs({
      ...filters,
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
      limit: 10000,
    });
    
    const csvHeader = "ID,Timestamp,Action,Entity Type,Entity ID,Admin ID,Contact ID,Assessment ID,IP Address,Details\n";
    const csvRows = logs.map(log => {
      const detailsStr = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
      return [
        sanitizeForCSV(log.id),
        sanitizeForCSV(log.createdAt.toISOString()),
        sanitizeForCSV(log.action),
        sanitizeForCSV(log.entityType || ''),
        sanitizeForCSV(log.entityId || ''),
        sanitizeForCSV(log.adminId || ''),
        sanitizeForCSV(log.contactId || ''),
        sanitizeForCSV(log.assessmentId || ''),
        sanitizeForCSV(log.ipAddress || ''),
        sanitizeForCSV(detailsStr),
      ].join(',');
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error({ err: error }, "Export audit logs error");
    res.status(500).json({ success: false, error: "Failed to export audit logs" });
  }
});

// ============================================
// TENANT MANAGEMENT ROUTES
// ============================================

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  fontFamily: z.string().optional(),
  customCss: z.string().optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().optional(),
});

// List all tenants
router.get("/tenants", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const tenants = await fcStorage.getAllTenants(includeInactive);
    
    res.json({
      success: true,
      data: { tenants },
    });
  } catch (error) {
    logger.error({ err: error }, "Get tenants error");
    res.status(500).json({ success: false, error: "Failed to fetch tenants" });
  }
});

// Get tenant by ID
router.get("/tenants/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const tenant = await fcStorage.getTenantById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }
    
    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    logger.error({ err: error }, "Get tenant error");
    res.status(500).json({ success: false, error: "Failed to fetch tenant" });
  }
});

// Create tenant
router.post("/tenants", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const data = tenantSchema.parse(req.body);
    
    // Check slug uniqueness
    const existing = await fcStorage.getTenantBySlug(data.slug);
    if (existing) {
      return res.status(400).json({ success: false, error: "Slug already in use" });
    }
    
    const tenant = await fcStorage.createTenant(data);
    
    await logAuditAction(req, "tenant:created", "tenant", tenant.id, { name: tenant.name, slug: tenant.slug });
    
    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Create tenant error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to create tenant" });
  }
});

// Update tenant
router.patch("/tenants/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const data = tenantSchema.partial().parse(req.body);
    
    // Check slug uniqueness if changing
    if (data.slug) {
      const existing = await fcStorage.getTenantBySlug(data.slug);
      if (existing && existing.id !== req.params.id) {
        return res.status(400).json({ success: false, error: "Slug already in use" });
      }
    }
    
    const tenant = await fcStorage.updateTenant(req.params.id, data);
    
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }
    
    await logAuditAction(req, "tenant:updated", "tenant", tenant.id, { changes: Object.keys(data) });
    
    res.json({
      success: true,
      data: tenant,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Update tenant error");
    if (error.name === "ZodError") {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || "Validation error" });
    }
    res.status(500).json({ success: false, error: "Failed to update tenant" });
  }
});

// ============================================
// BENCHMARK ADMIN ENDPOINTS  
// ============================================

// Seed benchmark data endpoint (admin only - for initial data population)
router.post("/benchmarks/seed", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    // The benchmark data is already defined as constants in benchmark-engine.ts
    // This endpoint confirms the data is available and logs the action
    await logAuditAction(req, "benchmarks:seeded", "system", "benchmarks", {
      sectorCount: Object.keys(UK_SECTOR_BENCHMARKS).length,
      dimensionCount: Object.keys(DIMENSION_BENCHMARKS).length,
    });
    
    res.json({
      success: true,
      message: "Benchmark data is initialized from static configuration",
      data: {
        sectorsLoaded: Object.keys(UK_SECTOR_BENCHMARKS).length,
        dimensionsLoaded: Object.keys(DIMENSION_BENCHMARKS).length,
        sicMappingsLoaded: Object.keys(SIC_TO_SECTOR).length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Seed benchmarks error");
    res.status(500).json({ success: false, error: "Failed to seed benchmarks" });
  }
});

// Delete tenant (soft delete by deactivating)
router.delete("/tenants/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const tenant = await fcStorage.getTenantById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }
    
    // Soft delete - deactivate rather than hard delete
    await fcStorage.updateTenant(req.params.id, { isActive: false });
    
    await logAuditAction(req, "tenant:deleted", "tenant", req.params.id, { name: tenant.name });
    
    res.json({
      success: true,
      message: "Tenant deactivated successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Delete tenant error");
    res.status(500).json({ success: false, error: "Failed to delete tenant" });
  }
});

// ============================================
// ADMIN BENCHMARK DATA MANAGEMENT
// ============================================

// Get all benchmark data with filters
router.get("/benchmarks", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { type, sector, dimension } = req.query;
    
    let assessmentBenchmarks: any[] = [];
    let industryBenchmarks: any[] = [];
    let macroBenchmarks: any[] = [];
    
    // Fetch assessment benchmarks (dimension scores)
    if (!type || type === "assessment" || type === "all") {
      if (sector && sector !== "all") {
        assessmentBenchmarks = await db.select().from(fcAssessmentBenchmarks)
          .where(eq(fcAssessmentBenchmarks.sector, sector as string));
      } else {
        assessmentBenchmarks = await db.select().from(fcAssessmentBenchmarks);
      }
    }
    
    // Fetch industry benchmarks (financial KPIs)
    if (!type || type === "industry" || type === "all") {
      if (sector && sector !== "all") {
        industryBenchmarks = await db.select().from(fcIndustryBenchmarks)
          .where(eq(fcIndustryBenchmarks.sector, sector as string));
      } else {
        industryBenchmarks = await db.select().from(fcIndustryBenchmarks);
      }
    }
    
    // Fetch macro benchmarks (economic indicators)
    if (!type || type === "macro" || type === "all") {
      macroBenchmarks = await db.select().from(fcMacroBenchmarks);
    }
    
    const allSectors = new Set<string>();
    const allDimensions = new Set<string>();
    
    assessmentBenchmarks.forEach(b => {
      if (b.sector) allSectors.add(b.sector);
      if (b.dimension) allDimensions.add(b.dimension);
    });
    industryBenchmarks.forEach(b => {
      if (b.sector) allSectors.add(b.sector);
    });
    
    Object.keys(UK_SECTOR_BENCHMARKS).forEach(s => allSectors.add(s));
    Object.keys(DIMENSION_BENCHMARKS).forEach(d => allDimensions.add(d));
    
    res.json({
      success: true,
      data: {
        assessmentBenchmarks,
        industryBenchmarks,
        macroBenchmarks,
        staticBenchmarks: {
          sectors: UK_SECTOR_BENCHMARKS,
          dimensions: DIMENSION_BENCHMARKS,
          sicMapping: SIC_TO_SECTOR,
        },
        filters: {
          sectors: Array.from(allSectors).sort(),
          dimensions: Array.from(allDimensions).sort(),
          types: ["assessment", "industry", "macro"],
        },
        counts: {
          assessment: assessmentBenchmarks.length,
          industry: industryBenchmarks.length,
          macro: macroBenchmarks.length,
          total: assessmentBenchmarks.length + industryBenchmarks.length + macroBenchmarks.length,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get benchmarks error");
    res.status(500).json({ success: false, error: "Failed to fetch benchmarks" });
  }
});

// Get benchmark summary/counts
router.get("/benchmarks/summary", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    // Get counts from each benchmark table
    const [assessmentCount, industryCount, macroCount] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(fcAssessmentBenchmarks),
      db.select({ count: sql`count(*)` }).from(fcIndustryBenchmarks),
      db.select({ count: sql`count(*)` }).from(fcMacroBenchmarks),
    ]);
    
    // Get sector distribution
    const sectorCounts = await db.select({
      sector: fcAssessmentBenchmarks.sector,
      count: sql`count(*)`
    }).from(fcAssessmentBenchmarks).groupBy(fcAssessmentBenchmarks.sector);
    
    res.json({
      success: true,
      data: {
        assessmentBenchmarks: Number(assessmentCount[0]?.count) || 0,
        industryBenchmarks: Number(industryCount[0]?.count) || 0,
        macroBenchmarks: Number(macroCount[0]?.count) || 0,
        bySector: sectorCounts.reduce((acc, s) => {
          acc[s.sector || "Cross-Sector"] = Number(s.count);
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get benchmarks summary error");
    res.status(500).json({ success: false, error: "Failed to fetch benchmark summary" });
  }
});

// ============================================
// BENCHMARK DATA PIPELINE
// ============================================

// Get benchmark generation report with full provenance
router.get("/benchmarks/generation-report", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const report = generateBenchmarks();
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error({ err: error }, "Generate benchmark report error");
    res.status(500).json({ success: false, error: "Failed to generate benchmark report" });
  }
});

// Get ONS sector statistics (for transparency)
router.get("/benchmarks/ons-data", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const sectorStats = getONSPublishedSectorStatistics();
    
    res.json({
      success: true,
      data: {
        sectorStatistics: sectorStats,
        sourceInfo: {
          name: "ONS Annual Business Survey & Employment Data",
          url: "https://www.ons.gov.uk/",
          accessedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get ONS data error");
    res.status(500).json({ success: false, error: "Failed to fetch ONS data" });
  }
});

// List available ONS datasets
router.get("/benchmarks/ons-datasets", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const datasets = await listAvailableDatasets();
    
    res.json({
      success: true,
      data: {
        datasets,
        apiBase: "https://api.beta.ons.gov.uk/v1",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "List ONS datasets error");
    res.status(500).json({ success: false, error: "Failed to list ONS datasets" });
  }
});

// ============================================
// BETA ACCESS WHITELIST
// ============================================

router.get("/beta-access", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const betaList = await fcStorage.getBetaAccessList();
    
    res.json({
      success: true,
      data: betaList,
    });
  } catch (error) {
    logger.error({ err: error }, "Get beta access list error");
    res.status(500).json({ success: false, error: "Failed to fetch beta access list" });
  }
});

const addBetaAccessSchema = z.object({
  email: z.string().email("Valid email is required"),
  notes: z.string().max(500).optional(),
});

router.post("/beta-access", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const data = addBetaAccessSchema.parse(req.body);
    const adminEmail = getAdminEmail(req as any) || "system";
    
    const existing = await fcStorage.getBetaAccessByEmail(data.email);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Email is already on the beta access list",
      });
    }
    
    const entry = await fcStorage.addBetaAccess(data.email, adminEmail, data.notes);
    
    await logAuditAction(req, "beta_access:add", "beta_access", entry.id, {
      email: data.email,
      notes: data.notes,
    });
    
    res.json({
      success: true,
      data: entry,
      message: `Added ${data.email} to beta access list`,
    });
  } catch (error) {
    logger.error({ err: error }, "Add beta access error");
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    res.status(500).json({ success: false, error: "Failed to add beta access" });
  }
});

router.delete("/beta-access/:id", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await fcStorage.removeBetaAccess(id);
    
    await logAuditAction(req, "beta_access:remove", "beta_access", id, {});
    
    res.json({
      success: true,
      message: "Removed from beta access list",
    });
  } catch (error) {
    logger.error({ err: error }, "Remove beta access error");
    res.status(500).json({ success: false, error: "Failed to remove beta access" });
  }
});

// ============================================
// AI NARRATIVE REGENERATION
// ============================================

const regenerateNarrativesSchema = z.object({
  assessmentIds: z.array(z.string().uuid()).min(1).max(10),
});

router.post("/regenerate-narratives", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const data = regenerateNarrativesSchema.parse(req.body);
    const results: { assessmentId: string; success: boolean; error?: string }[] = [];
    
    logger.info({ data_assessmentIds_length: data.assessmentIds.length }, "Regenerating narratives for assessments...");
    
    for (const assessmentId of data.assessmentIds) {
      try {
        const details = await fcStorage.getAssessmentWithDetails(assessmentId);
        if (!details) {
          results.push({ assessmentId, success: false, error: "Assessment not found" });
          continue;
        }
        
        const { assessment, company, responses } = details;
        const dimensionScores = normalizeDimensionScores(assessment.dimensionScores);
        
        clearNarrativeCache(assessmentId);
        
        const narratives = await generateAllNarratives(assessment, responses, dimensionScores, company);
        
        logger.info({ assessmentId: assessmentId }, "Successfully regenerated narratives for assessment");
        results.push({ assessmentId, success: true });
        
        await logAuditAction(req, "narratives:regenerated", "assessment", assessmentId, {
          sectionsGenerated: Object.keys(narratives).length,
        });
      } catch (err: any) {
        logger.error({ err: err, assessmentId: assessmentId }, "Failed to regenerate narratives for");
        results.push({ assessmentId, success: false, error: err.message || "Unknown error" });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: data.assessmentIds.length,
          succeeded: successCount,
          failed: data.assessmentIds.length - successCount,
        },
      },
      message: `Regenerated narratives for ${successCount}/${data.assessmentIds.length} assessments`,
    });
  } catch (error) {
    logger.error({ err: error }, "Regenerate narratives error");
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    res.status(500).json({ success: false, error: "Failed to regenerate narratives" });
  }
});

// ============================================
// UNIFIED QUESTION CONFIGURATION ENDPOINT
// ============================================

// Get all questions with their weightings and correlations in one unified response
router.get("/question-config", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    // Get all weightings and correlations from database in parallel
    const [weightings, correlations] = await Promise.all([
      db.select().from(fcQuestionWeightings).orderBy(asc(fcQuestionWeightings.questionKey)),
      db.select().from(fcQuestionCorrelations).orderBy(asc(fcQuestionCorrelations.sourceQuestionKey)),
    ]);
    
    // Create maps for quick lookup
    const weightingsMap = new Map(weightings.map(w => [w.questionKey, w]));
    const questionTextMap = new Map(ALL_QUESTIONS.map(q => [q.id, q.questionText]));
    
    // Group correlations by source question key
    const correlationsByQuestion = new Map<string, typeof correlations>();
    correlations.forEach(c => {
      const existing = correlationsByQuestion.get(c.sourceQuestionKey) || [];
      existing.push({
        ...c,
        sourceQuestionText: questionTextMap.get(c.sourceQuestionKey) || "Unknown",
        targetQuestionText: questionTextMap.get(c.targetQuestionKey) || "Unknown",
      } as any);
      correlationsByQuestion.set(c.sourceQuestionKey, existing);
    });
    
    // Merge all data into unified question configuration items
    const questionConfig = ALL_QUESTIONS.map(q => {
      const weighting = weightingsMap.get(q.id);
      const questionCorrelations = correlationsByQuestion.get(q.id) || [];
      
      return {
        // Question identity
        questionKey: q.id,
        questionText: q.questionText,
        tier: q.tier,
        dimension: q.dimension || weighting?.dimension || null,
        questionType: q.questionType,
        order: q.order,
        helpText: q.helpText || null,
        required: q.required,
        
        // Weighting configuration (from DB or defaults)
        dimensionWeight: weighting?.dimensionWeight ?? 1.0,
        overallWeight: weighting?.overallWeight ?? 1.0,
        scoreMultiplier: weighting?.scoreMultiplier ?? 1.0,
        maxScore: weighting?.maxScore ?? 5.0,
        
        // Scoring config from question bank
        scoringConfig: q.scoringConfig || null,
        benchmarkContribution: weighting?.benchmarkContribution || null,
        notes: weighting?.notes || null,
        
        // DB record info
        weightingId: weighting?.id || null,
        lastModifiedBy: weighting?.lastModifiedBy || null,
        updatedAt: weighting?.updatedAt || null,
        
        // Correlations for this question
        correlations: questionCorrelations,
        correlationCount: questionCorrelations.length,
      };
    });
    
    // Also return all correlations with enriched question text for the correlations tab
    const enrichedCorrelations = correlations.map(c => ({
      ...c,
      sourceQuestionText: questionTextMap.get(c.sourceQuestionKey) || "Unknown",
      targetQuestionText: questionTextMap.get(c.targetQuestionKey) || "Unknown",
    }));
    
    // Get unique tiers and dimensions for filtering
    const tiers = Array.from(new Set(ALL_QUESTIONS.map(q => q.tier))).sort();
    const dimensions = Array.from(new Set(
      ALL_QUESTIONS.map(q => q.dimension).filter((d): d is typeof d & string => d !== undefined && d !== null)
    )).sort();
    
    res.json({
      success: true,
      data: {
        questions: questionConfig,
        correlations: enrichedCorrelations,
        totalQuestions: questionConfig.length,
        totalWeightings: weightings.length,
        totalCorrelations: correlations.length,
        filters: {
          tiers,
          dimensions,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get question config error");
    res.status(500).json({ success: false, error: "Failed to fetch question configuration" });
  }
});

// ============================================
// QUESTION WEIGHTINGS MANAGEMENT
// ============================================

// Get all question weightings merged with question bank data
router.get("/question-weightings", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    // Get all weightings from database
    const weightings = await db.select().from(fcQuestionWeightings).orderBy(asc(fcQuestionWeightings.questionKey));
    
    // Create a map for quick lookup
    const weightingsMap = new Map(weightings.map(w => [w.questionKey, w]));
    
    // Merge with question bank data
    const mergedData = ALL_QUESTIONS.map(q => {
      const weighting = weightingsMap.get(q.id);
      return {
        questionKey: q.id,
        questionText: q.questionText,
        tier: q.tier,
        dimension: q.dimension || weighting?.dimension || null,
        questionType: q.questionType,
        order: q.order,
        // Weighting configuration (from DB or defaults)
        dimensionWeight: weighting?.dimensionWeight ?? 1.0,
        overallWeight: weighting?.overallWeight ?? 1.0,
        scoreMultiplier: weighting?.scoreMultiplier ?? 1.0,
        maxScore: weighting?.maxScore ?? 5.0,
        // Scoring config from question bank
        scoringConfig: q.scoringConfig || null,
        benchmarkContribution: weighting?.benchmarkContribution || null,
        notes: weighting?.notes || null,
        // DB record info
        weightingId: weighting?.id || null,
        lastModifiedBy: weighting?.lastModifiedBy || null,
        updatedAt: weighting?.updatedAt || null,
      };
    });
    
    res.json({
      success: true,
      data: {
        items: mergedData,
        total: mergedData.length,
        savedCount: weightings.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get question weightings error");
    res.status(500).json({ success: false, error: "Failed to fetch question weightings" });
  }
});

// Create or update question weighting
const upsertWeightingSchema = z.object({
  questionKey: z.string().min(1),
  dimension: z.string().nullable().optional(),
  dimensionWeight: z.number().min(0.1).max(3.0).optional(),
  overallWeight: z.number().min(0.1).max(3.0).optional(),
  scoreMultiplier: z.number().min(0.5).max(2.0).optional(),
  maxScore: z.number().min(1).max(10).optional(),
  benchmarkContribution: z.record(z.any()).nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.post("/question-weightings", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const data = upsertWeightingSchema.parse(req.body);
    const adminId = getAdminId(req);
    
    // Check if weighting already exists
    const [existing] = await db
      .select()
      .from(fcQuestionWeightings)
      .where(eq(fcQuestionWeightings.questionKey, data.questionKey))
      .limit(1);
    
    let result;
    let action: string;
    let previousValue = null;
    
    if (existing) {
      // Update existing
      previousValue = existing;
      action = "update";
      [result] = await db
        .update(fcQuestionWeightings)
        .set({
          dimension: data.dimension ?? existing.dimension,
          dimensionWeight: data.dimensionWeight ?? existing.dimensionWeight,
          overallWeight: data.overallWeight ?? existing.overallWeight,
          scoreMultiplier: data.scoreMultiplier ?? existing.scoreMultiplier,
          maxScore: data.maxScore ?? existing.maxScore,
          benchmarkContribution: data.benchmarkContribution ?? existing.benchmarkContribution,
          notes: data.notes ?? existing.notes,
          lastModifiedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(fcQuestionWeightings.id, existing.id))
        .returning();
    } else {
      // Create new
      action = "create";
      [result] = await db
        .insert(fcQuestionWeightings)
        .values({
          questionKey: data.questionKey,
          dimension: data.dimension,
          dimensionWeight: data.dimensionWeight ?? 1.0,
          overallWeight: data.overallWeight ?? 1.0,
          scoreMultiplier: data.scoreMultiplier ?? 1.0,
          maxScore: data.maxScore ?? 5.0,
          benchmarkContribution: data.benchmarkContribution,
          notes: data.notes,
          lastModifiedBy: adminId,
        })
        .returning();
    }
    
    // Log audit
    await db.insert(fcQuestionWeightingAudit).values({
      entityType: "weighting",
      entityId: result.id,
      questionKey: data.questionKey,
      action,
      previousValue: previousValue ? JSON.parse(JSON.stringify(previousValue)) : null,
      newValue: JSON.parse(JSON.stringify(result)),
      modifiedBy: adminId,
      importSource: "manual",
    });
    
    await logAuditAction(req, `weighting:${action}`, "question_weighting", result.id, {
      questionKey: data.questionKey,
    });
    
    res.json({
      success: true,
      data: result,
      message: `Question weighting ${action === "create" ? "created" : "updated"} successfully`,
    });
  } catch (error) {
    logger.error({ err: error }, "Upsert question weighting error");
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    res.status(500).json({ success: false, error: "Failed to save question weighting" });
  }
});

// Batch update weightings (for inline editing)
const batchUpdateWeightingsSchema = z.object({
  updates: z.array(upsertWeightingSchema).min(1).max(100),
});

router.post("/question-weightings/batch", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const { updates } = batchUpdateWeightingsSchema.parse(req.body);
    const adminId = getAdminId(req);
    
    const results: { questionKey: string; success: boolean; error?: string }[] = [];
    
    for (const update of updates) {
      try {
        const [existing] = await db
          .select()
          .from(fcQuestionWeightings)
          .where(eq(fcQuestionWeightings.questionKey, update.questionKey))
          .limit(1);
        
        let result;
        let action: string;
        
        if (existing) {
          action = "update";
          [result] = await db
            .update(fcQuestionWeightings)
            .set({
              dimension: update.dimension ?? existing.dimension,
              dimensionWeight: update.dimensionWeight ?? existing.dimensionWeight,
              overallWeight: update.overallWeight ?? existing.overallWeight,
              scoreMultiplier: update.scoreMultiplier ?? existing.scoreMultiplier,
              maxScore: update.maxScore ?? existing.maxScore,
              benchmarkContribution: update.benchmarkContribution ?? existing.benchmarkContribution,
              notes: update.notes ?? existing.notes,
              lastModifiedBy: adminId,
              updatedAt: new Date(),
            })
            .where(eq(fcQuestionWeightings.id, existing.id))
            .returning();
        } else {
          action = "create";
          [result] = await db
            .insert(fcQuestionWeightings)
            .values({
              questionKey: update.questionKey,
              dimension: update.dimension,
              dimensionWeight: update.dimensionWeight ?? 1.0,
              overallWeight: update.overallWeight ?? 1.0,
              scoreMultiplier: update.scoreMultiplier ?? 1.0,
              maxScore: update.maxScore ?? 5.0,
              benchmarkContribution: update.benchmarkContribution,
              notes: update.notes,
              lastModifiedBy: adminId,
            })
            .returning();
        }
        
        // Log audit
        await db.insert(fcQuestionWeightingAudit).values({
          entityType: "weighting",
          entityId: result.id,
          questionKey: update.questionKey,
          action,
          newValue: JSON.parse(JSON.stringify(result)),
          modifiedBy: adminId,
          importSource: "batch",
        });
        
        results.push({ questionKey: update.questionKey, success: true });
      } catch (err: any) {
        results.push({ questionKey: update.questionKey, success: false, error: err.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    await logAuditAction(req, "weightings:batch_update", "question_weightings", "batch", {
      total: updates.length,
      succeeded: successCount,
    });
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: updates.length,
          succeeded: successCount,
          failed: updates.length - successCount,
        },
      },
      message: `Updated ${successCount}/${updates.length} weightings`,
    });
  } catch (error) {
    logger.error({ err: error }, "Batch update weightings error");
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    res.status(500).json({ success: false, error: "Failed to batch update weightings" });
  }
});

// Delete question weighting
router.delete("/question-weightings/:id", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = getAdminId(req);
    
    const [existing] = await db
      .select()
      .from(fcQuestionWeightings)
      .where(eq(fcQuestionWeightings.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: "Weighting not found" });
    }
    
    await db.delete(fcQuestionWeightings).where(eq(fcQuestionWeightings.id, id));
    
    // Log audit
    await db.insert(fcQuestionWeightingAudit).values({
      entityType: "weighting",
      entityId: id,
      questionKey: existing.questionKey,
      action: "delete",
      previousValue: JSON.parse(JSON.stringify(existing)),
      modifiedBy: adminId,
      importSource: "manual",
    });
    
    await logAuditAction(req, "weighting:delete", "question_weighting", id, {
      questionKey: existing.questionKey,
    });
    
    res.json({
      success: true,
      message: "Question weighting deleted successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Delete question weighting error");
    res.status(500).json({ success: false, error: "Failed to delete question weighting" });
  }
});

// ============================================
// QUESTION CORRELATIONS MANAGEMENT
// ============================================

// Get all question correlations
router.get("/question-correlations", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const correlations = await db
      .select()
      .from(fcQuestionCorrelations)
      .orderBy(asc(fcQuestionCorrelations.sourceQuestionKey));
    
    // Enrich with question text
    const questionMap = new Map(ALL_QUESTIONS.map(q => [q.id, q.questionText]));
    
    const enrichedCorrelations = correlations.map(c => ({
      ...c,
      sourceQuestionText: questionMap.get(c.sourceQuestionKey) || "Unknown",
      targetQuestionText: questionMap.get(c.targetQuestionKey) || "Unknown",
    }));
    
    res.json({
      success: true,
      data: {
        items: enrichedCorrelations,
        total: enrichedCorrelations.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get question correlations error");
    res.status(500).json({ success: false, error: "Failed to fetch question correlations" });
  }
});

// Create or update question correlation
const upsertCorrelationSchema = z.object({
  id: z.string().optional(), // If provided, update; otherwise create
  sourceQuestionKey: z.string().min(1),
  targetQuestionKey: z.string().min(1),
  correlationType: z.enum(["positive", "negative", "conditional"]),
  correlationWeight: z.number().min(0).max(1).optional(),
  effectType: z.enum(["boost", "reduce", "adjust", "multiply"]),
  effectValue: z.number().optional(),
  condition: z.record(z.any()).nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.post("/question-correlations", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const data = upsertCorrelationSchema.parse(req.body);
    const adminId = getAdminId(req);
    
    // Validate source != target
    if (data.sourceQuestionKey === data.targetQuestionKey) {
      return res.status(400).json({ success: false, error: "Source and target questions cannot be the same" });
    }
    
    let result;
    let action: string;
    let previousValue = null;
    
    if (data.id) {
      // Update existing
      const [existing] = await db
        .select()
        .from(fcQuestionCorrelations)
        .where(eq(fcQuestionCorrelations.id, data.id))
        .limit(1);
      
      if (!existing) {
        return res.status(404).json({ success: false, error: "Correlation not found" });
      }
      
      previousValue = existing;
      action = "update";
      [result] = await db
        .update(fcQuestionCorrelations)
        .set({
          sourceQuestionKey: data.sourceQuestionKey,
          targetQuestionKey: data.targetQuestionKey,
          correlationType: data.correlationType,
          correlationWeight: data.correlationWeight ?? existing.correlationWeight,
          effectType: data.effectType,
          effectValue: data.effectValue ?? existing.effectValue,
          condition: data.condition ?? existing.condition,
          description: data.description ?? existing.description,
          isActive: data.isActive ?? existing.isActive,
          lastModifiedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(fcQuestionCorrelations.id, data.id))
        .returning();
    } else {
      // Create new
      action = "create";
      [result] = await db
        .insert(fcQuestionCorrelations)
        .values({
          sourceQuestionKey: data.sourceQuestionKey,
          targetQuestionKey: data.targetQuestionKey,
          correlationType: data.correlationType,
          correlationWeight: data.correlationWeight ?? 0.5,
          effectType: data.effectType,
          effectValue: data.effectValue ?? 0,
          condition: data.condition,
          description: data.description,
          isActive: data.isActive ?? true,
          lastModifiedBy: adminId,
        })
        .returning();
    }
    
    // Log audit
    await db.insert(fcQuestionWeightingAudit).values({
      entityType: "correlation",
      entityId: result.id,
      questionKey: data.sourceQuestionKey,
      action,
      previousValue: previousValue ? JSON.parse(JSON.stringify(previousValue)) : null,
      newValue: JSON.parse(JSON.stringify(result)),
      modifiedBy: adminId,
      importSource: "manual",
    });
    
    await logAuditAction(req, `correlation:${action}`, "question_correlation", result.id, {
      sourceQuestionKey: data.sourceQuestionKey,
      targetQuestionKey: data.targetQuestionKey,
    });
    
    res.json({
      success: true,
      data: result,
      message: `Question correlation ${action === "create" ? "created" : "updated"} successfully`,
    });
  } catch (error) {
    logger.error({ err: error }, "Upsert question correlation error");
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    res.status(500).json({ success: false, error: "Failed to save question correlation" });
  }
});

// Delete question correlation
router.delete("/question-correlations/:id", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = getAdminId(req);
    
    const [existing] = await db
      .select()
      .from(fcQuestionCorrelations)
      .where(eq(fcQuestionCorrelations.id, id))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: "Correlation not found" });
    }
    
    await db.delete(fcQuestionCorrelations).where(eq(fcQuestionCorrelations.id, id));
    
    // Log audit
    await db.insert(fcQuestionWeightingAudit).values({
      entityType: "correlation",
      entityId: id,
      questionKey: existing.sourceQuestionKey,
      action: "delete",
      previousValue: JSON.parse(JSON.stringify(existing)),
      modifiedBy: adminId,
      importSource: "manual",
    });
    
    await logAuditAction(req, "correlation:delete", "question_correlation", id, {
      sourceQuestionKey: existing.sourceQuestionKey,
      targetQuestionKey: existing.targetQuestionKey,
    });
    
    res.json({
      success: true,
      message: "Question correlation deleted successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Delete question correlation error");
    res.status(500).json({ success: false, error: "Failed to delete question correlation" });
  }
});

// Get weighting audit log
router.get("/question-weightings/audit", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const auditLogs = await db
      .select()
      .from(fcQuestionWeightingAudit)
      .orderBy(desc(fcQuestionWeightingAudit.modifiedAt))
      .limit(limit)
      .offset(offset);
    
    res.json({
      success: true,
      data: {
        items: auditLogs,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Get weighting audit log error");
    res.status(500).json({ success: false, error: "Failed to fetch audit log" });
  }
});

// ============================================
// EXCEL EXPORT / IMPORT
// ============================================

// Export question weightings to Excel
router.get("/question-weightings/export/excel", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    // Get weightings and correlations
    const weightings = await db.select().from(fcQuestionWeightings).orderBy(asc(fcQuestionWeightings.questionKey));
    const correlations = await db.select().from(fcQuestionCorrelations).orderBy(asc(fcQuestionCorrelations.sourceQuestionKey));
    
    const weightingsMap = new Map(weightings.map(w => [w.questionKey, w]));
    const questionMap = new Map(ALL_QUESTIONS.map(q => [q.id, q]));
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FinanceCompass Admin";
    workbook.created = new Date();
    
    // Sheet 1: Question Weightings
    const weightingsSheet = workbook.addWorksheet("Question Weightings", {
      properties: { tabColor: { argb: "FF0097A7" } }
    });
    
    weightingsSheet.columns = [
      { header: "Question Key", key: "questionKey", width: 30 },
      { header: "Question Text", key: "questionText", width: 60 },
      { header: "Tier", key: "tier", width: 15 },
      { header: "Dimension", key: "dimension", width: 25 },
      { header: "Question Type", key: "questionType", width: 15 },
      { header: "Order", key: "order", width: 8 },
      { header: "Dimension Weight", key: "dimensionWeight", width: 18 },
      { header: "Overall Weight", key: "overallWeight", width: 15 },
      { header: "Score Multiplier", key: "scoreMultiplier", width: 18 },
      { header: "Max Score", key: "maxScore", width: 12 },
      { header: "Notes", key: "notes", width: 40 },
    ];
    
    // Style header row
    weightingsSheet.getRow(1).font = { bold: true };
    weightingsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0097A7" }
    };
    weightingsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    
    // Add data rows
    ALL_QUESTIONS.forEach(q => {
      const weighting = weightingsMap.get(q.id);
      weightingsSheet.addRow({
        questionKey: sanitizeForExport(q.id),
        questionText: sanitizeForExport(q.questionText),
        tier: sanitizeForExport(q.tier),
        dimension: sanitizeForExport(q.dimension || weighting?.dimension || ""),
        questionType: sanitizeForExport(q.questionType),
        order: sanitizeForExport(q.order),
        dimensionWeight: weighting?.dimensionWeight ?? 1.0,
        overallWeight: weighting?.overallWeight ?? 1.0,
        scoreMultiplier: weighting?.scoreMultiplier ?? 1.0,
        maxScore: weighting?.maxScore ?? 5.0,
        notes: sanitizeForExport(weighting?.notes || ""),
      });
    });
    
    // Sheet 2: Question Correlations
    const correlationsSheet = workbook.addWorksheet("Question Correlations", {
      properties: { tabColor: { argb: "FF7B1FA2" } }
    });
    
    correlationsSheet.columns = [
      { header: "ID", key: "id", width: 36 },
      { header: "Source Question Key", key: "sourceQuestionKey", width: 30 },
      { header: "Source Question Text", key: "sourceQuestionText", width: 50 },
      { header: "Target Question Key", key: "targetQuestionKey", width: 30 },
      { header: "Target Question Text", key: "targetQuestionText", width: 50 },
      { header: "Correlation Type", key: "correlationType", width: 18 },
      { header: "Correlation Weight", key: "correlationWeight", width: 18 },
      { header: "Effect Type", key: "effectType", width: 15 },
      { header: "Effect Value", key: "effectValue", width: 12 },
      { header: "Is Active", key: "isActive", width: 10 },
      { header: "Description", key: "description", width: 40 },
    ];
    
    correlationsSheet.getRow(1).font = { bold: true };
    correlationsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7B1FA2" }
    };
    correlationsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    
    correlations.forEach(c => {
      correlationsSheet.addRow({
        id: sanitizeForExport(c.id),
        sourceQuestionKey: sanitizeForExport(c.sourceQuestionKey),
        sourceQuestionText: sanitizeForExport(questionMap.get(c.sourceQuestionKey)?.questionText || "Unknown"),
        targetQuestionKey: sanitizeForExport(c.targetQuestionKey),
        targetQuestionText: sanitizeForExport(questionMap.get(c.targetQuestionKey)?.questionText || "Unknown"),
        correlationType: sanitizeForExport(c.correlationType),
        correlationWeight: c.correlationWeight,
        effectType: sanitizeForExport(c.effectType),
        effectValue: c.effectValue,
        isActive: c.isActive,
        description: sanitizeForExport(c.description || ""),
      });
    });
    
    // Sheet 3: Instructions
    const instructionsSheet = workbook.addWorksheet("Instructions", {
      properties: { tabColor: { argb: "FF4CAF50" } }
    });
    
    instructionsSheet.columns = [
      { header: "Section", key: "section", width: 25 },
      { header: "Instructions", key: "instructions", width: 100 },
    ];
    
    instructionsSheet.getRow(1).font = { bold: true };
    instructionsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4CAF50" }
    };
    instructionsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    
    instructionsSheet.addRow({ section: "General", instructions: sanitizeForExport("Edit the Question Weightings and Question Correlations sheets, then re-upload this file.") });
    instructionsSheet.addRow({ section: "Question Weightings", instructions: sanitizeForExport("Modify Dimension Weight, Overall Weight, Score Multiplier, Max Score, and Notes columns. Do NOT change Question Key.") });
    instructionsSheet.addRow({ section: "Dimension Weight", instructions: sanitizeForExport("Weight applied when calculating dimension scores (0-10, default: 1.0)") });
    instructionsSheet.addRow({ section: "Overall Weight", instructions: sanitizeForExport("Weight applied when calculating overall scores (0-10, default: 1.0)") });
    instructionsSheet.addRow({ section: "Score Multiplier", instructions: sanitizeForExport("Multiplier applied to raw scores (0-10, default: 1.0)") });
    instructionsSheet.addRow({ section: "Max Score", instructions: sanitizeForExport("Maximum possible score for the question (0-10, default: 5.0)") });
    instructionsSheet.addRow({ section: "Question Correlations", instructions: sanitizeForExport("Define relationships between questions. Leave ID empty for new correlations.") });
    instructionsSheet.addRow({ section: "Correlation Types", instructions: sanitizeForExport("positive, negative, or conditional") });
    instructionsSheet.addRow({ section: "Effect Types", instructions: sanitizeForExport("boost (add), reduce (subtract), adjust (set), or multiply") });
    
    await logAuditAction(req, "weightings:export_excel", "question_weightings", "export", {
      questionCount: ALL_QUESTIONS.length,
      weightingsCount: weightings.length,
      correlationsCount: correlations.length,
    });
    
    // Generate and send file
    const filename = `FinanceCompass_Weightings_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error({ err: error }, "Export Excel error");
    res.status(500).json({ success: false, error: "Failed to export Excel file" });
  }
});

// Export scoring logic for pre_assessment questions
router.get("/scoring-logic/export", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const { tier = "pre_assessment" } = req.query;
    
    // Filter questions by tier
    const questions = ALL_QUESTIONS.filter(q => q.tier === tier);
    
    // Get weightings from database
    const weightings = await db.select().from(fcQuestionWeightings);
    const weightingsMap = new Map(weightings.map(w => [w.questionKey, w]));
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Constancia FinanceCompass";
    workbook.created = new Date();
    
    // Sheet 1: Scoring Logic Overview
    const overviewSheet = workbook.addWorksheet("Scoring Logic", {
      properties: { tabColor: { argb: "FF0B3D91" } }
    });
    
    overviewSheet.columns = [
      { header: "Question ID", key: "id", width: 25 },
      { header: "Dimension", key: "dimension", width: 25 },
      { header: "Question Type", key: "type", width: 15 },
      { header: "Question Text", key: "text", width: 60 },
      { header: "Scoring Method", key: "method", width: 25 },
      { header: "Min Score", key: "minScore", width: 12 },
      { header: "Max Score", key: "maxScore", width: 12 },
      { header: "Dimension Weight", key: "dimWeight", width: 15 },
      { header: "Overall Weight", key: "overallWeight", width: 15 },
      { header: "Score Multiplier", key: "multiplier", width: 15 },
    ];
    
    // Style header row
    overviewSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    overviewSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0B3D91" }
    };
    
    for (const q of questions) {
      const weighting = weightingsMap.get(q.id);
      const config = q.scoringConfig as any;
      
      let scoringMethod = "Position-based (option index)";
      let minScore = 1;
      let maxScore = 5;
      
      if (q.questionType === "slider") {
        scoringMethod = "Slider scale";
        minScore = q.sliderConfig?.min || 1;
        maxScore = q.sliderConfig?.max || 5;
      } else if (config?.weights) {
        scoringMethod = "Weighted options";
        const weights = Object.values(config.weights).filter((v): v is number => typeof v === "number");
        minScore = Math.min(...weights);
        maxScore = Math.max(...weights);
      } else if (q.options && q.options.length > 0) {
        scoringMethod = "Position-based (1 to N)";
        minScore = 1;
        maxScore = q.options.length;
      } else if (q.questionType === "structured") {
        scoringMethod = "Structured (no direct score)";
        minScore = 0;
        maxScore = 0;
      }
      
      overviewSheet.addRow({
        id: sanitizeForExport(q.id),
        dimension: sanitizeForExport(q.dimension),
        type: sanitizeForExport(q.questionType),
        text: sanitizeForExport(q.questionText.substring(0, 200)),
        method: sanitizeForExport(scoringMethod),
        minScore,
        maxScore,
        dimWeight: weighting?.dimensionWeight ?? 1.0,
        overallWeight: weighting?.overallWeight ?? 1.0,
        multiplier: weighting?.scoreMultiplier ?? 1.0,
      });
    }
    
    // Sheet 2: Option-level scoring
    const optionsSheet = workbook.addWorksheet("Option Scoring", {
      properties: { tabColor: { argb: "FF00BCD4" } }
    });
    
    optionsSheet.columns = [
      { header: "Question ID", key: "questionId", width: 25 },
      { header: "Dimension", key: "dimension", width: 25 },
      { header: "Question Type", key: "type", width: 15 },
      { header: "Option Value", key: "optionValue", width: 25 },
      { header: "Option Label", key: "optionLabel", width: 50 },
      { header: "Points Earned", key: "points", width: 15 },
      { header: "Max Possible", key: "maxPoints", width: 15 },
      { header: "Percentage", key: "percentage", width: 12 },
      { header: "Scoring Notes", key: "notes", width: 40 },
    ];
    
    optionsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    optionsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00BCD4" }
    };
    
    for (const q of questions) {
      const config = q.scoringConfig as any;
      
      if (q.questionType === "slider" && q.sliderConfig) {
        // Add slider scale entries
        const min = q.sliderConfig.min;
        const max = q.sliderConfig.max;
        for (let val = min; val <= max; val++) {
          const label = q.sliderConfig.labels?.[val] || `Level ${val}`;
          const points = val - min;
          const maxPoints = max - min;
          optionsSheet.addRow({
            questionId: sanitizeForExport(q.id),
            dimension: sanitizeForExport(q.dimension),
            type: "slider",
            optionValue: sanitizeForExport(String(val)),
            optionLabel: sanitizeForExport(label),
            points,
            maxPoints,
            percentage: maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0,
            notes: sanitizeForExport(`Slider value ${val} of ${max}`),
          });
        }
      } else if (q.options && q.options.length > 0) {
        const weights = config?.weights as Record<string, number> | undefined;
        const maxWeight = weights 
          ? Math.max(...Object.values(weights).filter((v): v is number => typeof v === "number"))
          : q.options.length;
        
        for (let i = 0; i < q.options.length; i++) {
          const opt = q.options[i];
          let points: number;
          let notes: string;
          
          if (weights && opt.value in weights) {
            points = weights[opt.value];
            notes = `Weighted: ${points} of ${maxWeight}`;
          } else {
            points = i + 1;
            notes = `Position-based: position ${i + 1} of ${q.options.length}`;
          }
          
          optionsSheet.addRow({
            questionId: sanitizeForExport(q.id),
            dimension: sanitizeForExport(q.dimension),
            type: sanitizeForExport(q.questionType),
            optionValue: sanitizeForExport(opt.value),
            optionLabel: sanitizeForExport(opt.label),
            points,
            maxPoints: maxWeight,
            percentage: maxWeight > 0 ? Math.round((points / maxWeight) * 100) : 0,
            notes: sanitizeForExport(notes),
          });
        }
      }
    }
    
    // Sheet 3: Dimension Score Calculation
    const calcSheet = workbook.addWorksheet("Calculation Formula", {
      properties: { tabColor: { argb: "FF4CAF50" } }
    });
    
    calcSheet.columns = [
      { header: "Step", key: "step", width: 10 },
      { header: "Description", key: "description", width: 80 },
      { header: "Formula", key: "formula", width: 50 },
    ];
    
    calcSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    calcSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4CAF50" }
    };
    
    const calculations = [
      { step: 1, description: "For each question response, extract the raw value (slider value, selected option, etc.)", formula: "rawValue = response.value" },
      { step: 2, description: "For SLIDER questions: Calculate score based on position in range", formula: "questionScore = (value - min) / (max - min)" },
      { step: 3, description: "For SINGLE_SELECT with weights: Look up weight for selected option", formula: "questionScore = weights[selectedValue] / maxWeight" },
      { step: 4, description: "For SINGLE_SELECT without weights: Use position-based scoring", formula: "questionScore = (optionIndex + 1) / totalOptions" },
      { step: 5, description: "For MULTI_SELECT: Average scores across all selected options", formula: "questionScore = avg(scoreForEachSelection)" },
      { step: 6, description: "Apply question-level score multiplier from weightings", formula: "adjustedScore = questionScore * scoreMultiplier" },
      { step: 7, description: "Sum all question scores within a dimension", formula: "totalScore = sum(adjustedScores)" },
      { step: 8, description: "Sum all maximum possible scores within a dimension", formula: "maxScore = sum(maxPossibleScores)" },
      { step: 9, description: "Calculate dimension score as percentage (capped at 100%)", formula: "dimensionScore = min(100, round((totalScore / maxScore) * 100))" },
      { step: 10, description: "Calculate overall score as average of all dimension scores", formula: "overallScore = avg(allDimensionScores)" },
    ];
    
    for (const calc of calculations) {
      calcSheet.addRow({
        step: calc.step,
        description: sanitizeForExport(calc.description),
        formula: sanitizeForExport(calc.formula),
      });
    }
    
    // Sheet 4: Dimensions Summary
    const dimensionsSheet = workbook.addWorksheet("Dimensions", {
      properties: { tabColor: { argb: "FFFF9800" } }
    });
    
    dimensionsSheet.columns = [
      { header: "Dimension", key: "dimension", width: 30 },
      { header: "Question Count", key: "count", width: 15 },
      { header: "Question IDs", key: "ids", width: 80 },
    ];
    
    dimensionsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    dimensionsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF9800" }
    };
    
    const dimensionGroups = new Map<string, string[]>();
    for (const q of questions) {
      const dim = q.dimension;
      if (!dimensionGroups.has(dim)) {
        dimensionGroups.set(dim, []);
      }
      dimensionGroups.get(dim)!.push(q.id);
    }
    
    Array.from(dimensionGroups.entries()).forEach(([dim, ids]) => {
      dimensionsSheet.addRow({
        dimension: sanitizeForExport(dim),
        count: ids.length,
        ids: sanitizeForExport(ids.join(", ")),
      });
    });
    
    await logAuditAction(req, "scoring_logic:export", "scoring_logic", "export", {
      tier,
      questionCount: questions.length,
    });
    
    const filename = `FinanceCompass_ScoringLogic_${tier}_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error({ err: error }, "Export scoring logic error");
    res.status(500).json({ success: false, error: "Failed to export scoring logic" });
  }
});

// Preview import (dry run with diff)
router.post("/question-weightings/import/preview", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    if (!req.files || !("file" in req.files)) {
      await logAuditAction(req, "weightings:import_preview_failed", "question_weightings", "preview", {
        reason: "no_file_uploaded",
      });
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    
    const file = req.files.file;
    const fileBuffer = Array.isArray(file) ? file[0].data : (file as any).data;
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const weightingsSheet = workbook.getWorksheet("Question Weightings");
    const correlationsSheet = workbook.getWorksheet("Question Correlations");
    
    if (!weightingsSheet) {
      await logAuditAction(req, "weightings:import_preview_failed", "question_weightings", "preview", {
        reason: "missing_weightings_sheet",
      });
      return res.status(400).json({ success: false, error: "Missing 'Question Weightings' sheet" });
    }
    
    // Get current data
    const currentWeightings = await db.select().from(fcQuestionWeightings);
    const currentWeightingsMap = new Map(currentWeightings.map(w => [w.questionKey, w]));
    
    const currentCorrelations = await db.select().from(fcQuestionCorrelations);
    const currentCorrelationsMap = new Map(currentCorrelations.map(c => [c.id, c]));
    
    const validQuestionKeys = new Set(ALL_QUESTIONS.map(q => q.id));
    
    const weightingChanges: Array<{
      questionKey: string;
      changeType: "create" | "update" | "unchanged";
      field?: string;
      oldValue?: any;
      newValue?: any;
    }> = [];
    
    const correlationChanges: Array<{
      id?: string;
      changeType: "create" | "update" | "delete" | "unchanged";
      field?: string;
      oldValue?: any;
      newValue?: any;
    }> = [];
    
    const errors: string[] = [];
    
    // Process weightings sheet
    weightingsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const questionKey = row.getCell("A").value?.toString();
      if (!questionKey) return;
      
      if (!validQuestionKeys.has(questionKey)) {
        errors.push(`Row ${rowNumber}: Unknown question key '${questionKey}'`);
        return;
      }
      
      const dimensionWeight = parseFloat(row.getCell("G").value?.toString() || "1.0");
      const overallWeight = parseFloat(row.getCell("H").value?.toString() || "1.0");
      const scoreMultiplier = parseFloat(row.getCell("I").value?.toString() || "1.0");
      const maxScore = parseFloat(row.getCell("J").value?.toString() || "5.0");
      const notes = row.getCell("K").value?.toString() || null;
      
      // Validate ranges
      if (dimensionWeight < 0 || dimensionWeight > 10) errors.push(`Row ${rowNumber}: Dimension weight out of range (0-10)`);
      if (overallWeight < 0 || overallWeight > 10) errors.push(`Row ${rowNumber}: Overall weight out of range (0-10)`);
      if (scoreMultiplier < 0 || scoreMultiplier > 10) errors.push(`Row ${rowNumber}: Score multiplier out of range (0-10)`);
      if (maxScore < 0 || maxScore > 10) errors.push(`Row ${rowNumber}: Max score out of range (0-10)`);
      
      const existing = currentWeightingsMap.get(questionKey);
      
      if (existing) {
        // Check for changes
        const changes: string[] = [];
        if (existing.dimensionWeight !== dimensionWeight) changes.push("dimensionWeight");
        if (existing.overallWeight !== overallWeight) changes.push("overallWeight");
        if (existing.scoreMultiplier !== scoreMultiplier) changes.push("scoreMultiplier");
        if (existing.maxScore !== maxScore) changes.push("maxScore");
        if (existing.notes !== notes) changes.push("notes");
        
        if (changes.length > 0) {
          changes.forEach(field => {
            weightingChanges.push({
              questionKey,
              changeType: "update",
              field,
              oldValue: existing[field as keyof typeof existing],
              newValue: { dimensionWeight, overallWeight, scoreMultiplier, maxScore, notes }[field],
            });
          });
        } else {
          weightingChanges.push({ questionKey, changeType: "unchanged" });
        }
      } else {
        // New weighting (only if not all defaults)
        if (dimensionWeight !== 1.0 || overallWeight !== 1.0 || scoreMultiplier !== 1.0 || maxScore !== 5.0 || notes) {
          weightingChanges.push({
            questionKey,
            changeType: "create",
            newValue: { dimensionWeight, overallWeight, scoreMultiplier, maxScore, notes },
          });
        }
      }
    });
    
    // Process correlations sheet (if present)
    if (correlationsSheet) {
      const processedIds = new Set<string>();
      
      correlationsSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        
        const id = row.getCell("A").value?.toString() || null;
        const sourceKey = row.getCell("B").value?.toString();
        const targetKey = row.getCell("D").value?.toString();
        const correlationType = row.getCell("F").value?.toString();
        const correlationWeight = parseFloat(row.getCell("G").value?.toString() || "0.5");
        const effectType = row.getCell("H").value?.toString();
        const effectValue = parseFloat(row.getCell("I").value?.toString() || "0");
        const isActive = row.getCell("J").value?.toString()?.toLowerCase() !== "false";
        const description = row.getCell("K").value?.toString() || null;
        
        if (!sourceKey || !targetKey || !correlationType || !effectType) {
          if (sourceKey || targetKey) {
            errors.push(`Row ${rowNumber}: Missing required correlation fields`);
          }
          return;
        }
        
        if (!validQuestionKeys.has(sourceKey)) errors.push(`Row ${rowNumber}: Unknown source question '${sourceKey}'`);
        if (!validQuestionKeys.has(targetKey)) errors.push(`Row ${rowNumber}: Unknown target question '${targetKey}'`);
        if (!["positive", "negative", "conditional"].includes(correlationType)) {
          errors.push(`Row ${rowNumber}: Invalid correlation type '${correlationType}'`);
        }
        if (!["boost", "reduce", "adjust", "multiply"].includes(effectType)) {
          errors.push(`Row ${rowNumber}: Invalid effect type '${effectType}'`);
        }
        
        if (id) {
          processedIds.add(id);
          const existing = currentCorrelationsMap.get(id);
          if (existing) {
            const hasChanges = 
              existing.sourceQuestionKey !== sourceKey ||
              existing.targetQuestionKey !== targetKey ||
              existing.correlationType !== correlationType ||
              existing.correlationWeight !== correlationWeight ||
              existing.effectType !== effectType ||
              existing.effectValue !== effectValue ||
              existing.isActive !== isActive ||
              existing.description !== description;
            
            correlationChanges.push({
              id,
              changeType: hasChanges ? "update" : "unchanged",
            });
          }
        } else {
          correlationChanges.push({
            changeType: "create",
            newValue: { sourceKey, targetKey, correlationType, effectType },
          });
        }
      });
      
      // Check for deleted correlations
      currentCorrelations.forEach(c => {
        if (!processedIds.has(c.id)) {
          correlationChanges.push({
            id: c.id,
            changeType: "delete",
            oldValue: { source: c.sourceQuestionKey, target: c.targetQuestionKey },
          });
        }
      });
    }
    
    const summary = {
      weightings: {
        creates: weightingChanges.filter(c => c.changeType === "create").length,
        updates: weightingChanges.filter(c => c.changeType === "update").length,
        unchanged: weightingChanges.filter(c => c.changeType === "unchanged").length,
      },
      correlations: {
        creates: correlationChanges.filter(c => c.changeType === "create").length,
        updates: correlationChanges.filter(c => c.changeType === "update").length,
        deletes: correlationChanges.filter(c => c.changeType === "delete").length,
        unchanged: correlationChanges.filter(c => c.changeType === "unchanged").length,
      },
      errors: errors.length,
    };
    
    // Log import preview attempt
    await logAuditAction(req, "weightings:import_preview", "question_weightings", "preview", {
      success: errors.length === 0,
      summary,
      errorCount: errors.length,
    });
    
    res.json({
      success: errors.length === 0,
      data: {
        summary,
        weightingChanges: weightingChanges.filter(c => c.changeType !== "unchanged"),
        correlationChanges: correlationChanges.filter(c => c.changeType !== "unchanged"),
        errors,
      },
      message: errors.length > 0 
        ? `Found ${errors.length} validation errors` 
        : `Preview: ${summary.weightings.creates + summary.weightings.updates} weighting changes, ${summary.correlations.creates + summary.correlations.updates + summary.correlations.deletes} correlation changes`,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Import preview error");
    // Log failed import attempt
    await logAuditAction(req, "weightings:import_preview_failed", "question_weightings", "preview", {
      error: error.message || "Unknown error",
    });
    res.status(500).json({ success: false, error: "Failed to preview import" });
  }
});

// Import from Excel (apply changes)
router.post("/question-weightings/import/apply", ensureFinanceCompassAccess("fc:questions:manage"), async (req: Request, res: Response) => {
  try {
    if (!req.files || !("file" in req.files)) {
      await logAuditAction(req, "weightings:import_failed", "question_weightings", "import", {
        reason: "no_file_uploaded",
      });
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    
    const file = req.files.file;
    const fileBuffer = Array.isArray(file) ? file[0].data : (file as any).data;
    const adminId = getAdminId(req);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    
    const weightingsSheet = workbook.getWorksheet("Question Weightings");
    
    if (!weightingsSheet) {
      await logAuditAction(req, "weightings:import_failed", "question_weightings", "import", {
        reason: "missing_weightings_sheet",
      });
      return res.status(400).json({ success: false, error: "Missing 'Question Weightings' sheet" });
    }
    
    const validQuestionKeys = new Set(ALL_QUESTIONS.map(q => q.id));
    const currentWeightings = await db.select().from(fcQuestionWeightings);
    const currentWeightingsMap = new Map(currentWeightings.map(w => [w.questionKey, w]));
    
    const results = {
      weightingsCreated: 0,
      weightingsUpdated: 0,
      correlationsCreated: 0,
      correlationsUpdated: 0,
      correlationsDeleted: 0,
      errors: [] as string[],
    };
    
    // Process weightings
    const weightingsToUpsert: Array<{
      questionKey: string;
      dimensionWeight: number;
      overallWeight: number;
      scoreMultiplier: number;
      maxScore: number;
      notes: string | null;
    }> = [];
    
    weightingsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      
      const questionKey = row.getCell("A").value?.toString();
      if (!questionKey || !validQuestionKeys.has(questionKey)) return;
      
      const dimensionWeight = parseFloat(row.getCell("G").value?.toString() || "1.0");
      const overallWeight = parseFloat(row.getCell("H").value?.toString() || "1.0");
      const scoreMultiplier = parseFloat(row.getCell("I").value?.toString() || "1.0");
      const maxScore = parseFloat(row.getCell("J").value?.toString() || "5.0");
      const notes = row.getCell("K").value?.toString() || null;
      
      // Only add if not all defaults
      if (dimensionWeight !== 1.0 || overallWeight !== 1.0 || scoreMultiplier !== 1.0 || maxScore !== 5.0 || notes) {
        weightingsToUpsert.push({ questionKey, dimensionWeight, overallWeight, scoreMultiplier, maxScore, notes });
      }
    });
    
    // Apply weighting changes
    for (const weighting of weightingsToUpsert) {
      try {
        const existing = currentWeightingsMap.get(weighting.questionKey);
        
        if (existing) {
          await db.update(fcQuestionWeightings)
            .set({
              dimensionWeight: weighting.dimensionWeight,
              overallWeight: weighting.overallWeight,
              scoreMultiplier: weighting.scoreMultiplier,
              maxScore: weighting.maxScore,
              notes: weighting.notes,
              lastModifiedBy: adminId,
              updatedAt: new Date(),
            })
            .where(eq(fcQuestionWeightings.id, existing.id));
          
          await db.insert(fcQuestionWeightingAudit).values({
            entityType: "weighting",
            entityId: existing.id,
            questionKey: weighting.questionKey,
            action: "update",
            previousValue: JSON.parse(JSON.stringify(existing)),
            newValue: weighting,
            modifiedBy: adminId,
            importSource: "excel",
          });
          
          results.weightingsUpdated++;
        } else {
          const [newWeighting] = await db.insert(fcQuestionWeightings)
            .values({
              questionKey: weighting.questionKey,
              dimensionWeight: weighting.dimensionWeight,
              overallWeight: weighting.overallWeight,
              scoreMultiplier: weighting.scoreMultiplier,
              maxScore: weighting.maxScore,
              notes: weighting.notes,
              lastModifiedBy: adminId,
            })
            .returning();
          
          await db.insert(fcQuestionWeightingAudit).values({
            entityType: "weighting",
            entityId: newWeighting.id,
            questionKey: weighting.questionKey,
            action: "create",
            newValue: weighting,
            modifiedBy: adminId,
            importSource: "excel",
          });
          
          results.weightingsCreated++;
        }
      } catch (err: any) {
        results.errors.push(`Failed to upsert weighting for ${weighting.questionKey}: ${err.message}`);
      }
    }
    
    await logAuditAction(req, "weightings:import_excel", "question_weightings", "import", {
      weightingsCreated: results.weightingsCreated,
      weightingsUpdated: results.weightingsUpdated,
      errors: results.errors.length,
    });
    
    res.json({
      success: results.errors.length === 0,
      data: results,
      message: `Import complete: Created ${results.weightingsCreated}, updated ${results.weightingsUpdated} weightings` + 
        (results.errors.length > 0 ? ` (${results.errors.length} errors)` : ""),
    });
  } catch (error: any) {
    logger.error({ err: error }, "Import apply error");
    // Log failed import attempt
    await logAuditAction(req, "weightings:import_failed", "question_weightings", "import", {
      error: error.message || "Unknown error",
    });
    res.status(500).json({ success: false, error: "Failed to apply import" });
  }
});

// ============================================
// SLIDESPEAK PRESENTATION GENERATION (ADMIN)
// ============================================

router.post("/assessments/:id/slidespeak/generate", ensureFinanceCompassAccess("fc:reports:generate"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.body || {};
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const completedStatuses = ["completed", "analysed", "report_generated", "initial_complete"];
    if (!completedStatuses.includes(assessment.status)) {
      return res.status(400).json({ 
        success: false, 
        error: "Assessment must be completed before generating presentation" 
      });
    }
    
    logger.info({ id: id, force_force_regenerate: force ? " (force regenerate)" : "" }, "Triggering generation for assessment");
    
    const result = await triggerSlidesSpeakGeneration(id, undefined, { force: !!force });
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    await logAuditAction(req, "slidespeak:generate", "assessment", id, { 
      force: !!force,
      status: result.status,
      taskId: result.taskId,
    });
    
    if (result.cached && result.status === "ready") {
      return res.json({
        success: true,
        data: {
          taskId: result.taskId,
          reportId: result.reportId,
          status: "ready" as SlidesSpeakStatus,
          url: result.url,
          cached: true,
          message: "Presentation already available.",
        },
      });
    }
    
    if (result.status === "generating" || result.status === "pending") {
      return res.json({
        success: true,
        data: {
          taskId: result.taskId,
          reportId: result.reportId,
          status: result.status as SlidesSpeakStatus,
          message: "Presentation generation in progress. This may take 1-2 minutes.",
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        taskId: result.taskId,
        reportId: result.reportId,
        status: "generating" as SlidesSpeakStatus,
        message: "Presentation generation started. This may take 1-2 minutes.",
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Generation trigger error");
    res.status(500).json({ success: false, error: "Failed to start presentation generation" });
  }
});

router.get("/assessments/:id/slidespeak/status", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const result = await getReportGenerationStatus(id);
    
    res.json({
      success: true,
      data: {
        hasReport: result.hasReport,
        status: result.status || null,
        url: result.url || null,
        taskId: result.taskId || null,
        reportId: result.reportId || null,
        error: result.error || null,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Status check error");
    res.status(500).json({ success: false, error: "Failed to check generation status" });
  }
});

router.get("/assessments/:id/slidespeak/download", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const result = await getReportGenerationStatus(id);
    
    if (!result.hasReport || result.status !== "ready" || !result.url) {
      return res.status(404).json({ 
        success: false, 
        error: "Presentation not ready. Please generate it first." 
      });
    }
    
    res.redirect(result.url);
  } catch (error: any) {
    logger.error({ err: error }, "Download error");
    res.status(500).json({ success: false, error: "Failed to download presentation" });
  }
});

// ============================================
// QUESTION-LEVEL ANALYTICS (INSIGHTS & TRENDS)
// ============================================

const questionAnalyticsSchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(30),
});

router.get("/question-analytics", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const { days } = questionAnalyticsSchema.parse(req.query);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get all questions
    const allQuestions = await fcStorage.getAllQuestions();
    
    // Question-level stats with response counts and avg scores
    const questionStatsResult = await db.execute(sql`
      SELECT 
        r.question_id,
        COUNT(*)::int as response_count,
        AVG(CASE WHEN r.score IS NOT NULL THEN r.score ELSE NULL END)::float as avg_score,
        COUNT(DISTINCT r.assessment_id)::int as unique_assessments
      FROM fc_responses r
      JOIN fc_assessments a ON r.assessment_id = a.id
      WHERE a.created_at >= ${startDate}
      GROUP BY r.question_id
      ORDER BY response_count DESC
    `);
    
    // Dimension performance from assessments
    const dimensionStatsResult = await db.execute(sql`
      SELECT 
        a.tier,
        a.dimension_scores,
        a.overall_maturity_score
      FROM fc_assessments a
      WHERE a.created_at >= ${startDate}
        AND a.status IN ('completed', 'analysed', 'report_generated', 'initial_complete')
        AND a.dimension_scores IS NOT NULL
    `);
    
    // Calculate dimension averages
    const dimensionTotals: Record<string, { total: number; count: number }> = {};
    for (const row of (dimensionStatsResult.rows as any[])) {
      if (row.dimension_scores && typeof row.dimension_scores === 'object') {
        for (const [dim, score] of Object.entries(row.dimension_scores)) {
          if (typeof score === 'number') {
            if (!dimensionTotals[dim]) {
              dimensionTotals[dim] = { total: 0, count: 0 };
            }
            dimensionTotals[dim].total += score;
            dimensionTotals[dim].count += 1;
          }
        }
      }
    }
    
    const dimensionPerformance = Object.entries(dimensionTotals).map(([dimension, data]) => ({
      dimension,
      avgScore: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
      responseCount: data.count,
    })).sort((a, b) => b.avgScore - a.avgScore);
    
    // Completion trends over time (daily)
    const completionTrendsResult = await db.execute(sql`
      SELECT 
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*)::int as total_assessments,
        COUNT(CASE WHEN status IN ('completed', 'analysed', 'report_generated', 'initial_complete') THEN 1 END)::int as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int as in_progress,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END)::int as not_started,
        AVG(CASE WHEN overall_maturity_score IS NOT NULL THEN overall_maturity_score ELSE NULL END)::float as avg_score
      FROM fc_assessments
      WHERE created_at >= ${startDate}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);
    
    // Score distribution histogram
    const scoreDistributionResult = await db.execute(sql`
      SELECT 
        CASE 
          WHEN overall_maturity_score < 1 THEN '0-1'
          WHEN overall_maturity_score < 2 THEN '1-2'
          WHEN overall_maturity_score < 3 THEN '2-3'
          WHEN overall_maturity_score < 4 THEN '3-4'
          ELSE '4-5'
        END as score_range,
        COUNT(*)::int as count
      FROM fc_assessments
      WHERE created_at >= ${startDate}
        AND overall_maturity_score IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range
    `);
    
    // Top problematic questions (lowest avg scores, high response counts)
    const questionStats = (questionStatsResult.rows as any[]).map(row => {
      const question = allQuestions.find(q => q.id === row.question_id);
      return {
        questionId: row.question_id,
        questionText: question?.prompt?.substring(0, 100) || 'Unknown question',
        dimension: question?.dimension || 'unknown',
        responseCount: row.response_count,
        avgScore: row.avg_score ? Math.round(row.avg_score * 10) / 10 : null,
        uniqueAssessments: row.unique_assessments,
      };
    });
    
    // Identify problematic questions (low avg scores with sufficient data)
    const problematicQuestions = questionStats
      .filter(q => q.avgScore !== null && q.responseCount >= 5)
      .sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0))
      .slice(0, 20);
    
    // Device/source breakdown from audit logs
    const deviceBreakdownResult = await db.execute(sql`
      SELECT 
        CASE 
          WHEN details->>'userAgent' ILIKE '%mobile%' OR details->>'userAgent' ILIKE '%android%' OR details->>'userAgent' ILIKE '%iphone%' THEN 'mobile'
          WHEN details->>'userAgent' ILIKE '%tablet%' OR details->>'userAgent' ILIKE '%ipad%' THEN 'tablet'
          ELSE 'desktop'
        END as device,
        COUNT(*)::int as count
      FROM fc_audit_logs
      WHERE created_at >= ${startDate}
        AND action IN ('assessment:started', 'assessment:completed', 'assessment:submitted')
      GROUP BY device
    `);
    
    // Source breakdown from audit logs
    const sourceBreakdownResult = await db.execute(sql`
      SELECT 
        COALESCE(
          details->>'source',
          CASE 
            WHEN details->>'referrer' ILIKE '%google%' THEN 'organic'
            WHEN details->>'referrer' ILIKE '%linkedin%' THEN 'linkedin'
            WHEN details->>'referrer' ILIKE '%facebook%' THEN 'facebook'
            WHEN details->>'referrer' IS NOT NULL AND details->>'referrer' != '' THEN 'referral'
            ELSE 'direct'
          END
        ) as source,
        COUNT(*)::int as count
      FROM fc_audit_logs
      WHERE created_at >= ${startDate}
        AND action = 'assessment:started'
      GROUP BY source
    `);
    
    // Question abandonment heatmap data
    const questionResponseCounts = new Map<string, number>();
    for (const row of (questionStatsResult.rows as any[])) {
      questionResponseCounts.set(row.question_id, row.response_count);
    }
    
    // Calculate abandonment rates (questions answered vs max possible)
    const maxResponses = Math.max(...questionStats.map(q => q.responseCount), 1);
    const questionHeatmap = allQuestions
      .filter(q => q.tier === 'full' || q.tier === 'pre_assessment')
      .slice(0, 138)
      .map((q, index) => {
        const responseCount = questionResponseCounts.get(q.id) || 0;
        const abandonmentRate = maxResponses > 0 
          ? Math.round((1 - responseCount / maxResponses) * 100) 
          : 0;
        return {
          questionNumber: index + 1,
          questionId: q.id,
          questionText: q.prompt?.substring(0, 150) || 'Unknown question',
          dimension: q.dimension || 'general',
          responseCount,
          abandonmentRate,
          avgScore: questionStats.find(qs => qs.questionId === q.id)?.avgScore || null,
        };
      });
    
    // Tier breakdown
    const tierBreakdownResult = await db.execute(sql`
      SELECT 
        tier,
        COUNT(*)::int as total,
        COUNT(CASE WHEN status IN ('completed', 'analysed', 'report_generated', 'initial_complete') THEN 1 END)::int as completed
      FROM fc_assessments
      WHERE created_at >= ${startDate}
      GROUP BY tier
    `);
    
    res.json({
      success: true,
      data: {
        period: { days, startDate: startDate.toISOString() },
        questionStats: questionStats.slice(0, 50),
        dimensionPerformance,
        completionTrends: (completionTrendsResult.rows as any[]).map(row => ({
          date: row.date,
          total: row.total_assessments,
          completed: row.completed,
          inProgress: row.in_progress,
          notStarted: row.not_started,
          avgScore: row.avg_score ? Math.round(row.avg_score * 10) / 10 : null,
        })),
        scoreDistribution: scoreDistributionResult.rows,
        problematicQuestions,
        deviceBreakdown: deviceBreakdownResult.rows,
        sourceBreakdown: sourceBreakdownResult.rows,
        questionHeatmap,
        tierBreakdown: tierBreakdownResult.rows,
        summary: {
          totalQuestions: allQuestions.length,
          totalResponses: questionStats.reduce((sum, q) => sum + q.responseCount, 0),
          avgOverallScore: dimensionStatsResult.rows.length > 0
            ? Math.round(
                ((dimensionStatsResult.rows as any[])
                  .filter(r => r.overall_maturity_score)
                  .reduce((sum, r) => sum + r.overall_maturity_score, 0) /
                  Math.max((dimensionStatsResult.rows as any[]).filter(r => r.overall_maturity_score).length, 1)) * 10
              ) / 10
            : 0,
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Question analytics error");
    res.status(500).json({ success: false, error: "Failed to fetch question analytics" });
  }
});

// ============================================
// ASSESSMENT OUTPUTS (PDF & PPTX STATUS)
// ============================================

router.get("/assessments/:id/outputs", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assessment = await fcStorage.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }
    
    const reports = await db
      .select()
      .from(fcReports)
      .where(eq(fcReports.assessmentId, id));
    
    const pdfReport = reports.find(r => r.tier === "pdf" || r.tier === "assessment_report" || r.pdfPath);
    const pptxReport = reports.find(r => r.tier === "pptx" || r.tier === "presentation");
    
    let pptxStatus: SlidesSpeakStatus = "pending";
    let pptxUrl: string | null = null;
    
    if (pptxReport) {
      const statusResult = await getReportGenerationStatus(id);
      pptxStatus = (statusResult.status as SlidesSpeakStatus) || "pending";
      pptxUrl = statusResult.url || null;
    }
    
    res.json({
      success: true,
      data: {
        pdf: {
          available: !!pdfReport,
          generatedAt: pdfReport?.pdfGeneratedAt || pdfReport?.createdAt || null,
        },
        pptx: {
          available: !!pptxReport && pptxStatus === "ready",
          status: pptxStatus,
          url: pptxUrl,
          generatedAt: pptxReport?.pdfGeneratedAt || pptxReport?.createdAt || null,
        },
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Assessment outputs error");
    res.status(500).json({ success: false, error: "Failed to fetch assessment outputs" });
  }
});

// ============================================
// WIDGET ANALYTICS WITH TREND ANALYSIS & AI INSIGHTS
// ============================================

import { generateMarketInsights, clearInsightsCache, getCacheStatus } from "../services/finance-compass/perplexity-insights-service";

const widgetAnalyticsQuerySchema = z.object({
  days: z.coerce.number().min(7).max(365).default(30),
  refresh: z.coerce.boolean().optional().default(false),
});

interface QualityScoreBreakdown {
  sampleScore: number;
  completenessScore: number;
  varianceScore: number;
  recencyScore: number;
}

function calculateQualityScore(
  totalEvents: number,
  completeSessions: number,
  totalSessions: number,
  scores: number[],
  eventDates: Date[]
): { score: number; breakdown: QualityScoreBreakdown; confidence: string } {
  // Sample Size (25% weight) - minimum 100 events for confidence
  const sampleScore = Math.min((totalEvents / 100) * 25, 25);
  
  // Completeness (25% weight) - sessions that answered >5 questions
  const completenessScore = totalSessions > 0 
    ? (completeSessions / totalSessions) * 25 
    : 0;
  
  // Variance (25% weight) - healthy distribution of scores (not all same value)
  let varianceScore = 0;
  if (scores.length >= 10) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    // Healthy stdDev is 0.5-1.5 for scores 1-5
    const normalizedVariance = Math.min(stdDev / 1.5, 1);
    varianceScore = normalizedVariance * 25;
  }
  
  // Recency (25% weight) - data from last 7 days weighted higher
  let recencyScore = 0;
  if (eventDates.length > 0) {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentEvents = eventDates.filter(d => d.getTime() > sevenDaysAgo).length;
    recencyScore = Math.min((recentEvents / Math.max(eventDates.length, 1)) * 25 + 5, 25);
  }
  
  const totalScore = Math.round(sampleScore + completenessScore + varianceScore + recencyScore);
  
  let confidence: string;
  if (totalScore >= 75) confidence = 'high';
  else if (totalScore >= 50) confidence = 'medium';
  else if (totalScore >= 25) confidence = 'low';
  else confidence = 'insufficient';
  
  return {
    score: totalScore,
    breakdown: { sampleScore, completenessScore, varianceScore, recencyScore },
    confidence,
  };
}

router.get("/widget-analytics", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const { days, refresh } = widgetAnalyticsQuerySchema.parse(req.query);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get widget events grouped by day
    const trendsResult = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as total_events,
        COUNT(CASE WHEN event_type = 'question_answered' THEN 1 END)::int as question_answered,
        COUNT(CASE WHEN event_type = 'qualification_completed' THEN 1 END)::int as qualification_completed,
        COUNT(CASE WHEN event_type = 'preview_reset' THEN 1 END)::int as preview_reset,
        COUNT(CASE WHEN event_type = 'preview_completed' THEN 1 END)::int as preview_completed,
        COUNT(DISTINCT session_id)::int as unique_sessions
      FROM widget_analytics
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Get session-level stats for quality scoring
    const sessionStatsResult = await db.execute(sql`
      SELECT 
        session_id,
        COUNT(*)::int as event_count,
        MAX(CASE WHEN event_type = 'qualification_completed' THEN 1 ELSE 0 END)::int as completed,
        MAX(final_score)::float as final_score
      FROM widget_analytics
      WHERE created_at >= ${startDate}
        AND session_id IS NOT NULL
      GROUP BY session_id
    `);
    
    // Get device breakdown with completion rates
    const deviceResult = await db.execute(sql`
      SELECT 
        CASE 
          WHEN user_agent ILIKE '%mobile%' OR user_agent ILIKE '%android%' OR user_agent ILIKE '%iphone%' THEN 'mobile'
          WHEN user_agent ILIKE '%tablet%' OR user_agent ILIKE '%ipad%' THEN 'tablet'
          ELSE 'desktop'
        END as device,
        COUNT(DISTINCT session_id)::int as sessions,
        COUNT(CASE WHEN event_type = 'qualification_completed' THEN 1 END)::int as completions
      FROM widget_analytics
      WHERE created_at >= ${startDate}
      GROUP BY device
    `);
    
    // Get source breakdown
    const sourceResult = await db.execute(sql`
      SELECT 
        COALESCE(
          CASE 
            WHEN metadata->>'source' IS NOT NULL THEN metadata->>'source'
            WHEN metadata->>'referrer' ILIKE '%linkedin%' THEN 'linkedin'
            WHEN metadata->>'referrer' ILIKE '%google%' THEN 'google'
            WHEN metadata->>'referrer' ILIKE '%twitter%' OR metadata->>'referrer' ILIKE '%x.com%' THEN 'twitter'
            ELSE 'direct'
          END,
          'direct'
        ) as source,
        COUNT(DISTINCT session_id)::int as sessions
      FROM widget_analytics
      WHERE created_at >= ${startDate}
      GROUP BY source
      ORDER BY sessions DESC
      LIMIT 10
    `);
    
    // Get industry breakdown with completion rates and scores (using DISTINCT to prevent over-counting)
    const industryResult = await db.execute(sql`
      SELECT 
        COALESCE(qualification_data->>'industry', 'unknown') as industry,
        COUNT(DISTINCT session_id)::int as sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'qualification_completed' THEN session_id END)::int as completions,
        AVG(CASE WHEN final_score IS NOT NULL THEN final_score END)::float as avg_score,
        MAX(final_score)::int as max_score,
        MIN(CASE WHEN final_score IS NOT NULL THEN final_score END)::int as min_score
      FROM widget_analytics
      WHERE created_at >= ${startDate}
        AND qualification_data IS NOT NULL
      GROUP BY COALESCE(qualification_data->>'industry', 'unknown')
      HAVING COUNT(DISTINCT session_id) >= 2
      ORDER BY sessions DESC
    `);
    
    // Get company size breakdown with completion rates and scores
    const companySizeResult = await db.execute(sql`
      SELECT 
        COALESCE(qualification_data->>'companySize', 'unknown') as company_size,
        COUNT(DISTINCT session_id)::int as sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'qualification_completed' THEN session_id END)::int as completions,
        AVG(CASE WHEN final_score IS NOT NULL THEN final_score END)::float as avg_score,
        MAX(final_score)::int as max_score,
        MIN(CASE WHEN final_score IS NOT NULL THEN final_score END)::int as min_score
      FROM widget_analytics
      WHERE created_at >= ${startDate}
        AND qualification_data IS NOT NULL
      GROUP BY COALESCE(qualification_data->>'companySize', 'unknown')
      HAVING COUNT(DISTINCT session_id) >= 2
      ORDER BY sessions DESC
    `);
    
    // Get revenue band breakdown
    const revenueResult = await db.execute(sql`
      SELECT 
        COALESCE(qualification_data->>'revenue', 'unknown') as revenue_band,
        COUNT(DISTINCT session_id)::int as sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'qualification_completed' THEN session_id END)::int as completions,
        AVG(CASE WHEN final_score IS NOT NULL THEN final_score END)::float as avg_score
      FROM widget_analytics
      WHERE created_at >= ${startDate}
        AND qualification_data IS NOT NULL
      GROUP BY COALESCE(qualification_data->>'revenue', 'unknown')
      HAVING COUNT(DISTINCT session_id) >= 2
      ORDER BY sessions DESC
    `);
    
    // Get role breakdown
    const roleResult = await db.execute(sql`
      SELECT 
        COALESCE(qualification_data->>'role', 'unknown') as role,
        COUNT(DISTINCT session_id)::int as sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'qualification_completed' THEN session_id END)::int as completions,
        AVG(CASE WHEN final_score IS NOT NULL THEN final_score END)::float as avg_score
      FROM widget_analytics
      WHERE created_at >= ${startDate}
        AND qualification_data IS NOT NULL
      GROUP BY COALESCE(qualification_data->>'role', 'unknown')
      HAVING COUNT(DISTINCT session_id) >= 2
      ORDER BY sessions DESC
    `);
    
    // Get question-level abandonment
    const questionAbandonmentResult = await db.execute(sql`
      WITH question_counts AS (
        SELECT 
          question_id,
          question_number,
          COUNT(*)::int as response_count
        FROM widget_analytics
        WHERE created_at >= ${startDate}
          AND event_type = 'question_answered'
          AND question_id IS NOT NULL
        GROUP BY question_id, question_number
      ),
      max_responses AS (
        SELECT MAX(response_count) as max_count FROM question_counts
      )
      SELECT 
        qc.question_id,
        qc.question_number,
        qc.response_count,
        ROUND((1 - qc.response_count::float / NULLIF(mr.max_count, 0)) * 100)::int as abandonment_rate
      FROM question_counts qc
      CROSS JOIN max_responses mr
      ORDER BY abandonment_rate DESC
      LIMIT 10
    `);
    
    // Calculate totals for trend data
    const trends = (trendsResult.rows as any[]).map(row => ({
      date: row.date,
      totalEvents: row.total_events,
      questionAnsweredCount: row.question_answered,
      qualificationCompletedCount: row.qualification_completed,
      previewResetCount: row.preview_reset,
      previewCompletedCount: row.preview_completed,
      uniqueSessions: row.unique_sessions,
    }));
    
    const sessions = sessionStatsResult.rows as any[];
    const totalSessions = sessions.length;
    const completeSessions = sessions.filter(s => s.completed > 0 || s.event_count >= 5).length;
    const scores = sessions.filter(s => s.final_score != null).map(s => s.final_score);
    const eventDates = trends.map(t => new Date(t.date));
    const totalEvents = trends.reduce((sum, t) => sum + t.totalEvents, 0);
    
    // Calculate quality score
    const qualityScore = calculateQualityScore(
      totalEvents,
      completeSessions,
      totalSessions,
      scores,
      eventDates
    );
    
    // Prepare data for AI insights
    const deviceBreakdown = (deviceResult.rows as any[]).map(row => ({
      device: row.device,
      count: row.sessions,
      completionRate: row.sessions > 0 ? row.completions / row.sessions : 0,
    }));
    
    const sourceBreakdown = (sourceResult.rows as any[]).map(row => ({
      source: row.source,
      count: row.sessions,
    }));
    
    const topAbandonmentQuestions = (questionAbandonmentResult.rows as any[]).map(row => ({
      questionId: row.question_number?.toString() || row.question_id,
      rate: row.abandonment_rate || 0,
    }));
    
    // Process industry breakdown with outlier detection
    const industryBreakdown = (industryResult.rows as any[]).map(row => ({
      industry: row.industry,
      sessions: row.sessions,
      completions: row.completions,
      completionRate: row.sessions > 0 ? Math.round((row.completions / row.sessions) * 100) : 0,
      avgScore: row.avg_score ? Math.round(row.avg_score) : null,
      maxScore: row.max_score,
      minScore: row.min_score,
    }));
    
    // Process company size breakdown with outlier detection
    const companySizeBreakdown = (companySizeResult.rows as any[]).map(row => ({
      companySize: row.company_size,
      sessions: row.sessions,
      completions: row.completions,
      completionRate: row.sessions > 0 ? Math.round((row.completions / row.sessions) * 100) : 0,
      avgScore: row.avg_score ? Math.round(row.avg_score) : null,
      maxScore: row.max_score,
      minScore: row.min_score,
    }));
    
    // Process revenue band breakdown
    const revenueBreakdown = (revenueResult.rows as any[]).map(row => ({
      revenueBand: row.revenue_band,
      sessions: row.sessions,
      completions: row.completions,
      completionRate: row.sessions > 0 ? Math.round((row.completions / row.sessions) * 100) : 0,
      avgScore: row.avg_score ? Math.round(row.avg_score) : null,
    }));
    
    // Process role breakdown
    const roleBreakdown = (roleResult.rows as any[]).map(row => ({
      role: row.role,
      sessions: row.sessions,
      completions: row.completions,
      completionRate: row.sessions > 0 ? Math.round((row.completions / row.sessions) * 100) : 0,
      avgScore: row.avg_score ? Math.round(row.avg_score) : null,
    }));
    
    // Calculate overall averages from the qualified dataset (sessions with qualification_data)
    const qualifiedBenchmarkResult = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT session_id)::int as total_sessions,
        COUNT(DISTINCT CASE WHEN event_type = 'qualification_completed' THEN session_id END)::int as total_completions,
        AVG(CASE WHEN final_score IS NOT NULL THEN final_score END)::float as avg_score
      FROM widget_analytics
      WHERE created_at >= ${startDate}
        AND qualification_data IS NOT NULL
    `);
    const qualifiedBenchmarks = qualifiedBenchmarkResult.rows[0] as any;
    const qualifiedSessions = qualifiedBenchmarks?.total_sessions || 0;
    const qualifiedCompletions = qualifiedBenchmarks?.total_completions || 0;
    const overallAvgScore = qualifiedBenchmarks?.avg_score || 0;
    const overallCompletionRate = qualifiedSessions > 0 ? (qualifiedCompletions / qualifiedSessions) * 100 : 0;
    
    // Identify outliers (segments that deviate significantly from overall average)
    const outliers: Array<{segment: string; type: string; value: number; benchmark: number; deviation: string; insight: string}> = [];
    
    const formatSegmentName = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    // Industry outliers (score + completion)
    industryBreakdown.forEach(ind => {
      if (ind.avgScore && Math.abs(ind.avgScore - overallAvgScore) > 15 && ind.sessions >= 3) {
        const isHigh = ind.avgScore > overallAvgScore;
        outliers.push({
          segment: formatSegmentName(ind.industry),
          type: 'industry_score',
          value: ind.avgScore,
          benchmark: Math.round(overallAvgScore),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `${formatSegmentName(ind.industry)} sector shows ${ind.avgScore - Math.round(overallAvgScore)} points above average readiness`
            : `${formatSegmentName(ind.industry)} sector may need additional support (${Math.round(overallAvgScore) - ind.avgScore} points below average)`,
        });
      }
      if (Math.abs(ind.completionRate - overallCompletionRate) > 20 && ind.sessions >= 3) {
        const isHigh = ind.completionRate > overallCompletionRate;
        outliers.push({
          segment: formatSegmentName(ind.industry),
          type: 'industry_completion',
          value: ind.completionRate,
          benchmark: Math.round(overallCompletionRate),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `${formatSegmentName(ind.industry)} sector has ${ind.completionRate - Math.round(overallCompletionRate)}% higher completion rate`
            : `${formatSegmentName(ind.industry)} sector shows ${Math.round(overallCompletionRate) - ind.completionRate}% lower completion - may indicate friction`,
        });
      }
    });
    
    // Company size outliers (score + completion)
    companySizeBreakdown.forEach(cs => {
      const sizeLabel = cs.companySize.replace(/_/g, '-');
      if (cs.avgScore && Math.abs(cs.avgScore - overallAvgScore) > 15 && cs.sessions >= 3) {
        const isHigh = cs.avgScore > overallAvgScore;
        outliers.push({
          segment: `${sizeLabel} employees`,
          type: 'company_size_score',
          value: cs.avgScore,
          benchmark: Math.round(overallAvgScore),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `Companies with ${sizeLabel} employees score ${cs.avgScore - Math.round(overallAvgScore)} points above average`
            : `Companies with ${sizeLabel} employees may benefit from targeted guidance`,
        });
      }
      if (Math.abs(cs.completionRate - overallCompletionRate) > 20 && cs.sessions >= 3) {
        const isHigh = cs.completionRate > overallCompletionRate;
        outliers.push({
          segment: `${sizeLabel} employees`,
          type: 'company_size_completion',
          value: cs.completionRate,
          benchmark: Math.round(overallCompletionRate),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `${sizeLabel} employee companies complete ${cs.completionRate - Math.round(overallCompletionRate)}% more assessments`
            : `${sizeLabel} employee companies may face friction (${Math.round(overallCompletionRate) - cs.completionRate}% lower completion)`,
        });
      }
    });
    
    // Revenue band outliers (score + completion)
    revenueBreakdown.forEach(rev => {
      if (rev.avgScore && Math.abs(rev.avgScore - overallAvgScore) > 15 && rev.sessions >= 3) {
        const isHigh = rev.avgScore > overallAvgScore;
        outliers.push({
          segment: rev.revenueBand,
          type: 'revenue_score',
          value: rev.avgScore,
          benchmark: Math.round(overallAvgScore),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `${rev.revenueBand} revenue band scores ${rev.avgScore - Math.round(overallAvgScore)} points above average`
            : `${rev.revenueBand} revenue band needs more support`,
        });
      }
      if (Math.abs(rev.completionRate - overallCompletionRate) > 20 && rev.sessions >= 3) {
        const isHigh = rev.completionRate > overallCompletionRate;
        outliers.push({
          segment: rev.revenueBand,
          type: 'revenue_completion',
          value: rev.completionRate,
          benchmark: Math.round(overallCompletionRate),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `${rev.revenueBand} revenue band completes ${rev.completionRate - Math.round(overallCompletionRate)}% more assessments`
            : `${rev.revenueBand} revenue band shows ${Math.round(overallCompletionRate) - rev.completionRate}% lower completion`,
        });
      }
    });
    
    // Role outliers (score + completion)
    roleBreakdown.forEach(role => {
      if (role.avgScore && Math.abs(role.avgScore - overallAvgScore) > 15 && role.sessions >= 3) {
        const isHigh = role.avgScore > overallAvgScore;
        outliers.push({
          segment: formatSegmentName(role.role),
          type: 'role_score',
          value: role.avgScore,
          benchmark: Math.round(overallAvgScore),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `${formatSegmentName(role.role)} role shows ${role.avgScore - Math.round(overallAvgScore)} points above average readiness`
            : `${formatSegmentName(role.role)} role may need tailored content`,
        });
      }
      if (Math.abs(role.completionRate - overallCompletionRate) > 20 && role.sessions >= 3) {
        const isHigh = role.completionRate > overallCompletionRate;
        outliers.push({
          segment: formatSegmentName(role.role),
          type: 'role_completion',
          value: role.completionRate,
          benchmark: Math.round(overallCompletionRate),
          deviation: isHigh ? 'above' : 'below',
          insight: isHigh 
            ? `${formatSegmentName(role.role)} role completes ${role.completionRate - Math.round(overallCompletionRate)}% more assessments`
            : `${formatSegmentName(role.role)} role shows ${Math.round(overallCompletionRate) - role.completionRate}% lower completion`,
        });
      }
    });
    
    // Generate AI insights with Perplexity
    const insightsData = {
      totalEvents,
      questionAnsweredCount: trends.reduce((sum, t) => sum + t.questionAnsweredCount, 0),
      qualificationCompletedCount: trends.reduce((sum, t) => sum + t.qualificationCompletedCount, 0),
      avgCompletionRate: totalSessions > 0 ? completeSessions / totalSessions : 0,
      topAbandonmentQuestions,
      deviceBreakdown,
      sourceBreakdown,
      weeklyTrend: trends.slice(0, 7).map(t => ({
        week: t.date,
        events: t.totalEvents
      })),
    };
    
    const { insights, fromCache, nextRefresh } = await generateMarketInsights(insightsData, refresh);
    
    // Summary statistics
    const summary = {
      totalEvents,
      totalSessions,
      completeSessions,
      avgCompletionRate: totalSessions > 0 ? Math.round((completeSessions / totalSessions) * 100) : 0,
      avgEventsPerSession: totalSessions > 0 ? Math.round(totalEvents / totalSessions) : 0,
    };
    
    res.json({
      success: true,
      data: {
        period: { days, startDate: startDate.toISOString() },
        trends,
        qualityScore,
        insights,
        insightsMeta: {
          fromCache,
          nextRefresh,
          canRefresh: !fromCache,
        },
        deviceBreakdown,
        sourceBreakdown,
        topAbandonmentQuestions,
        // Deep segmentation analysis
        segmentation: {
          industryBreakdown,
          companySizeBreakdown,
          revenueBreakdown,
          roleBreakdown,
          outliers,
          benchmarks: {
            avgScore: Math.round(overallAvgScore),
            avgCompletionRate: Math.round(overallCompletionRate),
          },
        },
        summary,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Widget analytics error");
    res.status(500).json({ success: false, error: "Failed to fetch widget analytics" });
  }
});

router.post("/widget-analytics/refresh-insights", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    clearInsightsCache();
    res.json({ success: true, message: "Insights cache cleared. Next request will generate fresh insights." });
  } catch (error) {
    logger.error({ err: error }, "Refresh insights error");
    res.status(500).json({ success: false, error: "Failed to refresh insights" });
  }
});

// ============================================
// DATA QUALITY & MONETIZATION
// ============================================

router.get("/data-quality/summary", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const summary = await dataQualityService.getQualitySummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error({ err: error }, "Data quality summary error");
    res.status(500).json({ success: false, error: "Failed to fetch data quality summary" });
  }
});

router.get("/data-quality/segments", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const segments = await dataQualityService.getSegmentCounts();
    res.json({ success: true, data: segments });
  } catch (error) {
    logger.error({ err: error }, "Segment counts error");
    res.status(500).json({ success: false, error: "Failed to fetch segment counts" });
  }
});

router.post("/data-quality/backfill", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    logger.info("Starting data quality backfill...");
    const stats = await dataQualityService.backfillAllAssessments();
    
    await logAuditAction(req, "data_quality:backfill", "assessments", "all", {
      totalAssessments: stats.totalAssessments,
      validRecords: stats.validRecords,
      invalidRecords: stats.invalidRecords,
    });
    
    res.json({ 
      success: true, 
      data: stats,
      message: `Backfill complete. ${stats.validRecords} valid, ${stats.invalidRecords} invalid out of ${stats.totalAssessments} total.`,
    });
  } catch (error) {
    logger.error({ err: error }, "Data quality backfill error");
    res.status(500).json({ success: false, error: "Failed to run backfill" });
  }
});

router.post("/data-quality/validate/:assessmentId", ensureFinanceCompassAccess("fc:assessments:manage"), async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const result = await dataQualityService.updateAssessmentQuality(assessmentId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ err: error }, "Assessment validation error");
    res.status(500).json({ success: false, error: "Failed to validate assessment" });
  }
});

router.get("/data-export/anonymous", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { validOnly, minQualityScore, countryCode, industry, sizeBand } = req.query;
    
    const exportData = await anonymousExportService.generateExport({
      validOnly: validOnly !== "false",
      minQualityScore: minQualityScore ? parseInt(minQualityScore as string, 10) : 60,
      countryCode: countryCode as string | undefined,
      industry: industry as string | undefined,
      sizeBand: sizeBand as string | undefined,
    });
    
    res.json({ success: true, data: exportData });
  } catch (error) {
    logger.error({ err: error }, "Anonymous export error");
    res.status(500).json({ success: false, error: "Failed to generate export" });
  }
});

router.get("/data-export/benchmarks", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const benchmarks = await anonymousExportService.generateBenchmarkSummary();
    res.json({ success: true, data: benchmarks });
  } catch (error) {
    logger.error({ err: error }, "Benchmark export error");
    res.status(500).json({ success: false, error: "Failed to generate benchmarks" });
  }
});

// ============================================
// WIDGET QUALITY & DATA EXPORT
// ============================================

router.get("/widget-quality/stats", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const stats = await widgetQualityService.getQualityStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ err: error }, "Widget quality stats error");
    res.status(500).json({ success: false, error: "Failed to fetch widget quality stats" });
  }
});

router.get("/widget-quality/segments", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const segments = await widgetQualityService.getSegmentCounts();
    res.json({ success: true, data: segments });
  } catch (error) {
    logger.error({ err: error }, "Widget segment counts error");
    res.status(500).json({ success: false, error: "Failed to fetch widget segment counts" });
  }
});

router.post("/widget-quality/backfill", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    logger.info("Starting widget quality backfill...");
    const stats = await widgetQualityService.aggregateAndValidateSessions();
    
    await logAuditAction(req, "widget_quality:backfill", "widget_analytics", "all", {
      totalSessions: stats.totalSessions,
      validSessions: stats.validSessions,
      invalidSessions: stats.invalidSessions,
    });
    
    res.json({ 
      success: true, 
      data: stats,
      message: `Backfill complete. ${stats.validSessions} valid, ${stats.invalidSessions} invalid out of ${stats.totalSessions} total sessions.`,
    });
  } catch (error) {
    logger.error({ err: error }, "Widget quality backfill error");
    res.status(500).json({ success: false, error: "Failed to run widget backfill" });
  }
});

router.get("/widget-export/anonymous", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    const { widget, validOnly, minQualityScore } = req.query;
    
    const exportData = await widgetQualityService.generateAnonymousExport({
      widget: widget as string | undefined,
      validOnly: validOnly !== "false",
      minQualityScore: minQualityScore ? parseInt(minQualityScore as string, 10) : 60,
    });
    
    res.json({ success: true, data: exportData });
  } catch (error) {
    logger.error({ err: error }, "Widget anonymous export error");
    res.status(500).json({ success: false, error: "Failed to generate widget export" });
  }
});

// ============================================
// COMBINED BACKFILL & STATUS
// ============================================

router.post("/data-quality/backfill-all", ensureFinanceCompassAccess("fc:admin:full"), async (req: Request, res: Response) => {
  try {
    if (isBackfillInProgress()) {
      return res.status(409).json({ 
        success: false, 
        error: "Backfill already in progress",
        lastResult: getLastBackfillResult(),
      });
    }

    logger.info("Starting combined data quality backfill...");
    const result = await runStartupBackfill();
    
    await logAuditAction(req, "data_quality:backfill_all", "all", "all", {
      assessments: result.assessments,
      widgets: result.widgets,
      durationMs: result.durationMs,
    });
    
    res.json({ 
      success: result.success, 
      data: result,
      message: `Combined backfill complete in ${result.durationMs}ms.`,
    });
  } catch (error) {
    logger.error({ err: error }, "Combined backfill error");
    res.status(500).json({ success: false, error: "Failed to run combined backfill" });
  }
});

router.get("/data-quality/backfill-status", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    res.json({ 
      success: true, 
      data: {
        isRunning: isBackfillInProgress(),
        lastResult: getLastBackfillResult(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Backfill status error");
    res.status(500).json({ success: false, error: "Failed to get backfill status" });
  }
});

router.get("/data-quality/combined-summary", ensureFinanceCompassAccess("fc:view"), async (req: Request, res: Response) => {
  try {
    const [assessmentSummary, widgetStats, assessmentSegments, widgetSegments] = await Promise.all([
      dataQualityService.getQualitySummary(),
      widgetQualityService.getQualityStats(),
      dataQualityService.getSegmentCounts(),
      widgetQualityService.getSegmentCounts(),
    ]);
    
    res.json({ 
      success: true, 
      data: {
        assessments: {
          summary: assessmentSummary,
          segments: assessmentSegments,
        },
        widgets: {
          summary: widgetStats,
          segments: widgetSegments,
        },
        combined: {
          totalValidRecords: assessmentSummary.validRecords + widgetStats.validSessions,
          totalInvalidRecords: assessmentSummary.invalidRecords + widgetStats.invalidSessions,
          overallValidPercentage: Math.round(
            ((assessmentSummary.validRecords + widgetStats.validSessions) / 
             (assessmentSummary.totalAssessments + widgetStats.totalSessions || 1)) * 100
          ),
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Combined summary error");
    res.status(500).json({ success: false, error: "Failed to get combined summary" });
  }
});
