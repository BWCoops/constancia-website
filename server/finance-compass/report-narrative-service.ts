/**
 * FinanceCompass Report Narrative Service
 * 
 * Provides AI-driven dynamic content generation for PDF reports.
 * Uses multi-stage pipeline structure matching blog generation quality.
 * Implements consulting-grade guardrails with Big 4 professional standards.
 */

import OpenAI from "openai";
import pLimit from "p-limit";
import { createChildLogger } from "../lib/logger";
import type { 
  FcAssessment, 
  FcResponse,
  FcCompany,
  FCDimension
} from "@shared/finance-compass-schema";
import { DIMENSION_CONFIG } from "./question-bank";

const log = createChildLogger("report-narrative-service");
import { 
  generateEvidenceBasedGuidelines,
  formatVendorContextForAI,
  generateImplementationPhases,
  getAggregatedTimeline,
  getAggregatedImplementationCosts,
  getIndustryComplexity,
  STAKEHOLDER_CONTEXT,
  BENEFIT_CATEGORIES,
  detectSemanticPatterns,
  matchValueJourneyThemes,
  generateValueJourneyNarrative,
  CONFIDENCE_LEVELS,
  generateIndustryValueContext,
  generateStakeholderValueContext,
  generateTechnologyTrendContext,
  getIndustryValueProfile,
  getVendorMarketPosition,
  generateOpportunitiesContext,
  type ClientDiscoveryProfile,
  type PriorityContext,
  type ConfidenceLevel,
  type TimelinePhase,
  type IndustryComplexityProfile,
  type SemanticPattern
} from "./intelligence-engine";
import {
  calculateDimensionContributions,
  calculateSuggestedRoiInputs,
  DIMENSION_LABELS,
  BENEFIT_LABELS,
  type DimensionContribution,
  type SuggestedRoiInputs,
  type CanonicalDimension
} from "@shared/dimension-roi-mapping";
import {
  detectRootCauses,
  enhanceRootCauses,
  applyCorrelationAdjustments,
  scoreToMaturityLevel,
  STAKEHOLDER_FOCUS,
  CONFIDENCE_LEVEL_METADATA,
  getStakeholderRelevantDimensions,
  calculateRespondentConfidence,
  type EnhancedRootCause,
  type StakeholderType as CorrelationStakeholderType,
  type ConfidenceLevel as CorrelationConfidenceLevel,
} from "./correlation-matrix";
import {
  researchIndustryBenchmarks,
  factCheckContent,
  isPerplexityAvailable,
  type IndustryResearchResult,
  type FactCheckResult,
} from "./perplexity-service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const narrativeLimit = pLimit(2);
const AI_MODEL = "gpt-4o";

const narrativeCache = new Map<string, { content: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCacheKey(assessmentId: string, type: string): string {
  return `${assessmentId}:${type}`;
}

function getCached<T>(assessmentId: string, type: string): T | null {
  const key = getCacheKey(assessmentId, type);
  const cached = narrativeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.content as T;
  }
  return null;
}

function setCache(assessmentId: string, type: string, content: any): void {
  const key = getCacheKey(assessmentId, type);
  narrativeCache.set(key, { content, timestamp: Date.now() });
}

export function clearNarrativeCache(assessmentId: string): void {
  const prefix = `${assessmentId}:`;
  const keysToDelete = Array.from(narrativeCache.keys()).filter(key => key.startsWith(prefix));
  keysToDelete.forEach(key => narrativeCache.delete(key));
}

/**
 * Unified InsightContext for AI-driven report generation
 * Combines assessment data, benchmark timelines, industry profiles, and confidence levels
 * for consistent, data-driven narrative generation across all report sections.
 */
export interface InsightContext {
  assessment: {
    overallScore: number;
    readinessLevel: string;
    tier: string;
    sizeBand: string;
  };
  dimensionScores: Record<string, { score: number; gap: number; analysis?: string }>;
  confidenceFramework: {
    factPrefix: string;
    hypothesisPrefix: string;
    estimatePrefix: string;
    validationPrefix: string;
  };
  benchmarkTimeline: {
    min: number;
    max: number;
    typical: number;
    industryMultiplier: number;
    industryRationale: string;
  };
  implementationPhases: TimelinePhase[];
  implementationCosts: {
    min: number;
    max: number;
    typical: number;
  };
  industryProfile: {
    marginCategory: string;
    typicalMargin: { min: number; max: number };
    forecastImpactMultiplier: number;
    transformationValueDrivers: string[];
    keyEPMBenefits: string[];
    marketTrends: string[];
    regulatoryPressures: string[];
  };
  detectedPatterns: SemanticPattern[];
  valueJourneyThemes: { theme: { name: string; description: string; typicalTimeline: string }; relevanceScore: number; matchedTriggers: string[] }[];
  clientProfile?: ClientDiscoveryProfile;
  roiBenefits?: {
    dimensionContributions: DimensionContribution[];
    suggestedInputs: SuggestedRoiInputs;
    totalEstimatedBenefit: number;
  };
  // Phase 2-4 Integration: Enhanced Intelligence Features
  enhancedRootCauses?: EnhancedRootCause[];
  respondentConfidence?: {
    overall: number;
    breakdown: {
      roleConfidence: number;
      seniorityMultiplier: number;
      selfAssessment: number;
    };
    respondentRole?: string;
    respondentSeniority?: string;
  };
  confidenceLevelMetadata?: typeof CONFIDENCE_LEVEL_METADATA;
}

/**
 * Builds a unified InsightContext from assessment data for consistent AI prompt generation.
 * This ensures all report sections reference the same benchmark data and timelines.
 */
export function buildInsightContext(
  assessment: FcAssessment,
  dimensionScores: Record<string, { score: number; analysis?: string }>,
  company?: FcCompany | null,
  responses?: FcResponse[]
): InsightContext {
  const sizeBand = assessment.sizeBand || company?.sizeBand || 'mid_market';
  const sector = company?.sector || undefined;
  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
  const readinessLevel = overallScore >= 75 ? "advanced" : overallScore >= 50 ? "established" : overallScore >= 30 ? "developing" : "foundational";
  
  const benchmarkTimeline = getAggregatedTimeline(sizeBand, sector);
  const implementationCosts = getAggregatedImplementationCosts(sizeBand);
  const industryComplexity = getIndustryComplexity(sector);
  const industryValueProfile = getIndustryValueProfile(sector);
  
  const scoreMap = Object.fromEntries(
    Object.entries(dimensionScores).map(([k, v]) => [k, v.score])
  );
  
  const clientProfile = responses ? extractClientProfile(responses) : undefined;
  const implementationPhases = generateImplementationPhases(sizeBand, clientProfile, scoreMap, sector);
  const detectedPatterns = detectSemanticPatterns(scoreMap);
  const valueJourneyThemes = clientProfile ? matchValueJourneyThemes(clientProfile, scoreMap) : [];
  
  const dimensionScoresWithGaps = Object.fromEntries(
    Object.entries(dimensionScores).map(([dim, data]) => [
      dim,
      {
        score: data.score,
        gap: Math.max(0, 75 - data.score),
        analysis: data.analysis
      }
    ])
  );
  
  // Phase 2-4: Enhanced Root Cause Analysis with Remediation Paths
  const baseRootCauses = detectRootCauses(scoreMap);
  const enhancedRootCauses = enhanceRootCauses(baseRootCauses, scoreMap);
  
  // Phase 2: Respondent Confidence Calculation
  // Extract respondent role and seniority from responses or assessment
  const respondentRole = extractRespondentRole(responses) || 'fpa_manager';
  const respondentSeniority = extractRespondentSeniority(responses) || 'manager';
  const selfAssessmentScore = extractSelfAssessmentScore(responses);
  
  // Build RespondentContext for confidence calculation
  const respondentContext = {
    role: respondentRole as any,
    seniority: respondentSeniority as any,
    yearsInRole: 5, // Default assumption
    yearsAtCompany: 3, // Default assumption
    dimensionExpertise: selfAssessmentScore !== undefined 
      ? Object.fromEntries(Object.keys(scoreMap).map(d => [d, selfAssessmentScore]))
      : {},
  };
  
  // Calculate average confidence across all dimensions
  const dimensions = Object.keys(scoreMap) as any[];
  const confidenceScores = dimensions.map(dim => 
    calculateRespondentConfidence(respondentContext, dim)
  );
  const overallConfidence = confidenceScores.length > 0 
    ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
    : 50;
  
  return {
    assessment: {
      overallScore,
      readinessLevel,
      tier: assessment.tier || 'quick',
      sizeBand,
    },
    dimensionScores: dimensionScoresWithGaps,
    confidenceFramework: {
      factPrefix: CONFIDENCE_LEVELS.FACT.prefix,
      hypothesisPrefix: CONFIDENCE_LEVELS.HYPOTHESIS.prefix,
      estimatePrefix: CONFIDENCE_LEVELS.ESTIMATE.prefix,
      validationPrefix: CONFIDENCE_LEVELS.REQUIRES_DISCOVERY.prefix,
    },
    benchmarkTimeline: {
      min: benchmarkTimeline.min,
      max: benchmarkTimeline.max,
      typical: benchmarkTimeline.typical,
      industryMultiplier: benchmarkTimeline.industryMultiplier,
      industryRationale: benchmarkTimeline.industryRationale,
    },
    implementationPhases,
    implementationCosts: {
      min: implementationCosts.min,
      max: implementationCosts.max,
      typical: implementationCosts.typical,
    },
    industryProfile: {
      marginCategory: industryValueProfile.marginCategory,
      typicalMargin: industryValueProfile.typicalMargin,
      forecastImpactMultiplier: industryValueProfile.forecastImpactMultiplier,
      transformationValueDrivers: industryValueProfile.transformationValueDrivers,
      keyEPMBenefits: industryValueProfile.keyEPMBenefits,
      marketTrends: industryValueProfile.marketTrends,
      regulatoryPressures: industryValueProfile.regulatoryPressures,
    },
    detectedPatterns,
    valueJourneyThemes: valueJourneyThemes.slice(0, 4).map(vt => ({
      theme: {
        name: vt.theme.name,
        description: vt.theme.description,
        typicalTimeline: vt.theme.typicalTimeline,
      },
      relevanceScore: vt.relevanceScore,
      matchedTriggers: vt.matchedTriggers,
    })),
    clientProfile,
    roiBenefits: calculateRoiBenefitsContext(scoreMap, sizeBand),
    // Phase 2-4 Integration
    enhancedRootCauses,
    respondentConfidence: {
      overall: overallConfidence,
      breakdown: {
        roleConfidence: Math.round(confidenceScores.length > 0 
          ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
          : 50),
        seniorityMultiplier: respondentContext.seniority === 'director' || respondentContext.seniority === 'vp' ? 1.2 
          : respondentContext.seniority === 'c_suite' ? 1.3 
          : respondentContext.seniority === 'senior_manager' ? 1.1 
          : 1.0,
        selfAssessment: selfAssessmentScore ?? 0,
      },
      respondentRole,
      respondentSeniority,
    },
    confidenceLevelMetadata: CONFIDENCE_LEVEL_METADATA,
  };
}

/**
 * Extract respondent role from responses (pre-assessment question)
 */
function extractRespondentRole(responses?: FcResponse[]): string | undefined {
  if (!responses) return undefined;
  const roleResponse = responses.find(r => r.questionId === 'pre_role' || r.questionId === 'respondent_role');
  if (roleResponse?.response) {
    const response = roleResponse.response as any;
    return typeof response === 'string' ? response : response?.selectedOption;
  }
  return undefined;
}

/**
 * Extract respondent seniority from responses
 */
function extractRespondentSeniority(responses?: FcResponse[]): string | undefined {
  if (!responses) return undefined;
  const seniorityResponse = responses.find(r => r.questionId === 'pre_seniority' || r.questionId === 'respondent_seniority');
  if (seniorityResponse?.response) {
    const response = seniorityResponse.response as any;
    return typeof response === 'string' ? response : response?.selectedOption;
  }
  return undefined;
}

/**
 * Extract self-assessment score from responses (0-100)
 */
function extractSelfAssessmentScore(responses?: FcResponse[]): number | undefined {
  if (!responses) return undefined;
  const selfAssessResponse = responses.find(r => 
    r.questionId === 'self_assessment' || 
    r.questionId === 'pre_self_assessment' ||
    r.questionId === 'confidence_level'
  );
  if (selfAssessResponse?.response !== undefined && selfAssessResponse?.response !== null) {
    const response = selfAssessResponse.response as any;
    const value = typeof response === 'number' ? response : response?.sliderValue;
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
}

/**
 * Calculate ROI benefits context from dimension scores.
 * Links each dimension to specific financial benefit categories.
 */
function calculateRoiBenefitsContext(
  dimensionScores: Record<string, number>,
  sizeBand: string
): InsightContext['roiBenefits'] {
  const contributions = calculateDimensionContributions(dimensionScores, sizeBand);
  const suggestedInputs = calculateSuggestedRoiInputs(dimensionScores, sizeBand);
  
  return {
    dimensionContributions: contributions,
    suggestedInputs,
    totalEstimatedBenefit: suggestedInputs.totalEstimatedBenefit,
  };
}

/**
 * Formats the InsightContext into a comprehensive prompt section for AI generation.
 * Ensures consistent benchmark data and confidence language across all report sections.
 */
export function formatInsightContextForPrompt(ctx: InsightContext): string {
  const phasesSummary = ctx.implementationPhases.map(p => 
    `  - ${p.name}: Months ${p.monthRange.start + 1}-${p.monthRange.end} (${p.typicalBenefitPercentage}% of benefits typically realised)`
  ).join('\n');
  
  const gapsContext = Object.entries(ctx.dimensionScores)
    .filter(([_, data]) => data.gap > 15)
    .sort((a, b) => b[1].gap - a[1].gap)
    .slice(0, 3)
    .map(([dim, data]) => `  - ${dim.replace(/_/g, ' ')}: ${data.score}% (gap: ${data.gap} points to top-quartile)`)
    .join('\n');
  
  const patternsContext = ctx.detectedPatterns.length > 0 
    ? `STRATEGIC PATTERNS DETECTED:\n${ctx.detectedPatterns.map(p => `  - ${p.name} (${p.riskLevel} risk): ${p.implication}`).join('\n')}`
    : '';
  
  const valueJourneyContext = ctx.valueJourneyThemes.length > 0
    ? `VALUE JOURNEY THEMES:\n${ctx.valueJourneyThemes.map(vt => `  - ${vt.theme.name} (${vt.relevanceScore}% relevance): ${vt.theme.typicalTimeline}`).join('\n')}`
    : '';
  
  // Format ROI benefits context if available
  const roiBenefitsContext = ctx.roiBenefits ? formatRoiBenefitsForPrompt(ctx.roiBenefits) : '';
  
  // Phase 2-4: Format enhanced root causes with remediation paths
  const rootCausesContext = ctx.enhancedRootCauses && ctx.enhancedRootCauses.length > 0
    ? formatEnhancedRootCausesForPrompt(ctx.enhancedRootCauses)
    : '';
  
  // Phase 2: Format respondent confidence for prompt calibration
  const respondentConfidenceContext = ctx.respondentConfidence
    ? formatRespondentConfidenceForPrompt(ctx.respondentConfidence)
    : '';
  
  return `
=== UNIFIED INSIGHT CONTEXT (Benchmark-Grounded) ===

ASSESSMENT PROFILE:
- Overall EPM Readiness: ${ctx.assessment.overallScore}% (${ctx.assessment.readinessLevel})
- Assessment Tier: ${ctx.assessment.tier}
- Organisation Size Band: ${ctx.assessment.sizeBand}

PRIORITY DIMENSION GAPS:
${gapsContext}

VENDOR BENCHMARK TIMELINES (for organisations of this size and industry):
- Implementation Range: ${ctx.benchmarkTimeline.min}-${ctx.benchmarkTimeline.max} months
- Typical Duration: ${ctx.benchmarkTimeline.typical} months
- Industry Complexity Multiplier: ${ctx.benchmarkTimeline.industryMultiplier}x
- Industry Context: ${ctx.benchmarkTimeline.industryRationale}

IMPLEMENTATION PHASES (from vendor benchmarks):
${phasesSummary}

IMPLEMENTATION COST RANGE:
- Typical: £${ctx.implementationCosts.typical}k (range: £${ctx.implementationCosts.min}k - £${ctx.implementationCosts.max}k)

INDUSTRY VALUE PROFILE:
- Margin Category: ${ctx.industryProfile.marginCategory.replace(/_/g, ' ')}
- Typical Margin: ${ctx.industryProfile.typicalMargin.min}-${ctx.industryProfile.typicalMargin.max}%
- Forecast Impact Multiplier: ${ctx.industryProfile.forecastImpactMultiplier}x
- Key EPM Benefits: ${ctx.industryProfile.keyEPMBenefits.slice(0, 3).join('; ')}
- Market Trends: ${ctx.industryProfile.marketTrends.slice(0, 2).join('; ')}

${patternsContext}

${valueJourneyContext}

${roiBenefitsContext}

CONFIDENCE LANGUAGE GUIDANCE:
Use these natural prefixes to convey evidence basis (DO NOT use technical tags):
- For validated evidence: "${ctx.confidenceFramework.factPrefix}..."
- For advisory judgement: "${ctx.confidenceFramework.hypothesisPrefix}..."
- For benchmark-informed estimates: "${ctx.confidenceFramework.estimatePrefix}..."
- For areas requiring discovery: "${ctx.confidenceFramework.validationPrefix}..."

${rootCausesContext}

${respondentConfidenceContext}

CRITICAL REQUIREMENT: All timeline and cost references MUST use the exact figures above.
`;
}

/**
 * Phase 3: Format enhanced root causes with remediation paths for AI prompts
 */
function formatEnhancedRootCausesForPrompt(rootCauses: EnhancedRootCause[]): string {
  if (rootCauses.length === 0) return '';
  
  const formatted = rootCauses.map(rc => {
    const remediation = rc.remediationPaths?.[0]; // Use top remediation
    const remediationInfo = remediation 
      ? `\n    Recommended Action: ${remediation.description} (${remediation.effort} effort, ${remediation.timeframe})`
      : '';
    
    // Map pattern to human-readable name
    const patternLabels: Record<string, string> = {
      tech_fragmentation: "Technology Fragmentation",
      data_silos: "Data Silos",
      process_gaps: "Process Gaps",
      skills_deficit: "Skills Deficit",
      governance_weakness: "Governance Weakness",
      change_resistance: "Change Resistance",
    };
    
    const urgencyLevel = rc.urgencyScore >= 80 ? 'critical' : rc.urgencyScore >= 60 ? 'high' : 'moderate';
    const patternKey = rc.pattern.id as string;
    
    return `  - ${patternLabels[patternKey] || patternKey} (${urgencyLevel} urgency, ${rc.confidence}% confidence)
    Business Risk: ${rc.businessRisk}
    Affected Areas: ${rc.affectedDimensions.join(', ')}
    Effort to Resolve: ${rc.effortToResolve}${remediationInfo}`;
  }).join('\n\n');
  
  return `ENHANCED ROOT CAUSE ANALYSIS (Phase 3):
${formatted}

GUIDANCE: Use these identified root causes to provide targeted recommendations. 
Reference the confidence level when presenting findings.`;
}

/**
 * Phase 2: Format respondent confidence for prompt calibration
 */
function formatRespondentConfidenceForPrompt(confidence: NonNullable<InsightContext['respondentConfidence']>): string {
  const confidenceLevel = confidence.overall >= 90 ? 'Very High' 
    : confidence.overall >= 75 ? 'High'
    : confidence.overall >= 60 ? 'Moderate'
    : 'Lower';
    
  return `RESPONDENT CONFIDENCE CALIBRATION (Phase 2):
- Overall Confidence: ${confidence.overall}% (${confidenceLevel})
- Role: ${confidence.respondentRole || 'Not specified'} (expertise: ${confidence.breakdown.roleConfidence}%)
- Seniority: ${confidence.respondentSeniority || 'Not specified'} (multiplier: ${confidence.breakdown.seniorityMultiplier}x)
${confidence.breakdown.selfAssessment ? `- Self-Assessment: ${confidence.breakdown.selfAssessment}%` : ''}

GUIDANCE: Calibrate findings confidence based on respondent profile. 
${confidence.overall < 70 ? 'Consider flagging some findings as "Pending Validation" given moderate respondent confidence.' : 'High respondent confidence supports "Validated Evidence" claims.'}`;
}

/**
 * Format ROI benefits data for AI prompts.
 * Shows dimension contributions to specific benefit categories.
 */
function formatRoiBenefitsForPrompt(roiBenefits: NonNullable<InsightContext['roiBenefits']>): string {
  const { dimensionContributions, suggestedInputs, totalEstimatedBenefit } = roiBenefits;
  
  // Get top contributing dimensions
  const topDimensions = dimensionContributions
    .filter(d => d.totalContribution > 0)
    .slice(0, 5)
    .map(d => `  - ${d.label}: £${d.totalContribution}k potential (gap: ${d.gap} points)`)
    .join('\n');
  
  // Format benefit breakdown
  const benefitBreakdown = [
    `  - Process Efficiency: ${suggestedInputs.processEfficiencyPercent}% improvement potential`,
    `  - FTE Redeployment: ${suggestedInputs.headcountDelta} FTEs (£${Math.round(suggestedInputs.headcountDelta * 80)}k)`,
    `  - Close Acceleration: ${suggestedInputs.closeAccelerationDays} days faster (£${suggestedInputs.closeAccelerationValue}k)`,
    `  - Consulting Savings: £${suggestedInputs.externalConsultingSavings}k`,
    `  - Revenue Enablement: £${suggestedInputs.revenueEnablement}k`,
    `  - Compliance Risk Avoidance: £${suggestedInputs.complianceRiskAvoidance}k`,
    `  - Audit Efficiency: £${suggestedInputs.auditEfficiencySavings}k`,
  ].join('\n');
  
  return `DIMENSION-LINKED ROI BENEFITS (based on assessment gaps):
Total Estimated Annual Benefit: £${totalEstimatedBenefit}k

TOP VALUE-DRIVING DIMENSIONS:
${topDimensions}

BENEFIT CATEGORY BREAKDOWN:
${benefitBreakdown}

Use these dimension-specific insights to tailor recommendations and highlight where the organisation
will gain most value from transformation investments.`;
}

/**
 * Normalizes dimension scores from database format to the expected object format.
 * Database stores: { dimension: number } e.g., { "data_analytics": 69 }
 * Functions expect: { dimension: { score: number; analysis?: string } }
 * 
 * This handles both formats gracefully for backwards compatibility.
 */
export function normalizeDimensionScores(
  rawScores: unknown
): Record<string, { score: number; analysis?: string; recommendations?: string[] }> {
  if (!rawScores || typeof rawScores !== 'object') {
    return {};
  }
  
  const scores = rawScores as Record<string, unknown>;
  
  const normalized: Record<string, { score: number; analysis?: string; recommendations?: string[] }> = {};
  
  for (const [dimension, value] of Object.entries(scores)) {
    if (typeof value === 'number') {
      // Database format: { dimension: number }
      normalized[dimension] = { score: value };
    } else if (typeof value === 'object' && value !== null && 'score' in value) {
      // Already in expected format: { dimension: { score: number, ... } }
      normalized[dimension] = value as { score: number; analysis?: string; recommendations?: string[] };
    } else {
      log.warn({ dimension, value }, "Unexpected dimension score format");
      normalized[dimension] = { score: 0 };
    }
  }
  
  return normalized;
}

/**
 * Robustly extracts and parses JSON from AI response text.
 * Handles cases where AI includes text before/after JSON, markdown code blocks, or malformed responses.
 */
function extractJSON<T>(text: string): T | null {
  // Try to find JSON in markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]) as T;
    } catch (e) {
      // Continue to other extraction methods
    }
  }

  // Find the first { and manually balance braces to find the matching }
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }

  if (endIdx === -1) return null;

  const jsonStr = text.slice(startIdx, endIdx + 1);
  
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    // Try cleaning common issues: trailing commas, unescaped newlines in strings
    const cleaned = jsonStr
      .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
      .replace(/\n\s*\n/g, '\n');     // Collapse multiple newlines
    
    try {
      return JSON.parse(cleaned) as T;
    } catch (e2) {
      log.error({ err: e2 instanceof Error ? e2 : new Error(String(e2)) }, "JSON extraction failed");
      return null;
    }
  }
}

