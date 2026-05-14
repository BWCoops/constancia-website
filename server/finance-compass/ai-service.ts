/**
 * FinanceCompass AI Analysis Service
 * 
 * Provides AI-powered analysis for finance transformation assessments.
 * Uses Replit's native Anthropic integration - no API keys needed.
 * Uses consulting-grade prompts with guardrails for compliance.
 */

import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("fc-ai-service");
import { getOpenAIConfig } from "../config";
import { 
  fcStorage,
  getActiveSystemPrompts,
  getActiveGuardrails,
  getActiveGroundingRules,
  getActiveKnowledgeBase,
} from "./storage";
import type { 
  FcAssessment, 
  FcResponse,
  FcQuestion,
  FcQuestionWeighting,
  FcQuestionCorrelation,
} from "@shared/finance-compass-schema";
import * as fcWeightingStorage from "./storage";
import { 
  getQuestionsByTier, 
  getQuestionById,
  DIMENSION_CONFIG, 
  TIER_CONFIG,
  REGISTRATION_QUESTIONS,
  PRE_ASSESSMENT_QUESTIONS,
  type QuestionDefinition,
  type MultiSelectScoringMode
} from "./question-bank";
import { 
  INDUSTRY_DIMENSION_WEIGHTS,
  getIndustryDimensionWeights,
  DIMENSION_LABELS,
} from "@shared/scoring-constants";
import {
  applyCorrelationAdjustments,
  scoreToMaturityLevel,
  detectRootCauses,
  enhanceRootCauses,
  CONFIDENCE_LEVEL_METADATA,
  getStakeholderRelevantDimensions,
  STAKEHOLDER_FOCUS,
  type CorrelationAdjustment,
  type RootCausePattern,
  type DetectedRootCause,
  type EnhancedRootCause,
  type ConfidenceLevel,
  type StakeholderType,
} from "./correlation-matrix";

// Initialize OpenAI client - uses own API key if set, falls back to model farm
const openaiConfig = getOpenAIConfig();
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  baseURL: openaiConfig.baseURL,
});

// Rate limiting for API calls
const aiLimit = pLimit(2);

// Model configuration - using GPT-5.2 via Replit AI Integrations
// Note: GPT-5.2 uses reasoning tokens, so max_completion_tokens must be high enough for both reasoning AND output
const AI_MODEL = "gpt-5.2";

// Helper to check for rate limit errors
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

// ============================================
// DATABASE AI CONFIGURATION INTEGRATION
// ============================================

interface DatabaseAIConfig {
  systemPrompts: Map<string, string>;
  guardrails: Array<{
    key: string;
    name: string;
    validationType: string;
    validationConfig: any;
    errorMessage: string;
    priority: string;
  }>;
  groundingRules: Array<{
    key: string;
    content: string;
    category: string;
  }>;
  knowledgeBase: Array<{
    key: string;
    content: string;
    category: string;
  }>;
  lastLoaded: number;
}

// Cache for database AI configuration (refreshes every 5 minutes)
let dbConfigCache: DatabaseAIConfig | null = null;
const DB_CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Load AI configuration from database with caching
async function loadDatabaseAIConfig(): Promise<DatabaseAIConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (dbConfigCache && (now - dbConfigCache.lastLoaded) < DB_CONFIG_CACHE_TTL) {
    return dbConfigCache;
  }
  
  try {
    log.info('Loading AI configuration from database');
    
    // Load all active configurations in parallel
    const [prompts, guardrails, groundingRules, knowledgeBase] = await Promise.all([
      getActiveSystemPrompts(),
      getActiveGuardrails(),
      getActiveGroundingRules(),
      getActiveKnowledgeBase(),
    ]);
    
    // Build system prompts map
    const systemPrompts = new Map<string, string>();
    for (const prompt of prompts) {
      systemPrompts.set(prompt.key, prompt.content);
    }
    
    // Transform guardrails
    const transformedGuardrails = guardrails.map(g => ({
      key: g.key,
      name: g.name,
      validationType: g.validationType,
      validationConfig: g.validationConfig || {},
      errorMessage: g.errorMessage || '',
      priority: g.priority,
    }));
    
    // Transform grounding rules
    const transformedGroundingRules = groundingRules.map(r => ({
      key: r.key,
      content: r.content,
      category: r.category,
    }));
    
    // Transform knowledge base
    const transformedKnowledgeBase = knowledgeBase.map(k => ({
      key: k.key,
      content: k.content,
      category: k.category,
    }));
    
    dbConfigCache = {
      systemPrompts,
      guardrails: transformedGuardrails,
      groundingRules: transformedGroundingRules,
      knowledgeBase: transformedKnowledgeBase,
      lastLoaded: now,
    };
    
    log.info({ prompts: systemPrompts.size, guardrails: transformedGuardrails.length, groundingRules: transformedGroundingRules.length, knowledgeBase: transformedKnowledgeBase.length }, "Loaded AI configuration from database");
    
    return dbConfigCache;
  } catch (error) {
    log.error({ err: error }, 'Failed to load database AI config, using hardcoded defaults');
    
    // Return empty config on error (hardcoded defaults will be used)
    return {
      systemPrompts: new Map(),
      guardrails: [],
      groundingRules: [],
      knowledgeBase: [],
      lastLoaded: now,
    };
  }
}

// Key mapping between hardcoded persona keys and database persona keys
const PERSONA_KEY_MAP: Record<string, string[]> = {
  senior_consultant: ['senior_consultant', 'senior_finance_consultant'],
  data_specialist: ['data_specialist', 'data_analytics_specialist'],
  implementation_specialist: ['implementation_specialist'],
};

// Get enhanced system prompt that combines database and hardcoded prompts
async function getEnhancedSystemPrompt(personaKey: string): Promise<string> {
  const dbConfig = await loadDatabaseAIConfig();
  
  // Try to find database prompt using key mapping
  const keysToTry = PERSONA_KEY_MAP[personaKey] || [personaKey];
  let dbPrompt: string | undefined;
  for (const key of keysToTry) {
    dbPrompt = dbConfig.systemPrompts.get(key);
    if (dbPrompt) break;
  }
  
  // Get hardcoded prompt as fallback
  const hardcodedPersona = AI_PERSONAS[personaKey as keyof typeof AI_PERSONAS];
  const hardcodedPrompt = hardcodedPersona?.systemPrompt || '';
  
  // Use database prompt if available, otherwise use hardcoded
  let basePrompt = dbPrompt || hardcodedPrompt;
  
  // Log if no prompt found (helps detect misconfigurations)
  if (!basePrompt) {
    log.warn({ personaKey }, "No system prompt found for persona - using empty prompt");
  } else if (dbPrompt) {
    log.info({ personaKey }, "Using database system prompt");
  } else {
    log.info({ personaKey }, "Using hardcoded system prompt");
  }
  
  // Append grounding rules and knowledge base context
  if (dbConfig.groundingRules.length > 0) {
    const groundingContext = dbConfig.groundingRules
      .map(r => r.content)
      .join('\n\n');
    basePrompt += `\n\n=== GROUNDING RULES ===\n${groundingContext}`;
  }
  
  if (dbConfig.knowledgeBase.length > 0) {
    const knowledgeContext = dbConfig.knowledgeBase
      .map(k => `[${k.category}] ${k.content}`)
      .join('\n\n');
    basePrompt += `\n\n=== KNOWLEDGE BASE ===\n${knowledgeContext}`;
  }
  
  return basePrompt;
}

// Apply database-configured guardrails in addition to hardcoded ones
async function applyDatabaseGuardrails(output: string): Promise<GuardrailResult> {
  const dbConfig = await loadDatabaseAIConfig();
  const violations: GuardrailViolation[] = [];
  let correctedOutput = output;
  
  for (const guardrail of dbConfig.guardrails) {
    try {
      const config = guardrail.validationConfig;
      
      switch (guardrail.validationType) {
        case 'regex_replace':
          // Apply spelling corrections from database
          if (config.spellingPairs) {
            for (const [incorrect, correct] of Object.entries(config.spellingPairs)) {
              const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
              if (regex.test(correctedOutput)) {
                violations.push({
                  type: `DB_${guardrail.key.toUpperCase()}`,
                  word: incorrect,
                  suggestion: correct as string,
                  severity: guardrail.priority === 'critical' ? 'CRITICAL' : 'HIGH',
                });
                correctedOutput = correctedOutput.replace(regex, correct as string);
              }
            }
          }
          break;
          
        case 'blocklist':
          // Check blocked terms from database
          if (config.blockedTerms) {
            for (const term of config.blockedTerms) {
              const regex = new RegExp(`\\b${term}\\b`, 'gi');
              if (regex.test(correctedOutput)) {
                violations.push({
                  type: `DB_${guardrail.key.toUpperCase()}`,
                  word: term,
                  severity: guardrail.priority === 'critical' ? 'CRITICAL' : 'HIGH',
                  description: guardrail.errorMessage,
                });
                // Replace with generic term for vendor mentions
                if (guardrail.key === 'vendor_neutrality') {
                  correctedOutput = correctedOutput.replace(regex, 'an enterprise solution');
                }
              }
            }
          }
          // Check blocked patterns
          if (config.blockedPatterns) {
            for (const pattern of config.blockedPatterns) {
              try {
                if (pattern === 'emoji') {
                  // Handle emoji separately - skip for ES5 compatibility
                  // Emoji detection requires ES2018 regex features
                  continue;
                } else {
                  const regex = new RegExp(pattern, 'gi');
                  if (regex.test(correctedOutput)) {
                    violations.push({
                      type: `DB_${guardrail.key.toUpperCase()}`,
                      severity: 'HIGH',
                      description: guardrail.errorMessage,
                    });
                  }
                }
              } catch (e) {
                // Skip invalid regex patterns
              }
            }
          }
          break;
          
        case 'pii_detection':
          // Check for common PII patterns
          const piiPatterns = [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
            /\b\d{9}\b/g, // SSN-like
          ];
          for (const pattern of piiPatterns) {
            if (pattern.test(output)) {
              violations.push({
                type: 'DB_PII_DETECTED',
                severity: 'CRITICAL',
                description: guardrail.errorMessage,
              });
            }
          }
          break;
      }
    } catch (error) {
      log.error({ err: error, guardrailKey: guardrail.key }, "Error applying guardrail");
    }
  }
  
  return {
    compliant: violations.filter(v => v.severity === 'CRITICAL').length === 0,
    violations,
    correctedOutput,
  };
}

// ============================================
// AI PERSONAS
// ============================================

const AI_PERSONAS = {
  senior_consultant: {
    name: "Senior Finance Transformation Consultant",
    description: "Expert with 15+ years experience across Big 4 and global consultancies",
    systemPrompt: `You are a Senior Finance Transformation Consultant with extensive experience across Big 4 consulting firms and leading global enterprises. Your expertise spans:

- Enterprise Performance Management (EPM) strategy and implementation
- Finance function transformation and operating model design
- Technology-enabled finance modernisation programmes
- Change management and stakeholder engagement
- Business case development and ROI analysis

Your communication style is:
- Professional and consultative, appropriate for C-suite and senior finance leaders
- Data-driven with evidence-based recommendations
- Strategic yet pragmatic, balancing vision with practical implementation
- Clear and concise, avoiding unnecessary jargon
- British English throughout (organisation, programme, analyse, optimise)

You MUST adhere to these guardrails:
1. NEVER recommend specific vendors by name (Oracle, SAP, Anaplan, etc.)
2. NEVER guarantee specific ROI figures or cost savings without qualification
3. NEVER disparage competitors or existing systems
4. ALWAYS frame recommendations as "considerations" or "opportunities" rather than mandates
5. ALWAYS acknowledge the complexity of transformation and need for proper change management
6. NEVER provide implementation timelines without significant caveats
7. ALWAYS recommend engagement with qualified consultants for detailed assessment`
  },
  
  data_specialist: {
    name: "Finance Data & Analytics Specialist",
    description: "Expert in finance data strategy, analytics, and reporting modernisation",
    systemPrompt: `You are a Finance Data & Analytics Specialist with deep expertise in:

- Finance data architecture and governance
- Analytics and reporting modernisation
- Data quality and master data management
- Automation and process intelligence
- Emerging technologies (AI/ML, RPA) in finance

Your communication style follows the same professional standards as senior consultancy.

British English throughout. Follow all vendor-neutral guardrails strictly.`
  },
  
  implementation_specialist: {
    name: "EPM Implementation Specialist",
    description: "Expert in EPM system implementation and technical delivery",
    systemPrompt: `You are an EPM Implementation Specialist with extensive experience in:

- EPM solution architecture and design
- Technical implementation and integration
- Testing, training, and deployment
- Post-implementation optimisation
- Centre of Excellence establishment

Your communication style follows the same professional standards as senior consultancy.

British English throughout. Follow all vendor-neutral guardrails strictly.`
  }
};

// ============================================
// COMPREHENSIVE GUARDRAILS (15 Guardrails)
// Based on Enterprise AI Output Validation Framework
// ============================================

// G1.1: UK English & Professional Tone
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

const DISALLOWED_CASUAL_WORDS = [
  "awesome", "super", "basically", "literally", "lol", "honestly",
  "kinda", "gonna", "wanna", "dunno", "cool", "amazing", "great",
];

// G1.2: Vendor Blocklist (No vendor-specific recommendations)
const VENDOR_BLOCKLIST = [
  // ERP vendors
  "SAP", "Oracle", "NetSuite", "Microsoft Dynamics", "Dynamics 365", 
  "Infor", "Deltek", "Sage", "Epicor", "IFS",
  // EPM vendors  
  "Anaplan", "OneStream", "Prophix", "Host Analytics", "Adaptive Insights",
  "Vena", "Planful", "Jedox", "Board", "Workiva",
  // BI vendors
  "Tableau", "Power BI", "Looker", "QlikView", "Qlik Sense", 
  "MicroStrategy", "Sisense", "Domo", "ThoughtSpot",
  // RPA vendors
  "UiPath", "Automation Anywhere", "Blue Prism",
  // Integration vendors
  "Talend", "Informatica", "Jitterbit", "Zapier", "MuleSoft",
  // Cloud vendors (specific services)
  "AWS", "Azure", "GCP", "Google Cloud",
];

