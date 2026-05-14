/**
 * FinanceCompass Adaptive Question Engine
 * 
 * Provides intelligent question sequencing and AI-generated follow-up questions.
 * Uses existing guardrails and AI patterns from ai-service.ts.
 */

import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { z } from "zod";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("fc-adaptive-engine");
import * as fcStorage from "./storage";
import type { 
  FcAssessment, 
  FcResponse,
  FcQuestion,
  FCQuestionType,
  FCDimension
} from "@shared/finance-compass-schema";
import { 
  REGISTRATION_QUESTIONS,
  PRE_ASSESSMENT_QUESTIONS,
  FULL_ASSESSMENT_QUESTIONS,
  type QuestionDefinition 
} from "./question-bank";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface AdaptiveQuestionResult {
  question: FcQuestion | GeneratedQuestion | null;
  isGenerated: boolean;
  isComplete: boolean;
  skippedQuestionIds: string[];
  totalQuestions: number;
  answeredQuestions: number;
  relevanceScore?: number;
}

export interface GeneratedQuestion {
  id: string;
  tier: string;
  dimension: FCDimension | string;
  sequence: number;
  questionKey: string;
  prompt: string;
  helpText: string | null;
  type: FCQuestionType;
  options: { value: string; label: string; description?: string }[] | null;
  validation: { min?: number; max?: number; labels?: Record<number, string> } | null;
  scoringConfig: any | null;
  isRequired: boolean;
  isAdaptive: boolean;
  dependsOn: any | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  aiGroundingNotes?: string;
  generatedFromQuestionId?: string;
  generatedFromResponse?: any;
}

export interface QuestionRelevanceScore {
  questionId: string;
  score: number;
  factors: {
    dimensionMatch: number;
    painPointAlignment: number;
    priorityAlignment: number;
    dependencyMet: number;
    sequenceBonus: number;
  };
  shouldSkip: boolean;
  skipReason?: string;
}

// ============================================
// AI CLIENT CONFIGURATION
// ============================================

import { getOpenAIConfig } from "../config";

const openaiConfig = getOpenAIConfig();
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  baseURL: openaiConfig.baseURL,
});

const aiLimit = pLimit(2);
const AI_MODEL = "gpt-5.2"; // Latest OpenAI model

// ============================================
// ADAPTIVE QUESTION TARGETS BY TIER
// ============================================
// These represent the TARGET number of AI follow-up questions to generate
// per tier, distributed across dimensions:
// - Pre-Assessment: 15 initial questions + 15 AI follow-ups = 30 total
// - Full Assessment: 25 initial questions + 25 AI follow-ups = 50 total
// Note: Registration tier does NOT generate follow-ups (signup form only)

const ADAPTIVE_LIMITS = {
  pre_assessment: { maxTotal: 15, maxPerDimension: 3 },
  full: { maxTotal: 25, maxPerDimension: 4 },
} as const;

type AdaptiveTier = keyof typeof ADAPTIVE_LIMITS;

// ============================================
// CACHING
// ============================================

const generatedQuestionCache = new Map<string, GeneratedQuestion>();

function getCacheKey(assessmentId: string, questionId: string): string {
  return `${assessmentId}:${questionId}`;
}

function getCachedQuestion(assessmentId: string, questionId: string): GeneratedQuestion | null {
  const key = getCacheKey(assessmentId, questionId);
  return generatedQuestionCache.get(key) || null;
}

function setCachedQuestion(assessmentId: string, questionId: string, question: GeneratedQuestion): void {
  const key = getCacheKey(assessmentId, questionId);
  generatedQuestionCache.set(key, question);
}

export function clearCache(assessmentId?: string): void {
  if (assessmentId) {
    const keys = Array.from(generatedQuestionCache.keys());
    for (const key of keys) {
      if (key.startsWith(`${assessmentId}:`)) {
        generatedQuestionCache.delete(key);
      }
    }
  } else {
    generatedQuestionCache.clear();
  }
}

// ============================================
// ADAPTIVE LIMITS CHECK
// ============================================

async function canGenerateMoreFollowUps(
  assessmentId: string, 
  tier: string,
  responses: FcResponse[]
): Promise<{ canGenerate: boolean; currentCount: number; maxTotal: number; dimensionCounts: Record<string, number> }> {
  const limits = ADAPTIVE_LIMITS[tier as AdaptiveTier] || ADAPTIVE_LIMITS.pre_assessment;
  
  // Count adaptive responses already generated
  const adaptiveResponses = responses.filter(r => r.isAdaptiveResponse === true);
  const currentCount = adaptiveResponses.length;
  
  // Count per dimension
  const dimensionCounts: Record<string, number> = {};
  for (const r of adaptiveResponses) {
    // Get the question to find its dimension
    const question = await fcStorage.getQuestionById(r.questionId);
    if (question?.dimension) {
      dimensionCounts[question.dimension] = (dimensionCounts[question.dimension] || 0) + 1;
    }
  }
  
  return {
    canGenerate: currentCount < limits.maxTotal,
    currentCount,
    maxTotal: limits.maxTotal,
    dimensionCounts,
  };
}

// ============================================
// DATABASE PERSISTENCE FOR GENERATED QUESTIONS
// ============================================