/**
 * Extracts client discovery profile from registration responses
 * Used to map pain points and ambitions to value journey themes
 */
export function extractClientProfile(responses: FcResponse[]): ClientDiscoveryProfile {
  const painPointsResponse = responses.find(r => r.questionId === "q1_pain_points");
  const prioritiesResponse = responses.find(r => r.questionId === "q1_priorities");
  const ambitionsResponse = responses.find(r => r.questionId === "q1_ambitions");
  const urgencyResponse = responses.find(r => r.questionId === "q1_urgency");
  const budgetResponse = responses.find(r => r.questionId === "q1_budget_availability");
  const buyInResponse = responses.find(r => r.questionId === "q1_stakeholder_buyin");
  
  const extractArray = (response: FcResponse | undefined): string[] => {
    if (!response?.response) return [];
    const value = response.response;
    if (Array.isArray(value)) return value.map(v => String(v));
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(v => String(v));
      } catch {
        return value.split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };
  
  const extractNumber = (response: FcResponse | undefined): number => {
    if (!response?.response) return 3;
    const value = response.response;
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseInt(value, 10) || 3;
    return 3;
  };
  
  const extractString = (response: FcResponse | undefined): string => {
    if (!response?.response) return "";
    const value = response.response;
    if (typeof value === "string") return value;
    return String(value);
  };
  
  return {
    painPoints: extractArray(painPointsResponse),
    priorities: extractArray(prioritiesResponse),
    ambitions: extractArray(ambitionsResponse),
    urgencyLevel: extractNumber(urgencyResponse),
    budgetReadiness: extractString(budgetResponse),
    stakeholderBuyIn: extractNumber(buyInResponse),
  };
}

/**
 * Generates value journey context for AI prompts based on client profile
 */
export function generateValueJourneyContext(
  clientProfile: ClientDiscoveryProfile,
  dimensionScores: Record<string, number>
): string {
  const matchedThemes = matchValueJourneyThemes(clientProfile, dimensionScores);
  const narrative = generateValueJourneyNarrative(clientProfile, matchedThemes);
  
  let context = `
CLIENT DISCOVERY PROFILE:
- Pain Points: ${clientProfile.painPoints.join(", ") || "Not specified"}
- Strategic Priorities: ${clientProfile.priorities.join(", ") || "Not specified"}
- 3-Year Ambitions: ${clientProfile.ambitions.join(", ") || "Not specified"}
- Urgency Level: ${clientProfile.urgencyLevel}/5
- Budget Readiness: ${clientProfile.budgetReadiness || "Not specified"}
- Stakeholder Buy-in: ${clientProfile.stakeholderBuyIn}/5

MATCHED VALUE JOURNEY THEMES (ranked by relevance):
`;
  
  for (const { theme, relevanceScore, matchedTriggers } of matchedThemes.slice(0, 4)) {
    const confidenceLabel = CONFIDENCE_LEVELS[theme.confidenceLevel].consultingLabel;
    context += `
- ${theme.name} (Relevance: ${relevanceScore}%, Confidence: ${confidenceLabel})
  Matched triggers: ${matchedTriggers.join(", ")}
  Expected outcomes: ${theme.expectedOutcomes.slice(0, 2).join("; ")}
  Indicative timeline: ${theme.typicalTimeline}
`;
  }
  
  context += `
CRITICAL INSTRUCTION FOR NARRATIVE GENERATION:
Build the transformation narrative around the client's stated pain points and ambitions.
Reference their specific challenges when making recommendations.
Use "Based on the challenges you've identified..." and "Aligned with your ambition to..." framing.
DO NOT generate generic best-practice recommendations that ignore their stated priorities.
`;
  
  return context;
}

const UK_SPELLING_MAP: Record<string, string> = {
  "organization": "organisation",
  "organizations": "organisations",
  "organizational": "organisational",
  "analyze": "analyse",
  "analyzed": "analysed",
  "analyzing": "analysing",
  "optimize": "optimise",
  "optimized": "optimised",
  "optimizing": "optimising",
  "optimization": "optimisation",
  "realize": "realise",
  "realized": "realised",
  "realizing": "realising",
  "recognize": "recognise",
  "recognized": "recognised",
  "recognizing": "recognising",
  "color": "colour",
  "behavior": "behaviour",
  "behavioral": "behavioural",
  "program": "programme",
  "programs": "programmes",
  "honor": "honour",
  "favor": "favour",
  "favorable": "favourable",
  "center": "centre",
  "centered": "centred",
  "meter": "metre",
  "theater": "theatre",
  "traveled": "travelled",
  "traveling": "travelling",
  "modeled": "modelled",
  "modeling": "modelling",
  "labeled": "labelled",
  "labeling": "labelling",
  "canceled": "cancelled",
  "canceling": "cancelling",
  "signaling": "signalling",
  "focused": "focussed",
  "focusing": "focussing",
  "utilizing": "utilising",
  "utilize": "utilise",
  "utilized": "utilised",
  "maximize": "maximise",
  "maximized": "maximised",
  "maximizing": "maximising",
  "minimize": "minimise",
  "minimized": "minimised",
  "minimizing": "minimising",
  "prioritize": "prioritise",
  "prioritized": "prioritised",
  "prioritizing": "prioritising",
  "standardize": "standardise",
  "standardized": "standardised",
  "customize": "customise",
  "customized": "customised",
  "centralize": "centralise",
  "centralized": "centralised",
  "finalize": "finalise",
  "finalized": "finalised",
  "strategize": "strategise",
  "digitize": "digitise",
  "digitized": "digitised",
  "modernize": "modernise",
  "modernized": "modernised",
};

const VENDOR_BLOCKLIST = [
  "SAP", "Oracle", "NetSuite", "Microsoft Dynamics", "Dynamics 365", 
  "Infor", "Deltek", "Sage", "Epicor", "IFS",
  "Anaplan", "OneStream", "Prophix", "Host Analytics", "Adaptive Insights",
  "Vena", "Planful", "Jedox", "Board", "Workiva",
  "Tableau", "Power BI", "Looker", "QlikView", "Qlik Sense", 
  "MicroStrategy", "Sisense", "Domo", "ThoughtSpot",
  "UiPath", "Automation Anywhere", "Blue Prism",
  "Talend", "Informatica", "Jitterbit", "Zapier", "MuleSoft",
  "Workday", "Coupa", "Ariba", "Concur", "BlackLine",
];

const BANNED_WORDS = [
  "delve", "delving", "delved",
  "dive deep", "diving deep", "deep dive",
  "unlock", "unlocking", "unlocked",
  "unleash", "unleashing", "unleashed",
  "harness", "harnessing", "harnessed",
  "leverage", "leveraging", "leveraged",
  "pivotal", "paradigm", "paradigm shift",
  "synergy", "synergies", "synergistic",
  "crucial", "paramount",
  "seamless", "seamlessly",
  "robust", "robustly",
  "holistic", "holistically",
  "streamline", "streamlined", "streamlining",
  "cutting-edge", "state-of-the-art",
  "game-changing", "game-changer",
  "best-in-class", "world-class",
  "low-hanging fruit",
  "move the needle",
  "circle back",
  "touch base",
  "boil the ocean",
];

const BANNED_PHRASES = [
  "In today's fast-paced",
  "In the realm of",
  "When it comes to",
  "It's worth noting",
  "Moreover,",
  "Furthermore,",
  "Additionally,",
  "In conclusion,",
  "To summarize,",
  "At the end of the day",
  "Going forward",
  "Moving forward",
  "As we move forward",
  "In this day and age",
  "The fact of the matter is",
  "It goes without saying",
  "Needless to say",
  "Let's be honest",
  "To be honest",
  "Frankly speaking",
  "Here's the thing",
  "Look,",
  "So,",
  "Now,",
  "Right?",
  "You know,",
];

interface GuardrailResult {
  text: string;
  violations: string[];
}

function enforceGuardrails(text: string): GuardrailResult {
  let result = text;
  const violations: string[] = [];
  
  for (const [us, uk] of Object.entries(UK_SPELLING_MAP)) {
    const regex = new RegExp(`\\b${us}\\b`, 'gi');
    result = result.replace(regex, uk);
  }
  
  for (const vendor of VENDOR_BLOCKLIST) {
    const regex = new RegExp(`\\b${vendor}\\b`, 'gi');
    if (regex.test(result)) {
      violations.push(`Replaced vendor name: "${vendor}"`);
      result = result.replace(regex, 'an appropriate enterprise solution');
    }
  }
  
  const textLower = result.toLowerCase();
  for (const banned of BANNED_WORDS) {
    if (textLower.includes(banned.toLowerCase())) {
      violations.push(`Contains banned word: "${banned}"`);
    }
  }
  
  for (const phrase of BANNED_PHRASES) {
    if (textLower.includes(phrase.toLowerCase())) {
      violations.push(`Contains banned phrase: "${phrase}"`);
    }
  }
  
  result = result.replace(/[^\x00-\x7F]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x1F600 && code <= 0x1F64F) return '';
    if (code >= 0x1F300 && code <= 0x1F5FF) return '';
    if (code >= 0x1F680 && code <= 0x1F6FF) return '';
    return char;
  });
  result = result.replace(/!+/g, '.').replace(/\?{2,}/g, '?');
  result = result.replace(/\s{2,}/g, ' ').trim();
  
  return { text: result, violations };
}

function validateContent(text: string): { passed: boolean; violations: string[] } {
  const violations: string[] = [];
  const textLower = text.toLowerCase();
  
  for (const banned of BANNED_WORDS) {
    if (textLower.includes(banned.toLowerCase())) {
      violations.push(`Contains banned word: "${banned}"`);
    }
  }
  
  for (const phrase of BANNED_PHRASES) {
    if (textLower.includes(phrase.toLowerCase())) {
      violations.push(`Contains banned phrase: "${phrase}"`);
    }
  }
  
  for (const vendor of VENDOR_BLOCKLIST) {
    if (text.includes(vendor)) {
      violations.push(`Contains vendor name: "${vendor}"`);
    }
  }
  
  return { passed: violations.length === 0, violations };
}

interface ContentQualityResult {
  isAcceptable: boolean;
  violations: string[];
  severeViolations: string[];
  requiresRegeneration: boolean;
}

function validateContentQuality(text: string, violations: string[]): ContentQualityResult {
  const severeViolations: string[] = [];
  
  for (const v of violations) {
    if (v.includes("vendor name")) {
      severeViolations.push(v);
    }
  }
  
  const requiresRegeneration = severeViolations.length > 3;
  
  if (violations.length > 0) {
    log.info({ violationCount: violations.length, violations: violations.slice(0, 5) }, "Content quality check violations found");
  }
  
  return {
    isAcceptable: severeViolations.length === 0,
    violations,
    severeViolations,
    requiresRegeneration,
  };
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || String(error);
      
      if (
        errorMsg.includes("529") || 
        errorMsg.includes("overloaded") || 
        errorMsg.includes("rate") ||
        errorMsg.includes("429") ||
        errorMsg.includes("RATELIMIT_EXCEEDED") ||
        errorMsg.toLowerCase().includes("quota")
      ) {
        const delay = initialDelay * Math.pow(2, attempt);
        log.info({ delayMs: delay, attempt: attempt + 1, maxRetries }, "AI rate limited, retrying");
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

const CONSULTING_PERSONA = `You are a Senior Partner at a top-tier management consulting firm (McKinsey, Bain, BCG, Deloitte calibre) producing consulting-grade reports for CFOs and senior finance executives.

=== PROFESSIONAL CONSULTING FIRM WRITING STYLE ===

TONE & VOICE:
- Write in a formal, authoritative, professional tone throughout
- Use the voice of a trusted adviser presenting findings to the board
- Be direct and confident in assertions, but support with evidence
- Avoid casual, conversational, or informal language entirely

UK ENGLISH (MANDATORY):
organisation, programme, analyse, optimise, colour, behaviour, centre, recognise, realise, favour, honour, travelled, focussed, utilise, maximise, minimise, prioritise, standardise, customise, centralise, finalise

RESEARCH-BASED LANGUAGE PATTERNS:
- "Our analysis indicates..."
- "Research demonstrates..."
- "Evidence suggests..."
- "Based on industry benchmarks..."
- "Cross-industry data shows..."
- "Assessment findings reveal..."

BANNED INFORMAL ELEMENTS:
- NEVER use: "Here's the thing:", "Look,", "Frankly,", "To be fair,", "By the way,"
- NEVER use casual rhetorical questions like "Why?" or "Sound familiar?"
- NEVER use idioms or colloquialisms
- NEVER use fragments as sentences or exclamation marks

BANNED WORDS (never use these):
delve, dive deep, unlock, unleash, harness, leverage, pivotal, paradigm, synergy, crucial, paramount, seamless, robust, holistic, streamline, cutting-edge, state-of-the-art, game-changing

SENTENCE VARIETY (anti-AI detection):
- NEVER write 3+ sentences in a row with similar length or structure
- Alternate dramatically: "Short punch." followed by "Then a longer, more nuanced explanation that builds context."
- Vary paragraph lengths between 2-5 sentences
- Use a mix of simple, compound, and complex sentence structures

SPECIFIC NUMBERS AND METRICS:
- Include specific percentages: "approximately 23%", "around 67%"
- Reference timeframes: "typically 3-4 months", "within 6-8 weeks"
- Use currency where relevant: "approximately £2.4 million", "around £150,000"
- Quote assessment scores directly where appropriate

CRITICAL GUARDRAILS:
1. NEVER mention specific vendor names (Oracle, SAP, Anaplan, etc.) - use "EPM platform" or "enterprise solution"
2. NEVER guarantee specific ROI figures without qualification
3. ALWAYS frame recommendations as "considerations" or "opportunities"
4. ALWAYS acknowledge transformation complexity and change management needs
5. Generate specific, actionable recommendations - not generic advice
6. NEVER claim direct client work: Do NOT use "we've worked with CFOs", "our clients", "in our work with clients"
7. NEVER use technical confidence tags like [FACT], [HYPOTHESIS], [ESTIMATE], or percentage confidence indicators like "(75%)" in the output

INSIGHT PRESENTATION STYLE:
Instead of using tags, present insights using natural consulting language that conveys confidence through word choice:
- For evidence-based facts: "Your assessment confirms...", "The data shows...", "You reported..."
- For pattern-based inferences: "Based on your responses, it appears...", "The assessment suggests...", "This indicates..."
- For benchmark comparisons: "Peer organisations typically...", "Industry benchmarks suggest...", "Comparable organisations achieve..."
- For areas needing exploration: "Further analysis would clarify...", "This warrants deeper exploration in...", "Discovery engagement would validate..."

Write with the confidence of a senior consultant - insights should flow naturally without explicit confidence labelling.`;

interface SectionTemplate {
  name: string;
  minWords: number;
  instructions: string;
}

const SECTION_TEMPLATES: Record<string, SectionTemplate> = {
  executive_summary: {
    name: "Executive Summary",
    minWords: 200,
    instructions: `Write a compelling executive summary that:
- Opens with a powerful, contextual statement about the organisation's assessment results
- Synthesises 3-4 key insights specific to their situation with quantified findings
- Provides strategic context linking findings to business impact
- Concludes with a clear call to action for next steps
- Uses specific numbers from the assessment (scores, percentages, gaps)
- Avoids generic statements - every sentence should be tailored to this assessment`,
  },
  dimension_narrative: {
    name: "Dimension Analysis",
    minWords: 150,
    instructions: `For each dimension, provide:
- A concise 2-3 sentence narrative explaining what the score means in practical terms
- 2-3 specific strengths observed (not generic platitudes)
- 2-3 concrete improvement areas with clear rationale
- 2-3 actionable recommendations that are specific and measurable
- Reference the actual score and maturity level throughout
- Compare to industry benchmarks where relevant`,
  },
  key_findings: {
    name: "Key Findings & Gaps",
    minWords: 250,
    instructions: `Present findings as a senior consultant would to a CFO:
- Lead with the most impactful finding first
- Quantify each finding with specific data points
- Categorise by impact level (high/medium/low) with clear rationale
- Identify specific gaps between current and target state
- Include evidence points that support each finding
- Prioritise findings by urgency and business impact`,
  },
  action_plan: {
    name: "Prioritised Action Plan",
    minWords: 300,
    instructions: `Create a structured, phased action plan:
- Open with a 2-3 sentence summary of the recommended transformation approach
- Organise actions into clear phases with timeframes
- For each action item include: priority, effort level, expected benefit, dependencies
- Identify 2-3 "quick wins" (low effort, high impact) for early momentum
- Identify 2-3 "strategic initiatives" for transformational change
- Include an implementation timeline with specific milestones
- Be specific about resource requirements and success metrics`,
  },
  benchmarks: {
    name: "Industry Benchmarks",
    minWords: 150,
    instructions: `Provide contextual benchmark analysis:
- Compare organisation metrics against industry medians and top quartile
- Explain positioning in business terms (not just numbers)
- Highlight specific gaps to top-quartile performance
- Include sector-specific context where relevant
- Frame insights around competitive positioning`,
  },
};

async function callAI(systemPrompt: string, userPrompt: string, maxTokens: number = 2048): Promise<string> {
  const response = await retryWithBackoff(async () => {
    const result = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });
    return result;
  });
  
  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No text response from AI");
  }
  
  const guardrailResult = enforceGuardrails(textContent);
  
  if (guardrailResult.violations.length > 0) {
    validateContentQuality(guardrailResult.text, guardrailResult.violations);
  }
  
  return guardrailResult.text;
}

export interface DataSynthesis {
  organisationProfile: string;
  strengthsSummary: string;
  gapsSummary: string;
  strategicContext: string;
  dimensionInsights: Record<string, string>;
  priorityAreas: string[];
  quickWinOpportunities: string[];
}