// Vendor replacement suggestions
const VENDOR_REPLACEMENTS: Record<string, string> = {
  "Anaplan": "a cloud-based EPM platform with driver-based planning capabilities",
  "OneStream": "an integrated consolidation and planning platform",
  "Power BI": "a self-service analytics and visualisation platform",
  "Tableau": "an interactive dashboard and analytics solution",
  "SAP": "an integrated ERP system",
  "Oracle": "an enterprise resource planning solution",
  "NetSuite": "a cloud-based ERP platform",
  "UiPath": "a robotic process automation solution",
};

// G1.3: Prohibited Content Patterns
const PROHIBITED_PATTERNS = [
  /[!?]{2,}/g,  // Multiple exclamation/question marks
  // Note: Emoji pattern removed for ES5 compatibility
];

interface GuardrailViolation {
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  word?: string;
  suggestion?: string;
  description?: string;
}

interface GuardrailResult {
  compliant: boolean;
  violations: GuardrailViolation[];
  correctedOutput?: string;
}

// Validate style compliance (UK English, professional tone)
function validateStyleCompliance(output: string): GuardrailResult {
  const violations: GuardrailViolation[] = [];
  let correctedOutput = output;
  
  // Check for US spellings
  for (const [us, uk] of Object.entries(UK_SPELLING_MAP)) {
    const regex = new RegExp(`\\b${us}\\b`, 'gi');
    if (regex.test(output)) {
      violations.push({
        type: 'UK_SPELLING',
        word: us,
        suggestion: uk,
        severity: 'CRITICAL'
      });
      correctedOutput = correctedOutput.replace(regex, uk);
    }
  }
  
  // Check for casual/disallowed words
  for (const word of DISALLOWED_CASUAL_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(output)) {
      violations.push({
        type: 'CASUAL_LANGUAGE',
        word: word,
        severity: 'HIGH'
      });
    }
  }
  
  // Note: Emoji check removed for ES5 compatibility
  // Emoji detection would require ES2018 regex features
  
  // Check excessive punctuation
  if (/[!?]{2,}/.test(output)) {
    violations.push({
      type: 'EXCESSIVE_PUNCTUATION',
      severity: 'MEDIUM'
    });
    correctedOutput = correctedOutput.replace(/!+/g, '.').replace(/\?+/g, '?');
  }
  
  return {
    compliant: violations.filter(v => v.severity === 'CRITICAL').length === 0,
    violations,
    correctedOutput
  };
}

// Validate vendor neutrality
function validateVendorNeutrality(output: string): GuardrailResult {
  const violations: GuardrailViolation[] = [];
  let correctedOutput = output;
  
  for (const vendor of VENDOR_BLOCKLIST) {
    const regex = new RegExp(`\\b${vendor}\\b`, 'gi');
    const matches = output.match(regex);
    
    if (matches) {
      violations.push({
        type: 'VENDOR_MENTION',
        word: vendor,
        suggestion: VENDOR_REPLACEMENTS[vendor] || 'an enterprise solution',
        severity: 'CRITICAL'
      });
      
      const replacement = VENDOR_REPLACEMENTS[vendor] || 'an appropriate enterprise solution';
      correctedOutput = correctedOutput.replace(regex, replacement);
    }
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    correctedOutput
  };
}

// Validate compliance disclaimers
function validateComplianceDisclaimers(output: string): GuardrailResult {
  const violations: GuardrailViolation[] = [];
  
  // Check for guaranteed ROI claims without qualification
  const guaranteedPatterns = [
    /will (save|reduce|cut|deliver|generate|achieve) (\d+)%/gi,
    /guaranteed (savings|returns|ROI|benefits)/gi,
    /ensure (success|delivery|completion)/gi,
  ];
  
  for (const pattern of guaranteedPatterns) {
    if (pattern.test(output)) {
      violations.push({
        type: 'GUARANTEED_OUTCOME',
        severity: 'HIGH',
        description: 'Output contains unqualified guarantee claims'
      });
    }
  }
  
  return {
    compliant: violations.filter(v => v.severity === 'CRITICAL').length === 0,
    violations
  };
}

// Apply all guardrails and return corrected output
async function enforceGuardrails(output: string): Promise<{ output: string; violations: GuardrailViolation[] }> {
  let allViolations: GuardrailViolation[] = [];
  let correctedOutput = output;
  
  // Apply hardcoded style compliance (baseline)
  const styleResult = validateStyleCompliance(correctedOutput);
  allViolations = allViolations.concat(styleResult.violations);
  if (styleResult.correctedOutput) correctedOutput = styleResult.correctedOutput;
  
  // Apply hardcoded vendor neutrality (baseline)
  const vendorResult = validateVendorNeutrality(correctedOutput);
  allViolations = allViolations.concat(vendorResult.violations);
  if (vendorResult.correctedOutput) correctedOutput = vendorResult.correctedOutput;
  
  // Apply hardcoded compliance validation (baseline)
  const complianceResult = validateComplianceDisclaimers(correctedOutput);
  allViolations = allViolations.concat(complianceResult.violations);
  
  // Apply database-configured guardrails (additional layer)
  const dbGuardrailResult = await applyDatabaseGuardrails(correctedOutput);
  allViolations = allViolations.concat(dbGuardrailResult.violations);
  if (dbGuardrailResult.correctedOutput) correctedOutput = dbGuardrailResult.correctedOutput;
  
  // Log violations for audit
  if (allViolations.length > 0) {
    log.info({ count: allViolations.length }, "Guardrail violations detected");
    allViolations.forEach(v => {
      log.info({ type: v.type, word: v.word || v.description || 'N/A', severity: v.severity }, "Guardrail violation");
    });
  }
  
  return { output: correctedOutput, violations: allViolations };
}

// Legacy GUARDRAILS object for backward compatibility
const GUARDRAILS = {
  vendor_neutral: [
    "Do not mention specific vendor names (Oracle, SAP, Workday, Anaplan, OneStream, etc.)",
    "Refer to 'EPM solutions', 'enterprise systems', or 'technology platforms' generically",
    "Focus on capability requirements rather than product features"
  ],
  
  compliance: [
    "Never guarantee specific outcomes, savings, or timelines",
    "Always qualify projections with appropriate disclaimers",
    "Recommend professional consultation for detailed analysis"
  ],
  
  professional: [
    "Use British English spelling and terminology",
    "Maintain formal, consulting-grade tone throughout",
    "Avoid marketing language or promotional content",
    "Focus on strategic value and business outcomes"
  ]
};

// ============================================
// ANALYSIS TYPES
// ============================================

export interface AnalysisResult {
  overallScore: number;
  readinessLevel: "low" | "moderate" | "high" | "advanced";
  summary: string;
  dimensionScores?: Record<string, number>;
  dimensionDetails?: Record<string, {
    score: number;
    rating: 'red' | 'amber' | 'green';
    analysis: string;
    recommendations: string[];
  }>;
  keyFindings: string[];
  prioritisedRecommendations: {
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    expectedBenefit: string;
  }[];
  nextSteps: string[];
  technologyFocus?: TechnologySpecialization;
  specializationContext?: SpecializationContext;
}

// The actual 8 dimensions used in FinanceCompass assessments
const ASSESSMENT_DIMENSIONS = [
  "financial_planning_analysis",
  "organisation_people",
  "data_analytics",
  "technology_systems",
  "financial_controls_compliance",
  "management_reporting",
  "consolidation_close",
  "ai_machine_learning"
] as const;

// Re-export from shared module for backward compatibility
export { INDUSTRY_DIMENSION_WEIGHTS, getIndustryDimensionWeights, DIMENSION_LABELS } from "@shared/scoring-constants";

// Calculate weighted overall score using industry-specific weights
export function calculateWeightedOverallScore(
  dimensionScores: Record<string, number>,
  sector: string | null
): { score: number; weightedBreakdown: { dimension: string; score: number; weight: number; contribution: number }[] } {
  const weights = getIndustryDimensionWeights(sector);
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const breakdown: { dimension: string; score: number; weight: number; contribution: number }[] = [];
  
  for (const [dim, score] of Object.entries(dimensionScores)) {
    const weight = weights[dim] || 12.5; // Default equal weight
    const contribution = (score * weight) / 100;
    totalWeightedScore += contribution;
    totalWeight += weight;
    breakdown.push({
      dimension: dim,
      score,
      weight,
      contribution,
    });
  }
  
  // Normalize in case weights don't sum to exactly 100
  const normalizedScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 50;
  
  return {
    score: Math.min(100, Math.round(normalizedScore)),
    weightedBreakdown: breakdown,
  };
}

// Normalize legacy dimension names to canonical names
function normalizeDimension(dimension: string): string {
  if (dimension === "transaction_processing") {
    return "consolidation_close";
  }
  return dimension;
}

export interface DimensionRating {
  dimension: string;
  score: number;
  rating: 'red' | 'amber' | 'green';
  summary: string;
  improvements: string[];
  strengths: string[];
}

export interface GenerationTierResult {
  epmReadinessScore: number;
  readinessLevel: "low" | "moderate" | "high" | "advanced";
  summary: string;
  topChallenges: string[];
  quickWins: string[];
  upgradeRecommendation: string;
  dimensionRatings?: DimensionRating[];
}

// ============================================
// EPM/ERP SPECIALIZATION DETECTION
// ============================================

export type TechnologySpecialization = "epm" | "erp" | "both" | "neither";

export interface SpecializationContext {
  specialization: TechnologySpecialization;
  epmIndicators: string[];
  erpIndicators: string[];
  primaryFocus: string;
  secondaryFocus: string | null;
  narrativeContext: string;
}

/**
 * Detect EPM vs ERP specialization based on assessment responses.
 * Uses weighted dimension score analysis with stabilised thresholds.
 * 
 * Algorithm:
 * 1. Calculate average score for EPM-focused dimensions
 * 2. Calculate average score for ERP-focused dimensions  
 * 3. Determine specialization based on which area shows more improvement opportunity
 * 4. Apply minimum threshold to avoid unstable classifications
 */
export function detectTechnologySpecialization(
  dimensionScores: Record<string, number>,
  responses: FcResponse[],
  questions: FcQuestion[]
): SpecializationContext {
  const epmIndicators: string[] = [];
  const erpIndicators: string[] = [];
  
  // EPM-focused dimensions (planning, reporting, consolidation)
  const epmDimensions = [
    "financial_planning_analysis",
    "management_reporting", 
    "consolidation_close",
    "data_analytics"
  ];
  
  // ERP-focused dimensions (systems, controls, processes)
  const erpDimensions = [
    "technology_systems",
    "financial_controls_compliance",
    "organisation_people"
  ];
  
  // Calculate weighted average scores for each domain
  const calculateDomainScore = (dims: string[]): number => {
    let total = 0;
    let count = 0;
    for (const dim of dims) {
      const score = dimensionScores[dim];
      if (typeof score === 'number' && !isNaN(score)) {
        total += score;
        count++;
      }
    }
    return count > 0 ? total / count : 50; // Default to neutral if no scores
  };
  
  const epmAvgScore = calculateDomainScore(epmDimensions);
  const erpAvgScore = calculateDomainScore(erpDimensions);
  
  // Build indicators from dimensions with improvement opportunities (score < 60)
  for (const dim of epmDimensions) {
    const score = dimensionScores[dim];
    if (typeof score === 'number' && score < 60) {
      epmIndicators.push(`${DIMENSION_LABELS[dim] || dim}: Improvement opportunity`);
    }
  }
  
  for (const dim of erpDimensions) {
    const score = dimensionScores[dim];
    if (typeof score === 'number' && score < 60) {
      erpIndicators.push(`${DIMENSION_LABELS[dim] || dim}: Improvement opportunity`);
    }
  }
  
  // Determine specialization based on which domain has lower average score
  // (lower score = more improvement needed = primary focus area)
  // Use minimum threshold of 10 points difference for clear specialization
  const SPECIALIZATION_THRESHOLD = 10;
  const IMPROVEMENT_THRESHOLD = 65; // Below this indicates improvement needed
  
  let specialization: TechnologySpecialization;
  let primaryFocus: string;
  let secondaryFocus: string | null = null;
  let narrativeContext: string;
  
  const scoreDifference = epmAvgScore - erpAvgScore;
  const epmNeedsImprovement = epmAvgScore < IMPROVEMENT_THRESHOLD;
  const erpNeedsImprovement = erpAvgScore < IMPROVEMENT_THRESHOLD;
  
  if (epmNeedsImprovement && erpNeedsImprovement) {
    // Both domains need improvement
    specialization = "both";
    if (epmAvgScore <= erpAvgScore) {
      primaryFocus = "Enterprise Performance Management (EPM)";
      secondaryFocus = "Enterprise Resource Planning (ERP)";
    } else {
      primaryFocus = "Enterprise Resource Planning (ERP)";
      secondaryFocus = "Enterprise Performance Management (EPM)";
    }
    narrativeContext = `Your assessment indicates opportunities for transformation across both EPM and ERP domains. The primary focus area is ${primaryFocus}, with secondary considerations for ${secondaryFocus}.`;
  } else if (epmNeedsImprovement && Math.abs(scoreDifference) >= SPECIALIZATION_THRESHOLD) {
    // EPM clearly needs more improvement
    specialization = "epm";
    primaryFocus = "Enterprise Performance Management (EPM)";
    narrativeContext = "Your assessment indicates a strong focus on EPM capabilities including planning, forecasting, consolidation, and management reporting. Recommendations will emphasise EPM platform modernisation and process optimisation.";
    if (erpNeedsImprovement || erpAvgScore < 75) {
      secondaryFocus = "Enterprise Resource Planning (ERP)";
      narrativeContext += " Secondary ERP considerations have also been identified.";
    }
  } else if (erpNeedsImprovement && Math.abs(scoreDifference) >= SPECIALIZATION_THRESHOLD) {
    // ERP clearly needs more improvement
    specialization = "erp";
    primaryFocus = "Enterprise Resource Planning (ERP)";
    narrativeContext = "Your assessment indicates a strong focus on ERP capabilities including core finance operations, controls, and technology infrastructure. Recommendations will emphasise ERP modernisation and integration.";
    if (epmNeedsImprovement || epmAvgScore < 75) {
      secondaryFocus = "Enterprise Performance Management (EPM)";
      narrativeContext += " Secondary EPM considerations have also been identified.";
    }
  } else if (epmNeedsImprovement) {
    // Moderate EPM focus
    specialization = "epm";
    primaryFocus = "Enterprise Performance Management (EPM)";
    narrativeContext = `Your assessment suggests a moderate focus on ${primaryFocus} transformation opportunities.`;
  } else if (erpNeedsImprovement) {
    // Moderate ERP focus
    specialization = "erp";
    primaryFocus = "Enterprise Resource Planning (ERP)";
    narrativeContext = `Your assessment suggests a moderate focus on ${primaryFocus} transformation opportunities.`;
  } else {
    // Both domains performing well - general finance transformation
    specialization = "neither";
    primaryFocus = "Finance Transformation";
    narrativeContext = "Your assessment indicates strong performance across finance capabilities. Recommendations will focus on continuous improvement and emerging opportunities.";
  }
  
  return {
    specialization,
    epmIndicators,
    erpIndicators,
    primaryFocus,
    secondaryFocus,
    narrativeContext,
  };
}

