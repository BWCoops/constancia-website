/**
 * AI Scoring Validator - Orchestrated Validation Pipeline
 * 
 * Four-layer validation system for FinanceCompass assessments:
 * 1. Base Assessment Scoring - Core scoring engine with context-aware modes
 * 2. Fragmentation Checking - Vendor fragmentation and tier mixing penalties
 * 3. Quality Checker - Business rule validation against vendor benchmarks
 * 4. AI Advisory Layer - OpenAI validation with auto-update capability
 * 
 * Enforces guardrails and ensures consistency with EPM/ERP/AI comparison tools.
 */

import OpenAI from "openai";
import { createChildLogger } from "../../lib/logger";
import { getOpenAIConfig } from "../../config";

const log = createChildLogger("ai-scoring-validator");
import { calculateQuestionScore, type ScoreResult } from "./scoring-engine";
import { getQuestionById, ALL_QUESTIONS, type QuestionDefinition } from "../question-bank";
import { VENDOR_BENCHMARKS, type VendorBenchmark, type OrganizationSizeBand } from "@shared/vendor-benchmarks";
import type { FcAssessment, FcResponse } from "@shared/finance-compass-schema";
import { getActiveGuardrails } from "../storage";
import { 
  applyCorrelationAdjustments, 
  scoreToMaturityLevel, 
  detectRootCauses,
  type CorrelationAdjustment,
  type MaturityLevel,
  type RootCausePattern
} from "../correlation-matrix";

const openaiConfig = getOpenAIConfig();
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  baseURL: openaiConfig.baseURL,
});

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'scoring' | 'fragmentation' | 'business_rule' | 'ai_advisory';
  code: string;
  message: string;
  field?: string;
  suggestedFix?: string;
  autoFixApplied?: boolean;
}

export interface AIValidationResult {
  confidence: number; // 0-100
  recommendation: 'accept' | 'flag_admin' | 'flag_user' | 'auto_update';
  issues: ValidationIssue[];
  suggestedScoreAdjustments?: Record<string, number>;
  narrative?: string;
}

export interface DimensionScoreWithMaturity {
  score: number;
  adjustedScore: number;
  maturityLevel: MaturityLevel;
  correlationAdjustments: CorrelationAdjustment[];
}

export interface RootCauseAnalysis {
  pattern: RootCausePattern;
  matchedIndicators: number;
  totalIndicators: number;
}

export interface ValidationResult {
  isValid: boolean;
  overallScore: number;
  adjustedOverallScore: number;
  dimensionScores: Record<string, number>;
  adjustedDimensionScores: Record<string, number>;
  dimensionDetails: Record<string, DimensionScoreWithMaturity>;
  correlationAdjustments: CorrelationAdjustment[];
  rootCauses: RootCauseAnalysis[];
  issues: ValidationIssue[];
  aiValidation?: AIValidationResult;
  vendorBenchmarkContext?: VendorBenchmarkContext;
  processingTimeMs: number;
}

export interface VendorBenchmarkContext {
  selectedVendors: string[];
  organizationSize: OrganizationSizeBand;
  expectedTimeline: { min: number; max: number; typical: number };
  expectedCost: { min: number; max: number; typical: number };
  constraints: string[];
}

// ============================================
// BUSINESS RULE CONSTANTS
// ============================================

const VENDOR_MINIMUM_TIMELINES: Record<string, Record<OrganizationSizeBand, number>> = {
  onestream: { smb: 4, mid_market: 8, enterprise: 12, large_enterprise: 18 },
  anaplan: { smb: 3, mid_market: 6, enterprise: 10, large_enterprise: 16 },
  oracle_epm: { smb: 4, mid_market: 8, enterprise: 14, large_enterprise: 22 },
  sap_analytics: { smb: 4, mid_market: 8, enterprise: 14, large_enterprise: 22 },
  workday_adaptive: { smb: 2, mid_market: 4, enterprise: 8, large_enterprise: 14 },
  planful: { smb: 2, mid_market: 4, enterprise: 6, large_enterprise: 10 },
  jedox: { smb: 2, mid_market: 3, enterprise: 5, large_enterprise: 8 },
  prophix: { smb: 2, mid_market: 3, enterprise: 5, large_enterprise: 8 },
  board: { smb: 3, mid_market: 5, enterprise: 8, large_enterprise: 12 },
  vena: { smb: 2, mid_market: 3, enterprise: 5, large_enterprise: 8 },
};