async function synthesizeAssessmentData(
  assessment: FcAssessment,
  responses: FcResponse[],
  dimensionScores: Record<string, { score: number; analysis?: string; recommendations?: string[] }>,
  company?: FcCompany | null
): Promise<DataSynthesis> {
  const cacheKey = 'data_synthesis';
  const cached = getCached<DataSynthesis>(assessment.id, cacheKey);
  if (cached) return cached;

  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
  const readinessLevel = overallScore >= 75 ? "advanced" : overallScore >= 50 ? "established" : overallScore >= 30 ? "developing" : "foundational";
  
  const sortedDimensions = Object.entries(dimensionScores)
    .sort((a, b) => b[1].score - a[1].score);
  
  const strongest = sortedDimensions.slice(0, 2);
  const weakest = sortedDimensions.slice(-3).reverse();
  
  // Response details are already captured in dimension scores - no need to map here

  const synthesisPrompt = `Synthesise this EPM assessment data into a comprehensive analysis document.

ORGANISATION PROFILE:
- Company: ${company?.name || 'Organisation'}
- Sector: ${company?.sector || 'Not specified'}
- Size Band: ${assessment.sizeBand || company?.sizeBand || 'Not specified'}
- Finance Cost Percentage: ${company?.financeCostPercentage || 'Not specified'}%

ASSESSMENT RESULTS:
- Overall EPM Readiness Score: ${overallScore}%
- Readiness Level: ${readinessLevel}
- Assessment Tier: ${assessment.tier}
- Number of Questions Answered: ${responses.length}

DIMENSION SCORES (sorted by performance):
${sortedDimensions.map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%${data.analysis ? ` | ${data.analysis}` : ''}`).join('\n')}

STRONGEST AREAS:
${strongest.map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%`).join('\n')}

WEAKEST AREAS (priority for improvement):
${weakest.map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%`).join('\n')}

Create a synthesis document that:
1. Provides organisational context and strategic profile
2. Summarises key strengths in specific, actionable terms
3. Identifies gaps with quantified impact potential
4. Offers strategic context linking assessment to business outcomes
5. Generates insight narratives for each dimension
6. Identifies priority transformation areas
7. Spots quick-win opportunities for early momentum

Return JSON:
{
  "organisationProfile": "2-3 sentence profile of the organisation's finance function maturity",
  "strengthsSummary": "2-3 sentence summary of core strengths with specific references",
  "gapsSummary": "2-3 sentence summary of critical gaps requiring attention",
  "strategicContext": "2-3 sentences on strategic implications for business performance",
  "dimensionInsights": {
    "dimension_name": "1-2 sentence insight for this specific dimension"
  },
  "priorityAreas": ["area1", "area2", "area3"],
  "quickWinOpportunities": ["opportunity1", "opportunity2", "opportunity3"]
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, synthesisPrompt, 2048));
    const synthesis = extractJSON<DataSynthesis>(result);
    if (synthesis) {
      setCache(assessment.id, cacheKey, synthesis);
      return synthesis;
    }
    log.warn("Data synthesis: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Data synthesis error");
  }

  const fallbackSynthesis: DataSynthesis = {
    organisationProfile: `The organisation demonstrates ${readinessLevel} finance transformation readiness with an overall readiness score of ${overallScore}%. Based on the assessment of ${responses.length} capability areas, there are clear opportunities to enhance finance function performance.`,
    strengthsSummary: `Strongest capabilities observed in ${strongest[0]?.[0]?.replace(/_/g, ' ') || 'core processes'} at ${strongest[0]?.[1]?.score || 0}% and ${strongest[1]?.[0]?.replace(/_/g, ' ') || 'supporting functions'} at ${strongest[1]?.[1]?.score || 0}%.`,
    gapsSummary: `Priority improvement areas identified in ${weakest[0]?.[0]?.replace(/_/g, ' ') || 'key dimensions'} (${weakest[0]?.[1]?.score || 0}%) which presents the greatest opportunity for performance enhancement.`,
    strategicContext: `Addressing the identified capability gaps would position the finance function to deliver improved business insights and operational efficiency. The assessment indicates a clear transformation pathway from current ${readinessLevel} to target maturity.`,
    dimensionInsights: Object.fromEntries(
      Object.entries(dimensionScores).map(([dim, data]) => [
        dim,
        `${dim.replace(/_/g, ' ')} scored ${data.score}%, indicating ${data.score >= 70 ? 'strong' : data.score >= 50 ? 'developing' : 'foundational'} capability in this area.`
      ])
    ),
    priorityAreas: weakest.slice(0, 3).map(([dim]) => dim.replace(/_/g, ' ')),
    quickWinOpportunities: [
      "Process documentation and standardisation",
      "Quick wins in automation of manual tasks",
      "Enhanced reporting and dashboard capabilities"
    ],
  };
  setCache(assessment.id, cacheKey, fallbackSynthesis);
  return fallbackSynthesis;
}

export interface ReportStructure {
  sections: ReportSection[];
  emphasisAreas: string[];
  priorityOrder: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  include: boolean;
  priority: number;
  narrativeType: "ai_generated" | "data_driven" | "hybrid";
}

export async function generateReportStructure(
  assessment: FcAssessment,
  responses: FcResponse[],
  company?: FcCompany | null
): Promise<ReportStructure> {
  const cached = getCached<ReportStructure>(assessment.id, 'structure');
  if (cached) return cached;
  
  const dimensionScores = normalizeDimensionScores(assessment.dimensionScores);
  const weakestDimensions = Object.entries(dimensionScores)
    .sort((a, b) => (a[1].score || 0) - (b[1].score || 0))
    .slice(0, 3)
    .map(([dim]) => dim);
  
  const strongestDimensions = Object.entries(dimensionScores)
    .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
    .slice(0, 2)
    .map(([dim]) => dim);

  const prompt = `Based on this EPM assessment profile, determine the optimal report structure:

Assessment Tier: ${assessment.tier}
EPM Readiness Score: ${assessment.epmReadinessScore || 'N/A'}%
Overall Maturity: ${assessment.overallMaturityScore || 'N/A'}
Weakest Dimensions: ${weakestDimensions.join(', ') || 'Not assessed'}
Strongest Dimensions: ${strongestDimensions.join(', ') || 'Not assessed'}
Company Size Band: ${assessment.sizeBand || company?.sizeBand || 'Not specified'}
Number of Responses: ${responses.length}

Determine which report sections to emphasise and their priority order.

Return JSON:
{
  "sections": [
    {"id": "cover", "title": "Cover Page", "include": true, "priority": 1, "narrativeType": "data_driven"},
    {"id": "executive_summary", "title": "Executive Summary", "include": true, "priority": 2, "narrativeType": "ai_generated"},
    {"id": "readiness_score", "title": "EPM Readiness Score", "include": true, "priority": 3, "narrativeType": "hybrid"},
    {"id": "dimension_analysis", "title": "Dimension Analysis", "include": true, "priority": 4, "narrativeType": "ai_generated"},
    {"id": "key_findings", "title": "Key Findings & Gaps", "include": true, "priority": 5, "narrativeType": "ai_generated"},
    {"id": "recommendations", "title": "Prioritised Recommendations", "include": true, "priority": 6, "narrativeType": "ai_generated"},
    {"id": "quick_wins", "title": "Quick Wins", "include": true, "priority": 7, "narrativeType": "ai_generated"},
    {"id": "action_plan", "title": "Action Plan", "include": true, "priority": 8, "narrativeType": "ai_generated"},
    {"id": "benchmarks", "title": "Industry Benchmarks", "include": true, "priority": 9, "narrativeType": "hybrid"},
    {"id": "next_steps", "title": "Next Steps & CTA", "include": true, "priority": 10, "narrativeType": "data_driven"}
  ],
  "emphasisAreas": ["dimension1", "dimension2"],
  "priorityOrder": ["section_id1", "section_id2"]
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 1024));
    const structure = extractJSON<ReportStructure>(result);
    if (structure) {
      setCache(assessment.id, 'structure', structure);
      return structure;
    }
    log.warn("Structure generation: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Structure generation error");
  }
  
  const fallback: ReportStructure = {
    sections: [
      { id: "cover", title: "Cover Page", include: true, priority: 1, narrativeType: "data_driven" },
      { id: "executive_summary", title: "Executive Summary", include: true, priority: 2, narrativeType: "ai_generated" },
      { id: "readiness_score", title: "EPM Readiness Score", include: true, priority: 3, narrativeType: "hybrid" },
      { id: "dimension_analysis", title: "Dimension Analysis", include: true, priority: 4, narrativeType: "ai_generated" },
      { id: "key_findings", title: "Key Findings & Gaps", include: true, priority: 5, narrativeType: "ai_generated" },
      { id: "recommendations", title: "Prioritised Recommendations", include: true, priority: 6, narrativeType: "ai_generated" },
      { id: "quick_wins", title: "Quick Wins", include: true, priority: 7, narrativeType: "ai_generated" },
      { id: "action_plan", title: "Action Plan", include: true, priority: 8, narrativeType: "ai_generated" },
      { id: "benchmarks", title: "Industry Benchmarks", include: true, priority: 9, narrativeType: "hybrid" },
      { id: "next_steps", title: "Next Steps & CTA", include: true, priority: 10, narrativeType: "data_driven" },
    ],
    emphasisAreas: weakestDimensions,
    priorityOrder: ["executive_summary", "readiness_score", "dimension_analysis", "recommendations"],
  };
  setCache(assessment.id, 'structure', fallback);
  return fallback;
}

export interface ExecutiveSummaryNarrative {
  opening: string;
  keyInsights: string[];
  strategicContext: string;
  implementationOutlook: string;
  callToAction: string;
  isFallback?: boolean;
}

export async function generateExecutiveSummary(
  assessment: FcAssessment,
  dimensionScores: Record<string, { score: number; analysis?: string }>,
  company?: FcCompany | null,
  synthesis?: DataSynthesis | null,
  responses?: FcResponse[]
): Promise<ExecutiveSummaryNarrative> {
  const cacheKey = 'executive_summary';
  const cached = getCached<ExecutiveSummaryNarrative>(assessment.id, cacheKey);
  if (cached) return cached;

  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
  const readinessLevel = overallScore >= 75 ? "advanced" : overallScore >= 50 ? "established" : overallScore >= 30 ? "developing" : "foundational";
  
  const sortedDimensions = Object.entries(dimensionScores).sort((a, b) => b[1].score - a[1].score);
  const weakest = sortedDimensions.slice(-2).reverse();
  const strongest = sortedDimensions.slice(0, 2);

  const template = SECTION_TEMPLATES.executive_summary;

  // Build unified InsightContext for consistent benchmark data across all sections
  const insightContext = buildInsightContext(assessment, dimensionScores, company, responses);
  const insightContextPrompt = formatInsightContextForPrompt(insightContext);
  
  // Get dynamic guidelines based on organisation size
  const sizeBand = assessment.sizeBand || company?.sizeBand || 'mid_market';
  const evidenceGuidelines = generateEvidenceBasedGuidelines(sizeBand);
  const vendorContext = formatVendorContextForAI(sizeBand);
  
  // Detect semantic patterns across dimensions
  const scoreMap = Object.fromEntries(
    Object.entries(dimensionScores).map(([k, v]) => [k, v.score])
  );
  const detectedPatterns = detectSemanticPatterns(scoreMap);

  // Generate industry-specific context for AI prompts
  const sector = company?.sector || undefined;
  const industryValueContext = generateIndustryValueContext(sector);
  const industryProfile = getIndustryValueProfile(sector);
  
  // Get current vendor/tool information for technology trend analysis
  const currentVendor = (assessment as any).currentEpmVendor || (company as any)?.currentEpmVendor || undefined;
  const technologyTrendContext = generateTechnologyTrendContext(currentVendor);
  const vendorPosition = getVendorMarketPosition(currentVendor);
  
  // Technology trend flag for declining platforms
  const technologyTrendFlag = vendorPosition?.marketTrend === 'declining' 
    ? `\n\nCRITICAL TECHNOLOGY FLAG: The current platform (${vendorPosition.vendorName}) shows DECLINING market trajectory. This should be prominently flagged in the summary as a strategic consideration.`
    : '';

  // Format implementation phases for the outlook section
  const phaseSummary = insightContext.implementationPhases
    .map(p => `Months ${p.monthRange.start + 1}-${p.monthRange.end}: ${p.name}`)
    .join(', ');

  const prompt = `Generate a personalised executive summary for this finance transformation assessment report.

${template.instructions}

${insightContextPrompt}

${evidenceGuidelines}

${vendorContext}

${industryValueContext}

${technologyTrendContext}
${technologyTrendFlag}

MINIMUM WORD COUNT: ${template.minWords} words

ORGANISATION PROFILE:
- Organisation: ${company?.name || 'The organisation'}
- Sector: ${company?.sector || 'Not specified'}
- Revenue Band: ${sizeBand}
- EPM Readiness Score: ${overallScore}%
- Readiness Level: ${readinessLevel}
- Industry Margin Profile: ${industryProfile.marginCategory} (${industryProfile.typicalMargin.min}-${industryProfile.typicalMargin.max}%)
- Forecast Impact Multiplier: ${industryProfile.forecastImpactMultiplier}x (${industryProfile.forecastImpactMultiplier >= 2.0 ? 'HIGH impact - small forecast improvements significantly affect profitability' : industryProfile.forecastImpactMultiplier >= 1.5 ? 'MEDIUM impact' : 'Standard impact'})

DIMENSION SCORES:
${Object.entries(dimensionScores).map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%`).join('\n')}

STRONGEST AREAS: ${strongest.map(s => `${s[0].replace(/_/g, ' ')} (${s[1].score}%)`).join(', ')}
WEAKEST AREAS: ${weakest.map(w => `${w[0].replace(/_/g, ' ')} (${w[1].score}%)`).join(', ')}

IMPLEMENTATION TIMELINE CONTEXT (from vendor benchmarks):
- Typical implementation duration: ${insightContext.benchmarkTimeline.typical} months (range: ${insightContext.benchmarkTimeline.min}-${insightContext.benchmarkTimeline.max} months)
- Industry complexity multiplier: ${insightContext.benchmarkTimeline.industryMultiplier}x
- Phase structure: ${phaseSummary}
- Typical implementation investment: £${insightContext.implementationCosts.typical}k (range: £${insightContext.implementationCosts.min}k-£${insightContext.implementationCosts.max}k)

${detectedPatterns.length > 0 ? `
STRATEGIC PATTERNS IDENTIFIED:
${detectedPatterns.map(p => `- ${p.name}: ${p.implication}`).join('\n')}
(Integrate these patterns naturally into your analysis without using any tags or labels)
` : ''}

${synthesis ? `
DATA SYNTHESIS CONTEXT:
- Profile: ${synthesis.organisationProfile}
- Strengths: ${synthesis.strengthsSummary}
- Gaps: ${synthesis.gapsSummary}
- Strategic Context: ${synthesis.strategicContext}
- Priority Areas: ${synthesis.priorityAreas.join(', ')}
` : ''}

INDUSTRY-SPECIFIC EMPHASIS:
- When discussing transformation value, reference the specific margin profile and why EPM/AI matters more for ${industryProfile.marginCategory.replace(/_/g, ' ')} industries
- Include at least one industry-specific market trend or regulatory pressure in your strategic context
- If the current technology platform shows declining trajectory, prominently flag this as a strategic risk

Write a compelling, personalised executive summary with confidence-tagged insights. Return JSON:
{
  "opening": "string (2-3 powerful sentences contextualising the assessment results, include specific score and readiness level)",
  "keyInsights": ["insight1 with 'Validated Evidence:' prefix for data from assessment", "insight2 with 'Advisory Judgement:' prefix for analysis-based insight", "insight3 with 'Indicative Outlook:' prefix for benchmark-based projection", "insight4 linking gap to business impact"],
  "strategicContext": "string (2-3 sentences linking findings to business impact with quantified potential specific to this industry, reference the ${insightContext.benchmarkTimeline.industryMultiplier}x industry complexity)",
  "implementationOutlook": "string (2-3 sentences summarising the benchmark-backed implementation timeline: ${insightContext.benchmarkTimeline.typical} months typical, with key phases and expected investment range of £${insightContext.implementationCosts.min}k-£${insightContext.implementationCosts.max}k)",
  "callToAction": "string (1-2 sentences with specific next steps)"
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 1536));
    const summary = extractJSON<ExecutiveSummaryNarrative>(result);
    if (summary) {
      setCache(assessment.id, cacheKey, summary);
      return summary;
    }
    log.warn("Executive summary: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Executive summary error");
  }

  const fallback: ExecutiveSummaryNarrative = {
    opening: `This assessment provides a comprehensive view of ${company?.name || 'your organisation'}'s finance transformation readiness. With an overall EPM Readiness Score of ${overallScore}%, the organisation demonstrates ${readinessLevel} maturity across key finance dimensions.`,
    keyInsights: [
      `Validated Evidence: Strongest capabilities observed in ${strongest[0]?.[0]?.replace(/_/g, ' ') || 'core processes'} at ${strongest[0]?.[1]?.score || 0}%`,
      `Validated Evidence: Priority improvement area identified in ${weakest[0]?.[0]?.replace(/_/g, ' ') || 'key dimensions'} at ${weakest[0]?.[1]?.score || 0}%`,
      `Advisory Judgement: Overall maturity indicates ${readinessLevel === 'advanced' ? 'readiness for advanced EPM capabilities' : 'opportunities for foundational improvements'}`,
      `Indicative Outlook: Gap to top-quartile performance estimated at ${Math.max(0, 75 - overallScore)} percentage points`,
    ],
    strategicContext: `The assessment reveals a balanced profile with clear opportunities to enhance finance effectiveness. Addressing the identified gaps could deliver efficiency improvements of 15-25% in key finance processes, with industry complexity factors suggesting a ${insightContext.benchmarkTimeline.industryMultiplier}x multiplier on standard timelines.`,
    implementationOutlook: `Based on vendor benchmarks for organisations of this size and sector, a typical transformation programme would span ${insightContext.benchmarkTimeline.typical} months across four phases: ${phaseSummary}. Investment range is typically £${insightContext.implementationCosts.min}k-£${insightContext.implementationCosts.max}k depending on scope and platform selection.`,
    callToAction: `We recommend engaging with Constancia's expert consultants to develop a tailored transformation roadmap based on these findings.`,
    isFallback: true,
  };
  setCache(assessment.id, cacheKey, fallback);
  return fallback;
}

export interface DimensionNarrative {
  dimension: string;
  dimensionLabel: string;
  score: number;
  maturityLevel: string;
  narrative: string;
  keyStrengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  isFallback?: boolean;
}

export async function generateDimensionNarratives(
  assessment: FcAssessment,
  dimensionScores: Record<string, { score: number; analysis?: string; recommendations?: string[] }>,
  synthesis?: DataSynthesis | null
): Promise<DimensionNarrative[]> {
  const cacheKey = 'dimension_narratives';
  const cached = getCached<DimensionNarrative[]>(assessment.id, cacheKey);
  if (cached) return cached;

  const narratives: DimensionNarrative[] = [];
  const template = SECTION_TEMPLATES.dimension_narrative;

  for (const [dimension, data] of Object.entries(dimensionScores)) {
    const maturityLevel = data.score >= 80 ? "Leading" : data.score >= 60 ? "Advanced" : data.score >= 40 ? "Established" : data.score >= 20 ? "Developing" : "Foundational";
    const normalizedDimension = dimension === "transaction_processing" ? "consolidation_close" : dimension;
    const dimConfig = DIMENSION_CONFIG[normalizedDimension as keyof typeof DIMENSION_CONFIG];
    const dimensionLabel = dimConfig?.name || dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const synthesisInsight = synthesis?.dimensionInsights?.[dimension] || '';

    const prompt = `Generate a detailed narrative analysis for the ${dimensionLabel} dimension of this EPM assessment.

${template.instructions}

MINIMUM WORD COUNT: ${template.minWords} words

DIMENSION: ${dimensionLabel}
SCORE: ${data.score}%
MATURITY LEVEL: ${maturityLevel}
EXISTING ANALYSIS: ${data.analysis || 'Not available'}
${synthesisInsight ? `SYNTHESIS INSIGHT: ${synthesisInsight}` : ''}

The narrative should:
- Explain what this ${data.score}% score means in practical business terms
- Reference specific capabilities associated with ${maturityLevel} maturity
- Identify concrete, measurable improvement opportunities
- Provide actionable recommendations that are specific to this score level

Return JSON:
{
  "narrative": "string (2-3 sentences explaining the score's practical implications)",
  "keyStrengths": ["specific strength 1", "specific strength 2"],
  "improvementAreas": ["specific area 1 with rationale", "specific area 2 with rationale"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "actionable recommendation 3"]
}`;

    try {
      const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 1024));
      const parsed = extractJSON<{ narrative: string; keyStrengths: string[]; improvementAreas: string[]; recommendations: string[] }>(result);
      if (parsed) {
        narratives.push({
          dimension,
          dimensionLabel,
          score: data.score,
          maturityLevel,
          narrative: parsed.narrative,
          keyStrengths: parsed.keyStrengths || [],
          improvementAreas: parsed.improvementAreas || [],
          recommendations: parsed.recommendations || data.recommendations || [],
        });
        continue;
      }
      log.warn({ dimension }, "Dimension narrative: Could not extract valid JSON, using fallback");
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)), dimension }, "Dimension narrative error");
    }

    narratives.push({
      dimension,
      dimensionLabel,
      score: data.score,
      maturityLevel,
      narrative: `The ${dimensionLabel} dimension achieved a score of ${data.score}%, indicating ${maturityLevel.toLowerCase()} maturity. ${data.analysis || 'Further analysis recommended to identify specific improvement opportunities.'}`,
      keyStrengths: [`Current ${dimensionLabel.toLowerCase()} processes are operational`],
      improvementAreas: [`Opportunity to enhance ${dimensionLabel.toLowerCase()} capabilities from ${data.score}% to target of 70%+`],
      recommendations: data.recommendations || [`Review current ${dimensionLabel.toLowerCase()} processes for optimisation opportunities`],
      isFallback: true,
    });
  }

  setCache(assessment.id, cacheKey, narratives);
  return narratives;
}