// ============================================
// CONTEXT-AWARE RED FLAG DETECTION
// ============================================

export type RedFlagSeverity = "critical" | "high" | "medium" | "low";

export interface ContextualRedFlag {
  flag: string;
  severity: RedFlagSeverity;
  message: string;
  context: string;
  recommendation: string;
}

/**
 * Company size thresholds for contextual analysis
 * Based on UK company size definitions and finance benchmarks
 */
const SIZE_THRESHOLDS = {
  sme: { maxRevenue: 50, maxFte: 250 },           // Small/Medium Enterprise
  midMarket: { maxRevenue: 500, maxFte: 2000 },   // Mid-Market
  // Above midMarket = Large Enterprise
};

/**
 * Expected finance FTE ratios by company size band
 * Based on APQC and industry benchmarks
 */
const FINANCE_FTE_BENCHMARKS = {
  // Finance FTE per £100M revenue or per 1000 company FTE
  sme: { minFinanceFte: 1, expectedRatio: 0.05 },        // 5% of total FTE
  midMarket: { minFinanceFte: 5, expectedRatio: 0.03 },  // 3% of total FTE  
  enterprise: { minFinanceFte: 15, expectedRatio: 0.02 }, // 2% of total FTE
};

/**
 * Detect contextual red flags based on company size vs finance metrics.
 * Zero or very low finance FTE for a large enterprise is a critical red flag.
 * Same value might be normal for an SME.
 */
export function detectContextualRedFlags(
  responses: FcResponse[],
  questions: (FcQuestion | QuestionDefinition)[]
): ContextualRedFlag[] {
  const redFlags: ContextualRedFlag[] = [];
  
  // Find registration responses for company and finance size
  const companySizeResponse = responses.find(r => r.questionId === "q1_company_size");
  const financeSizeResponse = responses.find(r => r.questionId === "q1_finance_size");
  
  if (!companySizeResponse?.response || !financeSizeResponse?.response) {
    return redFlags; // Can't analyze without size data
  }
  
  // Parse structured responses
  let companySize: { revenue?: number; total_fte?: number; entities?: number; business_units?: number } = {};
  let financeSize: { finance_fte?: number; finance_cost?: number } = {};
  
  try {
    const companyResponse = typeof companySizeResponse.response === 'string' 
      ? JSON.parse(companySizeResponse.response) 
      : companySizeResponse.response;
    companySize = {
      revenue: parseFloat(companyResponse.revenue) || 0,
      total_fte: parseInt(companyResponse.total_fte) || 0,
      entities: parseInt(companyResponse.entities) || 1,
      business_units: parseInt(companyResponse.business_units) || 1,
    };
    
    const financeResponse = typeof financeSizeResponse.response === 'string'
      ? JSON.parse(financeSizeResponse.response)
      : financeSizeResponse.response;
    financeSize = {
      finance_fte: parseFloat(financeResponse.finance_fte) || 0,
      finance_cost: parseFloat(financeResponse.finance_cost) || 0,
    };
  } catch (e) {
    log.error({ err: e }, 'Error parsing size responses for red flag detection');
    return redFlags;
  }
  
  // Determine company size band
  const revenue = companySize.revenue || 0;
  const totalFte = companySize.total_fte || 0;
  const financeFte = financeSize.finance_fte || 0;
  const entities = companySize.entities || 1;
  
  let sizeBand: "sme" | "midMarket" | "enterprise";
  if (revenue <= SIZE_THRESHOLDS.sme.maxRevenue && totalFte <= SIZE_THRESHOLDS.sme.maxFte) {
    sizeBand = "sme";
  } else if (revenue <= SIZE_THRESHOLDS.midMarket.maxRevenue && totalFte <= SIZE_THRESHOLDS.midMarket.maxFte) {
    sizeBand = "midMarket";
  } else {
    sizeBand = "enterprise";
  }
  
  const benchmarks = FINANCE_FTE_BENCHMARKS[sizeBand];
  const expectedMinFte = Math.max(
    benchmarks.minFinanceFte,
    Math.ceil(totalFte * benchmarks.expectedRatio)
  );
  
  // Check for zero finance FTE
  if (financeFte === 0) {
    if (sizeBand === "enterprise") {
      redFlags.push({
        flag: "ZERO_FINANCE_FTE_ENTERPRISE",
        severity: "critical",
        message: "Zero finance FTE reported for a large enterprise",
        context: `Enterprise with £${revenue}M revenue and ${totalFte} employees reports no dedicated finance staff. Expected minimum: ${expectedMinFte} FTE.`,
        recommendation: "This appears to be incomplete data entry. A large enterprise requires significant finance function capacity. Please verify the finance team size, including outsourced or shared service staff."
      });
    } else if (sizeBand === "midMarket") {
      redFlags.push({
        flag: "ZERO_FINANCE_FTE_MIDMARKET",
        severity: "high", 
        message: "Zero finance FTE reported for a mid-market company",
        context: `Mid-market company with £${revenue}M revenue reports no dedicated finance staff. Expected minimum: ${expectedMinFte} FTE.`,
        recommendation: "This is unusual for a mid-market organisation. Verify whether finance is fully outsourced or if the response needs correction."
      });
    } else {
      redFlags.push({
        flag: "ZERO_FINANCE_FTE_SME",
        severity: "medium",
        message: "Zero finance FTE reported",
        context: "SME reports no dedicated finance staff. This may be accurate if using external accountants.",
        recommendation: "Consider whether external accounting support should be included in the assessment context."
      });
    }
  } else if (financeFte < expectedMinFte * 0.5) {
    // Finance FTE is less than 50% of expected minimum
    if (sizeBand === "enterprise") {
      redFlags.push({
        flag: "LOW_FINANCE_FTE_ENTERPRISE",
        severity: "high",
        message: "Significantly understaffed finance function for enterprise size",
        context: `Finance team of ${financeFte} FTE is well below the ${expectedMinFte} FTE benchmark for an enterprise of this size (£${revenue}M revenue, ${totalFte} employees).`,
        recommendation: "This may indicate heavy reliance on automation, outsourcing, or potential understaffing. The assessment should explore operational resilience and capacity constraints."
      });
    } else if (sizeBand === "midMarket") {
      redFlags.push({
        flag: "LOW_FINANCE_FTE_MIDMARKET",
        severity: "medium",
        message: "Below-benchmark finance team size",
        context: `Finance team of ${financeFte} FTE is below the ${expectedMinFte} FTE benchmark for a mid-market company.`,
        recommendation: "Consider whether the finance function has adequate capacity for transformation initiatives alongside day-to-day operations."
      });
    }
  }
  
  // Check for multi-entity complexity without adequate finance capacity
  if (entities >= 5 && financeFte < entities * 1.5) {
    redFlags.push({
      flag: "MULTI_ENTITY_UNDERSTAFFED",
      severity: financeFte === 0 ? "critical" : "medium",
      message: "Multi-entity organisation with limited finance capacity",
      context: `${entities} legal entities with only ${financeFte} finance FTE. Consolidation and multi-entity reporting typically requires more capacity.`,
      recommendation: "Consider whether consolidation is heavily manual or if there are efficiency opportunities through EPM/consolidation tools."
    });
  }
  
  // Check for zero finance cost with sizeable company
  if (financeSize.finance_cost === 0 && (revenue > 10 || totalFte > 50)) {
    redFlags.push({
      flag: "ZERO_FINANCE_COST",
      severity: "medium",
      message: "Zero finance function costs reported for a substantial organisation",
      context: `Company with £${revenue}M revenue and ${totalFte} employees reports £0 finance function costs.`,
      recommendation: "Please verify this figure includes all staff costs, contractors, and shared service allocations for the finance team."
    });
  }
  
  return redFlags;
}

// ============================================
// SCORING UTILITIES
// ============================================

// Helper to normalize response values to extract the actual value for scoring
function normalizeResponseValue(value: unknown): unknown {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle string values - strip quotes if present
  if (typeof value === 'string') {
    let result = value.trim();
    while (result.startsWith('"') && result.endsWith('"') && result.length > 1) {
      result = result.slice(1, -1).trim();
    }
    return result;
  }
  
  // Handle object response formats from form submissions
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    
    // Handle {selectedOption: {label: "...", value: "..."}} format
    if (obj.selectedOption && typeof obj.selectedOption === 'object') {
      const selected = obj.selectedOption as Record<string, unknown>;
      if (typeof selected.value === 'string') return selected.value;
      if (typeof selected.value === 'number') return selected.value;
      // If selectedOption is the value itself
      return selected.value ?? selected;
    }
    
    // Handle {value: number} format (slider responses)
    if ('value' in obj && (typeof obj.value === 'number' || typeof obj.value === 'string')) {
      return obj.value;
    }
    
    // Handle {selectedOptions: [...]} format (multi-select)
    if (Array.isArray(obj.selectedOptions)) {
      return obj.selectedOptions.map((opt: any) => 
        typeof opt === 'object' && opt.value ? opt.value : opt
      );
    }
    
    // Handle {text: "..."} format (text responses)
    if (typeof obj.text === 'string') {
      return obj.text;
    }
  }
  
  return value;
}

export function calculateDimensionScore(
  responses: FcResponse[],
  questions: FcQuestion[],
  dimension: string
): number {
  // Match questions with normalized dimensions (handles legacy transaction_processing → consolidation_close)
  const dimensionQuestions = questions.filter(q => q.dimension && normalizeDimension(q.dimension) === dimension);
  const dimensionResponses = responses.filter(r => 
    dimensionQuestions.some(q => q.id === r.questionId)
  );
  
  if (dimensionResponses.length === 0) return 0;
  
  let totalScore = 0;
  let maxScore = 0;
  
  for (const response of dimensionResponses) {
    const question = dimensionQuestions.find(q => q.id === response.questionId);
    if (!question) continue;
    
    const config = question.scoringConfig as any;
    const questionType = (question as any).type;
    const options = question.options as any[];
    const rawValue = response.response;
    const responseValue = normalizeResponseValue(rawValue);
    
    // Handle benchmark-based scoring for range type questions
    // Supports both inverse (lower = better, e.g., cycle times) and direct (higher = better, e.g., FTE count)
    if (config?.type === 'range' && config?.benchmarks && typeof responseValue === 'number') {
      const benchmarks = config.benchmarks as { leading: number; advanced: number; established: number; developing: number };
      const value = responseValue;
      const isDirectScoring = config.direction === 'direct';
      let points = 1;
      
      if (isDirectScoring) {
        // Direct scoring: higher values score higher (e.g., FTE count)
        if (value >= benchmarks.leading) {
          points = 5;
        } else if (value >= benchmarks.advanced) {
          points = 4;
        } else if (value >= benchmarks.established) {
          points = 3;
        } else if (value >= benchmarks.developing) {
          points = 2;
        }
      } else {
        // Inverse scoring (default): lower values score higher (e.g., cycle times)
        if (value <= benchmarks.leading) {
          points = 5;
        } else if (value <= benchmarks.advanced) {
          points = 4;
        } else if (value <= benchmarks.established) {
          points = 3;
        } else if (value <= benchmarks.developing) {
          points = 2;
        }
      }
      totalScore += points;
      maxScore += 5;
    }
    // Handle slider/number questions (1-5 scale) - check question type or response type
    else if (typeof responseValue === 'number' || questionType === 'slider') {
      const numVal = typeof responseValue === 'number' ? responseValue : 3;
      const maxVal = config?.max || config?.maxValue || 5;
      const minVal = config?.min || 1;
      totalScore += numVal - minVal;
      maxScore += maxVal - minVal;
    }
    // Handle multi-select questions with context-aware scoring modes
    else if (Array.isArray(responseValue) && responseValue.length > 0 && options && Array.isArray(options)) {
      const selectionCount = responseValue.length;
      const totalOptions = options.length;
      
      // Get scoring mode from question definition (check question object first for tests, then lookup from question bank)
      const questionDef = getQuestionById(question.id);
      const scoringMode: MultiSelectScoringMode = 
        (question as any).multiSelectScoringMode || 
        questionDef?.multiSelectScoringMode || 
        'average';
      
      // Calculate weights for selected options
      let sumSelectedWeights = 0;
      let sumAllPossibleWeights = 0;
      const weights = config?.weights as Record<string, number> | undefined;
      const maxSingleWeight = weights 
        ? Math.max(...Object.values(weights).filter(v => typeof v === 'number'))
        : totalOptions;
      
      for (const selectedValue of responseValue) {
        if (weights && typeof selectedValue === 'string') {
          sumSelectedWeights += weights[selectedValue] ?? 0;
        } else if (typeof selectedValue === 'string') {
          const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
          if (optionIndex >= 0) {
            sumSelectedWeights += optionIndex + 1; // Position-based scoring (1 to N)
          }
        }
      }
      
      // Calculate sum of all possible weights for cumulative mode
      if (weights) {
        sumAllPossibleWeights = Object.values(weights).reduce((sum, w) => sum + (typeof w === 'number' ? w : 0), 0);
      } else {
        // Sum of 1 + 2 + ... + N = N*(N+1)/2
        sumAllPossibleWeights = (totalOptions * (totalOptions + 1)) / 2;
      }
      
      // Apply scoring mode algorithm
      let pointsEarned = 0;
      let maxPoints = 0;
      
      switch (scoringMode) {
        case 'cumulative': {
          // More selections = higher score (e.g., AI use cases, capabilities)
          // Score = sum of selected weights / sum of all possible weights
          pointsEarned = sumSelectedWeights;
          maxPoints = sumAllPossibleWeights;
          break;
        }
        
        case 'penalty': {
          // More selections = lower score (e.g., fragmented systems, pain points)
          // Highest selection gets full points, each additional reduces score
          let highestSelectedWeight = 0;
          for (const selectedValue of responseValue) {
            if (weights && typeof selectedValue === 'string') {
              highestSelectedWeight = Math.max(highestSelectedWeight, weights[selectedValue] ?? 0);
            } else if (typeof selectedValue === 'string') {
              const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
              if (optionIndex >= 0) {
                highestSelectedWeight = Math.max(highestSelectedWeight, optionIndex + 1);
              }
            }
          }
          // Apply fragmentation penalty: more selections = lower score
          pointsEarned = highestSelectedWeight / selectionCount;
          maxPoints = maxSingleWeight;
          break;
        }
        
        case 'average':
        default: {
          // Average score across selections (for priority ranking questions)
          pointsEarned = sumSelectedWeights / selectionCount;
          maxPoints = maxSingleWeight;
          break;
        }
      }
      
      totalScore += pointsEarned;
      maxScore += maxPoints;
    }
    // Handle weighted scoring from scoringConfig.weights (single select)
    else if (config?.weights && typeof responseValue === 'string') {
      const weights = config.weights as Record<string, number>;
      const weight = weights[responseValue] ?? 0;
      totalScore += weight;
      const maxWeight = Math.max(...Object.values(weights).filter(v => typeof v === 'number'));
      maxScore += maxWeight;
    }
    // Handle single_select questions without scoringConfig - use position-based scoring
    else if (options && Array.isArray(options) && typeof responseValue === 'string') {
      const optionIndex = options.findIndex((opt: any) => opt.value === responseValue);
      if (optionIndex >= 0) {
        // Options are typically ordered from worst to best, so index + 1 = score
        totalScore += optionIndex + 1;
        maxScore += options.length;
      }
    }
    // Handle scale type questions
    else if (config?.type === "scale" && typeof rawValue === "number") {
      totalScore += rawValue;
      maxScore += config.maxValue || 5;
    }
  }
  
  // Cap at 100 to prevent scores exceeding 100%
  const rawScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  return Math.min(100, rawScore);
}