const AI_CONFIDENCE_THRESHOLD = 95; // Auto-update if AI is >= 95% confident
const ANOMALY_DETECTION_THRESHOLD = 70; // Flag for admin review if < 70% confident

// ============================================
// LAYER 1: BASE ASSESSMENT SCORING
// ============================================

export function calculateBaseScores(
  responses: FcResponse[],
  questions: QuestionDefinition[]
): { dimensionScores: Record<string, number>; questionScores: Record<string, ScoreResult> } {
  const dimensionScores: Record<string, number[]> = {};
  const questionScores: Record<string, ScoreResult> = {};
  
  for (const response of responses) {
    const question = questions.find(q => q.id === response.questionId) || getQuestionById(response.questionId);
    if (!question) continue;
    
    const scoreResult = calculateQuestionScore(response.questionId, response.response, question);
    questionScores[response.questionId] = scoreResult;
    
    const dimension = question.dimension;
    if (dimension && dimension !== 'qualification') {
      if (!dimensionScores[dimension]) {
        dimensionScores[dimension] = [];
      }
      dimensionScores[dimension].push(scoreResult.normalizedScore * 100);
    }
  }
  
  const averagedDimensionScores: Record<string, number> = {};
  for (const [dim, scores] of Object.entries(dimensionScores)) {
    if (scores.length > 0) {
      const rawAverage = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      // Bound to valid percentage range
      averagedDimensionScores[dim] = Math.min(100, Math.max(0, rawAverage));
    }
  }
  
  return { dimensionScores: averagedDimensionScores, questionScores };
}

// ============================================
// LAYER 2: FRAGMENTATION CHECKING
// ============================================