export async function storeGeneratedQuestion(
  assessmentId: string,
  question: GeneratedQuestion
): Promise<{ id: string; questionKey: string }> {
  const storedQuestion = await fcStorage.createAdaptiveQuestion({
    tier: question.tier,
    dimension: question.dimension as string,
    sequence: question.sequence,
    questionKey: question.questionKey,
    prompt: question.prompt,
    helpText: question.helpText,
    type: question.type,
    options: question.options,
    validation: question.validation,
    scoringConfig: {
      assessmentId,
      generatedFromQuestionId: question.generatedFromQuestionId,
      generatedFromResponse: question.generatedFromResponse,
      aiGroundingNotes: question.aiGroundingNotes,
    },
    isRequired: question.isRequired,
    isAdaptive: true,
    dependsOn: question.dependsOn,
    isActive: true,
    assessmentId,
  });

  return { id: storedQuestion.id, questionKey: storedQuestion.questionKey };
}

export async function getStoredAdaptiveQuestion(
  assessmentId: string,
  questionId: string
): Promise<GeneratedQuestion | null> {
  // First check in-memory cache
  const cached = getCachedQuestion(assessmentId, questionId);
  if (cached) {
    return cached;
  }

  // Check database for persisted adaptive questions
  const dbQuestion = await fcStorage.getQuestionById(questionId);
  if (dbQuestion && dbQuestion.isAdaptive) {
    const scoringConfig = dbQuestion.scoringConfig as Record<string, any> || {};
    
    // Verify this question belongs to the assessment
    if (scoringConfig.assessmentId === assessmentId) {
      const generatedQuestion: GeneratedQuestion = {
        id: dbQuestion.id,
        tier: dbQuestion.tier,
        dimension: dbQuestion.dimension || '',
        sequence: dbQuestion.sequence,
        questionKey: dbQuestion.questionKey,
        prompt: dbQuestion.prompt,
        helpText: dbQuestion.helpText,
        type: dbQuestion.type as FCQuestionType,
        options: dbQuestion.options as any,
        validation: dbQuestion.validation as any,
        scoringConfig: dbQuestion.scoringConfig,
        isRequired: dbQuestion.isRequired,
        isAdaptive: true,
        dependsOn: dbQuestion.dependsOn,
        isActive: dbQuestion.isActive,
        createdAt: dbQuestion.createdAt,
        updatedAt: dbQuestion.updatedAt,
        aiGroundingNotes: scoringConfig.aiGroundingNotes,
        generatedFromQuestionId: scoringConfig.generatedFromQuestionId,
        generatedFromResponse: scoringConfig.generatedFromResponse,
      };
      
      // Cache for future requests
      setCachedQuestion(assessmentId, questionId, generatedQuestion);
      return generatedQuestion;
    }
  }

  return null;
}

// ============================================
// GUARDRAILS (Shared with ai-service.ts)
// ============================================

const UK_SPELLING_MAP: Record<string, string> = {
  "organization": "organisation",
  "analyze": "analyse",
  "optimize": "optimise",
  "realize": "realise",
  "recognize": "recognise",
  "color": "colour",
  "behavior": "behaviour",
  "program": "programme",
  "honor": "honour",
  "favor": "favour",
  "center": "centre",
  "meter": "metre",
  "theater": "theatre",
  "traveled": "travelled",
  "modeled": "modelled",
  "labeled": "labelled",
  "canceled": "cancelled",
  "signaling": "signalling",
  "focused": "focussed",
  "utilizing": "utilising",
  "maximize": "maximise",
  "minimize": "minimise",
  "prioritize": "prioritise",
  "standardize": "standardise",
  "customize": "customise",
  "centralize": "centralise",
  "finalize": "finalise",
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
  "AWS", "Azure", "GCP", "Google Cloud",
];

function enforceUKSpelling(text: string): string {
  let result = text;
  for (const [us, uk] of Object.entries(UK_SPELLING_MAP)) {
    const regex = new RegExp(`\\b${us}\\b`, 'gi');
    result = result.replace(regex, uk);
  }
  return result;
}

function removeVendorMentions(text: string): string {
  let result = text;
  for (const vendor of VENDOR_BLOCKLIST) {
    const regex = new RegExp(`\\b${vendor}\\b`, 'gi');
    result = result.replace(regex, 'an enterprise solution');
  }
  return result;
}

function removeEmoji(text: string): string {
  try {
    return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  } catch {
    return text;
  }
}

function applyGuardrails(text: string): string {
  let result = enforceUKSpelling(text);
  result = removeVendorMentions(result);
  result = removeEmoji(result);
  result = result.replace(/!+/g, '.').replace(/\?+\?/g, '?');
  return result;
}

// ============================================
// AI PERSONA FOR QUESTION GENERATION
// ============================================

const QUESTION_GENERATION_SYSTEM_PROMPT = `You are a Senior Finance Transformation Consultant generating follow-up questions for a finance assessment.

Your communication style is:
- Professional and consultative, appropriate for C-suite and senior finance leaders
- Clear and concise, avoiding unnecessary jargon
- British English throughout (organisation, programme, analyse, optimise)

You MUST adhere to these guardrails:
1. NEVER mention specific vendors by name (Oracle, SAP, Anaplan, etc.)
2. NEVER use casual language or emoji
3. ALWAYS use British English spelling
4. Questions must be focused on understanding the respondent's situation, not selling solutions
5. Questions should probe deeper into pain points or low-scoring areas
6. Keep questions concise but comprehensive`;

// ============================================
// SCHEMA VALIDATION FOR GENERATED QUESTIONS
// ============================================

const GeneratedQuestionOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