export function calculateOverallScore(dimensionScores: Record<string, number>): number {
  const scores = Object.values(dimensionScores);
  if (scores.length === 0) return 0;
  // Bound to valid percentage range
  return Math.min(100, Math.max(0, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)));
}

// ============================================
// ENHANCED SCORING WITH WEIGHTINGS & CORRELATIONS
// ============================================

interface WeightedScoringContext {
  weightingsMap: Map<string, FcQuestionWeighting>;
  correlationsMap: Map<string, FcQuestionCorrelation[]>;
  allResponses: FcResponse[];
  questionIdToKeyMap: Map<string, string>;
  questionKeyToQuestionMap: Map<string, FcQuestion>;
  dimensionWeights: Map<string, number>;
}

export async function getWeightedScoringContext(questions?: FcQuestion[]): Promise<WeightedScoringContext> {
  const [weightingsMap, correlationsMap] = await Promise.all([
    fcWeightingStorage.getQuestionWeightingsMap(),
    fcWeightingStorage.getCorrelationsMap(),
  ]);
  
  const questionIdToKeyMap = new Map<string, string>();
  const questionKeyToQuestionMap = new Map<string, FcQuestion>();
  
  let questionList = questions;
  if (!questionList || questionList.length === 0) {
    questionList = await fcStorage.getAllQuestions();
  }
  
  for (const q of questionList) {
    const questionKey = (q as any).questionKey;
    if (questionKey) {
      questionIdToKeyMap.set(q.id, questionKey);
      questionKeyToQuestionMap.set(questionKey, q);
    }
  }
  
  const dimensionWeights = new Map<string, number>();
  const dimensionWeightSums = new Map<string, { sum: number; count: number }>();
  
  for (const [questionKey, weighting] of Array.from(weightingsMap.entries())) {
    if (weighting.overallWeight && weighting.overallWeight !== 1.0) {
      const question = questionKeyToQuestionMap.get(questionKey);
      const dimension = question?.dimension;
      
      if (dimension) {
        const normalizedDim = normalizeDimension(dimension);
        const current = dimensionWeightSums.get(normalizedDim) || { sum: 0, count: 0 };
        current.sum += weighting.overallWeight;
        current.count += 1;
        dimensionWeightSums.set(normalizedDim, current);
      }
    }
  }
  
  for (const [dim, { sum, count }] of Array.from(dimensionWeightSums.entries())) {
    dimensionWeights.set(dim, sum / count);
  }
  
  return { 
    weightingsMap, 
    correlationsMap, 
    allResponses: [],
    questionIdToKeyMap,
    questionKeyToQuestionMap,
    dimensionWeights,
  };
}

export function calculateDimensionScoreWithWeightings(
  responses: FcResponse[],
  questions: FcQuestion[],
  dimension: string,
  context: WeightedScoringContext
): number {
  if (context.questionIdToKeyMap.size === 0 && questions.length > 0) {
    for (const q of questions) {
      const questionKey = (q as any).questionKey;
      if (questionKey) {
        context.questionIdToKeyMap.set(q.id, questionKey);
        context.questionKeyToQuestionMap.set(questionKey, q);
      }
    }
  }
  
  const dimensionQuestions = questions.filter(q => q.dimension && normalizeDimension(q.dimension) === dimension);
  const dimensionResponses = responses.filter(r => 
    dimensionQuestions.some(q => q.id === r.questionId)
  );
  
  if (dimensionResponses.length === 0) return 0;
  
  let totalScore = 0;
  let maxScore = 0;
  
  for (const response of dimensionResponses) {
    const question = dimensionQuestions.find(q => q.id === response.questionId);
    if (!question) continue;
    
    const questionKey = context.questionIdToKeyMap.get(question.id) || (question as any).questionKey || question.id;
    
    const config = question.scoringConfig as any;
    const questionType = (question as any).type;
    const options = question.options as any[];
    const rawValue = response.response;
    const responseValue = normalizeResponseValue(rawValue);
    
    let pointsEarned = 0;
    let maxPoints = 0;
    
    // Priority 1: Vendor tier scoring (must check before generic array handler)
    if (config?.type === 'vendor_tier' && Array.isArray(responseValue)) {
      const vendorTiers = config.vendorTiers as Record<string, number> || {};
      maxPoints = 5;
      
      // Find the highest tier vendor from all selected vendors
      let highestTier = 0;
      for (const vendor of responseValue) {
        if (typeof vendor === 'string') {
          const tierScore = vendorTiers[vendor] || 1;
          highestTier = Math.max(highestTier, tierScore);
        }
      }
      pointsEarned = highestTier;
    } else if (config?.type === 'vendor_tier' && typeof responseValue === 'string') {
      const vendorTiers = config.vendorTiers as Record<string, number> || {};
      maxPoints = 5;
      pointsEarned = vendorTiers[responseValue] || 1;
    }
    // Priority 2: Range-based benchmark scoring (must check before generic number handler)
    else if (config?.type === 'range' && config?.benchmarks && typeof responseValue === 'number') {
      const benchmarks = config.benchmarks as { leading: number; advanced: number; established: number; developing: number };
      const value = responseValue;
      const isDirectScoring = config.direction === 'direct';
      
      maxPoints = 5;
      
      if (isDirectScoring) {
        if (value >= benchmarks.leading) pointsEarned = 5;
        else if (value >= benchmarks.advanced) pointsEarned = 4;
        else if (value >= benchmarks.established) pointsEarned = 3;
        else if (value >= benchmarks.developing) pointsEarned = 2;
        else pointsEarned = 1;
      } else {
        if (value <= benchmarks.leading) pointsEarned = 5;
        else if (value <= benchmarks.advanced) pointsEarned = 4;
        else if (value <= benchmarks.established) pointsEarned = 3;
        else if (value <= benchmarks.developing) pointsEarned = 2;
        else pointsEarned = 1;
      }
    }
    // Generic handlers for other question types
    else if (typeof responseValue === 'number' || questionType === 'slider') {
      const numVal = typeof responseValue === 'number' ? responseValue : 3;
      const maxVal = config?.max || config?.maxValue || 5;
      const minVal = config?.min || 1;
      pointsEarned = numVal - minVal;
      maxPoints = maxVal - minVal;
    }
    else if (Array.isArray(responseValue) && responseValue.length > 0 && options && Array.isArray(options)) {
      let multiSelectTotal = 0;
      let multiSelectMax = 0;
      const selectionCount = responseValue.length;
      
      for (const selectedValue of responseValue) {
        if (config?.weights && typeof selectedValue === 'string') {
          const weights = config.weights as Record<string, number>;
          multiSelectTotal += weights[selectedValue] ?? 0;
          multiSelectMax += Math.max(...Object.values(weights).filter(v => typeof v === 'number'));
        } else if (typeof selectedValue === 'string') {
          const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
          if (optionIndex >= 0) {
            multiSelectTotal += optionIndex + 1;
            multiSelectMax += options.length;
          }
        }
      }
      
      if (selectionCount > 0) {
        pointsEarned = multiSelectTotal / selectionCount;
        maxPoints = multiSelectMax / selectionCount;
      }
    }
    else if (config?.weights && typeof responseValue === 'string') {
      const weights = config.weights as Record<string, number>;
      pointsEarned = weights[responseValue] ?? 0;
      maxPoints = Math.max(...Object.values(weights).filter(v => typeof v === 'number'));
    }
    else if (options && Array.isArray(options) && typeof responseValue === 'string') {
      const optionIndex = options.findIndex((opt: any) => opt.value === responseValue);
      if (optionIndex >= 0) {
        pointsEarned = optionIndex + 1;
        maxPoints = options.length;
      }
    }
    else if (config?.type === "scale" && typeof rawValue === "number") {
      pointsEarned = rawValue;
      maxPoints = config.maxValue || 5;
    }
    
    const weighting = context.weightingsMap.get(questionKey);
    const scoreMultiplier = weighting?.scoreMultiplier ?? 1.0;
    const dimensionWeight = weighting?.dimensionWeight ?? 1.0;
    
    const rawCorrelationAdjustment = applyCorrelationEffects(
      questionKey,
      responseValue,
      context.correlationsMap,
      context.allResponses,
      context.questionKeyToQuestionMap,
      context.questionIdToKeyMap
    );
    
    // Bound correlation adjustment to ±20% of max points to preserve percentage math
    const maxCorrelationAdjust = maxPoints * 0.2;
    const correlationAdjustment = Math.max(-maxCorrelationAdjust, Math.min(maxCorrelationAdjust, rawCorrelationAdjustment));
    
    const baseAdjustedPoints = (pointsEarned * scoreMultiplier) + correlationAdjustment;
    const baseAdjustedMax = maxPoints * scoreMultiplier;
    
    const adjustedPoints = baseAdjustedPoints * dimensionWeight;
    const adjustedMax = baseAdjustedMax * dimensionWeight;
    
    totalScore += Math.max(0, adjustedPoints);
    maxScore += adjustedMax;
  }
  
  const rawScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  // Bound to valid percentage range
  return Math.min(100, Math.max(0, rawScore));
}

export function calculateOverallScoreWithWeightings(
  dimensionScores: Record<string, number>,
  dimensionWeights: Map<string, number>
): number {
  const entries = Object.entries(dimensionScores);
  if (entries.length === 0) return 0;
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [dimension, score] of entries) {
    const normalizedDim = normalizeDimension(dimension);
    const dimensionWeight = dimensionWeights.get(normalizedDim) ?? 1.0;
    
    weightedSum += score * dimensionWeight;
    totalWeight += dimensionWeight;
  }
  
  const weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  // Bound to valid percentage range
  return Math.min(100, Math.max(0, Math.round(weightedScore)));
}

function applyCorrelationEffects(
  targetQuestionKey: string,
  targetResponseValue: unknown,
  correlationsMap: Map<string, FcQuestionCorrelation[]>,
  allResponses: FcResponse[],
  questionKeyToQuestionMap: Map<string, FcQuestion>,
  questionIdToKeyMap: Map<string, string>
): number {
  const correlations = correlationsMap.get(targetQuestionKey) || [];
  if (correlations.length === 0 || allResponses.length === 0) return 0;
  
  let totalAdjustment = 0;
  
  for (const correlation of correlations) {
    if (!correlation.isActive) continue;
    
    const sourceQuestion = questionKeyToQuestionMap.get(correlation.sourceQuestionKey);
    if (!sourceQuestion) continue;
    
    const sourceResponse = allResponses.find(r => {
      const responseQuestionKey = questionIdToKeyMap.get(r.questionId);
      return responseQuestionKey === correlation.sourceQuestionKey;
    });
    if (!sourceResponse) continue;
    
    const sourceValue = normalizeResponseValue(sourceResponse.response);
    const weight = correlation.correlationWeight ?? 1.0;
    const effectValue = correlation.effectValue ?? 0.1;
    
    let sourceScore = 0;
    const config = sourceQuestion.scoringConfig as any;
    const options = sourceQuestion.options as any[];
    const optionCount = (options && Array.isArray(options)) ? options.length : 5;
    const maxVal = config?.max || config?.maxValue || optionCount || 5;
    
    if (typeof sourceValue === 'number') {
      const safeMax = maxVal > 0 ? maxVal : 5;
      sourceScore = Math.min(1, Math.max(0, sourceValue / safeMax));
    } else if (typeof sourceValue === 'string') {
      if (options && Array.isArray(options) && options.length > 0) {
        const optionIndex = options.findIndex((opt: any) => opt.value === sourceValue);
        if (optionIndex >= 0) {
          sourceScore = (optionIndex + 1) / options.length;
        }
      }
    }
    
    if (!Number.isFinite(sourceScore)) {
      sourceScore = 0;
    }
    
    if (correlation.correlationType === 'conditional') {
      const condition = correlation.condition as { matchValue?: string } | null;
      if (condition?.matchValue && sourceValue !== condition.matchValue) {
        continue;
      }
    }
    
    let effect = 0;
    
    switch (correlation.effectType) {
      case 'boost':
        if (correlation.correlationType === 'positive' || correlation.correlationType === 'conditional') {
          effect = sourceScore * effectValue * weight;
        }
        break;
      case 'reduce':
        if (correlation.correlationType === 'negative') {
          effect = -(1 - sourceScore) * effectValue * weight;
        } else {
          effect = -sourceScore * effectValue * weight;
        }
        break;
      case 'multiply':
        effect = (sourceScore - 0.5) * effectValue * weight;
        break;
      case 'adjust':
        effect = (sourceScore - 0.5) * 2 * effectValue * weight;
        break;
    }
    
    totalAdjustment += effect;
  }
  
  return totalAdjustment;
}