export interface ImplementationPhase {
  phase: string;
  duration: string;
  activities: string[];
  milestones: string[];
  resources?: string;
}

export interface ActionPlanItem {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  expectedBenefit: string;
  effort: "low" | "medium" | "high";
  timeframe: string;
  dependencies: string[];
  dimension: string;
  successMetrics?: string[];
}

export interface ActionPlan {
  summary: string;
  items: ActionPlanItem[];
  quickWins: ActionPlanItem[];
  strategicInitiatives: ActionPlanItem[];
  implementationTimeline: ImplementationPhase[];
  isFallback?: boolean;
}

export async function generateActionPlan(
  assessment: FcAssessment,
  responses: FcResponse[],
  dimensionScores: Record<string, { score: number }>,
  synthesis?: DataSynthesis | null,
  company?: FcCompany | null
): Promise<ActionPlan> {
  const cacheKey = 'action_plan';
  const cached = getCached<ActionPlan>(assessment.id, cacheKey);
  if (cached) return cached;

  const weakestDimensions = Object.entries(dimensionScores)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 4);

  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
  const template = SECTION_TEMPLATES.action_plan;

  // Build unified InsightContext for consistent benchmark data
  const insightContext = buildInsightContext(assessment, dimensionScores, company, responses);
  const insightContextPrompt = formatInsightContextForPrompt(insightContext);
  
  // Format phases with specific month references for the prompt
  const phaseMapping = insightContext.implementationPhases.map(p => ({
    name: p.name,
    months: `Months ${p.monthRange.start + 1}-${p.monthRange.end}`,
    activities: p.keyActivities,
    benefitPercentage: p.typicalBenefitPercentage
  }));
  
  const phaseContext = phaseMapping.map((p, idx) => 
    `  Phase ${idx + 1} - ${p.name} (${p.months}): ${p.activities.slice(0, 2).join('; ')} [${p.benefitPercentage}% of total benefit]`
  ).join('\n');

  const prompt = `Generate a prioritised action plan for this finance transformation assessment.

${template.instructions}

${insightContextPrompt}

MINIMUM WORD COUNT: ${template.minWords} words

EPM READINESS SCORE: ${overallScore}%
ASSESSMENT TIER: ${assessment.tier}

DIMENSION SCORES (ordered by priority - lowest first):
${weakestDimensions.map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}% (gap: ${Math.max(0, 75 - data.score)} points to top-quartile)`).join('\n')}

VENDOR BENCHMARK PHASES (use these EXACT month ranges):
${phaseContext}

Total Implementation Duration: ${insightContext.benchmarkTimeline.typical} months (range: ${insightContext.benchmarkTimeline.min}-${insightContext.benchmarkTimeline.max} months)
Industry Complexity Multiplier: ${insightContext.benchmarkTimeline.industryMultiplier}x

${synthesis ? `
PRIORITY AREAS FROM SYNTHESIS: ${synthesis.priorityAreas.join(', ')}
QUICK WIN OPPORTUNITIES: ${synthesis.quickWinOpportunities.join(', ')}
` : ''}

CRITICAL REQUIREMENTS FOR TIMELINE ALIGNMENT:
1. Quick wins MUST be mapped to "Months 1-${phaseMapping[0]?.months?.split('-')[1]?.replace(/[^0-9]/g, '') || '3'}" (${phaseMapping[0]?.name || 'Foundation'} phase)
2. Strategic initiatives MUST reference specific later phases (e.g., "Months ${phaseMapping[2]?.months || '7-12'}: ${phaseMapping[2]?.name || 'Configure & Integrate'}")
3. All timeframes must use "Months X-Y" format, not "Weeks" format
4. Link each action to the specific phase where it should be executed

CONSULTING PRINCIPLE: good practice always investigates before investing. Quick wins in the first
90 days should be assessment-based or process-based actions (workshops, current state reviews, process
redesigns, governance fixes) — not technology procurement. Technology investment should follow only
once requirements have been validated through process work.

Generate a comprehensive action plan with:
1. A brief summary of the recommended transformation approach (2-3 sentences, reference the ${insightContext.benchmarkTimeline.typical}-month typical timeline and note that the programme begins with discovery and process improvement)
2. 6-8 prioritised action items with effort and timeframe estimates
3. 2-3 items as "quick wins" (low effort, high impact, Months 1-${phaseMapping[0]?.months?.split('-')[1]?.replace(/[^0-9]/g, '') || '3'}) — these must be investigation or process-based, not technology purchases
4. 2-3 items as "strategic initiatives" (higher effort, transformational impact, linked to ${phaseMapping[2]?.name || 'later phases'}) — technology investment belongs here, not in quick wins
5. A 4-phase implementation timeline matching the vendor benchmark phases above

Return JSON:
{
  "summary": "string (2-3 sentences on recommended approach, including the ${insightContext.benchmarkTimeline.typical}-month implementation timeline)",
  "items": [
    {
      "priority": "critical|high|medium|low",
      "title": "specific action title",
      "description": "detailed description of what needs to be done",
      "expectedBenefit": "quantified expected outcome with confidence prefix (e.g., 'Indicative Outlook: 15-20% efficiency gain')",
      "effort": "low|medium|high",
      "timeframe": "specific timeframe in Months format (e.g., 'Months 1-3', 'Months 4-6')",
      "dependencies": ["dependency1", "dependency2"],
      "dimension": "related dimension",
      "successMetrics": ["metric1", "metric2"]
    }
  ],
  "quickWins": [{"same structure as items - timeframe MUST be within Months 1-${phaseMapping[0]?.months?.split('-')[1]?.replace(/[^0-9]/g, '') || '3'}"}],
  "strategicInitiatives": [{"same structure as items - timeframe MUST reference later phases like Months ${phaseMapping[2]?.months || '7-12'}"}],
  "implementationTimeline": [
    {
      "phase": "${phaseMapping[0]?.name || 'Phase 1: Mobilise & Foundation'}",
      "duration": "${phaseMapping[0]?.months || 'Months 1-3'}",
      "activities": ["Activity 1", "Activity 2", "Activity 3"],
      "milestones": ["Milestone 1", "Milestone 2"],
      "resources": "Estimated resource requirement"
    },
    {
      "phase": "${phaseMapping[1]?.name || 'Phase 2: Design & Build'}",
      "duration": "${phaseMapping[1]?.months || 'Months 4-8'}",
      "activities": ["Activity 1", "Activity 2"],
      "milestones": ["Milestone 1"],
      "resources": "Estimated resource requirement"
    },
    {
      "phase": "${phaseMapping[2]?.name || 'Phase 3: Configure & Integrate'}",
      "duration": "${phaseMapping[2]?.months || 'Months 9-14'}",
      "activities": ["Activity 1", "Activity 2"],
      "milestones": ["Milestone 1"],
      "resources": "Estimated resource requirement"
    },
    {
      "phase": "${phaseMapping[3]?.name || 'Phase 4: Stabilise & Optimise'}",
      "duration": "${phaseMapping[3]?.months || 'Months 15-18'}",
      "activities": ["Activity 1", "Activity 2"],
      "milestones": ["Milestone 1"],
      "resources": "Estimated resource requirement"
    }
  ]
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 3072));
    const plan = extractJSON<ActionPlan>(result);
    if (plan) {
      setCache(assessment.id, cacheKey, plan);
      return plan;
    }
    log.warn("Action plan: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Action plan error");
  }

  // Build fallback timeline using benchmark phases
  const fallbackPhases = phaseMapping.map((p, idx) => ({
    phase: `Phase ${idx + 1}: ${p.name}`,
    duration: p.months,
    activities: p.activities.slice(0, 4),
    milestones: idx === 0 
      ? ["Governance established", "Quick wins identified", "Stakeholder alignment achieved"]
      : idx === 1 
      ? ["Technical architecture signed off", "Core build complete"]
      : idx === 2
      ? ["Integration testing complete", "Training delivered"]
      : ["Benefits tracking live", "Continuous improvement embedded"],
    resources: idx === 0 ? "2-3 FTE equivalent" : idx === 3 ? "2-3 FTE equivalent" : "4-5 FTE equivalent"
  }));
  
  const foundationEndMonth = phaseMapping[0]?.months?.split('-')[1]?.replace(/[^0-9]/g, '') || '3';
  const strategicStartMonth = phaseMapping[2]?.months || 'Months 7-12';
  
  const fallback: ActionPlan = {
    summary: `Based on the assessment findings, we recommend a ${insightContext.benchmarkTimeline.typical}-month phased programme focusing initially on foundational improvements in ${weakestDimensions[0]?.[0]?.replace(/_/g, ' ') || 'key areas'}, followed by capability enhancement in other dimensions. This approach balances quick wins achievable in Months 1-${foundationEndMonth} with strategic transformation across the four benchmark phases.`,
    items: weakestDimensions.map(([dim, data], idx) => ({
      priority: idx === 0 ? "critical" : idx === 1 ? "high" : "medium",
      title: `Enhance ${dim.replace(/_/g, ' ')} capabilities`,
      description: `Address gaps identified in ${dim.replace(/_/g, ' ')} to improve from current ${data.score}% maturity towards target of 70%+`,
      expectedBenefit: `Indicative Outlook: Improved ${dim.replace(/_/g, ' ')} efficiency and effectiveness, estimated 15-20% improvement`,
      effort: idx === 0 ? "medium" : "high",
      timeframe: idx === 0 ? `Months 1-${foundationEndMonth}` : `Months ${parseInt(foundationEndMonth) + 1}-${parseInt(foundationEndMonth) + 3}`,
      dependencies: [],
      dimension: dim,
      successMetrics: [`Achieve ${Math.min(data.score + 20, 80)}% score in ${dim.replace(/_/g, ' ')}`],
    })) as ActionPlanItem[],
    quickWins: [{
      priority: "high",
      title: "Document current state processes",
      description: "Create detailed process documentation to identify immediate improvement opportunities during the Foundation phase",
      expectedBenefit: "Validated Evidence: Clear visibility of optimisation opportunities within Months 1-2",
      effort: "low",
      timeframe: `Months 1-${Math.ceil(parseInt(foundationEndMonth) / 2)}`,
      dependencies: [],
      dimension: "organisation_people",
      successMetrics: ["Complete process maps for top 5 finance processes"],
    }, {
      priority: "high",
      title: "Establish governance framework",
      description: "Define roles, responsibilities, and decision rights for finance transformation aligned to the benchmark programme structure",
      expectedBenefit: "Advisory Judgement: Accelerated decision-making and clearer accountability",
      effort: "low",
      timeframe: `Months 1-${foundationEndMonth}`,
      dependencies: [],
      dimension: "governance_controls",
      successMetrics: ["Published RACI matrix", "Weekly SteerCo established"],
    }],
    strategicInitiatives: [{
      priority: "critical",
      title: "EPM platform evaluation and selection",
      description: `Conduct structured evaluation of enterprise performance management solutions aligned to identified requirements during ${phaseMapping[1]?.name || 'Design & Build'} phase`,
      expectedBenefit: `Indicative Outlook: Technology foundation for sustained transformation and long-term efficiency gains of 25-40%, with typical implementation investment of £${insightContext.implementationCosts.min}k-£${insightContext.implementationCosts.max}k`,
      effort: "high",
      timeframe: strategicStartMonth,
      dependencies: ["Stakeholder alignment", "Budget approval", "Requirements documentation"],
      dimension: "technology_systems",
      successMetrics: ["Shortlist of 3 platforms", "Completed vendor demos", "Business case approved"],
    }],
    implementationTimeline: fallbackPhases,
    isFallback: true,
  };
  setCache(assessment.id, cacheKey, fallback);
  return fallback;
}

export interface BenchmarkComparison {
  summary: string;
  benchmarks: BenchmarkItem[];
  positioningNarrative: string;
  isFallback?: boolean;
}

export interface BenchmarkItem {
  metric: string;
  organisationValue: number | string;
  industryMedian: number | string;
  topQuartile: number | string;
  position: "below" | "at" | "above";
  insight: string;
}

const INDUSTRY_BENCHMARKS: Record<string, { median: number; topQuartile: number; unit: string }> = {
  close_cycle_days: { median: 10, topQuartile: 5, unit: "days" },
  forecast_accuracy: { median: 85, topQuartile: 92, unit: "%" },
  finance_cost_ratio: { median: 1.5, topQuartile: 0.8, unit: "%" },
  automation_level: { median: 40, topQuartile: 70, unit: "%" },
  planning_cycle_weeks: { median: 12, topQuartile: 6, unit: "weeks" },
};