const GeneratedQuestionSchema = z.object({
  prompt: z.string().min(10).max(500),
  helpText: z.string().max(300).optional(),
  type: z.enum(["single_select", "multi_select", "slider"]),
  options: z.array(GeneratedQuestionOptionSchema).min(2).max(8).optional(),
  sliderConfig: z.object({
    min: z.number().min(1).max(1),
    max: z.number().min(3).max(10),
    labels: z.record(z.string()),
  }).optional(),
  dimension: z.string().optional(),
  aiGroundingNotes: z.string().optional(),
});

function validateGeneratedQuestion(raw: any): boolean {
  try {
    GeneratedQuestionSchema.parse(raw);
    
    if (raw.type === "slider" && !raw.sliderConfig) {
      return false;
    }
    if ((raw.type === "single_select" || raw.type === "multi_select") && (!raw.options || raw.options.length < 2)) {
      return false;
    }
    
    return true;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Question validation failed");
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getQuestionDefinitions(tier: string): QuestionDefinition[] {
  switch (tier) {
    case "registration":
    case "quick_assessment": // Legacy - uses same questions as registration
      // Registration/quick_assessment tier uses its own questions (signup form, not assessment)
      return REGISTRATION_QUESTIONS;
    case "pre_assessment":
      return PRE_ASSESSMENT_QUESTIONS;
    case "full":
      return FULL_ASSESSMENT_QUESTIONS;
    default:
      return PRE_ASSESSMENT_QUESTIONS;
  }
}

function findQuestionDefinition(questionId: string, tier: string): QuestionDefinition | null {
  const definitions = getQuestionDefinitions(tier);
  return definitions.find(q => q.id === questionId) || null;
}

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

function extractResponseValue(response: FcResponse): any {
  if (response.response === null || response.response === undefined) {
    return null;
  }
  if (typeof response.response === 'object') {
    const resp = response.response as Record<string, any>;
    if (resp.value !== undefined) return resp.value;
    if (resp.selected !== undefined) return resp.selected;
    if (resp.values !== undefined) return resp.values;
    return resp;
  }
  return response.response;
}

// ============================================
// SKIP LOGIC EVALUATION
// ============================================

interface DependsOnCondition {
  questionId: string;
  operator: "equals" | "not_equals" | "includes" | "excludes" | "greater_than" | "less_than";
  value: any;
}

export function shouldSkipQuestion(
  questionId: string,
  responses: FcResponse[],
  tier: string
): { skip: boolean; reason?: string } {
  const questionDef = findQuestionDefinition(questionId, tier);
  
  if (!questionDef) {
    return { skip: false };
  }
  
  const existingResponse = responses.find(r => {
    const qDef = findQuestionDefinition(r.questionId, tier);
    return qDef?.id === questionId || r.questionId === questionId;
  });
  if (existingResponse) {
    return { skip: true, reason: "Already answered" };
  }
  
  return { skip: false };
}

export function evaluateDependsOn(
  dependsOn: DependsOnCondition | DependsOnCondition[] | null | undefined,
  responses: FcResponse[],
  tier: string
): boolean {
  if (!dependsOn) {
    return true;
  }
  
  const conditions = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
  
  for (const condition of conditions) {
    const response = responses.find(r => {
      const qDef = findQuestionDefinition(r.questionId, tier);
      return qDef?.id === condition.questionId || r.questionId === condition.questionId;
    });
    
    if (!response) {
      return false;
    }
    
    const responseValue = extractResponseValue(response);
    
    switch (condition.operator) {
      case "equals":
        if (responseValue !== condition.value) return false;
        break;
      case "not_equals":
        if (responseValue === condition.value) return false;
        break;
      case "includes":
        if (Array.isArray(responseValue)) {
          if (!responseValue.includes(condition.value)) return false;
        } else {
          if (responseValue !== condition.value) return false;
        }
        break;
      case "excludes":
        if (Array.isArray(responseValue)) {
          if (responseValue.includes(condition.value)) return false;
        }
        break;
      case "greater_than":
        if (typeof responseValue !== "number" || responseValue <= condition.value) return false;
        break;
      case "less_than":
        if (typeof responseValue !== "number" || responseValue >= condition.value) return false;
        break;
    }
  }
  
  return true;
}

// ============================================
// QUESTION RELEVANCE SCORING
// ============================================

export function calculateQuestionRelevance(
  question: QuestionDefinition | FcQuestion,
  responses: FcResponse[],
  tier: string
): QuestionRelevanceScore {
  const q = question as any;
  const questionId = q.id || q.questionKey || '';
  const dimension = q.dimension || null;
  
  const factors = {
    dimensionMatch: 1.0,
    painPointAlignment: 1.0,
    priorityAlignment: 1.0,
    dependencyMet: 1.0,
    sequenceBonus: 0.0,
  };
  
  const painPointResponse = responses.find(r => {
    const qDef = findQuestionDefinition(r.questionId, tier);
    return qDef?.id === "q1_pain_points";
  });
  
  if (painPointResponse && dimension) {
    const painPoints = extractResponseValue(painPointResponse);
    if (Array.isArray(painPoints)) {
      const dimensionPainPointMap: Record<string, string[]> = {
        "technology_systems": ["outdated_systems", "data_silos"],
        "data_analytics": ["poor_data_quality", "poor_visibility"],
        "financial_planning_analysis": ["forecasting_challenges", "scenario_analysis"],
        "consolidation_close": ["slow_close", "manual_reporting"],
        "management_reporting": ["manual_reporting", "poor_visibility"],
        "organisation_people": ["resource_constraints"],
        "financial_controls_compliance": ["compliance_issues"],
      };
      
      const relevantPainPoints = dimensionPainPointMap[dimension as string] || [];
      const matchCount = painPoints.filter(pp => relevantPainPoints.includes(pp)).length;
      factors.painPointAlignment = 1.0 + (matchCount * 0.2);
    }
  }
  
  const priorityResponse = responses.find(r => {
    const qDef = findQuestionDefinition(r.questionId, tier);
    return qDef?.id === "q1_priorities";
  });
  
  if (priorityResponse && dimension) {
    const priorities = extractResponseValue(priorityResponse);
    if (Array.isArray(priorities)) {
      const dimensionPriorityMap: Record<string, string[]> = {
        "financial_planning_analysis": ["forecasting", "epm"],
        "management_reporting": ["reporting"],
        "consolidation_close": ["close_cycle"],
        "data_analytics": ["data_quality"],
        "financial_controls_compliance": ["controls"],
        "organisation_people": ["operating_model", "business_partnering"],
      };
      
      const relevantPriorities = dimensionPriorityMap[dimension as string] || [];
      const matchCount = priorities.filter(p => relevantPriorities.includes(p)).length;
      factors.priorityAlignment = 1.0 + (matchCount * 0.3);
    }
  }
  
  const questionDef = findQuestionDefinition(questionId, tier);
  if (questionDef) {
    const dependsOnMet = evaluateDependsOn(
      questionDef.scoringConfig?.dependsOn as DependsOnCondition | DependsOnCondition[] | undefined,
      responses,
      tier
    );
    factors.dependencyMet = dependsOnMet ? 1.0 : 0.0;
    
    const order = questionDef.order || 0;
    factors.sequenceBonus = Math.max(0, 1 - (order * 0.01));
  }
  
  const score = (
    factors.dimensionMatch * 0.15 +
    factors.painPointAlignment * 0.25 +
    factors.priorityAlignment * 0.25 +
    factors.dependencyMet * 0.25 +
    factors.sequenceBonus * 0.10
  );
  
  const skipResult = shouldSkipQuestion(questionId, responses, tier);
  
  return {
    questionId,
    score: Math.round(score * 100) / 100,
    factors,
    shouldSkip: skipResult.skip || factors.dependencyMet === 0,
    skipReason: skipResult.reason || (factors.dependencyMet === 0 ? "Dependency not met" : undefined),
  };
}

// ============================================
// FOLLOW-UP QUESTION TRIGGERS
// ============================================

interface FollowUpTrigger {
  questionId: string;
  condition: (response: any) => boolean;
  dimension: FCDimension;
  context: string;
}

const FOLLOW_UP_TRIGGERS: FollowUpTrigger[] = [
  // ============================================
  // TIER 1: QUICK ASSESSMENT TRIGGERS (q1_*)
  // ============================================
  
  // Pain points - always probe deeper
  {
    questionId: "q1_pain_points",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Explore pain points in more detail to understand root causes and business impact",
  },
  // Company size - understand complexity
  {
    questionId: "q1_company_size",
    condition: () => true,
    dimension: "organisation_people",
    context: "Understand organisational complexity, scale, and growth trajectory",
  },
  // Finance size - probe efficiency
  {
    questionId: "q1_finance_size",
    condition: () => true,
    dimension: "organisation_people",
    context: "Explore finance team structure, skills gaps, and capacity challenges",
  },
  // Priorities - strategic focus
  {
    questionId: "q1_priorities",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Explore strategic priorities and success criteria in more depth",
  },
  // Urgency - probe drivers or barriers
  {
    questionId: "q1_urgency",
    condition: () => true,
    dimension: "organisation_people",
    context: "Understand transformation drivers, timeline expectations, and barriers",
  },
  // ERP systems - technology landscape
  {
    questionId: "q1_erp_systems",
    condition: () => true,
    dimension: "technology_systems",
    context: "Explore current technology landscape, integration challenges, and modernisation plans",
  },
  // Spreadsheet dependency - technology maturity
  {
    questionId: "q1_spreadsheet_dependency",
    condition: () => true,
    dimension: "technology_systems",
    context: "Understand spreadsheet usage patterns and automation opportunities",
  },
  // Data confidence - explore data maturity
  {
    questionId: "q1_data_confidence",
    condition: () => true,
    dimension: "data_analytics",
    context: "Understand data quality challenges, governance, and aspirations",
  },
  // Reconciliation effort - data issues
  {
    questionId: "q1_reconciliation_effort",
    condition: () => true,
    dimension: "data_analytics",
    context: "Explore reconciliation pain points and efficiency opportunities",
  },
  // Manual vs value-add - operating model
  {
    questionId: "q1_manual_vs_valueadd",
    condition: () => true,
    dimension: "organisation_people",
    context: "Understand current finance activities and automation potential",
  },
  // Process bottlenecks - transaction processing
  {
    questionId: "q1_process_bottlenecks",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Explore specific process bottlenecks and their business impact",
  },
  // Budget availability - qualification
  {
    questionId: "q1_budget_availability",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Understand budget constraints, investment appetite, and business case requirements",
  },
  // Stakeholder buy-in - change readiness
  {
    questionId: "q1_stakeholder_buyin",
    condition: () => true,
    dimension: "organisation_people",
    context: "Understand stakeholder alignment, change appetite, and sponsorship strength",
  },

  // ============================================
  // TIER 2: PRE-ASSESSMENT TRIGGERS (q2_*)
  // ============================================
  
  // Consolidation centralisation
  {
    questionId: "q2_consolidation_centralisation",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Explore consolidation operating model and centralisation opportunities",
  },
  // Close cycle time
  {
    questionId: "q2_close_cycle",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Understand close cycle challenges and improvement priorities",
  },
  // Close reliability
  {
    questionId: "q2_close_reliability",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Explore root causes of close delays and reliability issues",
  },
  // Manual consolidation
  {
    questionId: "q2_manual_consolidation",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Understand manual consolidation processes and automation opportunities",
  },
  // Reporting centralisation
  {
    questionId: "q2_reporting_centralisation",
    condition: () => true,
    dimension: "management_reporting",
    context: "Explore reporting operating model and standardisation opportunities",
  },
  // Reporting timeliness
  {
    questionId: "q2_reporting_timeliness",
    condition: () => true,
    dimension: "management_reporting",
    context: "Understand reporting delays and their business impact",
  },
  // Report formats
  {
    questionId: "q2_report_formats",
    condition: () => true,
    dimension: "management_reporting",
    context: "Explore reporting standardisation and self-service opportunities",
  },
  // Manual reporting
  {
    questionId: "q2_manual_reporting",
    condition: () => true,
    dimension: "management_reporting",
    context: "Understand manual reporting effort and automation potential",
  },
  // Reporting satisfaction
  {
    questionId: "q2_reporting_satisfaction",
    condition: () => true,
    dimension: "management_reporting",
    context: "Explore stakeholder reporting needs and satisfaction gaps",
  },
  // Planning centralisation
  {
    questionId: "q2_planning_centralisation",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Explore planning operating model and coordination challenges",
  },
  // Forecast frequency
  {
    questionId: "q2_forecast_frequency",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Understand forecasting cadence and agility requirements",
  },
  // Forecast accuracy
  {
    questionId: "q2_forecast_accuracy",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Explore forecast accuracy challenges and improvement opportunities",
  },
  // Manual planning
  {
    questionId: "q2_manual_planning",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Understand planning effort and tool limitations",
  },
  // Scenario capability
  {
    questionId: "q2_scenario_capability",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Explore scenario modelling needs and current limitations",
  },
  // Data governance maturity
  {
    questionId: "q2_data_governance",
    condition: () => true,
    dimension: "data_analytics",
    context: "Understand data governance maturity and improvement priorities",
  },
  // Integration level
  {
    questionId: "q2_integration_level",
    condition: () => true,
    dimension: "technology_systems",
    context: "Explore system integration challenges and middleware landscape",
  },
  // Analytics maturity
  {
    questionId: "q2_analytics_maturity",
    condition: () => true,
    dimension: "data_analytics",
    context: "Understand analytics maturity and advanced analytics aspirations",
  },
  // Controls automation
  {
    questionId: "q2_controls_automation",
    condition: () => true,
    dimension: "financial_controls_compliance",
    context: "Explore controls automation and compliance challenges",
  },
  // Skills readiness
  {
    questionId: "q2_skills_readiness",
    condition: () => true,
    dimension: "organisation_people",
    context: "Understand skills gaps and change management readiness",
  },

  // ============================================
  // TIER 3: FULL ASSESSMENT TRIGGERS (q3_*)
  // ============================================
  
  // Process maturity deep dives
  {
    questionId: "q3_close_process_detail",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Deep dive into close process maturity and improvement roadmap",
  },
  {
    questionId: "q3_consolidation_complexity",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Explore consolidation complexity drivers and simplification opportunities",
  },
  {
    questionId: "q3_intercompany_maturity",
    condition: () => true,
    dimension: "consolidation_close",
    context: "Understand intercompany processes and elimination challenges",
  },
  {
    questionId: "q3_reporting_architecture",
    condition: () => true,
    dimension: "management_reporting",
    context: "Explore reporting architecture and modernisation opportunities",
  },
  {
    questionId: "q3_planning_integration",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Understand planning integration with operational systems",
  },
  {
    questionId: "q3_driver_based_planning",
    condition: () => true,
    dimension: "financial_planning_analysis",
    context: "Explore driver-based planning maturity and aspirations",
  },
  {
    questionId: "q3_data_architecture",
    condition: () => true,
    dimension: "data_analytics",
    context: "Deep dive into data architecture and master data management",
  },
  {
    questionId: "q3_technology_roadmap",
    condition: () => true,
    dimension: "technology_systems",
    context: "Understand technology roadmap and investment priorities",
  },
  {
    questionId: "q3_controls_framework",
    condition: () => true,
    dimension: "financial_controls_compliance",
    context: "Explore controls framework maturity and automation opportunities",
  },
  {
    questionId: "q3_operating_model",
    condition: () => true,
    dimension: "organisation_people",
    context: "Deep dive into finance operating model and transformation vision",
  },
];

function checkFollowUpTriggers(
  questionId: string,
  responseValue: any
): FollowUpTrigger | null {
  for (const trigger of FOLLOW_UP_TRIGGERS) {
    if (trigger.questionId === questionId && trigger.condition(responseValue)) {
      return trigger;
    }
  }
  return null;
}

// ============================================
// AI QUESTION GENERATION
// ============================================

export async function generateFollowUpQuestion(
  assessmentId: string,
  lastResponse: FcResponse
): Promise<GeneratedQuestion | null> {
  const cachedQuestion = getCachedQuestion(assessmentId, lastResponse.questionId);
  if (cachedQuestion) {
    log.info({ questionId: lastResponse.questionId }, "Returning cached follow-up for question");
    return cachedQuestion;
  }
  
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    log.error({ assessmentId }, "Assessment not found");
    return null;
  }
  
  // Registration and quick_assessment tiers do NOT generate AI follow-ups
  if (assessment.tier === "registration" || assessment.tier === "quick_assessment") {
    log.info({ tier: assessment.tier }, "Skipping follow-up generation - not applicable");
    return null;
  }
  
  const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
  const responseValue = extractResponseValue(lastResponse);
  
  // Check if we can generate more follow-ups based on limits
  const limitsCheck = await canGenerateMoreFollowUps(assessmentId, assessment.tier, responses);
  if (!limitsCheck.canGenerate) {
    log.info({ currentCount: limitsCheck.currentCount, maxTotal: limitsCheck.maxTotal, tier: assessment.tier }, "Adaptive question limit reached");
    return null;
  }
  
  const questionDef = findQuestionDefinition(lastResponse.questionId, assessment.tier);
  if (!questionDef) {
    log.info({ questionId: lastResponse.questionId }, "No question definition found, skipping follow-up");
    return null;
  }
  
  // Check for specific trigger, or use generic follow-up if none matches
  const trigger = checkFollowUpTriggers(questionDef.id, responseValue);
  
  // Determine context and dimension for question generation
  let generationContext: string;
  let targetDimension: FCDimension;
  
  if (trigger) {
    generationContext = trigger.context;
    targetDimension = trigger.dimension;
    log.info({ questionId: questionDef.id, context: trigger.context }, "Matched trigger");
  } else {
    // Generic follow-up based on response pattern
    generationContext = `Probe deeper into the respondent's answer to understand business impact and priorities`;
    targetDimension = (questionDef.dimension as FCDimension) || "organisation_people";
    log.info({ questionId: questionDef.id, dimension: targetDimension }, "Using generic follow-up");
  }
  
  // Check dimension limits
  const limits = ADAPTIVE_LIMITS[assessment.tier as AdaptiveTier] || ADAPTIVE_LIMITS.pre_assessment;
  const dimensionCount = limitsCheck.dimensionCounts[targetDimension] || 0;
  if (dimensionCount >= limits.maxPerDimension) {
    log.info({ dimension: targetDimension, dimensionCount, maxPerDimension: limits.maxPerDimension }, "Dimension limit reached");
    return null;
  }
  
  const responseContext = responses.slice(-5).map(r => {
    const qDef = findQuestionDefinition(r.questionId, assessment.tier);
    return {
      question: qDef?.questionText || "Unknown question",
      response: extractResponseValue(r),
      aiGrounding: qDef?.aiGroundingNotes || "",
    };
  });
  
  log.info({ tier: assessment.tier, dimension: targetDimension, currentCount: limitsCheck.currentCount, maxTotal: limitsCheck.maxTotal }, "Generating follow-up question");
  
  const prompt = `Based on the following assessment context, generate a single follow-up question to probe deeper into the respondent's challenges.

Context:
- Trigger: ${generationContext}
- Dimension: ${targetDimension}
- Assessment Tier: ${assessment.tier}
- Last Question: ${questionDef.questionText}
- Last Response: ${JSON.stringify(responseValue)}

Recent Response Context:
${JSON.stringify(responseContext, null, 2)}

AI Grounding Notes for Last Question:
${questionDef.aiGroundingNotes || "No specific grounding notes"}

Generate a probing follow-up question that:
1. Digs deeper into the pain point, challenge, or opportunity indicated
2. Helps understand the business impact and urgency
3. Identifies potential quick wins, priorities, or barriers
4. Is appropriate for C-suite/senior finance leaders
5. Avoids repeating questions already asked (see recent context)

The question MUST be one of these types:
- single_select: Provide 3-6 clear options
- multi_select: Provide 4-8 options (allow multiple selection)
- slider: Provide a 1-5 scale with clear labels

Respond with JSON only:
{
  "prompt": "The question text",
  "helpText": "Optional help text explaining the question",
  "type": "single_select|multi_select|slider",
  "options": [{"value": "option_key", "label": "Display Label", "description": "Optional description"}],
  "sliderConfig": {"min": 1, "max": 5, "labels": {"1": "Low", "3": "Medium", "5": "High"}},
  "dimension": "${targetDimension}",
  "aiGroundingNotes": "How this question's response should be used in analysis"
}`;

  try {
    const response = await aiLimit(() => 
      pRetry(
        async () => {
          const result = await openai.chat.completions.create({
            model: AI_MODEL,
            max_completion_tokens: 1024,
            messages: [
              { role: "system", content: QUESTION_GENERATION_SYSTEM_PROMPT },
              { role: "user", content: prompt }
            ],
          });
          return result;
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
          onFailedAttempt: (error) => {
            if (!isRateLimitError(error)) {
              throw error;
            }
            log.info({ attemptNumber: error.attemptNumber }, "Retry attempt");
          },
        }
      )
    );
    
    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      log.error("No text response from AI");
      return null;
    }
    
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.error("Could not parse AI response as JSON");
      return null;
    }
    
    const rawQuestion = JSON.parse(jsonMatch[0]);
    
    if (!validateGeneratedQuestion(rawQuestion)) {
      log.error("Generated question failed validation");
      return null;
    }
    
    const generatedQuestion: GeneratedQuestion = {
      id: `gen_${assessmentId}_${Date.now()}`,
      tier: assessment.tier,
      dimension: rawQuestion.dimension || targetDimension,
      sequence: responses.length + 1,
      questionKey: `adaptive_${targetDimension}_${Date.now()}`,
      prompt: applyGuardrails(rawQuestion.prompt),
      helpText: rawQuestion.helpText ? applyGuardrails(rawQuestion.helpText) : null,
      type: rawQuestion.type as FCQuestionType,
      options: rawQuestion.options ? rawQuestion.options.map((opt: any) => ({
        value: opt.value,
        label: applyGuardrails(opt.label),
        description: opt.description ? applyGuardrails(opt.description) : undefined,
      })) : null,
      validation: rawQuestion.sliderConfig ? {
        min: rawQuestion.sliderConfig.min,
        max: rawQuestion.sliderConfig.max,
        labels: rawQuestion.sliderConfig.labels,
      } : null,
      scoringConfig: null,
      isRequired: false,
      isAdaptive: true,
      dependsOn: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiGroundingNotes: rawQuestion.aiGroundingNotes,
      generatedFromQuestionId: lastResponse.questionId,
      generatedFromResponse: responseValue,
    };
    
    // Persist the generated question to the database
    try {
      const storedQuestion = await storeGeneratedQuestion(assessmentId, generatedQuestion);
      log.info({ questionId: storedQuestion.id, dimension: targetDimension }, "Persisted adaptive question to database");
      
      // Update the generated question with the actual database ID
      generatedQuestion.id = storedQuestion.id;
    } catch (dbError) {
      log.error({ err: dbError instanceof Error ? dbError : new Error(String(dbError)) }, "Failed to persist question to database, using in-memory only");
    }
    
    setCachedQuestion(assessmentId, lastResponse.questionId, generatedQuestion);
    
    log.info({ dimension: targetDimension, count: limitsCheck.currentCount + 1, maxTotal: limitsCheck.maxTotal }, "Successfully generated follow-up question");
    return generatedQuestion;
    
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error generating follow-up question");
    return null;
  }
}