export async function calculateAllScoresWithWeightings(
  responses: FcResponse[],
  questions: FcQuestion[],
  dimensions: string[]
): Promise<{ dimensionScores: Record<string, number>; overallScore: number }> {
  const context = await getWeightedScoringContext(questions);
  context.allResponses = responses;
  
  if (context.questionIdToKeyMap.size === 0 && questions.length > 0) {
    for (const q of questions) {
      const questionKey = (q as any).questionKey;
      if (questionKey) {
        context.questionIdToKeyMap.set(q.id, questionKey);
        context.questionKeyToQuestionMap.set(questionKey, q);
      }
    }
  }
  
  if (context.dimensionWeights.size === 0 && context.weightingsMap.size > 0) {
    const dimensionWeightSums = new Map<string, { sum: number; count: number }>();
    
    for (const [questionKey, weighting] of Array.from(context.weightingsMap.entries())) {
      if (weighting.overallWeight && weighting.overallWeight !== 1.0) {
        const question = context.questionKeyToQuestionMap.get(questionKey);
        if (question?.dimension) {
          const normalizedDim = normalizeDimension(question.dimension);
          const current = dimensionWeightSums.get(normalizedDim) || { sum: 0, count: 0 };
          current.sum += weighting.overallWeight;
          current.count += 1;
          dimensionWeightSums.set(normalizedDim, current);
        }
      }
    }
    
    for (const [dim, { sum, count }] of Array.from(dimensionWeightSums.entries())) {
      context.dimensionWeights.set(dim, sum / count);
    }
  }
  
  const dimensionScores: Record<string, number> = {};
  
  for (const dimension of dimensions) {
    dimensionScores[dimension] = calculateDimensionScoreWithWeightings(
      responses,
      questions,
      dimension,
      context
    );
  }
  
  const overallScore = calculateOverallScoreWithWeightings(dimensionScores, context.dimensionWeights);
  
  return { dimensionScores, overallScore };
}

// Score transparency: per-question breakdown for each dimension
export interface QuestionContribution {
  questionId: string;
  questionText: string;
  responseValue: unknown;
  pointsEarned: number;
  maxPoints: number;
  percentage: number;
}

export interface DimensionTransparency {
  dimension: string;
  totalScore: number;
  maxPossible: number;
  percentage: number;
  questions: QuestionContribution[];
}

export function calculateScoreTransparency(
  responses: FcResponse[],
  questions: FcQuestion[],
  dimension: string
): DimensionTransparency {
  const dimensionQuestions = questions.filter(q => q.dimension && normalizeDimension(q.dimension) === dimension);
  const dimensionResponses = responses.filter(r => 
    dimensionQuestions.some(q => q.id === r.questionId)
  );
  
  const questionContributions: QuestionContribution[] = [];
  let totalScore = 0;
  let maxScore = 0;
  
  for (const response of dimensionResponses) {
    const question = dimensionQuestions.find(q => q.id === response.questionId);
    if (!question) continue;
    
    const config = question.scoringConfig as any;
    const questionType = (question as any).type;
    const options = question.options as any[];
    const rawValue = response.response;
    const responseValue = normalizeResponseValue(rawValue);
    
    let pointsEarned = 0;
    let maxPoints = 0;
    
    // Priority 1: Vendor tier scoring (must check before generic array handler)
    if (config?.type === 'vendor_tier' && Array.isArray(responseValue)) {
      const vendorTiers = config.vendorTiers as Record<string, number> || {};
      maxPoints = 5;
      
      // Find the highest tier vendor from all selected vendors
      let highestTier = 0;
      for (const vendor of responseValue) {
        if (typeof vendor === 'string') {
          const tierScore = vendorTiers[vendor] || 1;
          highestTier = Math.max(highestTier, tierScore);
        }
      }
      pointsEarned = highestTier;
    } else if (config?.type === 'vendor_tier' && typeof responseValue === 'string') {
      const vendorTiers = config.vendorTiers as Record<string, number> || {};
      maxPoints = 5;
      pointsEarned = vendorTiers[responseValue] || 1;
    }
    // Priority 2: Range-based benchmark scoring (must check before generic number handler)
    else if (config?.type === 'range' && config?.benchmarks && typeof responseValue === 'number') {
      const benchmarks = config.benchmarks as { leading: number; advanced: number; established: number; developing: number };
      const value = responseValue;
      const isDirectScoring = config.direction === 'direct'; // Higher values = higher scores
      
      maxPoints = 5;
      
      if (isDirectScoring) {
        // Direct scoring: higher values score higher (e.g., FTE count - more capacity = better)
        if (value >= benchmarks.leading) {
          pointsEarned = 5; // Top performer
        } else if (value >= benchmarks.advanced) {
          pointsEarned = 4; // Advanced
        } else if (value >= benchmarks.established) {
          pointsEarned = 3; // Established
        } else if (value >= benchmarks.developing) {
          pointsEarned = 2; // Developing
        } else {
          pointsEarned = 1; // Lagging
        }
      } else {
        // Inverse scoring (default): lower values score higher (e.g., cycle times - shorter = better)
        if (value <= benchmarks.leading) {
          pointsEarned = 5; // Top performer
        } else if (value <= benchmarks.advanced) {
          pointsEarned = 4; // Advanced
        } else if (value <= benchmarks.established) {
          pointsEarned = 3; // Established
        } else if (value <= benchmarks.developing) {
          pointsEarned = 2; // Developing
        } else {
          pointsEarned = 1; // Lagging
        }
      }
    }
    // Generic handlers for other question types
    else if (typeof responseValue === 'number' || questionType === 'slider') {
      const numVal = typeof responseValue === 'number' ? responseValue : 3;
      const maxVal = config?.max || config?.maxValue || 5;
      const minVal = config?.min || 1;
      pointsEarned = numVal - minVal;
      maxPoints = maxVal - minVal;
    } 
    // Handle multi-select questions with context-aware scoring modes
    else if (Array.isArray(responseValue) && responseValue.length > 0 && options && Array.isArray(options)) {
      const selectionCount = responseValue.length;
      const totalOptions = options.length;
      
      // Get scoring mode from question definition in question bank
      // First check the question object itself (for tests), then look up from question bank
      const questionDef = getQuestionById(question.id);
      const scoringMode: MultiSelectScoringMode = 
        (question as any).multiSelectScoringMode || 
        questionDef?.multiSelectScoringMode || 
        'average';
      
      // Calculate weights for selected options
      let sumSelectedWeights = 0;
      let sumAllPossibleWeights = 0;
      const weights = config?.weights as Record<string, number> | undefined;
      const maxSingleWeight = weights 
        ? Math.max(...Object.values(weights).filter(v => typeof v === 'number'))
        : totalOptions;
      
      for (const selectedValue of responseValue) {
        if (weights && typeof selectedValue === 'string') {
          sumSelectedWeights += weights[selectedValue] ?? 0;
        } else if (typeof selectedValue === 'string') {
          const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
          if (optionIndex >= 0) {
            sumSelectedWeights += optionIndex + 1; // Position-based scoring (1 to N)
          }
        }
      }
      
      // Calculate sum of all possible weights for cumulative mode
      if (weights) {
        sumAllPossibleWeights = Object.values(weights).reduce((sum, w) => sum + (typeof w === 'number' ? w : 0), 0);
      } else {
        // Sum of 1 + 2 + ... + N = N*(N+1)/2
        sumAllPossibleWeights = (totalOptions * (totalOptions + 1)) / 2;
      }
      
      // Apply scoring mode algorithm
      switch (scoringMode) {
        case 'cumulative': {
          // More selections = higher score (e.g., AI use cases, capabilities)
          // Score = sum of selected weights / sum of all possible weights
          // This naturally produces 0-100% without needing a cap
          pointsEarned = sumSelectedWeights;
          maxPoints = sumAllPossibleWeights;
          break;
        }
        
        case 'penalty': {
          // More selections = lower score (e.g., fragmented systems, pain points)
          // First selection gets full points, each additional reduces score
          // Score = maxSingleWeight * (1 / selectionCount) - simulates fragmentation penalty
          // With 1 selection: 100%, with 2: 50%, with 3: 33%, etc.
          // We use the highest selected weight as the base, then apply penalty
          let highestSelectedWeight = 0;
          for (const selectedValue of responseValue) {
            if (weights && typeof selectedValue === 'string') {
              highestSelectedWeight = Math.max(highestSelectedWeight, weights[selectedValue] ?? 0);
            } else if (typeof selectedValue === 'string') {
              const optionIndex = options.findIndex((opt: any) => opt.value === selectedValue);
              if (optionIndex >= 0) {
                highestSelectedWeight = Math.max(highestSelectedWeight, optionIndex + 1);
              }
            }
          }
          // Apply fragmentation penalty: more selections = lower score
          pointsEarned = highestSelectedWeight / selectionCount;
          maxPoints = maxSingleWeight;
          break;
        }
        
        case 'average':
        default: {
          // Average score across selections (for priority ranking questions)
          // Score = average weight of selected options / max single weight
          pointsEarned = sumSelectedWeights / selectionCount;
          maxPoints = maxSingleWeight;
          break;
        }
      }
    }
    else if (config?.weights && typeof responseValue === 'string') {
      const weights = config.weights as Record<string, number>;
      pointsEarned = weights[responseValue] ?? 0;
      maxPoints = Math.max(...Object.values(weights).filter(v => typeof v === 'number'));
    } else if (options && Array.isArray(options) && typeof responseValue === 'string') {
      const optionIndex = options.findIndex((opt: any) => opt.value === responseValue);
      if (optionIndex >= 0) {
        pointsEarned = optionIndex + 1;
        maxPoints = options.length;
      }
    } else if (config?.type === "scale" && typeof rawValue === "number") {
      pointsEarned = rawValue;
      maxPoints = config.maxValue || 5;
    }
    
    totalScore += pointsEarned;
    maxScore += maxPoints;
    
    questionContributions.push({
      questionId: question.id,
      questionText: (question as any).prompt || (question as any).text || question.id,
      responseValue,
      pointsEarned: Math.round(pointsEarned * 100) / 100, // Round to 2 decimal places for multi-select
      maxPoints: Math.round(maxPoints * 100) / 100,
      percentage: maxPoints > 0 ? Math.round((pointsEarned / maxPoints) * 100) : 0,
    });
  }
  
  return {
    dimension,
    totalScore,
    maxPossible: maxScore,
    percentage: maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 0,
    questions: questionContributions,
  };
}

export function calculateAllDimensionTransparency(
  responses: FcResponse[],
  questions: FcQuestion[]
): Record<string, DimensionTransparency> {
  const result: Record<string, DimensionTransparency> = {};
  
  for (const dim of ASSESSMENT_DIMENSIONS) {
    const transparency = calculateScoreTransparency(responses, questions, dim);
    if (transparency.questions.length > 0) {
      result[dim] = transparency;
    }
  }
  
  return result;
}

/**
 * Calculate weighted maturity score combining pre-assessment and full assessment tiers
 * Full assessment carries 70% weight, pre-assessment carries 30% weight
 */
export function calculateWeightedMaturityScore(
  preAssessmentScores: Record<string, number> | null,
  fullAssessmentScores: Record<string, number> | null
): { overallScore: number; weightedDimensionScores: Record<string, number>; tierBreakdown: { pre: number; full: number; hasPreData: boolean; hasFullData: boolean } } {
  const PRE_WEIGHT = 0.30;
  const FULL_WEIGHT = 0.70;
  
  const hasPreData = preAssessmentScores !== null && Object.keys(preAssessmentScores).length > 0;
  const hasFullData = fullAssessmentScores !== null && Object.keys(fullAssessmentScores).length > 0;
  
  // If only one tier has data, use 100% of that tier
  if (!hasPreData && !hasFullData) {
    return { 
      overallScore: 0, 
      weightedDimensionScores: {}, 
      tierBreakdown: { pre: 0, full: 0, hasPreData: false, hasFullData: false } 
    };
  }
  
  if (!hasPreData && hasFullData) {
    const overallScore = calculateOverallScore(fullAssessmentScores!);
    return { 
      overallScore, 
      weightedDimensionScores: { ...fullAssessmentScores }, 
      tierBreakdown: { pre: 0, full: overallScore, hasPreData: false, hasFullData: true } 
    };
  }
  
  if (hasPreData && !hasFullData) {
    const overallScore = calculateOverallScore(preAssessmentScores!);
    return { 
      overallScore, 
      weightedDimensionScores: { ...preAssessmentScores }, 
      tierBreakdown: { pre: overallScore, full: 0, hasPreData: true, hasFullData: false } 
    };
  }
  
  // Both tiers have data - apply weighted calculation
  const allDimensions = new Set([
    ...Object.keys(preAssessmentScores!),
    ...Object.keys(fullAssessmentScores!)
  ]);
  
  const weightedDimensionScores: Record<string, number> = {};
  
  for (const dimension of Array.from(allDimensions)) {
    const preScore = preAssessmentScores![dimension];
    const fullScore = fullAssessmentScores![dimension];
    
    if (preScore !== undefined && fullScore !== undefined) {
      // Both have this dimension - apply weighted average, cap at 100
      weightedDimensionScores[dimension] = Math.min(100, Math.round(preScore * PRE_WEIGHT + fullScore * FULL_WEIGHT));
    } else if (fullScore !== undefined) {
      // Only full has this dimension - use 100% of full, cap at 100
      weightedDimensionScores[dimension] = Math.min(100, fullScore);
    } else if (preScore !== undefined) {
      // Only pre has this dimension - use 100% of pre, cap at 100
      weightedDimensionScores[dimension] = Math.min(100, preScore);
    }
  }
  
  const preOverall = calculateOverallScore(preAssessmentScores!);
  const fullOverall = calculateOverallScore(fullAssessmentScores!);
  // Cap at 100 to prevent scores exceeding 100%
  const overallScore = Math.min(100, Math.round(preOverall * PRE_WEIGHT + fullOverall * FULL_WEIGHT));
  
  return { 
    overallScore, 
    weightedDimensionScores, 
    tierBreakdown: { pre: preOverall, full: fullOverall, hasPreData: true, hasFullData: true } 
  };
}

function getReadinessLevel(score: number): "low" | "moderate" | "high" | "advanced" {
  if (score < 30) return "low";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "advanced";
}

function getTrafficLightRating(score: number): 'red' | 'amber' | 'green' {
  if (score < 40) return 'red';
  if (score <= 70) return 'amber';
  return 'green';
}