export async function generateBenchmarkComparison(
  assessment: FcAssessment,
  company?: FcCompany | null
): Promise<BenchmarkComparison> {
  const cacheKey = 'benchmarks';
  const cached = getCached<BenchmarkComparison>(assessment.id, cacheKey);
  if (cached) return cached;

  const sizeBand = assessment.sizeBand || company?.sizeBand || "50m_250m";
  const financeCostRatio = company?.financeCostPercentage || 1.2;
  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 50;

  const template = SECTION_TEMPLATES.benchmarks;

  const benchmarks: BenchmarkItem[] = [
    {
      metric: "EPM Readiness",
      organisationValue: overallScore,
      industryMedian: 55,
      topQuartile: 75,
      position: overallScore > 65 ? "above" : overallScore > 45 ? "at" : "below",
      insight: overallScore > 65 
        ? "Organisation demonstrates above-average finance function maturity relative to peers" 
        : "Opportunity to enhance finance function capabilities relative to industry benchmarks",
    },
    {
      metric: "Finance Cost Ratio",
      organisationValue: `${financeCostRatio.toFixed(1)}%`,
      industryMedian: "1.5%",
      topQuartile: "0.8%",
      position: financeCostRatio < 1.0 ? "above" : financeCostRatio < 1.8 ? "at" : "below",
      insight: financeCostRatio < 1.0 
        ? "Finance function operating efficiently relative to revenue" 
        : "Potential for cost optimisation through automation and process improvement",
    },
  ];

  const prompt = `Generate a benchmark comparison narrative for this assessment.

${template.instructions}

MINIMUM WORD COUNT: ${template.minWords} words

ORGANISATION PROFILE:
- Size Band: ${sizeBand}
- Sector: ${company?.sector || 'General'}
- EPM Readiness: ${overallScore}%
- Finance Cost Ratio: ${financeCostRatio}%

BENCHMARKS:
${benchmarks.map(b => `- ${b.metric}: ${b.organisationValue} (Median: ${b.industryMedian}, Top Quartile: ${b.topQuartile})`).join('\n')}

Provide:
1. A 2-3 sentence summary of benchmark positioning with specific comparisons
2. A positioning narrative explaining what the benchmarks mean for competitive positioning

Return JSON:
{
  "summary": "string (specific comparison to medians and top quartile)",
  "positioningNarrative": "string (strategic implications of benchmark position)"
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 1024));
    const parsed = extractJSON<{ summary: string; positioningNarrative: string }>(result);
    if (parsed) {
      const comparison: BenchmarkComparison = {
        summary: parsed.summary,
        benchmarks,
        positioningNarrative: parsed.positioningNarrative,
      };
      setCache(assessment.id, cacheKey, comparison);
      return comparison;
    }
    log.warn("Benchmark comparison: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Benchmark comparison error");
  }

  const gapToTopQuartile = Math.max(0, 75 - overallScore);
  const fallback: BenchmarkComparison = {
    summary: `The assessment indicates ${overallScore >= 55 ? 'competitive' : 'developing'} positioning relative to industry peers in the ${sizeBand.replace(/_/g, ' to £').replace('m', 'M').replace('over', 'Over £')} revenue band. Current EPM readiness of ${overallScore}% is ${overallScore >= 55 ? 'at' : 'below'} the industry median of 55%, with a gap of ${gapToTopQuartile} percentage points to top-quartile performance.`,
    benchmarks,
    positioningNarrative: `Relative to organisations of similar size and complexity, there are clear opportunities to enhance finance function performance. Closing the ${gapToTopQuartile} percentage point gap to top-quartile would position the organisation among leading finance functions in the sector.`,
    isFallback: true,
  };
  setCache(assessment.id, cacheKey, fallback);
  return fallback;
}

export interface KeyFindingsNarrative {
  overallAssessment: string;
  findings: KeyFinding[];
  gapsIdentified: GapItem[];
  isFallback?: boolean;
}

export interface KeyFinding {
  category: string;
  finding: string;
  impact: "high" | "medium" | "low";
  evidencePoints: string[];
}

export interface GapItem {
  area: string;
  currentState: string;
  targetState: string;
  gapDescription: string;
  priority: "critical" | "high" | "medium" | "low";
}

export async function generateKeyFindings(
  assessment: FcAssessment,
  dimensionScores: Record<string, { score: number; analysis?: string }>,
  synthesis?: DataSynthesis | null
): Promise<KeyFindingsNarrative> {
  const cacheKey = 'key_findings';
  const cached = getCached<KeyFindingsNarrative>(assessment.id, cacheKey);
  if (cached) return cached;

  const template = SECTION_TEMPLATES.key_findings;
  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;

  const prompt = `Generate key findings and gaps analysis for this EPM assessment.

${template.instructions}

MINIMUM WORD COUNT: ${template.minWords} words

EPM READINESS SCORE: ${overallScore}%
ASSESSMENT TIER: ${assessment.tier}

DIMENSION SCORES:
${Object.entries(dimensionScores).map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%${data.analysis ? ` | ${data.analysis}` : ''}`).join('\n')}

${synthesis ? `
SYNTHESIS CONTEXT:
- Strengths: ${synthesis.strengthsSummary}
- Gaps: ${synthesis.gapsSummary}
- Priority Areas: ${synthesis.priorityAreas.join(', ')}
` : ''}

Generate findings that:
- Lead with quantified, specific insights (not generic observations)
- Include clear evidence points for each finding
- Identify gaps with specific current vs target states
- Prioritise by business impact

Return JSON:
{
  "overallAssessment": "string (2-3 sentences with specific score references)",
  "findings": [
    {
      "category": "category name",
      "finding": "specific finding with data",
      "impact": "high|medium|low",
      "evidencePoints": ["evidence 1 with number", "evidence 2"]
    }
  ],
  "gapsIdentified": [
    {
      "area": "area name",
      "currentState": "current state with score",
      "targetState": "target state (typically 70%+)",
      "gapDescription": "specific gap description with percentage",
      "priority": "critical|high|medium|low"
    }
  ]
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 2048));
    const findings = extractJSON<KeyFindingsNarrative>(result);
    if (findings) {
      setCache(assessment.id, cacheKey, findings);
      return findings;
    }
    log.warn("Key findings: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Key findings error");
  }

  const weakest = Object.entries(dimensionScores)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3);

  const fallback: KeyFindingsNarrative = {
    overallAssessment: `The assessment reveals a mixed maturity profile with an overall EPM Readiness Score of ${overallScore}%. The organisation demonstrates foundational capabilities but would benefit from targeted investments in ${weakest[0]?.[0]?.replace(/_/g, ' ') || 'key dimensions'} (${weakest[0]?.[1]?.score || 0}%) and ${weakest[1]?.[0]?.replace(/_/g, ' ') || 'supporting areas'} (${weakest[1]?.[1]?.score || 0}%).`,
    findings: weakest.map(([dim, data]) => ({
      category: dim.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      finding: `${dim.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} maturity at ${data.score}% indicates a ${70 - data.score} percentage point gap to target maturity`,
      impact: data.score < 30 ? "high" : data.score < 50 ? "medium" : "low",
      evidencePoints: [
        `Current score of ${data.score}% below target of 70%`,
        `Gap of ${70 - data.score} percentage points to close`
      ],
    })) as KeyFinding[],
    gapsIdentified: weakest.slice(0, 2).map(([dim, data]) => ({
      area: dim.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      currentState: `${data.score}% maturity`,
      targetState: "70%+ maturity",
      gapDescription: `Gap of ${70 - data.score} percentage points requiring focused improvement effort`,
      priority: data.score < 30 ? "critical" : "high",
    })) as GapItem[],
    isFallback: true,
  };
  setCache(assessment.id, cacheKey, fallback);
  return fallback;
}

export interface ExecutiveBrief {
  headline: string;
  situationAnalysis: string;
  keyFindings: string[];
  topRecommendations: string[];
  valueProposition: string;
  riskHighlight: string;
  callToAction: string;
}

export async function generateExecutiveBrief(
  assessment: FcAssessment,
  responses: FcResponse[],
  company: FcCompany | null | undefined,
  metrics: any,
  vendorRecommendations: any,
  priorityContext?: PriorityContext | null
): Promise<ExecutiveBrief> {
  const cacheKey = 'executive_brief';
  const cached = getCached<ExecutiveBrief>(assessment.id, cacheKey);
  if (cached) return cached;

  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
  const readinessLevel = overallScore >= 75 ? "Advanced" : overallScore >= 50 ? "Established" : overallScore >= 30 ? "Developing" : "Foundational";
  
  const dimensionScores = metrics?.dimensionScores || {};
  const sortedDimensions = Object.entries(dimensionScores)
    .sort((a, b) => (b[1] as any)?.score - (a[1] as any)?.score);
  const weakest = sortedDimensions.slice(-3).reverse();
  const strongest = sortedDimensions.slice(0, 2);

  const roiMetrics = metrics?.roiMetrics || {};
  const potentialSavings = roiMetrics?.potentialAnnualSavings || roiMetrics?.estimatedSavings || 0;
  const paybackPeriod = roiMetrics?.paybackMonths || roiMetrics?.paybackPeriod || 24;

  // Get dynamic guidelines based on organisation size and industry
  const sizeBand = assessment.sizeBand || company?.sizeBand || 'mid_market';
  const sector = company?.sector || undefined;
  const evidenceGuidelines = generateEvidenceBasedGuidelines(sizeBand);
  const vendorContext = formatVendorContextForAI(sizeBand);
  const timeline = getAggregatedTimeline(sizeBand, sector);
  
  // Extract client profile for value journey integration
  const clientProfile = extractClientProfile(responses);
  
  // Build dimension score map
  const scoreMap: Record<string, number> = {};
  for (const [dim, data] of Object.entries(dimensionScores)) {
    scoreMap[dim] = (data as any)?.score || 0;
  }
  
  // Generate dynamic phases based on client profile, dimension gaps, and industry
  const phases = generateImplementationPhases(sizeBand, clientProfile, scoreMap, sector);
  
  // Generate value journey context for AI prompt
  const valueJourneyContext = generateValueJourneyContext(clientProfile, scoreMap);
  
  // Detect semantic patterns across dimensions
  const detectedPatterns = detectSemanticPatterns(scoreMap);

  // Enhance with Perplexity research when available
  let perplexityResearch: IndustryResearchResult | null = null;
  if (isPerplexityAvailable() && sector) {
    try {
      log.info({ sector }, "Fetching Perplexity industry research");
      const focusAreas = weakest.slice(0, 3).map(([dim]) => (dim as string).replace(/_/g, ' '));
      perplexityResearch = await researchIndustryBenchmarks(sector, sizeBand, focusAreas);
      log.info({ citationCount: perplexityResearch.citations.length }, "Perplexity research complete");
    } catch (err) {
      log.error({ err: err instanceof Error ? err : new Error(String(err)) }, "Perplexity research failed, continuing without");
    }
  }

  const prompt = `Generate an Executive Brief for a CFO-level finance transformation assessment report.

${evidenceGuidelines}

${vendorContext}

${valueJourneyContext}

CFO STAKEHOLDER FOCUS:
- ${STAKEHOLDER_CONTEXT.cfo.focusAreas.join(', ')}
- Metrics Priority: ${STAKEHOLDER_CONTEXT.cfo.metricsPriority.join(', ')}
- Tone: ${STAKEHOLDER_CONTEXT.cfo.tone}

ORGANISATION CONTEXT:
- Company: ${company?.name || 'Organisation'}
- Sector: ${company?.sector || 'Finance/Professional Services'}
- Size Band: ${sizeBand}
- Finance Cost Percentage: ${company?.financeCostPercentage || 2.5}%
${company?.description ? `- Business Description: ${company.description}` : ''}
${company?.keyServices ? `- Key Services: ${company.keyServices}` : ''}

${company?.description ? `CRITICAL - COMPANY-SPECIFIC CONTEXT:
Base your insights on what this organisation ACTUALLY does: "${company.description}". 
Do NOT make generic industry assumptions. For example:
- If this is an air traffic services provider, do NOT mention fleet optimisation (they don't have a fleet)
- If this is a software company, focus on digital products not physical manufacturing
Tailor ALL insights specifically to their business model and operations.` : `NOTE: No company description provided. Use general industry benchmarks but avoid overly specific assumptions about their operations.`}

${priorityContext && priorityContext.rankedPriorities.length > 0 ? `
TRANSFORMATION PRIORITIES (User-Stated Focus Areas):
${priorityContext.rankedPriorities.map(p => `${p.rank}. ${p.label}`).join('\n')}

PRIORITY GUIDANCE:
${priorityContext.priorityAcknowledgement}

${priorityContext.blindSpotWarning ? `BLIND SPOT ALERT:
${priorityContext.blindSpotWarning}

IMPARTIALITY REQUIREMENT:
While acknowledging the client's stated priorities, you MUST remain impartial about clear issues. If dimensions outside their stated priorities show significant gaps (especially critical gaps), surface these professionally. The client may have blind spots - your role is to provide balanced, honest advice even when it challenges their current focus.` : ''}` : ''}

ASSESSMENT RESULTS:
- Overall EPM Readiness Score: ${overallScore}%
- Maturity Level: ${readinessLevel}
- Assessment Tier: ${assessment.tier}
- Questions Completed: ${responses.length}

TOP PERFORMING DIMENSIONS:
${strongest.map(([dim, data]: [string, any]) => `- ${dim.replace(/_/g, ' ')}: ${data?.score || 0}%`).join('\n')}

PRIORITY IMPROVEMENT AREAS:
${weakest.map(([dim, data]: [string, any]) => `- ${dim.replace(/_/g, ' ')}: ${data?.score || 0}%`).join('\n')}

${detectedPatterns.length > 0 ? `
STRATEGIC PATTERNS IDENTIFIED:
${detectedPatterns.map(p => `- ${p.name}: ${p.implication}`).join('\n')}
(Integrate these patterns naturally into your analysis - do not use any bracketed tags)
` : ''}

${generateOpportunitiesContext(sector, scoreMap, priorityContext?.rankedPriorities.map(p => p.id) || [])}

${perplexityResearch && perplexityResearch.insights ? `
INDUSTRY RESEARCH (Perplexity-Verified Data):
${perplexityResearch.insights}

${Object.keys(perplexityResearch.benchmarks).length > 0 ? `VERIFIED BENCHMARKS:
${Object.entries(perplexityResearch.benchmarks).map(([key, value]) => `- ${key}: ${value}`).join('\n')}` : ''}

${perplexityResearch.trends.length > 0 ? `CURRENT INDUSTRY TRENDS:
${perplexityResearch.trends.map(t => `- ${t}`).join('\n')}` : ''}

${perplexityResearch.citations.length > 0 ? `(Research sourced from: ${perplexityResearch.citations.slice(0, 3).join(', ')})` : ''}
` : ''}

ROI INDICATORS:
- Potential Annual Savings: £${potentialSavings.toLocaleString()}
- Estimated Payback Period: ${paybackPeriod} months
- Implementation Timeline (from comparison tool): ${timeline.min}-${timeline.max} months (typical: ${timeline.typical})
${vendorRecommendations ? `- Recommended Platform Approach: ${vendorRecommendations?.platformStrategy || 'EPM modernisation'}` : ''}

Create a consulting-grade Executive Brief following these requirements:

1. HEADLINE: One powerful sentence (15-20 words) that captures the transformation opportunity. Include the score and one quantified business impact.

2. SITUATION ANALYSIS: 2-3 sentences describing the current state of the finance function. Reference specific scores and gaps. Use consulting-firm language.

3. KEY FINDINGS: 3-5 bullet points of the most significant findings. Each must be specific and quantified where possible. Focus on business impact, not technical details.

4. TOP RECOMMENDATIONS: Exactly 3 prioritised actions. Each should be specific, measurable, and linked to value creation. Frame as strategic imperatives.

5. VALUE PROPOSITION: One sentence summarising the ROI opportunity with specific metrics (savings, efficiency gains, time reduction).

6. RISK HIGHLIGHT: One sentence identifying the main risk or concern if no action is taken. Be specific and quantify where possible.

7. CALL TO ACTION: One clear sentence recommending the immediate next step.

CRITICAL REQUIREMENTS:
- Maximum 500 words total across all sections
- UK English spelling (organisation, programme, analyse, optimise)
- Professional CFO-oriented tone throughout
- Quantified insights wherever possible
- Focus on business impact, not technical implementation
- NEVER mention specific vendor names
- Frame insights around competitive positioning and stakeholder value
- Use NATURAL LANGUAGE throughout - write in complete, flowing sentences
- Do NOT use em-dashes (—), technical notation, or bullet-style formatting in prose sections
- Do NOT include bracketed tags like [FACT], [HYPOTHESIS], [ESTIMATE] in the output
- Write as a human consultant would speak - conversational yet professional

Return ONLY valid JSON:
{
  "headline": "...",
  "situationAnalysis": "...",
  "keyFindings": ["...", "...", "..."],
  "topRecommendations": ["...", "...", "..."],
  "valueProposition": "...",
  "riskHighlight": "...",
  "callToAction": "..."
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 1500));
    const brief = extractJSON<ExecutiveBrief>(result);
    if (brief && brief.headline && brief.situationAnalysis && brief.keyFindings) {
      setCache(assessment.id, cacheKey, brief);
      return brief;
    }
    log.warn("Executive brief: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Executive brief generation error");
  }

  const fallback: ExecutiveBrief = {
    headline: `Finance function assessment reveals ${readinessLevel.toLowerCase()} maturity at ${overallScore}% with significant transformation opportunity.`,
    situationAnalysis: `The assessment indicates a ${readinessLevel.toLowerCase()} level of finance transformation readiness with an overall readiness score of ${overallScore}%. ${weakest[0] ? `The ${(weakest[0][0] as string).replace(/_/g, ' ')} dimension at ${(weakest[0][1] as any)?.score || 0}% represents the priority area for improvement.` : ''} Current capabilities provide a foundation for targeted enhancement initiatives.`,
    keyFindings: [
      `Overall EPM readiness score of ${overallScore}% positions the organisation at ${readinessLevel.toLowerCase()} maturity`,
      weakest[0] ? `${(weakest[0][0] as string).replace(/_/g, ' ')} capability at ${(weakest[0][1] as any)?.score || 0}% presents the greatest improvement opportunity` : 'Key dimension gaps identified for targeted improvement',
      strongest[0] ? `${(strongest[0][0] as string).replace(/_/g, ' ')} at ${(strongest[0][1] as any)?.score || 0}% demonstrates existing organisational strength` : 'Existing capabilities provide transformation foundation',
      `Assessment coverage of ${responses.length} capability areas ensures comprehensive baseline`,
    ],
    topRecommendations: [
      weakest[0] ? `Prioritise ${(weakest[0][0] as string).replace(/_/g, ' ')} enhancement to close the ${70 - ((weakest[0][1] as any)?.score || 0)} percentage point gap to target maturity` : 'Develop structured improvement roadmap for priority dimensions',
      `Establish governance framework to track transformation progress against defined milestones`,
      `Conduct detailed process assessment for top priority areas to quantify specific improvement opportunities`,
    ],
    valueProposition: potentialSavings > 0 
      ? `Addressing identified gaps could deliver approximately £${potentialSavings.toLocaleString()} in annual efficiency gains with an estimated payback period of ${paybackPeriod} months.`
      : `Targeted improvements across priority dimensions could deliver significant efficiency gains and enhanced finance function performance.`,
    riskHighlight: `Without action, the organisation risks widening competitive gap as industry peers accelerate their finance transformation programmes.`,
    callToAction: `Schedule a strategy workshop to develop a detailed transformation roadmap with prioritised initiatives and defined success metrics.`,
  };
  
  setCache(assessment.id, cacheKey, fallback);
  return fallback;
}

export interface FullReportNarratives {
  structure: ReportStructure;
  executiveSummary: ExecutiveSummaryNarrative;
  dimensionNarratives: DimensionNarrative[];
  keyFindings: KeyFindingsNarrative;
  actionPlan: ActionPlan;
  benchmarks: BenchmarkComparison;
  dataSynthesis?: DataSynthesis;
  isFallback?: boolean;
}

export async function generateAllNarratives(
  assessment: FcAssessment,
  responses: FcResponse[],
  dimensionScores: Record<string, { score: number; analysis?: string; recommendations?: string[] }>,
  company?: FcCompany | null
): Promise<FullReportNarratives> {
  log.info({ assessmentId: assessment.id }, "Starting multi-stage narrative generation");
  
  log.info("Stage 1: Synthesising assessment data");
  const dataSynthesis = await synthesizeAssessmentData(assessment, responses, dimensionScores, company);
  log.info("Data synthesis complete");

  log.info("Stage 2: Generating section narratives in parallel");
  const [structure, executiveSummary, dimensionNarratives, keyFindings, actionPlan, benchmarks] = await Promise.all([
    generateReportStructure(assessment, responses, company),
    generateExecutiveSummary(assessment, dimensionScores, company, dataSynthesis),
    generateDimensionNarratives(assessment, dimensionScores, dataSynthesis),
    generateKeyFindings(assessment, dimensionScores, dataSynthesis),
    generateActionPlan(assessment, responses, dimensionScores, dataSynthesis),
    generateBenchmarkComparison(assessment, company),
  ]);
  log.info("All section narratives generated");

  const hasFallback = 
    executiveSummary.isFallback ||
    keyFindings.isFallback ||
    actionPlan.isFallback ||
    benchmarks.isFallback ||
    dimensionNarratives.some(d => d.isFallback);

  log.info({ hasFallback }, "Narrative generation complete");

  return {
    structure,
    executiveSummary,
    dimensionNarratives,
    keyFindings,
    actionPlan,
    benchmarks,
    dataSynthesis,
    isFallback: hasFallback,
  };
}

export interface RoadmapPhase {
  phase: number;
  name: string;
  duration: string;
  objectives: string[];
  deliverables: string[];
  keyMilestones: string[];
  resources: string;
  riskMitigation: string;
}

export interface ImplementationRoadmap {
  totalDuration: string;
  phases: RoadmapPhase[];
  criticalPath: string[];
  quickWins: string[];
  successFactors: string[];
  summary: string;
  isFallback?: boolean;
}