export function checkFragmentation(
  responses: FcResponse[],
  questions: QuestionDefinition[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  const vendorQuestions = questions.filter(q => 
    q.scoringConfig?.type === 'vendor_tier'
  );
  
  for (const vendorQ of vendorQuestions) {
    const response = responses.find(r => r.questionId === vendorQ.id);
    if (!response) continue;
    
    const responseVal = response.response as unknown;
    const values = Array.isArray(responseVal) ? responseVal : [responseVal];
    
    if (values.length > 1) {
      const vendorTiers = vendorQ.scoringConfig?.vendorTiers || {};
      const tiers = new Set<string>();
      
      for (const v of values) {
        const vendorStr = String(v);
        if (vendorTiers.tier1?.includes(vendorStr)) tiers.add('tier1');
        else if (vendorTiers.tier2?.includes(vendorStr)) tiers.add('tier2');
        else if (vendorTiers.specialist?.includes(vendorStr)) tiers.add('specialist');
        else if (vendorTiers.legacy?.includes(vendorStr)) tiers.add('legacy');
      }
      
      if (values.length >= 3) {
        issues.push({
          severity: 'warning',
          category: 'fragmentation',
          code: 'HIGH_VENDOR_FRAGMENTATION',
          message: `Using ${values.length} EPM/CPM vendors indicates significant platform fragmentation. This typically increases complexity and reduces ROI.`,
          field: vendorQ.id,
          suggestedFix: 'Consider consolidating to a unified platform for better integration and lower TCO.',
        });
      } else if (values.length === 2 && tiers.size > 1) {
        issues.push({
          severity: 'info',
          category: 'fragmentation',
          code: 'MIXED_TIER_VENDORS',
          message: `Mixed tier vendors detected (${Array.from(tiers).join(', ')}). This may indicate a transition state or specialist requirements.`,
          field: vendorQ.id,
        });
      }
    }
  }
  
  return issues;
}

// ============================================
// LAYER 2.5: CORRELATION SCORING
// ============================================

export interface CorrelationScoringResult {
  adjustedScores: Record<string, number>;
  adjustments: CorrelationAdjustment[];
  dimensionDetails: Record<string, DimensionScoreWithMaturity>;
  rootCauses: RootCauseAnalysis[];
}

export function calculateCorrelationScoring(
  baseScores: Record<string, number>
): CorrelationScoringResult {
  const { adjustedScores, allAdjustments } = applyCorrelationAdjustments(baseScores);
  
  const dimensionDetails: Record<string, DimensionScoreWithMaturity> = {};
  
  for (const [dimension, baseScore] of Object.entries(baseScores)) {
    const adjustmentsForDim = allAdjustments.filter(a => a.dimension === dimension);
    const adjustedScore = adjustedScores[dimension] ?? baseScore;
    
    dimensionDetails[dimension] = {
      score: baseScore,
      adjustedScore,
      maturityLevel: scoreToMaturityLevel(adjustedScore),
      correlationAdjustments: adjustmentsForDim
    };
  }
  
  const rootCauses = detectRootCauses(adjustedScores);
  
  return {
    adjustedScores,
    adjustments: allAdjustments,
    dimensionDetails,
    rootCauses
  };
}

// ============================================
// LAYER 3: QUALITY CHECKER - BUSINESS RULES
// ============================================

export function validateBusinessRules(
  assessment: Partial<FcAssessment>,
  responses: FcResponse[],
  estimatedTimeline?: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  const vendorResponse = responses.find(r => r.questionId === 'q2_current_epm_vendor');
  const sizeResponse = responses.find(r => r.questionId === 'q1_company_size');
  
  if (vendorResponse && sizeResponse && estimatedTimeline !== undefined) {
    const vendorVal = vendorResponse.response as unknown;
    const vendors = Array.isArray(vendorVal) ? vendorVal : [vendorVal];
    
    const sizeVal = sizeResponse.response as string;
    const orgSize = mapCompanySizeToOrganizationBand(sizeVal);
    
    for (const vendor of vendors) {
      const vendorId = String(vendor).toLowerCase();
      const minTimeline = VENDOR_MINIMUM_TIMELINES[vendorId]?.[orgSize];
      
      if (minTimeline && estimatedTimeline < minTimeline) {
        const vendorName = VENDOR_BENCHMARKS.find(v => v.id === vendorId)?.name || String(vendor);
        issues.push({
          severity: 'critical',
          category: 'business_rule',
          code: 'TIMELINE_BELOW_MINIMUM',
          message: `${vendorName} implementations for ${formatOrgSize(orgSize)} organizations cannot realistically be completed in less than ${minTimeline} months. Current estimate: ${estimatedTimeline} months.`,
          field: 'implementation_timeline',
          suggestedFix: `Adjust timeline to minimum ${minTimeline} months based on vendor benchmarks.`,
        });
      }
    }
  }
  
  const dimensionScores = assessment.dimensionScores as Record<string, number> | undefined;
  if (dimensionScores) {
    for (const [dim, score] of Object.entries(dimensionScores)) {
      if (score > 100) {
        issues.push({
          severity: 'critical',
          category: 'scoring',
          code: 'SCORE_EXCEEDS_MAXIMUM',
          message: `Dimension "${dim}" score (${score}) exceeds maximum allowed value of 100.`,
          field: dim,
          suggestedFix: 'Cap score at 100.',
        });
      }
      if (score < 0) {
        issues.push({
          severity: 'critical',
          category: 'scoring',
          code: 'NEGATIVE_SCORE',
          message: `Dimension "${dim}" has negative score (${score}).`,
          field: dim,
          suggestedFix: 'Set minimum score to 0.',
        });
      }
    }
    
    const scores = Object.values(dimensionScores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxDev = Math.max(...scores.map(s => Math.abs(s - avg)));
    
    if (maxDev > 50) {
      issues.push({
        severity: 'warning',
        category: 'scoring',
        code: 'HIGH_SCORE_VARIANCE',
        message: `Large variance detected across dimensions (max deviation: ${maxDev.toFixed(1)} from average ${avg.toFixed(1)}). This may indicate inconsistent responses.`,
        suggestedFix: 'AI advisory layer will analyze for potential data quality issues.',
      });
    }
  }
  
  return issues;
}

// ============================================
// LAYER 4: AI ADVISORY LAYER
// ============================================

export async function runAIAdvisoryValidation(
  assessment: Partial<FcAssessment>,
  responses: FcResponse[],
  questions: QuestionDefinition[],
  baseIssues: ValidationIssue[]
): Promise<AIValidationResult> {
  const guardrails = await getActiveGuardrails().catch(() => []);
  
  const responsesSummary = responses.map(r => {
    const q = questions.find(qn => qn.id === r.questionId);
    return {
      question: q?.questionText || r.questionId,
      answer: r.response,
      dimension: q?.dimension,
    };
  });
  
  const vendorContext = buildVendorBenchmarkContext(responses);
  
  const systemPrompt = `You are an AI validation advisor for FinanceCompass, a finance transformation assessment tool.
Your role is to validate assessment responses and scores for consistency, accuracy, and alignment with industry benchmarks.

GUARDRAILS TO ENFORCE:
${guardrails.map(g => `- ${g.name}: ${g.errorMessage}`).join('\n')}

VENDOR BENCHMARKS CONTEXT:
${vendorContext ? formatVendorContext(vendorContext) : 'No vendor selected'}

VALIDATION RULES:
1. Check for logical inconsistencies between responses
2. Validate scores against industry benchmarks (EPM comparison tool data)
3. Ensure timeline and cost estimates are realistic for selected vendors
4. Flag any responses that seem contradictory or implausible
5. Verify AI/ML capability claims align with technology maturity scores

CONFIDENCE LEVELS:
- 95-100%: High confidence - can auto-update scores if needed
- 70-94%: Medium confidence - flag for user review
- Below 70%: Low confidence - flag for admin review

Respond in JSON format:
{
  "confidence": <0-100>,
  "recommendation": "accept" | "flag_admin" | "flag_user" | "auto_update",
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "code": "<ISSUE_CODE>",
      "message": "<description>",
      "suggestedFix": "<fix if applicable>"
    }
  ],
  "suggestedScoreAdjustments": { "<dimension>": <adjusted_score> } or null,
  "narrative": "<brief explanation of validation findings>"
}`;

  const assessmentOverall = (assessment.overallMaturityScore ?? 0);
  const userPrompt = `Validate this FinanceCompass assessment:

ASSESSMENT SUMMARY:
- Overall Score: ${assessmentOverall || 'Not calculated'}
- Dimension Scores: ${JSON.stringify(assessment.dimensionScores || {})}
- Status: ${assessment.status}
- Size Band: ${assessment.sizeBand || 'Not specified'}

RESPONSES (${responses.length} total):
${JSON.stringify(responsesSummary.slice(0, 20), null, 2)}
${responses.length > 20 ? `... and ${responses.length - 20} more responses` : ''}

EXISTING ISSUES DETECTED:
${baseIssues.map(i => `- [${i.severity}] ${i.message}`).join('\n') || 'None'}

Please validate and provide your assessment.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty AI response");
    }
    
    const result = JSON.parse(content) as AIValidationResult;
    
    result.issues = (result.issues || []).map(issue => ({
      ...issue,
      category: 'ai_advisory' as const,
    }));
    
    if (result.confidence >= AI_CONFIDENCE_THRESHOLD && result.suggestedScoreAdjustments) {
      result.recommendation = 'auto_update';
    } else if (result.confidence < ANOMALY_DETECTION_THRESHOLD) {
      result.recommendation = 'flag_admin';
    }
    
    return result;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "AI validation error");
    return {
      confidence: 0,
      recommendation: 'flag_admin',
      issues: [{
        severity: 'warning',
        category: 'ai_advisory',
        code: 'AI_VALIDATION_FAILED',
        message: 'AI validation could not be completed. Manual review recommended.',
      }],
      narrative: 'AI validation encountered an error. Fallback to manual review.',
    };
  }
}

// ============================================
// ORCHESTRATOR - RUN ALL LAYERS
// ============================================

export async function runFullValidation(
  assessment: Partial<FcAssessment>,
  responses: FcResponse[],
  options: {
    includeAI?: boolean;
    estimatedTimeline?: number;
  } = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const allIssues: ValidationIssue[] = [];
  
  const questions = ALL_QUESTIONS;
  
  // Layer 1: Base Assessment Scoring
  const { dimensionScores, questionScores } = calculateBaseScores(responses, questions);
  
  // Layer 2: Fragmentation Checking
  const fragIssues = checkFragmentation(responses, questions);
  allIssues.push(...fragIssues);
  
  // Layer 2.5: Correlation Scoring (NEW)
  const correlationResult = calculateCorrelationScoring(dimensionScores);
  const { adjustedScores, adjustments, dimensionDetails, rootCauses } = correlationResult;
  
  // Add correlation-based issues
  for (const adjustment of adjustments) {
    if (adjustment.adjustment <= -5) {
      allIssues.push({
        severity: 'info',
        category: 'scoring',
        code: 'CORRELATION_PENALTY',
        message: `${adjustment.reason}: ${adjustment.sourceDimension} weakness is limiting ${adjustment.dimension} potential.`,
        field: adjustment.dimension,
      });
    }
  }
  
  // Add root cause issues
  for (const rc of rootCauses) {
    if (rc.pattern.priority === 'critical' || rc.pattern.priority === 'high') {
      allIssues.push({
        severity: rc.pattern.priority === 'critical' ? 'warning' : 'info',
        category: 'scoring',
        code: `ROOT_CAUSE_${rc.pattern.id.toUpperCase()}`,
        message: `Root cause detected: ${rc.pattern.name}. ${rc.pattern.description}`,
        suggestedFix: rc.pattern.recommendation,
      });
    }
  }
  
  // Layer 3: Business Rules Validation
  const ruleIssues = validateBusinessRules(assessment, responses, options.estimatedTimeline);
  allIssues.push(...ruleIssues);
  
  // Layer 4: AI Advisory Validation
  let aiValidation: AIValidationResult | undefined;
  if (options.includeAI !== false) {
    aiValidation = await runAIAdvisoryValidation(assessment, responses, questions, allIssues);
    allIssues.push(...aiValidation.issues);
  }
  
  // Calculate overall scores (both base and adjusted)
  const overallScore = Object.values(dimensionScores).length > 0
    ? Math.round(Object.values(dimensionScores).reduce((a, b) => a + b, 0) / Object.values(dimensionScores).length)
    : 0;
  
  const adjustedOverallScore = Object.values(adjustedScores).length > 0
    ? Math.round(Object.values(adjustedScores).reduce((a, b) => a + b, 0) / Object.values(adjustedScores).length)
    : 0;
  
  const hasCritical = allIssues.some(i => i.severity === 'critical');
  
  const vendorBenchmarkContext = buildVendorBenchmarkContext(responses);
  
  return {
    isValid: !hasCritical,
    overallScore,
    adjustedOverallScore,
    dimensionScores,
    adjustedDimensionScores: adjustedScores,
    dimensionDetails,
    correlationAdjustments: adjustments,
    rootCauses,
    issues: allIssues,
    aiValidation,
    vendorBenchmarkContext: vendorBenchmarkContext || undefined,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapCompanySizeToOrganizationBand(size: string): OrganizationSizeBand {
  const sizeMap: Record<string, OrganizationSizeBand> = {
    '50m_250m': 'smb',
    '250m_500m': 'mid_market',
    '500m_1b': 'mid_market',
    '1b_5b': 'enterprise',
    '5b_plus': 'large_enterprise',
    'under_50m': 'smb',
  };
  return sizeMap[size] || 'mid_market';
}

function formatOrgSize(size: OrganizationSizeBand): string {
  const labels: Record<OrganizationSizeBand, string> = {
    smb: 'SMB',
    mid_market: 'Mid-Market',
    enterprise: 'Enterprise',
    large_enterprise: 'Large Enterprise',
  };
  return labels[size] || size;
}

function buildVendorBenchmarkContext(responses: FcResponse[]): VendorBenchmarkContext | null {
  const vendorResponse = responses.find(r => r.questionId === 'q2_current_epm_vendor');
  const sizeResponse = responses.find(r => r.questionId === 'q1_company_size');
  
  if (!vendorResponse || !sizeResponse) return null;
  
  const vendorVal = vendorResponse.response as unknown;
  const vendors = Array.isArray(vendorVal) ? vendorVal : [vendorVal];
  
  const sizeVal = sizeResponse.response as string;
  const orgSize = mapCompanySizeToOrganizationBand(sizeVal);
  
  const selectedBenchmarks = vendors
    .map((v: unknown) => VENDOR_BENCHMARKS.find(b => b.id === String(v).toLowerCase()))
    .filter((b): b is VendorBenchmark => b !== undefined);
  
  if (selectedBenchmarks.length === 0) return null;
  
  const timelines = selectedBenchmarks.map((b: VendorBenchmark) => b.implementationTimeline[orgSize]);
  const costs = selectedBenchmarks.map((b: VendorBenchmark) => b.implementationCosts[orgSize]);
  
  return {
    selectedVendors: selectedBenchmarks.map((b: VendorBenchmark) => b.name),
    organizationSize: orgSize,
    expectedTimeline: {
      min: Math.max(...timelines.map(t => t.min)),
      max: Math.max(...timelines.map(t => t.max)),
      typical: Math.round(timelines.reduce((a, t) => a + (t.typical ?? (t.min + t.max) / 2), 0) / timelines.length),
    },
    expectedCost: {
      min: costs.reduce((a, c) => a + c.min, 0),
      max: costs.reduce((a, c) => a + c.max, 0),
      typical: costs.reduce((a, c) => a + (c.typical ?? (c.min + c.max) / 2), 0),
    },
    constraints: selectedBenchmarks.flatMap((b: VendorBenchmark) => b.considerations),
  };
}

function formatVendorContext(ctx: VendorBenchmarkContext): string {
  return `
Vendors: ${ctx.selectedVendors.join(', ')}
Organization Size: ${formatOrgSize(ctx.organizationSize)}
Expected Timeline: ${ctx.expectedTimeline.min}-${ctx.expectedTimeline.max} months (typical: ${ctx.expectedTimeline.typical})
Expected Cost: £${ctx.expectedCost.min}k-£${ctx.expectedCost.max}k (typical: £${ctx.expectedCost.typical}k)
Key Considerations:
${ctx.constraints.slice(0, 5).map((c: string) => `- ${c}`).join('\n')}
`;
}

// ============================================
// ADMIN NOTIFICATION INTERFACE
// ============================================

export interface AdminNotification {
  type: 'anomaly_detected' | 'validation_failed' | 'ai_low_confidence';
  assessmentId: string;
  severity: 'high' | 'medium' | 'low';
  summary: string;
  details: ValidationIssue[];
  aiConfidence?: number;
  timestamp: Date;
}

export function createAdminNotification(
  assessmentId: string,
  validationResult: ValidationResult
): AdminNotification | null {
  if (!validationResult.aiValidation) return null;
  
  const { aiValidation } = validationResult;
  
  if (aiValidation.recommendation === 'flag_admin' || aiValidation.confidence < ANOMALY_DETECTION_THRESHOLD) {
    return {
      type: aiValidation.confidence < 50 ? 'anomaly_detected' : 'ai_low_confidence',
      assessmentId,
      severity: aiValidation.confidence < 50 ? 'high' : 'medium',
      summary: `AI validation flagged assessment for review (${aiValidation.confidence}% confidence)`,
      details: validationResult.issues.filter(i => i.category === 'ai_advisory'),
      aiConfidence: aiValidation.confidence,
      timestamp: new Date(),
    };
  }
  
  const criticalIssues = validationResult.issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    return {
      type: 'validation_failed',
      assessmentId,
      severity: 'high',
      summary: `${criticalIssues.length} critical validation issue(s) detected`,
      details: criticalIssues,
      timestamp: new Date(),
    };
  }
  
  return null;
}

export function shouldAutoUpdateScores(aiValidation: AIValidationResult): boolean {
  return (
    aiValidation.confidence >= AI_CONFIDENCE_THRESHOLD &&
    aiValidation.recommendation === 'auto_update' &&
    aiValidation.suggestedScoreAdjustments !== undefined &&
    Object.keys(aiValidation.suggestedScoreAdjustments).length > 0
  );
}