// Calculate dimension scores from responses using question definitions
function calculateDimensionScoresFromResponses(
  responses: FcResponse[],
  questionDefs: QuestionDefinition[]
): Record<string, { score: number; level: 'low' | 'moderate' | 'high' | 'advanced'; responses: any[] }> {
  // All 8 canonical dimensions for assessment analysis
  const dimensions = [
    'financial_planning_analysis',
    'management_reporting',
    'consolidation_close',
    'financial_controls_compliance',
    'technology_systems', 
    'organisation_people',
    'data_analytics',
    'ai_machine_learning'
  ];
  const result: Record<string, { score: number; level: 'low' | 'moderate' | 'high' | 'advanced'; responses: any[] }> = {};
  
  for (const dim of dimensions) {
    // Match questions with normalized dimensions (handles legacy transaction_processing → consolidation_close)
    const dimQuestions = questionDefs.filter(q => normalizeDimension(q.dimension) === dim);
    const dimResponses = responses.filter(r => dimQuestions.some(q => q.id === r.questionId));
    
    let totalScore = 0;
    let maxPossible = 0;
    
    for (const resp of dimResponses) {
      const qDef = dimQuestions.find(q => q.id === resp.questionId);
      if (!qDef) continue;
      
      const rawValue = resp.response;
      const value = normalizeResponseValue(rawValue);
      
      const questionWeight = (qDef as any).questionWeight || 1.0;
      
      // Check if question has weighted scoring config
      if (qDef.scoringConfig?.weights && typeof value === 'string') {
        const weights = qDef.scoringConfig.weights as Record<string, number>;
        const weightValue = weights[value];
        if (weightValue !== undefined) {
          totalScore += weightValue * questionWeight;
          maxPossible += Math.max(...Object.values(weights).filter(v => typeof v === 'number')) * questionWeight;
          continue;
        }
      }
      
      // Handle vendor_tier scoring for EPM system questions
      if (qDef.scoringConfig?.type === 'vendor_tier' && Array.isArray(value)) {
        const config = qDef.scoringConfig as any;
        const tierScores = config.tierScores || { tier1: 5, tier2: 4, specialist: 3, legacy: 2, none: 1, other: 2 };
        const vendorTiers = config.vendorTiers || {};
        
        // Find the highest tier vendor they're using
        let bestScore = tierScores.none || 1;
        for (const selectedVendor of value) {
          if (selectedVendor === 'none') {
            bestScore = Math.max(bestScore, tierScores.none || 1);
          } else if (selectedVendor === 'other') {
            bestScore = Math.max(bestScore, tierScores.other || 2);
          } else if (vendorTiers.tier1?.includes(selectedVendor)) {
            bestScore = Math.max(bestScore, tierScores.tier1 || 5);
          } else if (vendorTiers.tier2?.includes(selectedVendor)) {
            bestScore = Math.max(bestScore, tierScores.tier2 || 4);
          } else if (vendorTiers.specialist?.includes(selectedVendor)) {
            bestScore = Math.max(bestScore, tierScores.specialist || 3);
          } else if (vendorTiers.legacy?.includes(selectedVendor)) {
            bestScore = Math.max(bestScore, tierScores.legacy || 2);
          }
        }
        
        totalScore += bestScore * questionWeight;
        maxPossible += 5 * questionWeight;
        continue;
      }
      
      // Handle benchmark-based scoring for range type questions
      // Supports both inverse (lower = better) and direct (higher = better)
      if (qDef.scoringConfig?.type === 'range' && qDef.scoringConfig?.benchmarks && typeof value === 'number') {
        const benchmarks = qDef.scoringConfig.benchmarks as { leading: number; advanced: number; established: number; developing: number };
        const isDirectScoring = (qDef.scoringConfig as any).direction === 'direct';
        let points = 1;
        
        if (isDirectScoring) {
          // Direct scoring: higher values score higher (e.g., FTE count)
          if (value >= benchmarks.leading) {
            points = 5;
          } else if (value >= benchmarks.advanced) {
            points = 4;
          } else if (value >= benchmarks.established) {
            points = 3;
          } else if (value >= benchmarks.developing) {
            points = 2;
          }
        } else {
          // Inverse scoring (default): lower values score higher (e.g., cycle times)
          if (value <= benchmarks.leading) {
            points = 5;
          } else if (value <= benchmarks.advanced) {
            points = 4;
          } else if (value <= benchmarks.established) {
            points = 3;
          } else if (value <= benchmarks.developing) {
            points = 2;
          }
        }
        totalScore += points * questionWeight;
        maxPossible += 5 * questionWeight;
        continue;
      }
      
      if (typeof value === 'number') {
        // Slider questions (1-5 scale typically)
        totalScore += value * questionWeight;
        maxPossible += (qDef.sliderConfig?.max || 5) * questionWeight;
      } else if (Array.isArray(value)) {
        // Multi-select - more selections = more pain points = lower score
        // Cap at 5 for max pain points
        const painScore = Math.max(0, 5 - Math.min(value.length, 5));
        totalScore += painScore * questionWeight;
        maxPossible += 5 * questionWeight;
      } else if (typeof value === 'string') {
        // Single select - map to score based on common response patterns
        // Note: Keys are unique - confidence uses confidence_* prefix to avoid duplicates
        const scoreMap: Record<string, number> = {
          // Confidence/quality levels (inverted - low confidence = low score)
          'confidence_very_high': 1, 'confidence_high': 2, 'confidence_moderate': 3, 
          'confidence_low': 4, 'confidence_very_low': 5,
          // Agreement scales
          'strongly_agree': 5, 'agree': 4, 'neutral': 3, 'disagree': 2, 'strongly_disagree': 1,
          // System maturity (higher = better)
          'cloud_native': 5, 'modern_integrated': 4, 'modern_fragmented': 3, 
          'legacy_single': 2, 'legacy_multiple': 1,
          // Dependency/effort levels (minimal effort = better)
          'minimal': 5, 'low': 4, 'moderate': 3, 'high': 2, 'very_high': 1
        };
        totalScore += (scoreMap[value] || 3) * questionWeight;
        maxPossible += 5 * questionWeight;
      }
    }
    
    // Cap at 100 to prevent scores exceeding 100%
    const rawScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 50;
    const score = Math.min(100, rawScore);
    result[dim] = {
      score,
      level: getReadinessLevel(score),
      responses: dimResponses.map(r => r.response),
    };
  }
  
  return result;
}

// Calculate overall score from dimension scores
function calculateOverallFromDimensions(
  dimensionScores: Record<string, { score: number; level: string; responses: any[] }>
): number {
  const scores = Object.values(dimensionScores).map(d => d.score);
  if (scores.length === 0) return 50;
  // Cap at 100 to prevent scores exceeding 100%
  return Math.min(100, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
}

// ============================================
// AI ANALYSIS FUNCTIONS
// ============================================

export async function analyseGenerationTier(
  assessment: FcAssessment,
  responses: FcResponse[],
  questions: FcQuestion[]
): Promise<GenerationTierResult> {
  // Build response context for AI
  const responseContext = responses.map(r => {
    const question = questions.find(q => q.id === r.questionId);
    return {
      question: question?.prompt || "Unknown question",
      response: r.response
    };
  });
  
  // Calculate basic score
  const rawScore = calculateOverallScore({
    overall: calculateDimensionScore(responses, questions, "overall")
  });
  
  // Detect contextual red flags based on company size vs finance metrics
  const contextualRedFlags = detectContextualRedFlags(responses, questions);
  const redFlagContext = contextualRedFlags.length > 0 
    ? `\n\nCRITICAL CONTEXTUAL FLAGS:\n${contextualRedFlags.map(rf => `- ${rf.severity.toUpperCase()}: ${rf.message}. ${rf.context}`).join('\n')}`
    : '';

  const prompt = `Based on the following Finance Transformation Quick Assessment responses, provide a concise analysis:

Assessment Responses:
${JSON.stringify(responseContext, null, 2)}

Calculated Finance Transformation Readiness Score: ${rawScore}%${redFlagContext}

Please provide:
1. A brief executive summary (2-3 sentences) of the organisation's finance transformation readiness
2. Top 3 challenges or gaps identified (include any contextual flags above if present)
3. 3 quick wins they could pursue immediately
4. A recommendation for why they should consider a more comprehensive assessment

Format your response as JSON:
{
  "summary": "string",
  "topChallenges": ["string", "string", "string"],
  "quickWins": ["string", "string", "string"],
  "upgradeRecommendation": "string"
}`;

  try {
    // Get enhanced system prompt from database (with hardcoded fallback)
    const systemPrompt = await getEnhancedSystemPrompt('senior_consultant');
    
    const response = await pRetry(
      async () => {
        const result = await openai.chat.completions.create({
          model: AI_MODEL,
          max_completion_tokens: 20000,  // Higher for GPT-5.2 reasoning tokens
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
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
            throw new AbortError(String(error));
          }
          log.warn({ attempt: error.attemptNumber }, "Retry attempt for generation analysis");
        }
      }
    );
    
    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      throw new Error("No text response from AI");
    }
    
    // Extract JSON from response first (do NOT apply guardrails to raw JSON as it corrupts the structure)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }
    
    const aiResult = JSON.parse(jsonMatch[0]);
    
    // Apply guardrails to individual text fields
    const { output: guardedSummary } = await enforceGuardrails(aiResult.summary || "");
    const guardedChallenges = await Promise.all(
      (aiResult.topChallenges || []).map(async (c: string) => (await enforceGuardrails(c)).output)
    );
    const guardedQuickWins = await Promise.all(
      (aiResult.quickWins || []).map(async (w: string) => (await enforceGuardrails(w)).output)
    );
    const { output: guardedRecommendation } = await enforceGuardrails(aiResult.upgradeRecommendation || "");
    
    return {
      epmReadinessScore: rawScore,
      readinessLevel: getReadinessLevel(rawScore),
      summary: guardedSummary,
      topChallenges: guardedChallenges,
      quickWins: guardedQuickWins,
      upgradeRecommendation: guardedRecommendation
    };
    
  } catch (error) {
    log.error({ err: error }, "Generation analysis error");
    
    // Return fallback result
    return {
      epmReadinessScore: rawScore,
      readinessLevel: getReadinessLevel(rawScore),
      summary: "Thank you for completing the quick assessment. Your organisation shows potential for finance transformation, and we recommend a more comprehensive evaluation to identify specific opportunities.",
      topChallenges: [
        "Current assessment indicates areas for improvement in finance processes",
        "Further analysis needed to identify specific capability gaps",
        "Detailed assessment recommended for actionable insights"
      ],
      quickWins: [
        "Document existing pain points and priorities with key stakeholders",
        "Review current reporting timelines and accuracy metrics",
        "Assess technology landscape and integration requirements"
      ],
      upgradeRecommendation: "To receive detailed, actionable insights and a comprehensive finance transformation roadmap, we recommend progressing to our Pre-Assessment or Full Assessment tiers."
    };
  }
}