// ============================================
// MAIN ADAPTIVE ENGINE FUNCTIONS
// ============================================

export async function getNextQuestion(
  assessmentId: string,
  requestedNextSequence?: number
): Promise<AdaptiveQuestionResult> {
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    return {
      question: null,
      isGenerated: false,
      isComplete: true,
      skippedQuestionIds: [],
      totalQuestions: 0,
      answeredQuestions: 0,
    };
  }
  
  const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
  const questionDefinitions = getQuestionDefinitions(assessment.tier);
  const dbQuestions = await fcStorage.getQuestionsByTier(assessment.tier as any);
  
  // Track answered questions by their questionKey (not database UUID) to avoid double-counting
  // The answeredQuestionIds set should only contain questionKey values to match against questionDefinitions
  const answeredQuestionIds = new Set<string>();
  for (const response of responses) {
    // Find the question definition by matching the response's questionId to a DB question's UUID,
    // then map that to the questionKey
    const dbQ = dbQuestions.find(dbq => dbq.id === response.questionId);
    if (dbQ?.questionKey) {
      answeredQuestionIds.add(dbQ.questionKey);
    } else {
      // Fallback: check if the questionId matches a questionKey directly (for generated questions)
      const qDef = questionDefinitions.find(q => q.id === response.questionId);
      if (qDef) {
        answeredQuestionIds.add(qDef.id);
      }
    }
  }
  
  const skippedQuestionIds: string[] = [];
  
  const sortedQuestions = [...questionDefinitions].sort((a, b) => a.order - b.order);
  
  // First, identify all questions that would be skipped by adaptive logic
  // This is needed to calculate accurate progress
  const allSkippedIds: string[] = [];
  for (const qDef of sortedQuestions) {
    if (answeredQuestionIds.has(qDef.id)) continue;
    const relevance = calculateQuestionRelevance(qDef, responses, assessment.tier);
    if (relevance.shouldSkip) {
      allSkippedIds.push(qDef.id);
    }
  }
  
  // Dynamic completion check: assessment is complete when all non-skipped questions are answered
  const totalQuestionsCount = questionDefinitions.length;
  const effectiveTotalQuestions = totalQuestionsCount - allSkippedIds.length;
  const uniqueAnsweredCount = answeredQuestionIds.size;
  const isAllAnswered = uniqueAnsweredCount >= effectiveTotalQuestions;
  
  log.info({ isAllAnswered, requestedNextSequence, uniqueAnsweredCount, effectiveTotalQuestions }, "Completion check");
  
  // If all questions are answered (accounting for skips), mark as complete
  // BUT: Skip this check if a specific sequence is requested (e.g., retake mode or back navigation)
  // This allows users to review/edit their answers even when all questions are answered
  if (isAllAnswered && requestedNextSequence === undefined) {
    log.info("Returning isComplete=true (all answered, no sequence requested)");
    return {
      question: null,
      isGenerated: false,
      isComplete: true,
      skippedQuestionIds: allSkippedIds,
      totalQuestions: effectiveTotalQuestions,
      answeredQuestions: responses.length,
    };
  }
  
  // If requestedNextSequence is provided, use linear navigation
  // Find the question with the exact sequence number, or find the next available one
  // This is used for retake mode and back navigation where we need to show specific questions
  if (requestedNextSequence !== undefined) {
    // First try to find the exact requested sequence
    let targetQDef = sortedQuestions.find(q => q.order === requestedNextSequence);
    
    // If exact sequence doesn't exist (gaps in order values), find the next available question
    // In retake mode, we want to find ANY question with order >= requested, not just unanswered ones
    if (!targetQDef) {
      // Find the next question in sequence order (may already be answered in retake mode)
      const nextAvailable = sortedQuestions.find(q => q.order >= requestedNextSequence);
      if (nextAvailable) {
        targetQDef = nextAvailable;
      }
    }
    
    if (targetQDef) {
      // First try to find the question in the database by questionKey
      let dbQuestion = dbQuestions.find(q => q.questionKey === targetQDef!.id);
      
      // If not found by questionKey, try by sequence
      if (!dbQuestion) {
        dbQuestion = dbQuestions.find(q => q.sequence === targetQDef!.order);
      }
      
      if (dbQuestion) {
        return {
          question: dbQuestion,
          isGenerated: false,
          isComplete: false,
          skippedQuestionIds: allSkippedIds,
          totalQuestions: effectiveTotalQuestions,
          answeredQuestions: responses.length,
          relevanceScore: 1.0,
        };
      }
      
      // Fallback: Create a generated question using the questionKey as ID
      // This allows responses to be matched by questionKey on subsequent lookups
      const generatedQuestion: GeneratedQuestion = {
        id: targetQDef.id, // Use questionKey directly, not prefixed
        tier: targetQDef.tier,
        dimension: targetQDef.dimension,
        sequence: targetQDef.order,
        questionKey: targetQDef.id,
        prompt: targetQDef.questionText,
        helpText: targetQDef.helpText || null,
        type: targetQDef.questionType,
        options: targetQDef.options || null,
        validation: targetQDef.sliderConfig ? {
          min: targetQDef.sliderConfig.min,
          max: targetQDef.sliderConfig.max,
          labels: targetQDef.sliderConfig.labels,
        } : null,
        scoringConfig: targetQDef.scoringConfig || null,
        isRequired: targetQDef.required,
        isAdaptive: false,
        dependsOn: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        aiGroundingNotes: targetQDef.aiGroundingNotes,
      };
      
      return {
        question: generatedQuestion,
        isGenerated: false,
        isComplete: false,
        skippedQuestionIds: allSkippedIds,
        totalQuestions: effectiveTotalQuestions,
        answeredQuestions: responses.length,
        relevanceScore: 1.0,
      };
    }
    
    // No more unanswered questions with order >= requested - fall through to adaptive logic
  }
  
  // Original adaptive logic (fallback when no specific sequence requested)
  for (const qDef of sortedQuestions) {
    if (answeredQuestionIds.has(qDef.id)) {
      continue;
    }
    
    const relevanceScore = calculateQuestionRelevance(qDef, responses, assessment.tier);
    
    if (relevanceScore.shouldSkip) {
      skippedQuestionIds.push(qDef.id);
      continue;
    }
    
    // First try to find the question in the database by questionKey
    let dbQuestion = dbQuestions.find(q => q.questionKey === qDef.id);
    
    // If not found by questionKey, try by sequence
    if (!dbQuestion) {
      dbQuestion = dbQuestions.find(q => q.sequence === qDef.order);
    }
    
    if (dbQuestion) {
      return {
        question: dbQuestion,
        isGenerated: false,
        isComplete: false,
        skippedQuestionIds: allSkippedIds,
        totalQuestions: effectiveTotalQuestions,
        answeredQuestions: responses.length,
        relevanceScore: relevanceScore.score,
      };
    }
    
    // Fallback: Create a generated question using questionKey as ID
    const generatedQuestion: GeneratedQuestion = {
      id: qDef.id, // Use questionKey directly, not prefixed
      tier: qDef.tier,
      dimension: qDef.dimension,
      sequence: qDef.order,
      questionKey: qDef.id,
      prompt: qDef.questionText,
      helpText: qDef.helpText || null,
      type: qDef.questionType,
      options: qDef.options || null,
      validation: qDef.sliderConfig ? {
        min: qDef.sliderConfig.min,
        max: qDef.sliderConfig.max,
        labels: qDef.sliderConfig.labels,
      } : null,
      scoringConfig: qDef.scoringConfig || null,
      isRequired: qDef.required,
      isAdaptive: false,
      dependsOn: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      aiGroundingNotes: qDef.aiGroundingNotes,
    };
    
    return {
      question: generatedQuestion,
      isGenerated: false,
      isComplete: false,
      skippedQuestionIds: allSkippedIds,
      totalQuestions: effectiveTotalQuestions,
      answeredQuestions: responses.length,
      relevanceScore: relevanceScore.score,
    };
  }
  
  // All questions have been answered or skipped - mark as complete
  return {
    question: null,
    isGenerated: false,
    isComplete: true,
    skippedQuestionIds: allSkippedIds,
    totalQuestions: effectiveTotalQuestions,
    answeredQuestions: responses.length,
  };
}

export async function getNextQuestionWithAdaptive(
  assessmentId: string,
  lastResponse?: FcResponse,
  requestedNextSequence?: number
): Promise<AdaptiveQuestionResult> {
  if (lastResponse) {
    const followUpQuestion = await generateFollowUpQuestion(assessmentId, lastResponse);
    if (followUpQuestion) {
      const assessment = await fcStorage.getAssessmentById(assessmentId);
      const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
      const questionDefinitions = getQuestionDefinitions(assessment?.tier || "pre_assessment");
      
      return {
        question: followUpQuestion,
        isGenerated: true,
        isComplete: false,
        skippedQuestionIds: [],
        totalQuestions: questionDefinitions.length,
        answeredQuestions: responses.length,
        relevanceScore: 1.0,
      };
    }
  }
  
  return getNextQuestion(assessmentId, requestedNextSequence);
}

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  getQuestionDefinitions,
  findQuestionDefinition,
  extractResponseValue,
  applyGuardrails,
  checkFollowUpTriggers,
};