export async function generateImplementationRoadmap(
  assessment: FcAssessment,
  company: FcCompany | null | undefined,
  transformationAmbition: string,
  vendorRecommendation: any,
  responses?: FcResponse[],
  dimensionScores?: Record<string, number>
): Promise<ImplementationRoadmap> {
  const cacheKey = `implementation_roadmap_${transformationAmbition}`;
  const cached = getCached<ImplementationRoadmap>(assessment.id, cacheKey);
  if (cached) return cached;

  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
  const readinessLevel = overallScore >= 75 ? "Advanced" : overallScore >= 50 ? "Established" : overallScore >= 30 ? "Developing" : "Foundational";

  // Get dynamic timelines from comparison tool data, adjusted for industry
  const sizeBand = assessment.sizeBand || company?.sizeBand || 'mid_market';
  const sector = company?.sector || undefined;
  const vendorTimeline = getAggregatedTimeline(sizeBand, sector);
  
  // Extract client profile for value journey integration
  const clientProfile = responses ? extractClientProfile(responses) : {
    painPoints: [],
    priorities: [],
    ambitions: [],
    urgencyLevel: 3,
    budgetReadiness: "",
    stakeholderBuyIn: 3
  };
  
  // Build dimension score map from assessment data if not provided
  const scoreMap = dimensionScores || {};
  
  // Generate dynamic phases tailored to client profile, gaps, and industry
  const dynamicPhases = generateImplementationPhases(sizeBand, clientProfile, scoreMap, sector);
  
  // Generate value journey context for AI prompt
  const valueJourneyContext = generateValueJourneyContext(clientProfile, scoreMap);
  
  const evidenceGuidelines = generateEvidenceBasedGuidelines(sizeBand);
  const vendorContext = formatVendorContextForAI(sizeBand);

  const ambitionLower = transformationAmbition.toLowerCase();
  let phaseCount: number;
  let totalMonths: number;
  let ambitionLabel: string;

  // Use dynamic timeline from vendor benchmarks as base, adjusted by ambition
  if (ambitionLower.includes('quick') || ambitionLower.includes('incremental')) {
    phaseCount = 4;
    totalMonths = Math.max(vendorTimeline.min, 12);
    ambitionLabel = 'Quick/Incremental';
  } else if (ambitionLower.includes('ambitious') || ambitionLower.includes('transform')) {
    phaseCount = 5;
    totalMonths = vendorTimeline.max;
    ambitionLabel = 'Ambitious/Transformational';
  } else {
    phaseCount = 5;
    totalMonths = vendorTimeline.typical;
    ambitionLabel = 'Moderate';
  }

  // Format dynamic phases for the prompt
  const phasesContext = dynamicPhases.map(p => 
    `  - ${p.name}: Months ${p.monthRange.start}-${p.monthRange.end} (${p.typicalBenefitPercentage}% benefit)`
  ).join('\n');

  const prompt = `Generate a detailed implementation roadmap for a finance transformation programme.

${evidenceGuidelines}

${vendorContext}

${valueJourneyContext}

ORGANISATION CONTEXT:
- Company: ${company?.name || 'Organisation'}
- Sector: ${company?.sector || 'Finance/Professional Services'}
- Size Band: ${sizeBand}
- Finance Cost Percentage: ${company?.financeCostPercentage || 2.5}%
${company?.description ? `- Business Description: ${company.description}` : ''}

${company?.description ? `CRITICAL - COMPANY-SPECIFIC CONTEXT:
Base recommendations on what this organisation ACTUALLY does: "${company.description}". 
Tailor the roadmap to their specific business model and operations.` : ''}

ASSESSMENT RESULTS:
- Overall EPM Readiness Score: ${overallScore}%
- Maturity Level: ${readinessLevel}
- Assessment Tier: ${assessment.tier}

TRANSFORMATION PARAMETERS (from comparison tool benchmarks):
- Transformation Ambition: ${ambitionLabel}
- Target Duration: ${totalMonths} months (based on ${vendorTimeline.min}-${vendorTimeline.max} month vendor benchmark range)
- Number of Phases: ${phaseCount}
- Reference Phases from Benchmark:
${phasesContext}
${vendorRecommendation ? `- Platform Strategy: ${vendorRecommendation?.platformStrategy || vendorRecommendation?.recommendation || 'EPM modernisation'}` : ''}

Generate a comprehensive implementation roadmap following these requirements:

CONSULTING PRINCIPLES TO APPLY:
Good practice in finance transformation is to understand before you invest. In practice this means:
  - The earliest phase is always about investigation: understanding the current state, aligning stakeholders,
    building the business case, and producing a prioritised roadmap. No technology procurement happens here.
  - Once the picture is clear, the focus shifts to process and quick wins: fixing what can be fixed without
    new systems, reducing manual effort, addressing governance gaps, and training people. This builds momentum
    and often resolves a material proportion of the identified issues.
  - Only once the process foundation is solid does it make sense to invest in targeted tooling: integration
    layers, data quality tools, workflow automation for the highest-volume pain points.
  - Major platform investment (full EPM replacement or consolidation) comes last, underpinned by everything
    already delivered. This is especially true for larger organisations where complexity is higher.
  - Timeline accuracy matters. A smaller or mid-market organisation may complete an EPM implementation in
    3 to 6 months. A large enterprise with complex integrations, multiple legal entities, or regulated
    processes may take 18 to 36 months. Use the context provided below to calibrate correctly.

1. SUMMARY: 2-3 sentences describing the overall approach, timeline, and expected outcomes. Acknowledge that
   the programme begins with structured discovery and process improvement before committing to technology.

2. PHASES: Generate exactly ${phaseCount} distinct phases that reflect the consulting principles above. Use
   the context provided (size band, total months, industry) to calibrate durations accurately. Each phase:
   - phase: number (1 to ${phaseCount})
   - name: descriptive phase name (e.g., "Discover and Assess", "Process and Quick Wins", "Design and Select",
     "Build and Configure", "Deploy and Optimise")
   - duration: specific timeframe calibrated to the ${totalMonths}-month total (e.g., "Months 1-4", "Months 5-10")
   - objectives: 3-4 key objectives for this phase
   - deliverables: 3-5 concrete deliverables
   - keyMilestones: 2-3 measurable milestones
   - resources: resource requirements appropriate to organisation size (e.g., "3-4 FTE, 2 external consultants")
   - riskMitigation: key risk to address in this phase

3. CRITICAL PATH: 4-6 key dependencies that must be managed across the programme

4. QUICK WINS: 3-5 early wins achievable in the first 90 days. These should be investigative or process-based
   actions such as workshops, assessments, and process fixes — not technology procurement decisions.

5. SUCCESS FACTORS: 4-5 critical success factors for the transformation

CRITICAL REQUIREMENTS:
- UK English spelling (organisation, programme, analyse, optimise)
- Professional consulting-firm tone
- Specific, measurable deliverables and milestones
- NEVER mention specific vendor names (use "EPM platform" or "enterprise solution")
- Resource estimates must be realistic for the stated organisation size band
- Phase durations must sum to approximately ${totalMonths} months
- Use NATURAL LANGUAGE — write in complete, flowing sentences
- Do NOT use em-dashes (—), technical notation, or bullet-style formatting in prose
- Do NOT include bracketed tags in the output
- Write as a human consultant would communicate

Return ONLY valid JSON:
{
  "summary": "2-3 sentence transformation summary",
  "totalDuration": "${totalMonths} months",
  "phases": [
    {
      "phase": 1,
      "name": "Phase name",
      "duration": "Months 1-3",
      "objectives": ["objective1", "objective2", "objective3"],
      "deliverables": ["deliverable1", "deliverable2", "deliverable3"],
      "keyMilestones": ["milestone1", "milestone2"],
      "resources": "Resource requirements",
      "riskMitigation": "Key risk to address"
    }
  ],
  "criticalPath": ["dependency1", "dependency2", "dependency3", "dependency4"],
  "quickWins": ["quick win 1", "quick win 2", "quick win 3"],
  "successFactors": ["CSF1", "CSF2", "CSF3", "CSF4"]
}`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, prompt, 3500));
    const roadmap = extractJSON<ImplementationRoadmap>(result);
    if (roadmap && roadmap.phases && roadmap.phases.length > 0) {
      setCache(assessment.id, cacheKey, roadmap);
      return roadmap;
    }
    log.warn("Implementation roadmap: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Implementation roadmap error");
  }

  // Compute dynamic phase month boundaries scaled to the actual total programme duration.
  // Phase weights: Discovery ~20%, Process/Design ~20%, Build ~35%, Deploy/Optimise ~25%
  // For 5-phase programmes the final weight is split further.
  const p1End = Math.max(2, Math.round(totalMonths * 0.20));
  const p2End = Math.max(p1End + 2, Math.round(totalMonths * 0.40));
  const p3End = Math.max(p2End + 2, Math.round(totalMonths * 0.75));
  const p4End5 = Math.max(p3End + 2, Math.round(totalMonths * 0.88)); // 5-phase only

  const mRange = (start: number, end: number) => `Months ${start}–${end}`;

  const fallbackPhases: RoadmapPhase[] = [];

  if (phaseCount === 4) {
    fallbackPhases.push(
      {
        phase: 1,
        name: "Discover and Assess",
        duration: mRange(1, p1End),
        objectives: [
          "Map current state processes, systems, and data flows",
          "Identify root causes of key pain points with evidence",
          "Align stakeholders on priorities and programme scope",
          "Produce a prioritised improvement roadmap with business case"
        ],
        deliverables: [
          "Current state assessment report",
          "Root cause and gap analysis",
          "Programme charter and governance framework",
          "Prioritised improvement roadmap"
        ],
        keyMilestones: [
          "Steering group established and governance agreed",
          "Current state assessment signed off"
        ],
        resources: "2-3 FTE, programme manager, 1-2 external advisers",
        riskMitigation: "Secure executive sponsorship and decision-making authority before beginning"
      },
      {
        phase: 2,
        name: "Process and Quick Wins",
        duration: mRange(p1End + 1, p2End),
        objectives: [
          "Resolve the highest-priority issues through process redesign",
          "Deliver quick wins that reduce manual effort without new technology",
          "Complete vendor evaluation and technology requirements specification",
          "Build the business case for platform investment based on process-validated requirements"
        ],
        deliverables: [
          "Redesigned process documentation for priority areas",
          "Quick win delivery log with measured effort savings",
          "Technology requirements specification",
          "Vendor shortlist and recommendation"
        ],
        keyMilestones: [
          "At least three quick wins delivered and measured",
          "Technology selection approved by steering group"
        ],
        resources: "3-4 FTE, process design lead, change management lead",
        riskMitigation: "Validate technology requirements with end users before procurement to prevent scope creep"
      },
      {
        phase: 3,
        name: "Build and Configure",
        duration: mRange(p2End + 1, p3End),
        objectives: [
          "Implement and configure the selected platform or integration solution",
          "Execute data migration and validate data quality",
          "Develop integration touchpoints with existing systems",
          "Complete user acceptance testing with business representatives"
        ],
        deliverables: [
          "Configured solution environment",
          "Migrated and validated data set",
          "Integration specifications and tested connections",
          "UAT sign-off documentation",
          "Training materials and curriculum"
        ],
        keyMilestones: [
          "Core solution build and unit testing complete",
          "User acceptance testing passed"
        ],
        resources: "4-5 FTE, technical implementation team, QA analysts, training coordinators",
        riskMitigation: "Implement rigorous testing cycles with early business user involvement to catch issues before go-live"
      },
      {
        phase: 4,
        name: "Deploy and Stabilise",
        duration: mRange(p3End + 1, totalMonths),
        objectives: [
          "Execute production deployment and hypercare support",
          "Deliver end-user training and adoption programme",
          "Establish benefits realisation tracking",
          "Transition to business-as-usual operations"
        ],
        deliverables: [
          "Production deployment",
          "Hypercare support model",
          "Benefits realisation dashboard",
          "Trained user community",
          "Lessons learned documentation"
        ],
        keyMilestones: [
          "Go-live achieved on target date",
          "Initial benefits targets confirmed"
        ],
        resources: "3-4 FTE, hypercare support team, change management specialists",
        riskMitigation: "Prepare rollback plans and escalation procedures; maintain parallel running where risk warrants it"
      }
    );
  } else {
    fallbackPhases.push(
      {
        phase: 1,
        name: "Discover and Assess",
        duration: mRange(1, p1End),
        objectives: [
          "Map current state processes, systems, and data flows in full",
          "Identify root causes of key pain points with supporting evidence",
          "Secure executive sponsorship and align stakeholders on scope",
          "Produce a prioritised improvement roadmap with initial quick wins"
        ],
        deliverables: [
          "Current state assessment report",
          "Root cause and gap analysis",
          "Programme charter and governance structure",
          "Prioritised improvement roadmap and quick wins plan"
        ],
        keyMilestones: [
          "Programme governance established with clear decision rights",
          "Current state baseline documented and agreed"
        ],
        resources: "2-3 FTE, programme manager, executive sponsor, 1-2 external advisers",
        riskMitigation: "Establish clear executive sponsorship and decision-making authority before committing resource"
      },
      {
        phase: 2,
        name: "Process and Quick Wins",
        duration: mRange(p1End + 1, p2End),
        objectives: [
          "Deliver process improvements and quick wins identified in Phase 1",
          "Reduce manual effort and governance gaps without new technology",
          "Complete solution architecture design and vendor evaluation",
          "Develop and approve the full implementation business case"
        ],
        deliverables: [
          "Process improvement log with measured effort savings",
          "Target operating model documentation",
          "Solution architecture blueprint",
          "Business case with ROI projections and vendor recommendation"
        ],
        keyMilestones: [
          "Business case approved by steering committee",
          "Solution architecture and vendor selection signed off"
        ],
        resources: "3-4 FTE, solution architect, process design lead, business analysts",
        riskMitigation: "Validate architecture and requirements with business users before procurement"
      },
      {
        phase: 3,
        name: "Build and Configure",
        duration: mRange(p2End + 1, p3End),
        objectives: [
          "Implement and configure core solution components",
          "Execute data migration activities and validate quality",
          "Develop integration touchpoints with existing systems",
          "Complete user acceptance testing with business representatives"
        ],
        deliverables: [
          "Configured solution environment",
          "Migrated and validated data set",
          "Integration specifications and tested connections",
          "UAT sign-off documentation"
        ],
        keyMilestones: [
          "Core solution build and testing complete",
          "User acceptance testing passed and signed off"
        ],
        resources: "5-6 FTE, technical implementation team, QA analysts",
        riskMitigation: "Implement rigorous testing cycles with continuous business user involvement"
      },
      {
        phase: 4,
        name: "Deploy and Transition",
        duration: mRange(p3End + 1, p4End5),
        objectives: [
          "Execute production deployment and provide hypercare support",
          "Deliver end-user training programme",
          "Transition to operational support model",
          "Initiate formal benefits tracking"
        ],
        deliverables: [
          "Production deployment",
          "Trained user community",
          "Operational support procedures",
          "Benefits tracking dashboard"
        ],
        keyMilestones: [
          "Successful go-live achieved",
          "Training completion confirmed across key user groups"
        ],
        resources: "4-5 FTE, training team, change management specialists",
        riskMitigation: "Prepare comprehensive rollback and contingency plans; maintain parallel running where appropriate"
      },
      {
        phase: 5,
        name: "Optimise and Scale",
        duration: mRange(p4End5 + 1, totalMonths),
        objectives: [
          "Stabilise operations and resolve post-go-live issues",
          "Implement continuous improvement initiatives",
          "Scale solution to additional business units or geographies",
          "Measure and communicate benefits realised"
        ],
        deliverables: [
          "Stabilised operational environment",
          "Continuous improvement roadmap",
          "Scaled solution rollout plan",
          "Benefits realisation report"
        ],
        keyMilestones: [
          "Hypercare period complete and operations stable",
          "Target benefits confirmed and evidenced"
        ],
        resources: "3-4 FTE, operations team, continuous improvement lead",
        riskMitigation: "Establish structured feedback mechanisms and a clear route for escalating ongoing issues"
      }
    );
  }

  const fallback: ImplementationRoadmap = {
    summary: `This ${ambitionLabel.toLowerCase()} transformation programme spans ${totalMonths} months across ${phaseCount} phases. The approach begins with structured discovery and process improvement to build a solid foundation before committing to technology investment, ensuring platform decisions are grounded in validated requirements.`,
    totalDuration: `${totalMonths} months`,
    phases: fallbackPhases,
    criticalPath: [
      "Executive sponsorship and sustained stakeholder engagement throughout",
      "Current state assessment completed before technology selection begins",
      "Process improvements delivered before platform build commences",
      "Data quality and migration readiness validated prior to go-live",
      "Change management and user adoption programme running in parallel with build",
      "Integration with existing systems scoped and tested early"
    ],
    quickWins: [
      "Conduct a structured current state workshop with finance leadership to agree priorities",
      "Complete an inventory of all manual processes and identify the top three for immediate redesign",
      "Establish programme governance: steering group, decision log, and communication cadence",
      "Review and rationalise the existing report catalogue, decommissioning redundant outputs",
      "Run a targeted skills and capability assessment to identify training priorities"
    ],
    successFactors: [
      "Active executive sponsorship with visible and sustained commitment",
      "Clear programme governance with defined decision rights and escalation paths",
      "Process improvements delivered before technology procurement to validate requirements",
      "Robust change management with user adoption tracked as a first-class programme metric",
      "Disciplined benefits tracking from day one of the programme"
    ],
    isFallback: true
  };

  setCache(assessment.id, cacheKey, fallback);
  return fallback;
}

// ============================================================================
// Stakeholder-Tailored Narratives
// ============================================================================

export type StakeholderType = 'cfo' | 'fpa_director' | 'it_director';

export interface StakeholderNarrative {
  stakeholderType: StakeholderType;
  title: string;
  // New structured format (similar to Executive Brief) - optional for backward compatibility
  headline?: string;
  situationOverview?: string;
  keyInsights?: {
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
  }[];
  priorityActions?: {
    action: string;
    rationale: string;
    timeframe: string;
    priority: "immediate" | "short-term" | "medium-term";
  }[];
  riskAssessment?: {
    risk: string;
    likelihood: "high" | "medium" | "low";
    mitigation: string;
  }[];
  valueOpportunities?: string[];
  callToAction?: string;
  // Legacy fields for backward compatibility
  focusAreas: string[];
  keyMessages: string[];
  risksPrioritized: string[];
  actionItems: string[];
  metrics: {
    name: string;
    value: string;
    context: string;
  }[];
  narrative: string;
  isFallback?: boolean;
}

// Normalize legacy stakeholder narratives to include new structured fields
function normalizeStakeholderNarrative(narrative: StakeholderNarrative): StakeholderNarrative {
  // If already has new fields with content, return as-is
  if (narrative.headline && narrative.keyInsights?.length && narrative.priorityActions?.length) {
    return narrative;
  }
  
  // Get stakeholder type for context-aware defaults
  const stakeholderType = narrative.stakeholderType;
  const roleLabel = stakeholderType === 'cfo' ? 'CFO' : 
                    stakeholderType === 'fpa_director' ? 'FP&A Director' : 
                    stakeholderType === 'it_director' ? 'IT Director' : 'Finance Leader';
  
  // Default insights when legacy data is empty
  const defaultKeyInsights: { title: string; description: string; impact: "high" | "medium" | "low" }[] = [
    { title: "Assessment Complete", description: "Your finance technology maturity assessment has been analysed and key improvement areas identified.", impact: "high" },
    { title: "Strategic Opportunity", description: "There are clear opportunities to enhance finance function capabilities through targeted investment.", impact: "medium" },
  ];
  
  // Default actions when legacy data is empty
  const defaultPriorityActions: { action: string; rationale: string; timeframe: string; priority: "immediate" | "short-term" | "medium-term" }[] = [
    { action: "Review assessment findings with key stakeholders", rationale: "Ensure alignment on priorities before taking action", timeframe: "Within 2 weeks", priority: "immediate" },
    { action: "Schedule consultation with Constancia to discuss recommendations", rationale: "Expert guidance can accelerate transformation planning", timeframe: "Within 30 days", priority: "short-term" },
  ];
  
  // Default risks when legacy data is empty
  const defaultRiskAssessment: { risk: string; likelihood: "high" | "medium" | "low"; mitigation: string }[] = [
    { risk: "Delayed action may increase competitive disadvantage", likelihood: "medium", mitigation: "Establish clear timeline and accountability for next steps" },
  ];
  
  // Hydrate new fields from legacy data OR use defaults
  const keyMessages = narrative.keyMessages || [];
  const actionItems = narrative.actionItems || [];
  const risksPrioritized = narrative.risksPrioritized || [];
  const focusAreas = narrative.focusAreas || [];
  
  return {
    ...narrative,
    headline: narrative.headline || keyMessages[0] || `${roleLabel} brief for EPM transformation planning`,
    situationOverview: narrative.situationOverview || narrative.narrative || `This brief provides tailored insights for the ${roleLabel} based on your organisation's finance technology maturity assessment.`,
    keyInsights: narrative.keyInsights || (keyMessages.length > 0 
      ? keyMessages.slice(0, 4).map((msg, i) => ({
          title: `Key Insight ${i + 1}`,
          description: msg,
          impact: (i < 2 ? "high" : "medium") as "high" | "medium" | "low"
        }))
      : defaultKeyInsights
    ),
    priorityActions: narrative.priorityActions || (actionItems.length > 0
      ? actionItems.map((action, i) => ({
          action,
          rationale: "Based on assessment findings",
          timeframe: i === 0 ? "Within 30 days" : i === 1 ? "Within 60 days" : "Within 90 days",
          priority: (i === 0 ? "immediate" : i === 1 ? "short-term" : "medium-term") as "immediate" | "short-term" | "medium-term"
        }))
      : defaultPriorityActions
    ),
    riskAssessment: narrative.riskAssessment || (risksPrioritized.length > 0
      ? risksPrioritized.slice(0, 3).map((risk, i) => ({
          risk,
          likelihood: (i === 0 ? "high" : "medium") as "high" | "medium" | "low",
          mitigation: "Develop mitigation strategy with Constancia support"
        }))
      : defaultRiskAssessment
    ),
    valueOpportunities: narrative.valueOpportunities || (focusAreas.length > 0 ? focusAreas : [
      "Enhanced decision support through improved analytics",
      "Process efficiency through targeted automation",
      "Risk reduction through better controls and visibility"
    ]),
    callToAction: narrative.callToAction || "Schedule a consultation with Constancia to discuss next steps and develop your transformation roadmap.",
  };
}

/**
 * Builds role-specific context for stakeholder narrative generation.
 * Provides tailored insights based on the stakeholder's priorities and concerns.
 */