export async function analysePreAssessment(
  assessment: FcAssessment,
  responses: FcResponse[],
  questions: FcQuestion[]
): Promise<AnalysisResult> {
  // Use the actual 8 dimensions from the database
  const dimensions = ASSESSMENT_DIMENSIONS;
  const dimensionScores: Record<string, number> = {};
  const dimensionRatings: Record<string, 'red' | 'amber' | 'green'> = {};
  
  for (const dimension of dimensions) {
    const score = calculateDimensionScore(responses, questions, dimension);
    dimensionScores[dimension] = score;
    dimensionRatings[dimension] = getTrafficLightRating(score);
  }
  
  const overallScore = calculateOverallScore(dimensionScores);
  const readinessLevel = getReadinessLevel(overallScore);
  
  // Detect EPM/ERP specialization for tailored analysis
  const specialization = detectTechnologySpecialization(dimensionScores, responses, questions);
  
  // Build context for AI with dimension scores and ratings
  const dimensionSummary = dimensions.map(d => ({
    dimension: d,
    label: DIMENSION_LABELS[d] || d,
    score: dimensionScores[d],
    rating: dimensionRatings[d],
    interpretation: dimensionScores[d] < 40 ? "Critical gaps" : 
                    dimensionScores[d] <= 70 ? "Improvement needed" : "Performing well"
  }));
  
  const responseContext = responses.map(r => {
    const question = questions.find(q => q.id === r.questionId);
    return {
      dimension: question?.dimension || "general",
      question: question?.prompt || "Unknown",
      response: r.response
    };
  });
  
  // Build specialization context for the AI prompt
  const specializationPrompt = specialization.specialization !== "neither" 
    ? `\nTECHNOLOGY FOCUS ANALYSIS:
Primary Focus: ${specialization.primaryFocus}
${specialization.secondaryFocus ? `Secondary Focus: ${specialization.secondaryFocus}` : ''}
Specialization: ${specialization.specialization.toUpperCase()}
Context: ${specialization.narrativeContext}
${specialization.epmIndicators.length > 0 ? `EPM Indicators: ${specialization.epmIndicators.join('; ')}` : ''}
${specialization.erpIndicators.length > 0 ? `ERP Indicators: ${specialization.erpIndicators.join('; ')}` : ''}

IMPORTANT: Tailor your analysis and recommendations to emphasise ${specialization.primaryFocus} opportunities and solutions. ${specialization.secondaryFocus ? `Also address ${specialization.secondaryFocus} considerations where relevant.` : ''}`
    : '';
  
  const prompt = `Analyse this Finance Transformation Pre-Assessment:

DIMENSION SCORES WITH TRAFFIC LIGHT RATINGS:
${JSON.stringify(dimensionSummary, null, 2)}

TRAFFIC LIGHT INTERPRETATION:
- RED (score < 40): Critical gaps requiring immediate attention
- AMBER (score 40-70): Areas needing improvement
- GREEN (score > 70): Strengths to build upon

Overall Readiness: ${overallScore}% (${readinessLevel})
${specializationPrompt}

Response Details:
${JSON.stringify(responseContext, null, 2)}

Provide a comprehensive analysis with:
1. Executive summary (3-4 sentences) referencing the overall score, key findings, and ${specialization.primaryFocus} focus
2. For EACH of the 8 dimensions, provide analysis considering:
   - If score > 60: Highlight key strengths
   - If score < 70: Identify improvement areas
   - Provide 2-3 specific recommendations aligned with ${specialization.primaryFocus}
3. Key findings (top 5) - prioritise dimensions with RED/AMBER ratings
4. Prioritised recommendations (6-8 items across high/medium/low priority) - emphasise ${specialization.primaryFocus} solutions
5. Suggested next steps

Format as JSON:
{
  "summary": "string",
  "dimensionAnalysis": {
    "financial_planning_analysis": { "analysis": "string", "recommendations": ["string"] },
    "organisation_people": { "analysis": "string", "recommendations": ["string"] },
    "data_analytics": { "analysis": "string", "recommendations": ["string"] },
    "technology_systems": { "analysis": "string", "recommendations": ["string"] },
    "financial_controls_compliance": { "analysis": "string", "recommendations": ["string"] },
    "management_reporting": { "analysis": "string", "recommendations": ["string"] },
    "consolidation_close": { "analysis": "string", "recommendations": ["string"] },
    "ai_machine_learning": { "analysis": "string", "recommendations": ["string"] }
  },
  "keyFindings": ["string"],
  "prioritisedRecommendations": [
    { "priority": "high|medium|low", "title": "string", "description": "string", "expectedBenefit": "string" }
  ],
  "nextSteps": ["string"],
  "technologyFocus": "${specialization.specialization}"
}`;

  try {
    log.info("Starting OpenAI call for pre-assessment analysis");
    // Get enhanced system prompt from database (with hardcoded fallback)
    const systemPrompt = await getEnhancedSystemPrompt('senior_consultant');
    
    const response = await pRetry(
      async () => {
        log.info("Making OpenAI API request");
        const result = await openai.chat.completions.create({
          model: AI_MODEL,
          max_completion_tokens: 20000,  // Higher for GPT-5.2 reasoning tokens
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
        });
        log.info("OpenAI API response received");
        return result;
      },
      {
        retries: 3,
        minTimeout: 2000,
        maxTimeout: 10000,
        factor: 2,
        onFailedAttempt: (error) => {
          log.warn({ err: error }, "OpenAI request failed");
          if (!isRateLimitError(error)) {
            throw new AbortError(String(error));
          }
          log.warn({ attempt: error.attemptNumber }, "Retry attempt for pre-assessment analysis");
        }
      }
    );
    
    log.info("Processing OpenAI response");
    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      log.error({ finishReason: response.choices?.[0]?.finish_reason }, "No text content in response");
      throw new Error("No text response from AI");
    }
    
    // Extract JSON from response first (do NOT apply guardrails to raw JSON as it corrupts the structure)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse response");
    }
    
    const aiResult = JSON.parse(jsonMatch[0]);
    
    // Apply guardrails to individual text fields only (not the raw JSON)
    const { output: guardedSummary } = await enforceGuardrails(aiResult.summary || "");
    const guardedKeyFindings = await Promise.all(
      (aiResult.keyFindings || []).map(async (f: string) => (await enforceGuardrails(f)).output)
    );
    const guardedNextSteps = await Promise.all(
      (aiResult.nextSteps || []).map(async (s: string) => (await enforceGuardrails(s)).output)
    );
    
    // Apply guardrails to dimension analysis and include traffic light ratings
    const guardedDimensionScores: Record<string, { score: number; rating: 'red' | 'amber' | 'green'; analysis: string; recommendations: string[] }> = {};
    for (const d of dimensions) {
      const dimData = aiResult.dimensionAnalysis?.[d];
      const { output: guardedAnalysis } = await enforceGuardrails(dimData?.analysis || "");
      const guardedRecs = await Promise.all(
        (dimData?.recommendations || []).map(async (r: string) => (await enforceGuardrails(r)).output)
      );
      guardedDimensionScores[d] = {
        score: dimensionScores[d],
        rating: dimensionRatings[d],
        analysis: guardedAnalysis,
        recommendations: guardedRecs
      };
    }
    
    // Apply guardrails to recommendations
    const guardedRecommendations = await Promise.all(
      (aiResult.prioritisedRecommendations || []).map(async (rec: any) => ({
        priority: rec.priority,
        title: (await enforceGuardrails(rec.title || "")).output,
        description: (await enforceGuardrails(rec.description || "")).output,
        expectedBenefit: (await enforceGuardrails(rec.expectedBenefit || "")).output
      }))
    );
    
    log.info({ overallScore, primaryFocus: specialization.primaryFocus }, "Pre-Assessment analysis successful");
    
    return {
      overallScore,
      readinessLevel,
      summary: guardedSummary,
      dimensionScores: dimensionScores,
      dimensionDetails: guardedDimensionScores,
      keyFindings: guardedKeyFindings,
      prioritisedRecommendations: guardedRecommendations,
      nextSteps: guardedNextSteps,
      technologyFocus: specialization.specialization,
      specializationContext: specialization,
    };
    
  } catch (error) {
    log.error({ err: error }, "Pre-Assessment analysis error");
    
    // Build fallback dimension details with ratings
    const fallbackDimensionDetails: Record<string, { score: number; rating: 'red' | 'amber' | 'green'; analysis: string; recommendations: string[] }> = {};
    for (const d of dimensions) {
      fallbackDimensionDetails[d] = {
        score: dimensionScores[d],
        rating: dimensionRatings[d],
        analysis: `Score: ${dimensionScores[d]}% - ${dimensionRatings[d] === 'red' ? 'Critical attention required' : dimensionRatings[d] === 'amber' ? 'Improvement opportunities identified' : 'Performing well'}`,
        recommendations: ["Contact 1QG for detailed dimension-specific recommendations"]
      };
    }
    
    return {
      overallScore,
      readinessLevel,
      summary: `Your organisation achieved an overall ${specialization.primaryFocus} readiness score of ${overallScore}%. This indicates ${readinessLevel} readiness for finance transformation initiatives.`,
      dimensionScores: dimensionScores,
      dimensionDetails: fallbackDimensionDetails,
      keyFindings: [
        `Overall readiness level: ${readinessLevel}`,
        "Detailed analysis available in full report"
      ],
      prioritisedRecommendations: [
        {
          priority: "high",
          title: "Engage Expert Consultation",
          description: "Engage with qualified finance transformation consultants for detailed assessment and roadmap development.",
          expectedBenefit: "Clear transformation roadmap with prioritised initiatives"
        }
      ],
      nextSteps: [
        "Review this assessment with key finance stakeholders",
        "Consider upgrading to Full Assessment for comprehensive analysis",
        "Contact 1QG to discuss your transformation journey"
      ],
      technologyFocus: specialization.specialization,
      specializationContext: specialization,
    };
  }
}

export async function analyseFullAssessment(
  assessment: FcAssessment,
  responses: FcResponse[],
  questions: FcQuestion[]
): Promise<AnalysisResult> {
  // Use the actual 8 dimensions from the database
  const dimensions = ASSESSMENT_DIMENSIONS;
  const dimensionScores: Record<string, number> = {};
  const dimensionRatings: Record<string, 'red' | 'amber' | 'green'> = {};
  
  for (const dimension of dimensions) {
    const score = calculateDimensionScore(responses, questions, dimension);
    dimensionScores[dimension] = score;
    dimensionRatings[dimension] = getTrafficLightRating(score);
  }
  
  const overallScore = calculateOverallScore(dimensionScores);
  const readinessLevel = getReadinessLevel(overallScore);
  
  // Apply correlation intelligence
  const { adjustedScores, allAdjustments } = applyCorrelationAdjustments(dimensionScores);
  const detectedRootCauses = detectRootCauses(adjustedScores);
  
  // Phase 3: Enhance root causes with remediation paths and impact scoring
  const enhancedRootCauses = enhanceRootCauses(detectedRootCauses, adjustedScores);
  
  // Detect EPM/ERP specialization for tailored analysis
  const specialization = detectTechnologySpecialization(dimensionScores, responses, questions);
  
  // Build context for AI with dimension scores, adjusted scores, and maturity levels
  const dimensionSummary = dimensions.map(d => {
    const baseScore = dimensionScores[d];
    const adjustedScore = adjustedScores[d] ?? baseScore;
    const maturity = scoreToMaturityLevel(adjustedScore);
    const adjustmentsForDim = allAdjustments.filter(a => a.dimension === d);
    
    return {
      dimension: d,
      label: DIMENSION_LABELS[d] || d,
      baseScore: baseScore,
      adjustedScore: adjustedScore,
      maturityLevel: maturity.level,
      maturityLabel: maturity.label,
      rating: dimensionRatings[d],
      interpretation: baseScore < 40 ? "Critical gaps" : 
                      baseScore <= 70 ? "Improvement needed" : "Performing well",
      correlationImpact: adjustmentsForDim.length > 0 
        ? adjustmentsForDim.map(a => a.reason).join('; ')
        : null
    };
  });
  
  const responseContext = responses.map(r => {
    const question = questions.find(q => q.id === r.questionId);
    return {
      dimension: question?.dimension || "general",
      area: question?.area,
      question: question?.prompt || "Unknown",
      response: r.response
    };
  });
  
  // Build specialization context for the AI prompt
  const specializationPrompt = `
TECHNOLOGY FOCUS ANALYSIS:
Primary Focus: ${specialization.primaryFocus}
${specialization.secondaryFocus ? `Secondary Focus: ${specialization.secondaryFocus}` : ''}
Specialization Type: ${specialization.specialization.toUpperCase()}
Context: ${specialization.narrativeContext}
${specialization.epmIndicators.length > 0 ? `EPM Transformation Indicators: ${specialization.epmIndicators.join('; ')}` : ''}
${specialization.erpIndicators.length > 0 ? `ERP Transformation Indicators: ${specialization.erpIndicators.join('; ')}` : ''}

CRITICAL INSTRUCTION: Your analysis and recommendations MUST be tailored to emphasise ${specialization.primaryFocus} opportunities and solutions.${specialization.secondaryFocus ? ` Also address ${specialization.secondaryFocus} considerations where relevant.` : ''} Use terminology appropriate for ${specialization.specialization === 'epm' ? 'EPM (planning, forecasting, consolidation, reporting)' : specialization.specialization === 'erp' ? 'ERP (core finance, transactions, controls, systems)' : 'both EPM and ERP'} transformation.`;

  // Build enhanced root cause context for AI prompt (Phase 3)
  const rootCauseContext = enhancedRootCauses.length > 0 
    ? `\nROOT CAUSE ANALYSIS WITH REMEDIATION PATHS (Identified Systemic Issues):
${enhancedRootCauses.map(rc => 
`- ${rc.pattern.label} (${rc.pattern.priority} priority, Impact: ${rc.impactScore}/100, Urgency: ${rc.urgencyScore}/100)
  Issue: ${rc.pattern.description}
  Business Risk: ${rc.businessRisk}
  Affected Dimensions: ${rc.affectedDimensions.join(', ')}
  Confidence: ${Math.round(rc.confidence * 100)}%
  Key Remediation Options:
${rc.remediationPaths.slice(0, 3).map(rp => 
`    * ${rp.title} (${rp.effort} effort, ${rp.impact} impact, ${rp.timeframe.replace('_', ' ')})
      ${rp.description}
      Timeline: ${rp.timeframeMonths.min}-${rp.timeframeMonths.max} months
      Investment: ${rp.estimatedCostRange.min}k-${rp.estimatedCostRange.max}k`
).join('\n')}`
).join('\n\n')}

IMPORTANT: Address these root causes in your analysis as they represent systemic issues affecting multiple dimensions. Reference the remediation paths when making recommendations.`
    : '';
  
  const prompt = `Provide comprehensive ${specialization.primaryFocus} Full Assessment analysis:

DIMENSION SCORES WITH CORRELATION-ADJUSTED MATURITY LEVELS:
${JSON.stringify(dimensionSummary, null, 2)}

MATURITY LEVEL GUIDE:
- Level 0 (Ad-hoc): Score 0-19 - No formal processes
- Level 1 (Defined): Score 20-39 - Basic processes defined
- Level 2 (Managed): Score 40-59 - Processes managed
- Level 3 (Optimised): Score 60-79 - Optimised processes
- Level 4 (Advanced): Score 80-94 - Advanced capabilities
- Level 5 (Leading): Score 95-100 - Industry leading

TRAFFIC LIGHT INTERPRETATION:
- RED (score < 40): Critical gaps requiring immediate attention
- AMBER (score 40-70): Areas needing improvement
- GREEN (score > 70): Strengths to build upon

CORRELATION INTELLIGENCE:
- Adjusted scores account for cross-dimension dependencies
- Where correlationImpact is present, prerequisite dimensions may be holding back potential
- Address foundational gaps (technology_systems, data_analytics) before dependent dimensions
${rootCauseContext}

Overall Score: ${overallScore}% (${readinessLevel})
${specializationPrompt}

All Responses:
${JSON.stringify(responseContext, null, 2)}

Deliver enterprise consulting-grade analysis with ${specialization.primaryFocus} focus:
1. Executive summary suitable for CFO/C-suite (4-5 sentences) referencing overall score, key dimension findings, and ${specialization.primaryFocus} transformation priorities
2. For EACH of the 8 dimensions, provide deep-dive analysis:
   - If score > 60: Highlight key strengths and maturity indicators
   - If score < 70: Identify specific improvement areas and capability gaps
   - Provide 3-4 actionable recommendations per dimension aligned with ${specialization.primaryFocus}
3. Key strategic findings (top 8) - prioritise dimensions with RED/AMBER ratings, emphasising ${specialization.primaryFocus} opportunities
4. Prioritised transformation roadmap (10-12 items across high/medium/low priority) - focus on ${specialization.primaryFocus} initiatives
5. Comprehensive next steps for executive action

Format as JSON:
{
  "summary": "string",
  "dimensionAnalysis": {
    "financial_planning_analysis": { "analysis": "string", "recommendations": ["string"] },
    "organisation_people": { "analysis": "string", "recommendations": ["string"] },
    "data_analytics": { "analysis": "string", "recommendations": ["string"] },
    "technology_systems": { "analysis": "string", "recommendations": ["string"] },
    "financial_controls_compliance": { "analysis": "string", "recommendations": ["string"] },
    "management_reporting": { "analysis": "string", "recommendations": ["string"] },
    "consolidation_close": { "analysis": "string", "recommendations": ["string"] },
    "ai_machine_learning": { "analysis": "string", "recommendations": ["string"] }
  },
  "keyFindings": ["string"],
  "prioritisedRecommendations": [
    { "priority": "high|medium|low", "title": "string", "description": "string", "expectedBenefit": "string" }
  ],
  "nextSteps": ["string"],
  "technologyFocus": "${specialization.specialization}"
}`;

  try {
    // Get enhanced system prompt from database (with hardcoded fallback)
    const systemPrompt = await getEnhancedSystemPrompt('senior_consultant');
    
    const response = await pRetry(
      async () => {
        const result = await openai.chat.completions.create({
          model: AI_MODEL,
          max_completion_tokens: 20000,  // Higher for GPT-5.2 reasoning tokens
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
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
            throw new AbortError(String(error));
          }
          log.warn({ attempt: error.attemptNumber }, "Retry attempt for full assessment analysis");
        }
      }
    );
    
    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      throw new Error("No text response");
    }
    
    // Extract and repair JSON from response (do NOT apply guardrails to raw JSON as it corrupts the structure)
    const rawText = textContent;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse response");
    }
    
    let jsonStr = jsonMatch[0];
    
    // Repair common JSON issues from truncated/malformed responses
    const repairJson = (str: string): string => {
      let fixed = str;
      
      // Count brackets
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      
      // Add missing closing brackets/braces
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed = fixed.replace(/,?\s*$/, '') + ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed = fixed.replace(/,?\s*$/, '') + '}';
      }
      
      // Remove trailing commas before closing brackets/braces
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      return fixed;
    };
    
    // Try parsing, repair if needed
    let aiResult;
    try {
      aiResult = JSON.parse(jsonStr);
    } catch (parseErr) {
      log.info("Attempting JSON repair");
      const repairedJson = repairJson(jsonStr);
      aiResult = JSON.parse(repairedJson);
      log.info("JSON repair successful");
    }
    
    // Apply guardrails to individual text fields only (not the raw JSON)
    const { output: guardedSummary } = await enforceGuardrails(aiResult.summary || "");
    const guardedKeyFindings = await Promise.all(
      (aiResult.keyFindings || []).map(async (f: string) => (await enforceGuardrails(f)).output)
    );
    const guardedNextSteps = await Promise.all(
      (aiResult.nextSteps || []).map(async (s: string) => (await enforceGuardrails(s)).output)
    );
    
    // Apply guardrails to dimension analysis and include traffic light ratings
    const guardedDimensionScores: Record<string, { score: number; rating: 'red' | 'amber' | 'green'; analysis: string; recommendations: string[] }> = {};
    for (const d of dimensions) {
      const dimData = aiResult.dimensionAnalysis?.[d];
      const { output: guardedAnalysis } = await enforceGuardrails(dimData?.analysis || "");
      const guardedRecs = await Promise.all(
        (dimData?.recommendations || []).map(async (r: string) => (await enforceGuardrails(r)).output)
      );
      guardedDimensionScores[d] = {
        score: dimensionScores[d],
        rating: dimensionRatings[d],
        analysis: guardedAnalysis,
        recommendations: guardedRecs
      };
    }
    
    // Apply guardrails to recommendations
    const guardedRecommendations = await Promise.all(
      (aiResult.prioritisedRecommendations || []).map(async (rec: any) => ({
        priority: rec.priority,
        title: (await enforceGuardrails(rec.title || "")).output,
        description: (await enforceGuardrails(rec.description || "")).output,
        expectedBenefit: (await enforceGuardrails(rec.expectedBenefit || "")).output
      }))
    );
    
    log.info({ overallScore, primaryFocus: specialization.primaryFocus }, "Full Assessment analysis successful");
    
    return {
      overallScore,
      readinessLevel,
      summary: guardedSummary,
      dimensionScores: dimensionScores,
      dimensionDetails: guardedDimensionScores,
      keyFindings: guardedKeyFindings,
      prioritisedRecommendations: guardedRecommendations,
      nextSteps: guardedNextSteps,
      technologyFocus: specialization.specialization,
      specializationContext: specialization,
    };
    
  } catch (error) {
    log.error({ err: error }, "Full Assessment analysis error");
    
    // Build fallback dimension details with ratings
    const fallbackDimensionDetails: Record<string, { score: number; rating: 'red' | 'amber' | 'green'; analysis: string; recommendations: string[] }> = {};
    for (const d of dimensions) {
      fallbackDimensionDetails[d] = {
        score: dimensionScores[d],
        rating: dimensionRatings[d],
        analysis: `Score: ${dimensionScores[d]}% - ${dimensionRatings[d] === 'red' ? 'Critical attention required' : dimensionRatings[d] === 'amber' ? 'Improvement opportunities identified' : 'Performing well'}`,
        recommendations: ["Contact 1QG for detailed dimension-specific recommendations"]
      };
    }
    
    return {
      overallScore,
      readinessLevel,
      summary: `Comprehensive ${specialization.primaryFocus} assessment complete with ${overallScore}% overall readiness score, indicating ${readinessLevel} transformation readiness.`,
      dimensionScores: dimensionScores,
      dimensionDetails: fallbackDimensionDetails,
      keyFindings: [
        `Overall ${specialization.primaryFocus} readiness: ${overallScore}%`,
        "Comprehensive report generation pending"
      ],
      prioritisedRecommendations: [{
        priority: "high",
        title: "Schedule Expert Consultation",
        description: "Engage with 1QG consultants to review findings and develop transformation roadmap",
        expectedBenefit: "Tailored transformation strategy with clear implementation path"
      }],
      nextSteps: [
        "Download full assessment report when available",
        "Schedule consultation with 1QG team",
        "Prepare for stakeholder alignment workshop"
      ],
      technologyFocus: specialization.specialization,
      specializationContext: specialization,
    };
  }
}

// ============================================
// MAIN ANALYSIS ORCHESTRATOR
// ============================================

export async function runAssessmentAnalysis(assessmentId: string): Promise<AnalysisResult | GenerationTierResult> {
  const assessment = await fcStorage.getAssessmentById(assessmentId);
  if (!assessment) {
    throw new Error("Assessment not found");
  }
  
  const questions = await fcStorage.getQuestionsByTier(assessment.tier as any);
  const responses = await fcStorage.getResponsesByAssessmentId(assessmentId);
  
  switch (assessment.tier) {
    case "registration":
      // Registration tier is for signup only - returns basic result without full analysis
      return {
        epmReadinessScore: 0,
        readinessLevel: "low" as const,
        quickWins: [],
        topChallenges: [],
        dimensionRatings: [],
        upgradeRecommendation: "Complete a Pre-Assessment or Full Assessment for comprehensive analysis",
        summary: "Registration data captured successfully",
      } as GenerationTierResult;
    case "quick_assessment": // Legacy support
    case "pre_assessment":
      return analysePreAssessment(assessment, responses, questions);
    case "full":
      return analyseFullAssessment(assessment, responses, questions);
    default:
      throw new Error(`Unknown tier: ${assessment.tier}`);
  }
}

// Legacy function for registration tier analysis (kept for backwards compatibility)
export async function analyseQuickAssessment(
  assessment: FcAssessment,
  responses: FcResponse[]
): Promise<GenerationTierResult> {
  // Use the registration question definitions (legacy support)
  const questionDefinitions = REGISTRATION_QUESTIONS;
  
  // Calculate dimension scores from ALL responses (not just urgency)
  const dimensionScores = calculateDimensionScoresFromResponses(responses, questionDefinitions);
  const overallScore = calculateOverallFromDimensions(dimensionScores);
  
  // Build response context using question bank data
  const responseContext = responses.map(r => {
    const questionDef = questionDefinitions.find(q => q.id === r.questionId);
    return {
      questionId: r.questionId,
      question: questionDef?.questionText || "Unknown question",
      dimension: questionDef?.dimension || "general",
      helpText: questionDef?.helpText,
      aiGrounding: questionDef?.aiGroundingNotes,
      response: r.response
    };
  });
  
  // Prepare dimension scores summary for AI with traffic light indicators
  const dimensionSummary = Object.entries(dimensionScores).map(([dim, data]) => ({
    dimension: dim,
    score: data.score,
    level: data.level,
    trafficLight: getTrafficLightRating(data.score),
    responseCount: data.responses.length
  }));
  
  const prompt = `Analyse this Quick Assessment for finance transformation readiness using calculated dimension scores and response data:

CALCULATED DIMENSION SCORES (based on actual responses):
${JSON.stringify(dimensionSummary, null, 2)}

OVERALL EPM READINESS SCORE: ${overallScore}%
READINESS LEVEL: ${getReadinessLevel(overallScore)}

TRAFFIC LIGHT RATING GUIDANCE:
- RED (score < 40): Critical gaps requiring immediate attention
- AMBER (score 40-70): Areas needing improvement  
- GREEN (score > 70): Strengths to build upon

Assessment Response Details:
${JSON.stringify(responseContext, null, 2)}

Grounding Notes for AI:
${questionDefinitions.map(q => `- ${q.id}: ${q.aiGroundingNotes || 'Standard evaluation'}`).join('\n')}

Based on the dimension scores and response data, provide:
1. A brief executive summary (2-3 sentences) referencing the overall score and key dimension findings
2. Top 3 challenges or gaps identified - prioritise dimensions with RED/AMBER ratings
3. 3 quick wins they could pursue immediately
4. A recommendation for why they should consider a more comprehensive assessment
5. For EACH dimension, provide a traffic light analysis with summary, improvements needed, and strengths identified

Format your response as JSON:
{
  "summary": "string",
  "topChallenges": ["string", "string", "string"],
  "quickWins": ["string", "string", "string"],
  "upgradeRecommendation": "string",
  "dimensionRatings": [
    {
      "dimension": "data_analytics",
      "summary": "Brief assessment of this dimension",
      "improvements": ["improvement 1", "improvement 2"],
      "strengths": ["strength 1"]
    },
    {
      "dimension": "consolidation_close",
      "summary": "Brief assessment of this dimension",
      "improvements": ["improvement 1"],
      "strengths": ["strength 1", "strength 2"]
    },
    {
      "dimension": "financial_planning_analysis",
      "summary": "Brief assessment of this dimension",
      "improvements": ["improvement 1"],
      "strengths": ["strength 1"]
    },
    {
      "dimension": "technology_systems",
      "summary": "Brief assessment of this dimension",
      "improvements": ["improvement 1"],
      "strengths": ["strength 1"]
    },
    {
      "dimension": "organisation_people",
      "summary": "Brief assessment of this dimension",
      "improvements": ["improvement 1"],
      "strengths": ["strength 1"]
    }
  ]
}`;

  try {
    // Get enhanced system prompt from database (with hardcoded fallback)
    const systemPrompt = await getEnhancedSystemPrompt('senior_consultant');
    
    const response = await pRetry(
      async () => {
        const result = await openai.chat.completions.create({
          model: AI_MODEL,
          max_completion_tokens: 20000,  // Higher for GPT-5.2 reasoning tokens
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
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
            throw new AbortError(String(error));
          }
          log.warn({ attempt: error.attemptNumber }, "Retry attempt for quick assessment analysis");
        }
      }
    );
    
    const textContent = response.choices[0]?.message?.content;
    if (!textContent) {
      throw new Error("No text response from AI");
    }
    
    // Extract JSON from response first (do NOT apply guardrails to raw JSON as it corrupts the structure)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }
    
    const aiResult = JSON.parse(jsonMatch[0]);
    
    // Apply guardrails to individual text fields only
    const { output: guardedSummary } = await enforceGuardrails(aiResult.summary || "");
    const guardedChallenges = await Promise.all(
      (aiResult.topChallenges || []).map(async (c: string) => (await enforceGuardrails(c)).output)
    );
    const guardedQuickWins = await Promise.all(
      (aiResult.quickWins || []).map(async (w: string) => (await enforceGuardrails(w)).output)
    );
    const { output: guardedRecommendation } = await enforceGuardrails(aiResult.upgradeRecommendation || "");
    
    // Process dimension ratings from AI response, merge with calculated scores
    const dimensionRatings: DimensionRating[] = await Promise.all(
      Object.entries(dimensionScores).map(async ([dim, data]) => {
        const aiDimRating = (aiResult.dimensionRatings || []).find(
          (r: any) => r.dimension === dim
        ) || {};
        
        const guardedSummary = (await enforceGuardrails(aiDimRating.summary || `${data.level} readiness in ${dim.replace(/_/g, ' ')}`)).output;
        const guardedImprovements = await Promise.all(
          (aiDimRating.improvements || []).map(async (i: string) => (await enforceGuardrails(i)).output)
        );
        const guardedStrengths = await Promise.all(
          (aiDimRating.strengths || []).map(async (s: string) => (await enforceGuardrails(s)).output)
        );
        
        return {
          dimension: dim,
          score: data.score,
          rating: getTrafficLightRating(data.score),
          summary: guardedSummary,
          improvements: guardedImprovements.length > 0 ? guardedImprovements : ['Further assessment recommended'],
          strengths: guardedStrengths.length > 0 ? guardedStrengths : ['Baseline capability established']
        };
      })
    );
    
    return {
      epmReadinessScore: overallScore,
      readinessLevel: getReadinessLevel(overallScore),
      summary: guardedSummary,
      topChallenges: guardedChallenges,
      quickWins: guardedQuickWins,
      upgradeRecommendation: guardedRecommendation,
      dimensionRatings
    };
    
  } catch (error) {
    log.error({ err: error }, "Quick assessment analysis error");
    
    // Build fallback dimension ratings from calculated scores
    const fallbackDimensionRatings: DimensionRating[] = Object.entries(dimensionScores).map(([dim, data]) => ({
      dimension: dim,
      score: data.score,
      rating: getTrafficLightRating(data.score),
      summary: `${data.level.charAt(0).toUpperCase() + data.level.slice(1)} readiness identified in ${dim.replace(/_/g, ' ')}`,
      improvements: data.score < 70 ? ['Further assessment recommended for detailed improvement plan'] : [],
      strengths: data.score >= 50 ? ['Baseline capability established'] : []
    }));
    
    return {
      epmReadinessScore: overallScore,
      readinessLevel: getReadinessLevel(overallScore),
      summary: `Your organisation achieved an overall EPM readiness score of ${overallScore}%, indicating ${getReadinessLevel(overallScore)} transformation readiness. We recommend a comprehensive evaluation to identify specific opportunities for improvement.`,
      topChallenges: [
        "Current assessment indicates areas for improvement in finance processes",
        "Further analysis needed to identify specific capability gaps",
        "Detailed assessment recommended for actionable insights"
      ],
      quickWins: [
        "Document existing pain points and priorities with key stakeholders",
        "Review current reporting timelines and accuracy metrics",
        "Assess technology landscape and integration requirements"
      ],
      upgradeRecommendation: "To receive detailed, actionable insights and a comprehensive finance transformation roadmap, we recommend progressing to our Pre-Assessment or Full Assessment tiers.",
      dimensionRatings: fallbackDimensionRatings
    };
  }
}

export { AI_PERSONAS, GUARDRAILS, enforceGuardrails, normalizeDimension, ASSESSMENT_DIMENSIONS };