function buildRoleSpecificContext(
  stakeholderType: StakeholderType,
  ctx: InsightContext,
  dimensionScores: Record<string, { score: number; gap?: number; analysis?: string }>
): string {
  const phases = ctx.implementationPhases;
  const foundationPhase = phases.find(p => p.name.toLowerCase().includes('foundation'));
  const corePhase = phases.find(p => p.name.toLowerCase().includes('core') || p.name.toLowerCase().includes('build'));
  const optimisationPhase = phases.find(p => p.name.toLowerCase().includes('optimis'));
  
  const formatPhaseRange = (phase: typeof foundationPhase) => {
    if (!phase) return 'initial months';
    return `Months ${phase.monthRange.start + 1}-${phase.monthRange.end}`;
  };
  
  const fpaScore = dimensionScores['financial_planning_analysis']?.score || 0;
  const dataScore = dimensionScores['data_analytics']?.score || 0;
  const techScore = dimensionScores['technology_systems']?.score || 0;
  const controlsScore = dimensionScores['financial_controls_compliance']?.score || 0;
  const closeScore = dimensionScores['consolidation_close']?.score || 0;
  
  switch (stakeholderType) {
    case 'cfo':
      return `
=== CFO-SPECIFIC CONTEXT (Role-Aligned Insights) ===

FINANCIAL IMPACT FOCUS:
- Implementation Investment Range: £${ctx.implementationCosts.min}k - £${ctx.implementationCosts.max}k (typical: £${ctx.implementationCosts.typical}k)
- ROI Timeline: Typical payback within ${Math.round(ctx.benchmarkTimeline.typical * 0.6)}-${Math.round(ctx.benchmarkTimeline.typical * 0.8)} months of go-live
- Industry Complexity Factor: ${ctx.benchmarkTimeline.industryMultiplier}x (affects implementation timeline)

STRATEGIC VALUE TIMELINE:
- Foundation Phase (${formatPhaseRange(foundationPhase)}): Quick wins delivering ${foundationPhase?.typicalBenefitPercentage || 10}% of total benefits
  * Immediate value: Process stabilisation, governance framework, baseline metrics
- Core Implementation (${formatPhaseRange(corePhase)}): Major capability deployment delivering ${corePhase?.typicalBenefitPercentage || 35}% of benefits
  * Strategic value: Enhanced decision support, improved forecast accuracy, risk visibility
- Optimisation (${formatPhaseRange(optimisationPhase)}): Full value realisation at ${optimisationPhase?.typicalBenefitPercentage || 20}% remaining benefits
  * Long-term value: Continuous improvement, advanced analytics, strategic agility

GOVERNANCE & RISK CONSIDERATIONS:
- Controls & Compliance Score: ${controlsScore}% ${controlsScore < 55 ? '(MATERIAL GAP - governance risk exposure)' : ''}
- ${ctx.detectedPatterns.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length > 0 
  ? `HIGH-PRIORITY PATTERNS: ${ctx.detectedPatterns.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').map(p => p.name).join(', ')}`
  : 'No critical risk patterns detected'}

CASH FLOW & BUDGETING:
- Investment can be phased across ${ctx.benchmarkTimeline.typical} months to manage cash flow impact
- Quick wins in Foundation phase offset early investment through efficiency gains
- ${ctx.assessment.readinessLevel === 'foundational' || ctx.assessment.readinessLevel === 'developing' 
  ? 'Advisory Judgement: Current maturity level suggests higher change management investment may be required'
  : 'Indicative Outlook: Existing maturity provides foundation for accelerated value delivery'}

CONFIDENCE GUIDANCE FOR CFO NARRATIVE:
- Use "Validated Evidence:" prefix when citing specific assessment scores or user inputs
- Use "Advisory Judgement:" when making inferences about strategic implications
- Use "Indicative Outlook:" when referencing industry benchmarks or peer comparisons
`;

    case 'fpa_director':
      return `
=== FP&A DIRECTOR-SPECIFIC CONTEXT (Role-Aligned Insights) ===

PLANNING & FORECASTING FOCUS:
- Financial Planning & Analysis Score: ${fpaScore}% ${fpaScore < 55 ? '(SIGNIFICANT IMPROVEMENT OPPORTUNITY)' : fpaScore >= 70 ? '(STRONG FOUNDATION)' : '(MODERATE CAPABILITY)'}
- Data & Analytics Score: ${dataScore}% ${dataScore < 55 ? '(DATA QUALITY RISK)' : ''}
- Planning Cycle Improvement Potential: ${Math.round(25 + (75 - Math.min(fpaScore, dataScore)) * 0.3)}% reduction achievable

OPERATIONAL EFFICIENCY TIMELINE:
- Foundation Phase (${formatPhaseRange(foundationPhase)}): Quick wins delivering ${foundationPhase?.typicalBenefitPercentage || 10}% of efficiency gains
  * Reporting automation, data quality baseline, process documentation
  * Typical FTE time savings: 15-20% in manual reporting activities
- Core Implementation (${formatPhaseRange(corePhase)}): Major productivity gains at ${corePhase?.typicalBenefitPercentage || 35}%
  * Integrated planning platform, automated consolidation, enhanced analytics
  * Forecast accuracy improvement: 20-30% reduction in variance
- Optimisation (${formatPhaseRange(optimisationPhase)}): Full operational efficiency at ${optimisationPhase?.typicalBenefitPercentage || 20}%
  * Advanced scenario modelling, predictive analytics, continuous improvement
  * Close cycle reduction: Target 30-50% faster month-end close

DIMENSION-SPECIFIC INSIGHTS:
- Consolidation & Close Score: ${closeScore}% ${closeScore < 55 ? '(HIGH-PRIORITY: Significant close cycle improvement opportunity)' : ''}
- ${fpaScore < dataScore 
  ? 'Advisory Judgement: Planning processes may not be fully leveraging available data capabilities'
  : dataScore < fpaScore 
    ? 'Advisory Judgement: Data quality improvements would amplify existing planning capabilities'
    : 'Balanced capability across planning and data dimensions'}

PRODUCTIVITY METRICS TO TRACK:
- Planning cycle days (current vs. target)
- Forecast accuracy (MAPE improvement)
- FTE hours on value-added analysis vs. data gathering
- Report generation automation percentage

QUICK WINS FOR FP&A (Foundation Phase):
1. Standardise chart of accounts and reporting hierarchies
2. Automate top 5 recurring reports
3. Implement forecast accuracy tracking dashboard
4. Document and streamline variance analysis process

CONFIDENCE GUIDANCE FOR FP&A NARRATIVE:
- Use "Validated Evidence:" when citing dimension scores directly from assessment
- Use "Advisory Judgement:" when inferring process improvement potential
- Use "Indicative Outlook:" when referencing industry benchmarks for cycle times
`;

    case 'it_director':
      return `
=== IT DIRECTOR-SPECIFIC CONTEXT (Role-Aligned Insights) ===

TECHNICAL ARCHITECTURE FOCUS:
- Technology Systems Score: ${techScore}% ${techScore < 55 ? '(MODERNISATION REQUIRED)' : techScore >= 70 ? '(SOLID FOUNDATION)' : '(ENHANCEMENT OPPORTUNITY)'}
- Data & Analytics Infrastructure: ${dataScore}% ${dataScore < 55 ? '(DATA ARCHITECTURE GAPS)' : ''}
- Integration Complexity Factor: ${ctx.benchmarkTimeline.industryMultiplier}x industry multiplier

IMPLEMENTATION TIMELINE (TECHNICAL VIEW):
- Foundation Phase (${formatPhaseRange(foundationPhase)}): Architecture design and infrastructure preparation
  * Data mapping, API specification, security architecture review
  * Integration pattern design for ${Math.round(ctx.benchmarkTimeline.typical * 0.2)} core system touchpoints
- Core Implementation (${formatPhaseRange(corePhase)}): Platform deployment and integration
  * System configuration, data migration, UAT cycles
  * Performance testing and security validation
- Optimisation (${formatPhaseRange(optimisationPhase)}): Technical optimisation and handover
  * Performance tuning, monitoring implementation, knowledge transfer
  * Hypercare support transition to BAU

TECHNICAL RISK FACTORS:
${ctx.detectedPatterns.filter(p => 
  p.name.toLowerCase().includes('technology') || 
  p.name.toLowerCase().includes('data') ||
  p.name.toLowerCase().includes('integration')
).map(p => `- ${p.name}: ${p.implication} (${p.riskLevel} risk)`).join('\n') || '- No specific technology-related patterns detected'}

DATA GOVERNANCE CONSIDERATIONS:
- Data Analytics Maturity: ${dataScore}% 
- ${dataScore < 55 
  ? 'CRITICAL: Data quality remediation should precede or parallel EPM implementation'
  : 'Data foundations adequate for implementation, ongoing governance required'}
- Controls & Compliance: ${controlsScore}% ${controlsScore < 55 ? '(Security/compliance framework gaps identified)' : ''}

SECURITY & COMPLIANCE CHECKLIST:
- Data residency and sovereignty requirements
- Authentication/SSO integration requirements  
- Audit logging and compliance reporting
- Disaster recovery and business continuity
- Vendor security certifications (SOC 2, ISO 27001)

INTEGRATION ARCHITECTURE FOCUS:
- ERP/GL integration: Primary data source connection
- HR/Payroll systems: Headcount and cost centre mapping
- CRM/Revenue systems: Revenue planning integration
- Data warehouse/BI: Analytical layer connectivity

IMPLEMENTATION COST BREAKDOWN (TECHNICAL):
- Platform licensing: Typically 40-50% of total investment
- Implementation services: 30-40% of total investment
- Infrastructure/integration: 15-25% of total investment
- Total range: £${ctx.implementationCosts.min}k - £${ctx.implementationCosts.max}k

CONFIDENCE GUIDANCE FOR IT NARRATIVE:
- Use "Validated Evidence:" when citing specific technology dimension scores
- Use "Advisory Judgement:" when assessing integration complexity
- Use "Indicative Outlook:" when referencing vendor benchmark timelines
`;

    default:
      return '';
  }
}

interface StakeholderProfile {
  title: string;
  role: string;
  focusDescription: string;
  priorityDimensions: string[];
  keyMetrics: string[];
  riskCategories: string[];
  communicationStyle: string;
}

const STAKEHOLDER_PROFILES: Record<StakeholderType, StakeholderProfile> = {
  cfo: {
    title: "Chief Financial Officer Brief",
    role: "CFO",
    focusDescription: "Strategic value creation, enterprise risk management, board-level messaging, ROI justification, and alignment with corporate strategy",
    priorityDimensions: [
      "Strategic alignment with business objectives",
      "Return on investment and value realisation",
      "Enterprise risk exposure and mitigation",
      "Board and stakeholder communication",
      "Capital allocation and funding requirements"
    ],
    keyMetrics: [
      "Total cost of ownership",
      "Expected ROI and payback period",
      "Risk-adjusted return metrics",
      "Finance function cost as percentage of revenue",
      "Strategic initiative alignment score"
    ],
    riskCategories: [
      "Strategic execution risk",
      "Investment and ROI realisation risk",
      "Regulatory and compliance risk",
      "Reputational and stakeholder risk",
      "Talent and capability risk"
    ],
    communicationStyle: "Executive-level, strategic, board-ready language with focus on value creation, risk mitigation, and competitive positioning"
  },
  fpa_director: {
    title: "FP&A Director Brief",
    role: "FP&A Director",
    focusDescription: "Operational efficiency, forecasting accuracy, planning cycle optimisation, close process improvement, and analytical capability enhancement",
    priorityDimensions: [
      "Planning and forecasting accuracy",
      "Close cycle duration and efficiency",
      "Process standardisation and automation",
      "Analytical depth and insight generation",
      "Resource utilisation and productivity"
    ],
    keyMetrics: [
      "Forecast accuracy (MAPE/bias)",
      "Days to close (monthly/quarterly)",
      "Planning cycle duration",
      "FTE allocation to value-added activities",
      "Report automation percentage"
    ],
    riskCategories: [
      "Forecast reliability and variance risk",
      "Process execution and quality risk",
      "Resource constraint and capacity risk",
      "Data integrity and timeliness risk",
      "Change adoption and transition risk"
    ],
    communicationStyle: "Operationally focused, detail-oriented, process-centric language with emphasis on measurable efficiency gains and practical implementation"
  },
  it_director: {
    title: "IT Director Brief",
    role: "IT Director",
    focusDescription: "Integration complexity, technology stack alignment, vendor selection criteria, data architecture requirements, and technical implementation considerations",
    priorityDimensions: [
      "Integration with existing systems landscape",
      "Data architecture and governance requirements",
      "Technology stack compatibility and modernisation",
      "Vendor evaluation and selection criteria",
      "Security, scalability, and performance requirements"
    ],
    keyMetrics: [
      "Number of integration touchpoints",
      "Data quality and completeness scores",
      "System uptime and performance SLAs",
      "Technical debt reduction potential",
      "Implementation complexity rating"
    ],
    riskCategories: [
      "Integration and interoperability risk",
      "Data migration and quality risk",
      "Vendor lock-in and dependency risk",
      "Security and compliance risk",
      "Technical capacity and skills risk"
    ],
    communicationStyle: "Technically precise, architecture-focused, vendor-agnostic language with emphasis on integration patterns, data flows, and implementation feasibility"
  }
};

export async function generateStakeholderNarrative(
  assessment: FcAssessment,
  responses: FcResponse[],
  company: FcCompany | null | undefined,
  metrics: any,
  stakeholderType: StakeholderType,
  priorityContext?: PriorityContext | null
): Promise<StakeholderNarrative> {
  const cacheKey = `stakeholder_narrative_${stakeholderType}`;
  const cached = getCached<StakeholderNarrative>(assessment.id, cacheKey);
  if (cached) return cached;

  const profile = STAKEHOLDER_PROFILES[stakeholderType];
  const overallScore = assessment.epmReadinessScore || assessment.overallMaturityScore || 0;
  const readinessLevel = overallScore >= 75 ? "advanced" : overallScore >= 50 ? "established" : overallScore >= 30 ? "developing" : "foundational";
  
  const dimensionScores = normalizeDimensionScores(assessment.dimensionScores);
  const sortedDimensions = Object.entries(dimensionScores).sort((a, b) => b[1].score - a[1].score);
  const weakest = sortedDimensions.slice(-3).reverse();
  const strongest = sortedDimensions.slice(0, 2);

  // Build unified InsightContext for consistent benchmark-grounded data
  const insightContext = buildInsightContext(assessment, dimensionScores, company, responses);
  const insightContextPrompt = formatInsightContextForPrompt(insightContext);

  // Generate industry-specific context for this stakeholder
  const sector = company?.sector || undefined;
  const stakeholderRole = stakeholderType === 'cfo' ? 'cfo' : stakeholderType === 'it_director' ? 'cio' : 'fpa';
  const stakeholderValueContext = generateStakeholderValueContext(sector, stakeholderRole);
  const industryProfile = getIndustryValueProfile(sector);
  
  // Get current vendor/tool information for technology trend analysis
  const currentVendor = (assessment as any).currentEpmVendor || (company as any)?.currentEpmVendor || undefined;
  const technologyTrendContext = generateTechnologyTrendContext(currentVendor);
  const vendorPosition = getVendorMarketPosition(currentVendor);
  
  // Technology trend flag for declining platforms - critical for stakeholder awareness
  const technologyTrendFlag = vendorPosition?.marketTrend === 'declining' 
    ? `\n\nCRITICAL TECHNOLOGY RISK: Current platform (${vendorPosition.vendorName}) shows DECLINING market trajectory. This MUST be flagged as a high-priority risk in the riskAssessment. Risks include: ${vendorPosition.riskIndicators.join('; ')}`
    : '';

  // Build role-specific context based on stakeholder type
  const roleSpecificContext = buildRoleSpecificContext(stakeholderType, insightContext, dimensionScores);

  const stakeholderPrompt = `Generate a tailored narrative brief for a ${profile.role} based on this EPM assessment.

STAKEHOLDER PROFILE:
- Role: ${profile.role}
- Focus: ${profile.focusDescription}
- Priority Dimensions: ${profile.priorityDimensions.join(', ')}
- Key Metrics of Interest: ${profile.keyMetrics.join(', ')}
- Risk Categories: ${profile.riskCategories.join(', ')}
- Communication Style: ${profile.communicationStyle}

${insightContextPrompt}

${roleSpecificContext}

${stakeholderValueContext}

INDUSTRY VALUE CONTEXT:
- Margin Profile: ${industryProfile.marginCategory.replace(/_/g, ' ')} (${industryProfile.typicalMargin.min}-${industryProfile.typicalMargin.max}%)
- Forecast Impact Multiplier: ${industryProfile.forecastImpactMultiplier}x
${industryProfile.forecastImpactMultiplier >= 2.0 ? '- IMPORTANT: In this low-margin industry, small planning improvements have AMPLIFIED impact on profitability. Emphasise this in value opportunities.' : ''}

KEY TRANSFORMATION VALUE DRIVERS FOR THIS SECTOR:
${industryProfile.transformationValueDrivers.map(d => '- ' + d).join('\n')}

${technologyTrendContext}
${technologyTrendFlag}

ORGANISATION CONTEXT:
- Company: ${company?.name || 'Organisation'}
- Sector: ${company?.sector || 'Not specified'}
- Size Band: ${assessment.sizeBand || company?.sizeBand || 'Not specified'}
- Finance Cost Percentage: ${company?.financeCostPercentage || 'Not specified'}%
${company?.description ? `- Business Description: ${company.description}` : ''}
${company?.keyServices ? `- Key Services: ${company.keyServices}` : ''}

${company?.description ? `CRITICAL - COMPANY-SPECIFIC CONTEXT:
Base your insights on what this organisation ACTUALLY does: "${company.description}". 
Do NOT make generic industry assumptions. Tailor ALL insights to their specific business model.
For example: if this is an air traffic services company, do NOT mention fleet optimisation or logistics operations.` : `NOTE: No company description provided. Use general industry benchmarks but avoid overly specific operational assumptions.`}

${priorityContext && priorityContext.rankedPriorities.length > 0 ? `
TRANSFORMATION PRIORITIES (Client-Stated Focus Areas):
${priorityContext.rankedPriorities.map(p => `${p.rank}. ${p.label}`).join('\n')}

PRIORITY ACKNOWLEDGEMENT:
${priorityContext.priorityAcknowledgement}

${priorityContext.unprioritizedGaps.length > 0 ? `BLIND SPOTS (Areas Outside Stated Priorities That Need Attention):
${priorityContext.unprioritizedGaps.slice(0, 3).map(g => `- ${g.dimension.replace(/_/g, ' ')}: ${g.score}% vs ${g.benchmark}% benchmark (${g.severity} gap) - ${g.recommendation}`).join('\n')}

IMPARTIALITY REQUIREMENT: While respecting the client's stated priorities, you MUST surface significant capability gaps even if outside their focus areas. Frame these diplomatically but clearly - the client may have blind spots that could impact transformation success.` : ''}` : ''}

ASSESSMENT RESULTS:
- Overall EPM Readiness Score: ${overallScore}%
- Readiness Level: ${readinessLevel}
- Assessment Tier: ${assessment.tier}
- Responses: ${responses.length} questions answered

DIMENSION SCORES:
${sortedDimensions.map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%`).join('\n')}

STRONGEST AREAS:
${strongest.map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%`).join('\n')}

WEAKEST AREAS:
${weakest.map(([dim, data]) => `- ${dim.replace(/_/g, ' ')}: ${data.score}%`).join('\n')}

AVAILABLE METRICS:
${JSON.stringify(metrics || {}, null, 2)}

Create a CONCISE, well-structured brief for the ${profile.role}. Focus on the most impactful points only. Be brief and direct.

CRITICAL CONTENT REQUIREMENTS:
1. INCLUDE at least one industry-specific insight relevant to the ${profile.role}'s priorities
2. If the current technology platform is declining, include a TECHNOLOGY RISK in the riskAssessment
3. Reference the industry margin profile when discussing value opportunities
4. Include market trends or regulatory pressures specific to this sector
5. MUST reference specific implementation phases when discussing timelines (e.g., "During the Foundation phase (Months 1-3)...")
6. Use confidence-tagged language naturally: "Validated Evidence:" for facts, "Advisory Judgement:" for inferences, "Indicative Outlook:" for benchmarks

CRITICAL BREVITY RULES:
- Keep descriptions SHORT (1 sentence max per item)
- Focus on the TOP 2-3 most important points only
- Avoid verbose explanations - executives value brevity
- Use bullet-point thinking: direct, actionable, specific

NATURAL LANGUAGE REQUIREMENTS:
- Write in complete, natural sentences - not technical notation
- Do NOT use em-dashes (—) or other technical punctuation markers
- Do NOT include bracketed tags like [FACT], [HYPOTHESIS] in output
- Write as a senior consultant would speak to an executive
- Use confidence prefixes naturally in prose (e.g., "Based on your assessment responses..." or "Comparable organisations typically achieve...")

Return JSON with this EXACT structure:
{
  "headline": "Single compelling sentence (max 15 words)",
  "situationOverview": "1-2 sentences ONLY providing essential context",
  "keyInsights": [
    {"title": "Short Title (3-5 words)", "description": "One sentence explaining the insight", "impact": "high|medium|low", "confidence": "validated|advisory|indicative"}
  ],
  "priorityActions": [
    {"action": "Short action statement", "rationale": "Brief rationale (1 sentence)", "timeframe": "e.g. Months 1-3 (Foundation phase)", "priority": "immediate|short-term|medium-term"}
  ],
  "riskAssessment": [
    {"risk": "Brief risk description", "likelihood": "high|medium|low", "mitigation": "Short mitigation (1 sentence)"}
  ],
  "valueOpportunities": ["Short opportunity statement (max 15 words each) - include at least one industry-specific opportunity"],
  "callToAction": "Clear next step (max 15 words)"
}

Generate exactly 2-3 keyInsights, 2-3 priorityActions, and 1-2 riskAssessment items. Keep it brief.`;

  try {
    const result = await narrativeLimit(() => callAI(CONSULTING_PERSONA, stakeholderPrompt, 1500));
    const parsed = extractJSON<{
      headline: string;
      situationOverview: string;
      keyInsights: { title: string; description: string; impact: string }[];
      priorityActions: { action: string; rationale: string; timeframe: string; priority: string }[];
      riskAssessment: { risk: string; likelihood: string; mitigation: string }[];
      valueOpportunities: string[];
      callToAction: string;
    }>(result);

    if (parsed) {
      const narrative: StakeholderNarrative = {
        stakeholderType,
        title: profile.title,
        headline: parsed.headline || '',
        situationOverview: parsed.situationOverview || '',
        keyInsights: (parsed.keyInsights || []).map(i => ({
          title: i.title,
          description: i.description,
          impact: (i.impact?.toLowerCase() as "high" | "medium" | "low") || "medium"
        })),
        priorityActions: (parsed.priorityActions || []).map(a => ({
          action: a.action,
          rationale: a.rationale,
          timeframe: a.timeframe,
          priority: (a.priority?.toLowerCase().replace('-', '-') as "immediate" | "short-term" | "medium-term") || "short-term"
        })),
        riskAssessment: (parsed.riskAssessment || []).map(r => ({
          risk: r.risk,
          likelihood: (r.likelihood?.toLowerCase() as "high" | "medium" | "low") || "medium",
          mitigation: r.mitigation
        })),
        valueOpportunities: parsed.valueOpportunities || [],
        callToAction: parsed.callToAction || '',
        // Legacy fields for backward compatibility
        focusAreas: parsed.valueOpportunities || [],
        keyMessages: (parsed.keyInsights || []).map(i => i.description),
        risksPrioritized: (parsed.riskAssessment || []).map(r => r.risk),
        actionItems: (parsed.priorityActions || []).map(a => a.action),
        metrics: [],
        narrative: parsed.situationOverview || '',
      };
      setCache(assessment.id, cacheKey, narrative);
      return narrative;
    }
    log.warn({ stakeholderType }, "Stakeholder narrative: Could not extract valid JSON, using fallback");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)), stakeholderType }, "Stakeholder narrative error");
  }

  // Fallback narrative generation with InsightContext for timeline consistency
  const fallbackNarrative = generateFallbackStakeholderNarrative(
    stakeholderType,
    profile,
    overallScore,
    readinessLevel,
    strongest,
    weakest,
    company,
    metrics,
    insightContext
  );
  setCache(assessment.id, cacheKey, fallbackNarrative);
  return fallbackNarrative;
}

function generateFallbackStakeholderNarrative(
  stakeholderType: StakeholderType,
  profile: StakeholderProfile,
  overallScore: number,
  readinessLevel: string,
  strongest: [string, { score: number }][],
  weakest: [string, { score: number }][],
  company: FcCompany | null | undefined,
  metrics: any,
  insightContext?: InsightContext
): StakeholderNarrative {
  const weakestDim = weakest[0]?.[0]?.replace(/_/g, ' ') || 'key capability areas';
  const strongestDim = strongest[0]?.[0]?.replace(/_/g, ' ') || 'core processes';
  const companyName = company?.name || 'Your organisation';
  
  // Extract timeline information from InsightContext for consistent messaging
  const phases = insightContext?.implementationPhases || [];
  const foundationPhase = phases.find(p => p.name.toLowerCase().includes('foundation'));
  const corePhase = phases.find(p => p.name.toLowerCase().includes('core') || p.name.toLowerCase().includes('build'));
  const costs = insightContext?.implementationCosts || { min: 150, max: 500, typical: 300 };
  const timeline = insightContext?.benchmarkTimeline || { min: 9, max: 18, typical: 12 };
  
  const foundationRange = foundationPhase 
    ? `Months ${foundationPhase.monthRange.start + 1}-${foundationPhase.monthRange.end}` 
    : 'Months 1-3';
  const coreRange = corePhase 
    ? `Months ${corePhase.monthRange.start + 1}-${corePhase.monthRange.end}` 
    : 'Months 4-9';

  // New structured fields
  let headline: string;
  let situationOverview: string;
  let keyInsights: { title: string; description: string; impact: "high" | "medium" | "low" }[];
  let priorityActions: { action: string; rationale: string; timeframe: string; priority: "immediate" | "short-term" | "medium-term" }[];
  let riskAssessment: { risk: string; likelihood: "high" | "medium" | "low"; mitigation: string }[];
  let valueOpportunities: string[];
  let callToAction: string;

  // Legacy fields
  let focusAreas: string[];
  let keyMessages: string[];
  let risksPrioritized: string[];
  let actionItems: string[];
  let narrativeText: string;
  let metricsData: { name: string; value: string; context: string }[];

  switch (stakeholderType) {
    case 'cfo':
      // New structured fields with timeline-grounded content
      headline = `${companyName} requires strategic investment to address ${readinessLevel}-level finance function readiness`;
      situationOverview = `Validated Evidence: The assessment reveals ${readinessLevel} finance transformation readiness with an overall readiness score of ${overallScore}%. Indicative Outlook: Based on comparable organisations, implementation typically spans ${timeline.typical} months with investment of £${costs.typical}k.`;
      keyInsights = [
        { title: "Strategic Investment Required", description: `Validated Evidence: Current EPM readiness of ${overallScore}% indicates ${readinessLevel} maturity requiring strategic investment of £${costs.min}k-£${costs.max}k to close capability gaps.`, impact: "high" },
        { title: "Primary Capability Gap Identified", description: `Advisory Judgement: The most significant capability gap resides in ${weakestDim}, which presents both operational risk and competitive disadvantage that must be addressed.`, impact: "high" },
        { title: "Foundation for Growth", description: `Validated Evidence: Strong foundation in ${strongestDim} provides a platform for capability building and demonstrates existing organisational capacity for improvement.`, impact: "medium" },
        { title: "Quick Wins Available", description: `Indicative Outlook: During the Foundation phase (${foundationRange}), quick wins can deliver 10-15% of total benefits while building momentum for transformation.`, impact: "medium" }
      ];
      priorityActions = [
        { action: "Sponsor development of detailed transformation business case", rationale: "Board approval requires a compelling business case with clear ROI metrics and phased investment plan", timeframe: `${foundationRange} (Foundation phase)`, priority: "immediate" },
        { action: "Approve budget allocation for implementation investment", rationale: `Investment range of £${costs.min}k-£${costs.max}k can be phased across ${timeline.typical} months to manage cash flow`, timeframe: `${foundationRange} (Foundation phase)`, priority: "immediate" },
        { action: "Establish programme governance and oversight structure", rationale: "Executive sponsorship is critical for driving successful implementation during core deployment", timeframe: `${coreRange} (Core implementation)`, priority: "short-term" },
        { action: "Champion change management and stakeholder communication", rationale: "Visible leadership commitment drives adoption and reduces change resistance", timeframe: "Ongoing across all phases", priority: "short-term" }
      ];
      riskAssessment = [
        { risk: "Delayed transformation increases competitive disadvantage", likelihood: "high", mitigation: `Prioritise quick wins in Foundation phase (${foundationRange}) to demonstrate early value and maintain momentum` },
        { risk: "Capability gaps may impact financial reporting quality", likelihood: "medium", mitigation: "Implement interim process improvements during Foundation phase while longer-term solutions are developed" },
        { risk: "Change resistance without visible executive sponsorship", likelihood: "medium", mitigation: "Ensure CFO visibility in transformation communications and governance from project inception" }
      ];
      valueOpportunities = [
        `Quick wins in Foundation phase (${foundationRange}) delivering immediate efficiency gains`,
        `Strategic capability deployment during ${coreRange} enabling enhanced decision support`,
        "Risk reduction through improved financial controls and visibility",
        `Typical ROI payback within ${Math.round(timeline.typical * 0.7)}-${Math.round(timeline.typical * 0.9)} months of go-live`
      ];
      callToAction = `Schedule a strategic planning session with Constancia to develop a comprehensive transformation business case within ${foundationRange}.`;

      // Legacy fields
      focusAreas = [
        "Strategic value creation and ROI realisation",
        "Enterprise risk exposure from capability gaps",
        "Board-ready transformation business case",
        "Alignment with corporate strategy objectives"
      ];
      keyMessages = [
        `Current EPM readiness of ${overallScore}% indicates ${readinessLevel} maturity requiring strategic investment`,
        `Primary capability gaps in ${weakestDim} present material risk to finance function performance`,
        `Transformation investment can deliver measurable efficiency gains and risk reduction`,
        "Clear executive sponsorship required to drive successful implementation",
        `Strong foundation in ${strongestDim} provides platform for capability building`
      ];
      risksPrioritized = [
        "Delayed transformation increases competitive disadvantage",
        "Capability gaps may impact financial reporting quality and timeliness",
        "Underinvestment in technology creates operational and compliance risk",
        "Change resistance without visible executive sponsorship"
      ];
      actionItems = [
        "Sponsor development of detailed transformation business case",
        "Allocate executive time to programme governance and oversight",
        "Secure board approval for required investment",
        "Champion change management and stakeholder communication"
      ];
      metricsData = [
        { name: "EPM Readiness Score", value: `${overallScore}%`, context: "Indicates current transformation maturity and investment requirement" },
        { name: "Maturity Level", value: readinessLevel, context: "Positions organisation against industry benchmarks for board reporting" },
        { name: "Priority Gap", value: weakestDim, context: "Primary area requiring strategic attention and investment" }
      ];
      narrativeText = situationOverview;
      break;

    case 'fpa_director':
      // New structured fields with timeline-grounded content
      const fpaScore = insightContext?.dimensionScores['financial_planning_analysis']?.score || overallScore;
      const dataAnalyticsScore = insightContext?.dimensionScores['data_analytics']?.score || overallScore;
      headline = `Operational efficiency gains achievable through targeted ${weakestDim} improvements`;
      situationOverview = `Validated Evidence: From an FP&A operations perspective, the ${overallScore}% readiness score indicates specific opportunities to enhance planning, forecasting, and close processes. Advisory Judgement: Based on current scores, 20-30% productivity improvement is achievable within ${timeline.typical} months.`;
      keyInsights = [
        { title: "Planning Efficiency Gap", description: `Validated Evidence: Financial Planning & Analysis score of ${fpaScore}% indicates specific process improvement opportunities for cycle time reduction.`, impact: "high" },
        { title: "Data & Analytics Capability", description: `Validated Evidence: Data Analytics score of ${dataAnalyticsScore}% ${dataAnalyticsScore < 55 ? 'suggests data quality improvements would amplify planning effectiveness' : 'provides foundation for advanced analytical capabilities'}.`, impact: "high" },
        { title: "Automation Potential", description: `Indicative Outlook: Comparable organisations achieve 20-30% FTE time savings through process automation in the Foundation phase (${foundationRange}).`, impact: "medium" },
        { title: "Quick Wins Available", description: `Advisory Judgement: Reporting automation and forecast accuracy tracking can deliver immediate value during ${foundationRange} while platform deployment continues.`, impact: "medium" }
      ];
      priorityActions = [
        { action: "Conduct detailed process mapping for priority improvement areas", rationale: "Understanding current state processes is essential for identifying quick wins and automation opportunities", timeframe: `${foundationRange} (Foundation phase)`, priority: "immediate" },
        { action: "Implement report automation for top 5 recurring reports", rationale: "Immediate FTE time savings of 15-20% achievable with minimal investment", timeframe: `${foundationRange} (Foundation phase)`, priority: "immediate" },
        { action: "Deploy enhanced forecast accuracy tracking dashboard", rationale: "Better measurement enables continuous improvement and demonstrates value to stakeholders", timeframe: `${coreRange} (Core implementation)`, priority: "short-term" },
        { action: "Lead operational change management for affected teams", rationale: "Early engagement ensures smooth adoption across planning and reporting processes", timeframe: "Ongoing across all phases", priority: "short-term" }
      ];
      riskAssessment = [
        { risk: "Forecast accuracy degradation during transition", likelihood: "medium", mitigation: `Implement parallel processes during ${coreRange} with validation checkpoints before full cutover` },
        { risk: "Extended close cycles during implementation", likelihood: "medium", mitigation: `Prioritise close cycle quick wins in Foundation phase (${foundationRange}) to build momentum` },
        { risk: "Change adoption challenges during process transformation", likelihood: "medium", mitigation: "Engage team early with clear benefits communication and adequate training investment" }
      ];
      valueOpportunities = [
        `Foundation phase (${foundationRange}): Report automation freeing 15-20% FTE capacity`,
        `Core implementation (${coreRange}): Forecast accuracy improvement of 20-30%`,
        `Close cycle reduction: Target 30-50% faster month-end close by optimisation phase`,
        "Enhanced analytical capability through integrated planning platform"
      ];
      callToAction = `Schedule a process improvement workshop with Constancia during ${foundationRange} to map current processes and identify quick wins.`;

      // Legacy fields
      focusAreas = [
        "Planning and forecasting process efficiency",
        "Close cycle optimisation and standardisation",
        "Analytical capability enhancement",
        "Resource allocation to value-added activities"
      ];
      keyMessages = [
        `Assessment score of ${overallScore}% highlights specific process improvement opportunities`,
        `${weakestDim} represents the primary operational efficiency gap`,
        "Process standardisation can reduce manual effort and improve accuracy",
        "Enhanced analytical capabilities would improve forecast reliability",
        `Current strength in ${strongestDim} provides foundation for process improvement`
      ];
      risksPrioritized = [
        "Forecast accuracy degradation from manual processes",
        "Extended close cycles impacting decision-making timelines",
        "Resource constraint limiting analytical depth",
        "Change adoption challenges during process transformation"
      ];
      actionItems = [
        "Conduct detailed process mapping for priority improvement areas",
        "Develop automation roadmap for high-volume manual activities",
        "Implement enhanced forecast accuracy tracking mechanisms",
        "Lead operational change management for affected teams"
      ];
      metricsData = [
        { name: "EPM Readiness Score", value: `${overallScore}%`, context: "Benchmark for measuring operational improvement progress" },
        { name: "Process Gap Priority", value: weakestDim, context: "Primary focus area for operational efficiency initiatives" },
        { name: "Strong Foundation", value: strongestDim, context: "Existing capability to build upon for process enhancement" }
      ];
      narrativeText = situationOverview;
      break;

    case 'it_director':
      // New structured fields with timeline-grounded content
      const techSystemsScore = insightContext?.dimensionScores['technology_systems']?.score || overallScore;
      const dataScore = insightContext?.dimensionScores['data_analytics']?.score || overallScore;
      const controlsScore = insightContext?.dimensionScores['financial_controls_compliance']?.score || overallScore;
      const industryMultiplier = insightContext?.benchmarkTimeline?.industryMultiplier || 1.0;
      
      headline = `Technical architecture requires careful planning to address ${weakestDim} integration complexity`;
      situationOverview = `Validated Evidence: The technical assessment reveals ${readinessLevel} maturity (${overallScore}%) across the finance technology stack. Advisory Judgement: Based on industry complexity factor of ${industryMultiplier}x, implementation will typically span ${timeline.min}-${timeline.max} months with investment of £${costs.min}k-£${costs.max}k.`;
      keyInsights = [
        { title: "Technology Systems Maturity", description: `Validated Evidence: Technology Systems score of ${techSystemsScore}% indicates ${techSystemsScore < 55 ? 'modernisation required with careful integration planning' : 'solid foundation for enhancement'}.`, impact: "high" },
        { title: "Data Architecture Assessment", description: `Validated Evidence: Data Analytics score of ${dataScore}% ${dataScore < 55 ? 'suggests data quality remediation should precede or parallel implementation' : 'provides adequate foundation for data migration'}.`, impact: "high" },
        { title: "Security & Compliance", description: `Validated Evidence: Controls & Compliance score of ${controlsScore}% ${controlsScore < 55 ? 'indicates security/compliance framework gaps requiring attention' : 'suggests adequate governance foundation'}.`, impact: "medium" },
        { title: "Integration Complexity", description: `Advisory Judgement: Industry complexity multiplier of ${industryMultiplier}x indicates ${industryMultiplier >= 1.2 ? 'above-average integration complexity requiring additional planning' : 'standard integration complexity'}.`, impact: "medium" }
      ];
      priorityActions = [
        { action: "Conduct detailed integration architecture assessment", rationale: "Understanding integration touchpoints critical for accurate scoping across planned timeline", timeframe: `${foundationRange} (Foundation phase)`, priority: "immediate" },
        { action: "Establish data quality baseline and remediation plan", rationale: "Data quality issues are primary cause of implementation delays in Core phase", timeframe: `${foundationRange} (Foundation phase)`, priority: "immediate" },
        { action: "Complete security architecture and compliance review", rationale: "Security requirements must be defined before platform deployment", timeframe: `${coreRange} (Core implementation)`, priority: "short-term" },
        { action: "Develop internal skills and training programme", rationale: "Technical capability building required in parallel with platform deployment", timeframe: `${coreRange} (Core implementation)`, priority: "short-term" }
      ];
      riskAssessment = [
        { risk: "Integration complexity exceeding estimates", likelihood: "high", mitigation: `Thorough architecture assessment in Foundation phase (${foundationRange}) with ${Math.round(timeline.typical * 0.15)}-month contingency buffer` },
        { risk: "Data migration quality issues impacting go-live", likelihood: "high", mitigation: `Data quality baseline and cleansing during ${foundationRange} before Core migration activities` },
        { risk: "Technical skills gap for selected platform", likelihood: "medium", mitigation: `Early skills assessment with training programme starting in ${foundationRange}` }
      ];
      valueOpportunities = [
        `Foundation phase (${foundationRange}): Architecture design and data quality baseline`,
        `Core implementation (${coreRange}): Platform deployment with integration testing`,
        `Technology debt reduction through modern architecture patterns`,
        `Enhanced security and compliance posture supporting regulatory requirements`
      ];
      callToAction = `Schedule a technical architecture review with Constancia during ${foundationRange} to assess integration requirements and develop implementation roadmap.`;

      // Legacy fields
      focusAreas = [
        "Integration architecture and system connectivity",
        "Data quality and governance requirements",
        "Technology stack modernisation opportunities",
        "Implementation complexity and resource planning"
      ];
      keyMessages = [
        `Technical assessment indicates ${readinessLevel} infrastructure maturity`,
        `${weakestDim} will require significant integration and data architecture work`,
        "Current system landscape complexity must inform solution design",
        "Data quality initiatives should precede or parallel technology implementation",
        `Existing ${strongestDim} capabilities can be extended with appropriate integration`
      ];
      risksPrioritized = [
        "Integration complexity exceeding initial estimates",
        "Data migration quality issues impacting go-live",
        "Technical skills gap for selected technology platform",
        "Security and compliance requirements for new systems"
      ];
      actionItems = [
        "Conduct detailed integration architecture assessment",
        "Develop data quality baseline and remediation plan",
        "Evaluate build vs buy options for capability gaps",
        "Assess internal technical capability and training requirements"
      ];
      metricsData = [
        { name: "Technical Readiness", value: `${overallScore}%`, context: "Indicates technical infrastructure maturity and integration complexity" },
        { name: "Integration Priority", value: weakestDim, context: "Area requiring most significant technical architecture work" },
        { name: "Technical Foundation", value: strongestDim, context: "Existing technical capability that can support enhancement" }
      ];
      narrativeText = situationOverview;
      break;
  }

  return {
    stakeholderType,
    title: profile.title,
    // New structured fields
    headline,
    situationOverview,
    keyInsights,
    priorityActions,
    riskAssessment,
    valueOpportunities,
    callToAction,
    // Legacy fields
    focusAreas,
    keyMessages,
    risksPrioritized,
    actionItems,
    metrics: metricsData,
    narrative: narrativeText,
    isFallback: true
  };
}

// ============================================
// PHASE 1-4 INTELLIGENCE EXPORT FOR FRONTEND
// ============================================

/**
 * Phase 1-4 Intelligence interface for frontend display
 * Consolidates enhanced root cause analysis, respondent confidence,
 * and confidence level metadata for UI presentation.
 */
export interface Phase14Intelligence {
  enhancedRootCauses: Array<{
    pattern: string;
    patternLabel: string;
    confidence: number;
    urgencyScore: number;
    impactScore: number;
    businessRisk: string;
    affectedDimensions: string[];
    effortToResolve: 'low' | 'medium' | 'high';
    stakeholderImpact: string[];
    remediationPaths: Array<{
      id: string;
      title: string;
      description: string;
      effort: string;
      impact: string;
      timeframe: string;
      estimatedCost?: string;
    }>;
  }>;
  respondentConfidence: {
    overall: number;
    confidenceLevel: string;
    respondentRole?: string;
    respondentSeniority?: string;
    breakdown: {
      roleConfidence: number;
      seniorityMultiplier: number;
      selfAssessment?: number;
    };
  };
  confidenceLevels: {
    validated_evidence: { label: string; color: string; description: string };
    advisory_judgement: { label: string; color: string; description: string };
    indicative_outlook: { label: string; color: string; description: string };
    pending_validation: { label: string; color: string; description: string };
  };
}

/**
 * Pattern labels for human-readable display
 */
const ROOT_CAUSE_PATTERN_LABELS: Record<string, string> = {
  tech_fragmentation: "Technology Fragmentation",
  data_quality_gap: "Data Quality Gap",
  skills_capacity: "Skills & Capacity Constraints",
  manual_controls: "Manual Control Processes",
  reporting_bottleneck: "Reporting Bottleneck",
  ai_not_ready: "AI Readiness Gap",
};

/**
 * Format timeframe for display
 */
function formatTimeframe(timeframe: string): string {
  const timeframeMap: Record<string, string> = {
    quick_win: "Quick Win (1-3 months)",
    short_term: "Short Term (3-6 months)",
    medium_term: "Medium Term (6-12 months)",
    long_term: "Long Term (12+ months)",
  };
  return timeframeMap[timeframe] || timeframe;
}

/**
 * Get confidence level label from numeric value
 */
function getConfidenceLevelLabel(confidence: number): string {
  if (confidence >= 90) return "Very High";
  if (confidence >= 75) return "High";
  if (confidence >= 60) return "Moderate";
  if (confidence >= 40) return "Low";
  return "Very Low";
}

/**
 * Get Phase 1-4 Intelligence data for frontend display.
 * This function builds the InsightContext and extracts the relevant Phase 1-4 data
 * formatted for UI presentation.
 */
export function getPhase14Intelligence(
  assessment: FcAssessment,
  dimensionScores: Record<string, { score: number; analysis?: string }>,
  company?: FcCompany | null,
  responses?: FcResponse[]
): Phase14Intelligence {
  // Build the full insight context
  const insightContext = buildInsightContext(assessment, dimensionScores, company, responses);
  
  // Format enhanced root causes for frontend
  const enhancedRootCauses = (insightContext.enhancedRootCauses || []).map(rc => ({
    pattern: rc.pattern.id,
    patternLabel: ROOT_CAUSE_PATTERN_LABELS[rc.pattern.id] || rc.pattern.name,
    confidence: Math.round(rc.confidence * 100),
    urgencyScore: rc.urgencyScore,
    impactScore: rc.impactScore,
    businessRisk: rc.businessRisk,
    affectedDimensions: rc.affectedDimensions.map(d => 
      DIMENSION_CONFIG[d as keyof typeof DIMENSION_CONFIG]?.name || d.replace(/_/g, ' ')
    ),
    effortToResolve: rc.effortToResolve,
    stakeholderImpact: rc.stakeholderImpact,
    remediationPaths: rc.remediationPaths.slice(0, 3).map(rp => ({
      id: rp.id,
      title: rp.title,
      description: rp.description,
      effort: rp.effort.charAt(0).toUpperCase() + rp.effort.slice(1),
      impact: rp.impact.charAt(0).toUpperCase() + rp.impact.slice(1),
      timeframe: formatTimeframe(rp.timeframe),
      estimatedCost: rp.estimatedCostRange 
        ? `£${rp.estimatedCostRange.min}k - £${rp.estimatedCostRange.max}k` 
        : undefined,
    })),
  }));
  
  // Format respondent confidence
  const respondentConfidence = insightContext.respondentConfidence 
    ? {
        overall: insightContext.respondentConfidence.overall,
        confidenceLevel: getConfidenceLevelLabel(insightContext.respondentConfidence.overall),
        respondentRole: insightContext.respondentConfidence.respondentRole,
        respondentSeniority: insightContext.respondentConfidence.respondentSeniority,
        breakdown: {
          roleConfidence: insightContext.respondentConfidence.breakdown.roleConfidence,
          seniorityMultiplier: insightContext.respondentConfidence.breakdown.seniorityMultiplier,
          selfAssessment: insightContext.respondentConfidence.breakdown.selfAssessment || undefined,
        },
      }
    : {
        overall: 50,
        confidenceLevel: "Moderate",
        breakdown: {
          roleConfidence: 50,
          seniorityMultiplier: 1.0,
        },
      };
  
  // Format confidence levels metadata for the legend
  const confidenceLevels = {
    validated_evidence: {
      label: CONFIDENCE_LEVEL_METADATA.validated_evidence.label,
      color: CONFIDENCE_LEVEL_METADATA.validated_evidence.color,
      description: CONFIDENCE_LEVEL_METADATA.validated_evidence.description,
    },
    advisory_judgement: {
      label: CONFIDENCE_LEVEL_METADATA.advisory_judgement.label,
      color: CONFIDENCE_LEVEL_METADATA.advisory_judgement.color,
      description: CONFIDENCE_LEVEL_METADATA.advisory_judgement.description,
    },
    indicative_outlook: {
      label: CONFIDENCE_LEVEL_METADATA.indicative_outlook.label,
      color: CONFIDENCE_LEVEL_METADATA.indicative_outlook.color,
      description: CONFIDENCE_LEVEL_METADATA.indicative_outlook.description,
    },
    pending_validation: {
      label: CONFIDENCE_LEVEL_METADATA.pending_validation.label,
      color: CONFIDENCE_LEVEL_METADATA.pending_validation.color,
      description: CONFIDENCE_LEVEL_METADATA.pending_validation.description,
    },
  };
  
  return {
    enhancedRootCauses,
    respondentConfidence,
    confidenceLevels,
  };
}

export { validateContent, validateContentQuality, synthesizeAssessmentData, normalizeStakeholderNarrative };
