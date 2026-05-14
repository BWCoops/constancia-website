/**
 * FinanceCompass Dimension Correlation Matrix
 * 
 * Defines interdependencies between the 8 assessment dimensions.
 * Used for correlation-aware scoring and root cause analysis.
 * 
 * Relationship Types:
 * - prerequisite: Source dimension must be mature for target to succeed
 * - enabler: High source score amplifies target capability
 * - dependency: Target requires source for full functionality
 * - inhibitor: Low source score constrains target potential
 * 
 * Strength: 0.0 to 1.0 (how strongly correlated)
 */

import type { FCDimension } from "@shared/finance-compass-schema";

// ============================================
// CORRELATION TYPES
// ============================================

export type CorrelationRelationshipType = 
  | "prerequisite"  // Must have A before B can succeed
  | "enabler"       // A amplifies B when strong
  | "dependency"    // B depends on A for full capability
  | "inhibitor";    // Low A constrains B

export interface DimensionCorrelation {
  source: FCDimension;
  target: FCDimension;
  type: CorrelationRelationshipType;
  strength: number; // 0.0 to 1.0
  description: string;
  scoreImpact: {
    bonusThreshold: number;    // Source score above this = bonus to target
    penaltyThreshold: number;  // Source score below this = penalty to target
    maxAdjustment: number;     // Maximum ±points adjustment
  };
}

export interface CorrelationAdjustment {
  dimension: FCDimension;
  adjustment: number;
  reason: string;
  sourceDimension: FCDimension;
  correlationType: CorrelationRelationshipType;
}

// ============================================
// MATURITY LEVEL DEFINITIONS
// ============================================

export interface MaturityLevel {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  shortLabel: string;
  description: string;
  scoreRange: { min: number; max: number };
  characteristics: string[];
}

export const MATURITY_LEVELS: MaturityLevel[] = [
  {
    level: 0,
    label: "Ad-hoc",
    shortLabel: "Ad-hoc",
    description: "Processes are undefined, reactive, and inconsistent",
    scoreRange: { min: 0, max: 19 },
    characteristics: [
      "No defined processes",
      "Highly manual, spreadsheet-dependent",
      "Reactive approach to challenges",
      "Limited visibility and control"
    ]
  },
  {
    level: 1,
    label: "Defined",
    shortLabel: "Defined",
    description: "Basic processes documented but inconsistently applied",
    scoreRange: { min: 20, max: 39 },
    characteristics: [
      "Some documented procedures",
      "Processes exist but vary by team/individual",
      "Basic controls in place",
      "Limited automation"
    ]
  },
  {
    level: 2,
    label: "Managed",
    shortLabel: "Managed",
    description: "Standardised processes with some system support",
    scoreRange: { min: 40, max: 59 },
    characteristics: [
      "Consistent processes across teams",
      "Basic system support for key activities",
      "Regular monitoring and reporting",
      "Defined roles and responsibilities"
    ]
  },
  {
    level: 3,
    label: "Optimised",
    shortLabel: "Optimised",
    description: "Automated processes with continuous improvement",
    scoreRange: { min: 60, max: 79 },
    characteristics: [
      "Significant automation of routine tasks",
      "Data-driven decision making",
      "Proactive monitoring and management",
      "Regular process improvement initiatives"
    ]
  },
  {
    level: 4,
    label: "Advanced",
    shortLabel: "Advanced",
    description: "Highly automated with analytics-driven insights",
    scoreRange: { min: 80, max: 94 },
    characteristics: [
      "End-to-end automation",
      "Advanced analytics and predictive capabilities",
      "Real-time visibility and control",
      "Industry-leading practices"
    ]
  },
  {
    level: 5,
    label: "Leading",
    shortLabel: "Leading",
    description: "AI-driven, autonomous, and continuously learning",
    scoreRange: { min: 95, max: 100 },
    characteristics: [
      "AI/ML-driven automation and optimisation",
      "Autonomous decision-making capabilities",
      "Continuous learning and adaptation",
      "Setting industry benchmarks"
    ]
  }
];

// ============================================
// 8x8 CORRELATION MATRIX
// ============================================

// Maximum total adjustment per dimension (prevents score inflation)
export const MAX_TOTAL_ADJUSTMENT_PER_DIMENSION = 6;

export const DIMENSION_CORRELATIONS: DimensionCorrelation[] = [
  // Technology Systems as Foundation
  {
    source: "technology_systems",
    target: "financial_planning_analysis",
    type: "prerequisite",
    strength: 0.8,
    description: "Advanced planning requires robust technology foundation",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 35, maxAdjustment: 3 }
  },
  {
    source: "technology_systems",
    target: "consolidation_close",
    type: "prerequisite",
    strength: 0.8,
    description: "Close automation requires ERP/EPM capability",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 35, maxAdjustment: 3 }
  },
  {
    source: "technology_systems",
    target: "management_reporting",
    type: "enabler",
    strength: 0.7,
    description: "Modern reporting requires integrated technology",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  {
    source: "technology_systems",
    target: "financial_controls_compliance",
    type: "dependency",
    strength: 0.6,
    description: "Control automation requires system support",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 45, maxAdjustment: 2 }
  },
  {
    source: "technology_systems",
    target: "data_analytics",
    type: "enabler",
    strength: 0.7,
    description: "Tech modernisation enables analytics capability",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  
  // Data Analytics as Foundation for AI
  {
    source: "data_analytics",
    target: "ai_machine_learning",
    type: "prerequisite",
    strength: 0.9,
    description: "AI requires strong data foundation and quality",
    scoreImpact: { bonusThreshold: 65, penaltyThreshold: 35, maxAdjustment: 4 }
  },
  {
    source: "data_analytics",
    target: "management_reporting",
    type: "prerequisite",
    strength: 0.7,
    description: "Self-service reporting requires data quality",
    scoreImpact: { bonusThreshold: 65, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  {
    source: "data_analytics",
    target: "financial_planning_analysis",
    type: "enabler",
    strength: 0.6,
    description: "Quality data enables accurate forecasting",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  
  // Organisation & People Relationships
  {
    source: "organisation_people",
    target: "technology_systems",
    type: "enabler",
    strength: 0.5,
    description: "Skilled teams maximise technology investment",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 35, maxAdjustment: 2 }
  },
  {
    source: "organisation_people",
    target: "ai_machine_learning",
    type: "dependency",
    strength: 0.6,
    description: "AI adoption requires skilled change agents",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  {
    source: "organisation_people",
    target: "financial_planning_analysis",
    type: "enabler",
    strength: 0.5,
    description: "Business partnering skills drive FP&A value",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  
  // FP&A and Reporting Connections
  {
    source: "financial_planning_analysis",
    target: "management_reporting",
    type: "dependency",
    strength: 0.6,
    description: "Planning insights need reporting channel",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  
  // Controls and Close Connections
  {
    source: "financial_controls_compliance",
    target: "consolidation_close",
    type: "enabler",
    strength: 0.6,
    description: "Strong controls enable faster, confident close",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 40, maxAdjustment: 2 }
  },
  {
    source: "consolidation_close",
    target: "management_reporting",
    type: "dependency",
    strength: 0.5,
    description: "Timely close enables timely reporting",
    scoreImpact: { bonusThreshold: 70, penaltyThreshold: 45, maxAdjustment: 2 }
  },
  
  // AI as Amplifier
  {
    source: "ai_machine_learning",
    target: "financial_planning_analysis",
    type: "enabler",
    strength: 0.7,
    description: "AI enhances forecast accuracy and scenario planning",
    scoreImpact: { bonusThreshold: 60, penaltyThreshold: 25, maxAdjustment: 3 }
  },
  {
    source: "ai_machine_learning",
    target: "management_reporting",
    type: "enabler",
    strength: 0.5,
    description: "AI enables automated insights and narratives",
    scoreImpact: { bonusThreshold: 60, penaltyThreshold: 25, maxAdjustment: 2 }
  }
];

// ============================================
// CORRELATION UTILITIES
// ============================================

/**
 * Get all correlations where the given dimension is the source
 */
export function getCorrelationsForSource(dimension: FCDimension): DimensionCorrelation[] {
  return DIMENSION_CORRELATIONS.filter(c => c.source === dimension);
}

/**
 * Get all correlations where the given dimension is the target
 */
export function getCorrelationsForTarget(dimension: FCDimension): DimensionCorrelation[] {
  return DIMENSION_CORRELATIONS.filter(c => c.target === dimension);
}

/**
 * Get the correlation between two specific dimensions (if exists)
 */
export function getCorrelation(source: FCDimension, target: FCDimension): DimensionCorrelation | undefined {
  return DIMENSION_CORRELATIONS.find(c => c.source === source && c.target === target);
}

/**
 * Convert a score to maturity level
 */
export function scoreToMaturityLevel(score: number): MaturityLevel {
  const clampedScore = Math.max(0, Math.min(100, score));
  
  for (const level of MATURITY_LEVELS) {
    if (clampedScore >= level.scoreRange.min && clampedScore <= level.scoreRange.max) {
      return level;
    }
  }
  
  // Default to level 0 if score is below 0
  return MATURITY_LEVELS[0];
}

/**
 * Get maturity level by number
 */
export function getMaturityLevelByNumber(level: number): MaturityLevel | undefined {
  return MATURITY_LEVELS.find(m => m.level === level);
}

/**
 * Calculate correlation adjustments for a dimension based on other dimension scores
 */
export function calculateCorrelationAdjustments(
  targetDimension: FCDimension,
  allDimensionScores: Record<string, number>
): CorrelationAdjustment[] {
  const adjustments: CorrelationAdjustment[] = [];
  const correlations = getCorrelationsForTarget(targetDimension);
  
  for (const correlation of correlations) {
    const sourceScore = allDimensionScores[correlation.source];
    
    if (sourceScore === undefined) continue;
    
    const { bonusThreshold, penaltyThreshold, maxAdjustment } = correlation.scoreImpact;
    let adjustment = 0;
    let reason = "";
    
    if (sourceScore >= bonusThreshold) {
      // Apply bonus - scaled by how far above threshold
      const bonusRatio = Math.min(1, (sourceScore - bonusThreshold) / (100 - bonusThreshold));
      adjustment = Math.round(maxAdjustment * bonusRatio * correlation.strength);
      reason = `Strong ${formatDimensionName(correlation.source)} (+${adjustment} pts)`;
    } else if (sourceScore < penaltyThreshold) {
      // Apply penalty - scaled by how far below threshold
      const penaltyRatio = Math.min(1, (penaltyThreshold - sourceScore) / penaltyThreshold);
      adjustment = -Math.round(maxAdjustment * penaltyRatio * correlation.strength);
      reason = `Weak ${formatDimensionName(correlation.source)} foundation (${adjustment} pts)`;
    }
    
    if (adjustment !== 0) {
      adjustments.push({
        dimension: targetDimension,
        adjustment,
        reason,
        sourceDimension: correlation.source,
        correlationType: correlation.type
      });
    }
  }
  
  return adjustments;
}

/**
 * Apply all correlation adjustments to dimension scores
 * Uses percentage-based adjustments to preserve valid 0-100 range
 */
export function applyCorrelationAdjustments(
  dimensionScores: Record<string, number>
): { adjustedScores: Record<string, number>; allAdjustments: CorrelationAdjustment[] } {
  const adjustedScores = { ...dimensionScores };
  const allAdjustments: CorrelationAdjustment[] = [];
  
  // Calculate adjustments for each dimension
  for (const dimension of Object.keys(dimensionScores) as FCDimension[]) {
    const adjustments = calculateCorrelationAdjustments(dimension, dimensionScores);
    allAdjustments.push(...adjustments);
    
    // Sum all adjustments for this dimension
    const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.adjustment, 0);
    
    // Bound total adjustment to ±MAX_TOTAL_ADJUSTMENT_PER_DIMENSION
    const boundedAdjustment = Math.max(-MAX_TOTAL_ADJUSTMENT_PER_DIMENSION, Math.min(MAX_TOTAL_ADJUSTMENT_PER_DIMENSION, totalAdjustment));
    
    // Apply adjustment, keeping within valid 0-100 range
    adjustedScores[dimension] = Math.max(0, Math.min(100, dimensionScores[dimension] + boundedAdjustment));
  }
  
  return { adjustedScores, allAdjustments };
}

/**
 * Get dimensions that are prerequisites for a target dimension
 */
export function getPrerequisiteDimensions(dimension: FCDimension): FCDimension[] {
  return DIMENSION_CORRELATIONS
    .filter(c => c.target === dimension && c.type === "prerequisite")
    .map(c => c.source);
}

/**
 * Get dimensions that are enabled by a source dimension
 */
export function getEnabledDimensions(dimension: FCDimension): FCDimension[] {
  return DIMENSION_CORRELATIONS
    .filter(c => c.source === dimension && (c.type === "enabler" || c.type === "prerequisite"))
    .map(c => c.target);
}

/**
 * Format dimension name for display
 */
function formatDimensionName(dimension: FCDimension): string {
  const nameMap: Record<FCDimension, string> = {
    financial_planning_analysis: "FP&A",
    management_reporting: "Reporting",
    consolidation_close: "Consolidation & Close",
    transaction_processing: "Consolidation & Close", // Legacy alias
    financial_controls_compliance: "Controls",
    technology_systems: "Technology",
    organisation_people: "Organisation & People",
    data_analytics: "Data & Analytics",
    ai_machine_learning: "AI/ML"
  };
  return nameMap[dimension] || dimension;
}

// ============================================
// ROOT CAUSE PATTERN DEFINITIONS
// ============================================

export interface RootCausePattern {
  id: string;
  name: string;
  label: string; // Display-friendly label (same as name)
  description: string;
  indicators: {
    dimension: FCDimension;
    condition: "below" | "above";
    threshold: number;
  }[];
  minIndicatorsRequired: number;
  affectedDimensions: FCDimension[];
  confidence: number;
  recommendation: string;
  priority: "critical" | "high" | "medium" | "low";
}

export const ROOT_CAUSE_PATTERNS: RootCausePattern[] = [
  {
    id: "tech_fragmentation",
    name: "Technology Fragmentation",
    label: "Technology Fragmentation",
    description: "Outdated or fragmented technology is limiting multiple capabilities",
    indicators: [
      { dimension: "technology_systems", condition: "below", threshold: 45 },
      { dimension: "consolidation_close", condition: "below", threshold: 50 },
      { dimension: "management_reporting", condition: "below", threshold: 50 }
    ],
    minIndicatorsRequired: 2,
    affectedDimensions: ["financial_planning_analysis", "management_reporting", "consolidation_close", "data_analytics"],
    confidence: 0.85,
    recommendation: "Technology modernisation should be Priority 1 - foundation for all other improvements",
    priority: "critical"
  },
  {
    id: "data_quality_gap",
    name: "Data Quality Foundation Gap",
    label: "Data Quality Gap",
    description: "Poor data quality is blocking analytics and AI adoption",
    indicators: [
      { dimension: "data_analytics", condition: "below", threshold: 45 },
      { dimension: "ai_machine_learning", condition: "below", threshold: 40 },
      { dimension: "management_reporting", condition: "below", threshold: 50 }
    ],
    minIndicatorsRequired: 2,
    affectedDimensions: ["ai_machine_learning", "management_reporting", "financial_planning_analysis"],
    confidence: 0.80,
    recommendation: "Invest in data quality and governance as foundation before AI/analytics initiatives",
    priority: "high"
  },
  {
    id: "skills_capacity",
    name: "Skills & Capacity Constraints",
    label: "Skills & Capacity Constraints",
    description: "Team skills or capacity gaps are forcing manual workarounds",
    indicators: [
      { dimension: "organisation_people", condition: "below", threshold: 45 },
      { dimension: "technology_systems", condition: "below", threshold: 50 },
      { dimension: "ai_machine_learning", condition: "below", threshold: 40 }
    ],
    minIndicatorsRequired: 2,
    affectedDimensions: ["technology_systems", "ai_machine_learning", "financial_planning_analysis"],
    confidence: 0.75,
    recommendation: "Skills development or hiring plan required before automation investments",
    priority: "high"
  },
  {
    id: "manual_controls",
    name: "Manual Control Processes",
    label: "Manual Controls",
    description: "Manual controls are extending close cycles and introducing risk",
    indicators: [
      { dimension: "financial_controls_compliance", condition: "below", threshold: 45 },
      { dimension: "consolidation_close", condition: "below", threshold: 50 }
    ],
    minIndicatorsRequired: 2,
    affectedDimensions: ["consolidation_close", "financial_controls_compliance"],
    confidence: 0.80,
    recommendation: "Process standardisation and control automation to reduce close cycle and risk",
    priority: "high"
  },
  {
    id: "reporting_bottleneck",
    name: "Reporting Bottleneck",
    label: "Reporting Bottleneck",
    description: "Reporting delays are limiting business insight delivery",
    indicators: [
      { dimension: "management_reporting", condition: "below", threshold: 45 },
      { dimension: "consolidation_close", condition: "below", threshold: 55 },
      { dimension: "data_analytics", condition: "below", threshold: 50 }
    ],
    minIndicatorsRequired: 2,
    affectedDimensions: ["management_reporting", "financial_planning_analysis"],
    confidence: 0.75,
    recommendation: "Streamline reporting processes and invest in self-service analytics",
    priority: "medium"
  },
  {
    id: "ai_not_ready",
    name: "AI Readiness Gap",
    label: "AI Readiness Gap",
    description: "Foundation elements not in place for successful AI adoption",
    indicators: [
      { dimension: "ai_machine_learning", condition: "below", threshold: 35 },
      { dimension: "data_analytics", condition: "below", threshold: 50 },
      { dimension: "technology_systems", condition: "below", threshold: 50 },
      { dimension: "organisation_people", condition: "below", threshold: 50 }
    ],
    minIndicatorsRequired: 3,
    affectedDimensions: ["ai_machine_learning"],
    confidence: 0.85,
    recommendation: "Build data, technology, and skills foundations before major AI investment",
    priority: "medium"
  }
];

/**
 * Detect root causes based on dimension scores
 */
export function detectRootCauses(
  dimensionScores: Record<string, number>
): DetectedRootCause[] {
  const detectedPatterns: DetectedRootCause[] = [];
  
  for (const pattern of ROOT_CAUSE_PATTERNS) {
    let matchedCount = 0;
    
    for (const indicator of pattern.indicators) {
      const score = dimensionScores[indicator.dimension];
      if (score === undefined) continue;
      
      if (indicator.condition === "below" && score < indicator.threshold) {
        matchedCount++;
      } else if (indicator.condition === "above" && score > indicator.threshold) {
        matchedCount++;
      }
    }
    
    if (matchedCount >= pattern.minIndicatorsRequired) {
      detectedPatterns.push({
        pattern,
        matchedIndicators: matchedCount,
        totalIndicators: pattern.indicators.length,
        affectedDimensions: pattern.affectedDimensions,
        confidence: pattern.confidence * (matchedCount / pattern.indicators.length)
      });
    }
  }
  
  // Sort by priority and confidence
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return detectedPatterns.sort((a, b) => {
    const priorityDiff = priorityOrder[a.pattern.priority] - priorityOrder[b.pattern.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
}

export interface DetectedRootCause {
  pattern: RootCausePattern;
  matchedIndicators: number;
  totalIndicators: number;
  affectedDimensions: FCDimension[];
  confidence: number;
}

// ============================================
// PHASE 2: RESPONDENT CONTEXT & CONFIDENCE
// ============================================

export type RespondentRole = 
  | "cfo"
  | "finance_director"
  | "fp_and_a_manager"
  | "controller"
  | "cio"
  | "it_director"
  | "finance_analyst"
  | "business_analyst"
  | "consultant"
  | "other";

export type RespondentSeniority = 
  | "c_suite"
  | "director"
  | "senior_manager"
  | "manager"
  | "analyst"
  | "consultant";

export interface RespondentContext {
  role: RespondentRole;
  seniority: RespondentSeniority;
  yearsInRole: number;
  yearsAtCompany: number;
  dimensionExpertise: Partial<Record<FCDimension, number>>; // 0-100 self-assessed expertise
}

/**
 * Role expertise mapping - which dimensions each role has authority on
 */
export const ROLE_DIMENSION_EXPERTISE: Record<RespondentRole, Partial<Record<FCDimension, number>>> = {
  cfo: {
    financial_planning_analysis: 95,
    management_reporting: 90,
    consolidation_close: 85,
    financial_controls_compliance: 90,
    technology_systems: 60,
    organisation_people: 85,
    data_analytics: 70,
    ai_machine_learning: 50
  },
  finance_director: {
    financial_planning_analysis: 90,
    management_reporting: 85,
    consolidation_close: 80,
    financial_controls_compliance: 85,
    technology_systems: 55,
    organisation_people: 75,
    data_analytics: 65,
    ai_machine_learning: 45
  },
  fp_and_a_manager: {
    financial_planning_analysis: 95,
    management_reporting: 80,
    consolidation_close: 60,
    financial_controls_compliance: 60,
    technology_systems: 50,
    organisation_people: 55,
    data_analytics: 85,
    ai_machine_learning: 60
  },
  controller: {
    financial_planning_analysis: 70,
    management_reporting: 75,
    consolidation_close: 95,
    financial_controls_compliance: 95,
    technology_systems: 55,
    organisation_people: 65,
    data_analytics: 60,
    ai_machine_learning: 40
  },
  cio: {
    financial_planning_analysis: 45,
    management_reporting: 50,
    consolidation_close: 40,
    financial_controls_compliance: 55,
    technology_systems: 95,
    organisation_people: 70,
    data_analytics: 85,
    ai_machine_learning: 90
  },
  it_director: {
    financial_planning_analysis: 40,
    management_reporting: 45,
    consolidation_close: 35,
    financial_controls_compliance: 50,
    technology_systems: 90,
    organisation_people: 60,
    data_analytics: 80,
    ai_machine_learning: 85
  },
  finance_analyst: {
    financial_planning_analysis: 75,
    management_reporting: 70,
    consolidation_close: 50,
    financial_controls_compliance: 45,
    technology_systems: 45,
    organisation_people: 40,
    data_analytics: 70,
    ai_machine_learning: 55
  },
  business_analyst: {
    financial_planning_analysis: 55,
    management_reporting: 60,
    consolidation_close: 40,
    financial_controls_compliance: 40,
    technology_systems: 65,
    organisation_people: 45,
    data_analytics: 80,
    ai_machine_learning: 70
  },
  consultant: {
    financial_planning_analysis: 75,
    management_reporting: 75,
    consolidation_close: 70,
    financial_controls_compliance: 70,
    technology_systems: 75,
    organisation_people: 70,
    data_analytics: 75,
    ai_machine_learning: 70
  },
  other: {
    financial_planning_analysis: 50,
    management_reporting: 50,
    consolidation_close: 50,
    financial_controls_compliance: 50,
    technology_systems: 50,
    organisation_people: 50,
    data_analytics: 50,
    ai_machine_learning: 50
  }
};

/**
 * Seniority multiplier for expertise/confidence
 */
export const SENIORITY_MULTIPLIER: Record<RespondentSeniority, number> = {
  c_suite: 1.2,
  director: 1.1,
  senior_manager: 1.0,
  manager: 0.9,
  analyst: 0.8,
  consultant: 1.0
};

/**
 * Calculate confidence weight for a respondent on a specific dimension
 */
export function calculateRespondentConfidence(
  context: RespondentContext,
  dimension: FCDimension
): number {
  const roleExpertise = ROLE_DIMENSION_EXPERTISE[context.role]?.[dimension] ?? 50;
  const seniorityMultiplier = SENIORITY_MULTIPLIER[context.seniority] ?? 1.0;
  const selfAssessedExpertise = context.dimensionExpertise?.[dimension] ?? roleExpertise;
  
  // Years of experience boost (up to 20% for 10+ years)
  const experienceBoost = Math.min(context.yearsInRole / 50, 0.2);
  
  // Blend role expertise with self-assessed (60/40 weighting)
  const blendedExpertise = (roleExpertise * 0.6) + (selfAssessedExpertise * 0.4);
  
  // Apply seniority and experience modifiers
  const finalConfidence = Math.min(100, blendedExpertise * seniorityMultiplier * (1 + experienceBoost));
  
  return Math.round(finalConfidence);
}

/**
 * Apply confidence-weighted adjustments to dimension scores
 */
export function applyConfidenceWeighting(
  dimensionScores: Record<string, number>,
  respondentContext: RespondentContext
): { 
  weightedScores: Record<string, number>; 
  confidenceLevels: Record<string, number>;
  lowConfidenceDimensions: FCDimension[];
} {
  const weightedScores: Record<string, number> = {};
  const confidenceLevels: Record<string, number> = {};
  const lowConfidenceDimensions: FCDimension[] = [];
  
  for (const [dimension, score] of Object.entries(dimensionScores)) {
    const confidence = calculateRespondentConfidence(respondentContext, dimension as FCDimension);
    confidenceLevels[dimension] = confidence;
    
    // Low confidence (< 60) adds uncertainty - widen the confidence band
    if (confidence < 60) {
      lowConfidenceDimensions.push(dimension as FCDimension);
    }
    
    // Scores remain the same but confidence influences how we interpret them
    weightedScores[dimension] = score;
  }
  
  return { weightedScores, confidenceLevels, lowConfidenceDimensions };
}

// ============================================
// PHASE 3: ENHANCED ROOT CAUSE ANALYSIS
// ============================================

export interface RemediationPath {
  id: string;
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  timeframe: "quick_win" | "short_term" | "medium_term" | "long_term";
  timeframeMonths: { min: number; max: number };
  dependencies: string[];
  stakeholders: string[];
  kpis: string[];
  estimatedCostRange: { min: number; max: number }; // In thousands
}

export interface EnhancedRootCause extends DetectedRootCause {
  remediationPaths: RemediationPath[];
  impactScore: number; // 0-100
  urgencyScore: number; // 0-100
  effortToResolve: "low" | "medium" | "high";
  businessRisk: string;
  stakeholderImpact: string[];
}

/**
 * Remediation paths for each root cause pattern
 */
export const ROOT_CAUSE_REMEDIATIONS: Record<string, RemediationPath[]> = {
  // ─── FRAMEWORK APPLIED THROUGHOUT ───────────────────────────────────────────
  // Step 1 (quick_win, Months 1-3):  Investigate and roadmap — understand the
  //   problem, document current state, align stakeholders, create a prioritised plan.
  // Step 2 (short_term, Months 3-6): Process and low-hanging fruit — governance
  //   changes, manual-effort reduction, quick process redesigns requiring no new tech.
  // Step 3 (medium_term, Months 6-12): Targeted tooling and integration — foundational
  //   technology that enables the process improvements already underway.
  // Step 4 (long_term, Months 12+):  Strategic platform investment — major platform
  //   consolidation or transformation requiring full change management.
  // ────────────────────────────────────────────────────────────────────────────

  tech_fragmentation: [
    {
      id: "systems_landscape_assessment",
      title: "Systems Landscape Assessment and Integration Roadmap",
      description: "Map all finance systems, data flows, and integration points. Document manual handoffs, quantify duplication effort, and produce a prioritised integration roadmap with business case.",
      effort: "low",
      impact: "high",
      timeframe: "quick_win",
      timeframeMonths: { min: 1, max: 3 },
      dependencies: [],
      stakeholders: ["CFO", "IT Director", "Finance Operations"],
      kpis: ["System inventory complete", "Integration gap analysis signed off", "Roadmap approved by steering group"],
      estimatedCostRange: { min: 15, max: 50 }
    },
    {
      id: "rpa_automation",
      title: "Targeted RPA for High-Volume Manual Data Transfers",
      description: "Deploy robotic process automation on the two or three highest-volume manual data movements identified in the assessment. Delivers immediate effort reduction without system replacement.",
      effort: "low",
      impact: "medium",
      timeframe: "short_term",
      timeframeMonths: { min: 3, max: 6 },
      dependencies: ["systems_landscape_assessment"],
      stakeholders: ["IT", "Finance Operations"],
      kpis: ["Manual effort reduction", "Processing time reduction", "Error rate reduction"],
      estimatedCostRange: { min: 30, max: 100 }
    },
    {
      id: "integration_layer",
      title: "Build Integration and Data Hub",
      description: "Implement integration middleware to connect existing systems and create a single source of truth for financial data, reducing reconciliation overhead and data latency.",
      effort: "medium",
      impact: "high",
      timeframe: "medium_term",
      timeframeMonths: { min: 6, max: 12 },
      dependencies: ["systems_landscape_assessment", "rpa_automation"],
      stakeholders: ["IT Director", "Data Architect", "Finance"],
      kpis: ["Data latency reduction", "Reconciliation time reduction", "Error rate reduction"],
      estimatedCostRange: { min: 100, max: 500 }
    },
    {
      id: "unified_platform",
      title: "Implement Unified EPM Platform",
      description: "Deploy an integrated EPM solution to consolidate planning, reporting, and consolidation on a single platform, underpinned by the integration layer and data governance already established.",
      effort: "high",
      impact: "high",
      timeframe: "long_term",
      timeframeMonths: { min: 12, max: 24 },
      dependencies: ["integration_layer", "systems_landscape_assessment"],
      stakeholders: ["CFO", "CIO", "Finance Transformation Lead"],
      kpis: ["Time-to-close reduction", "Planning cycle time", "User adoption rate"],
      estimatedCostRange: { min: 200, max: 1500 }
    }
  ],

  data_quality_gap: [
    {
      id: "data_quality_audit",
      title: "Data Quality Audit and Ownership Register",
      description: "Conduct a structured audit of all critical finance data domains. Identify root causes of quality failures, assign data owners to each domain, and produce a prioritised remediation plan.",
      effort: "low",
      impact: "high",
      timeframe: "quick_win",
      timeframeMonths: { min: 1, max: 3 },
      dependencies: [],
      stakeholders: ["CFO", "Chief Data Officer", "Finance Operations"],
      kpis: ["Data domains audited", "Ownership register complete", "Top-10 quality issues identified"],
      estimatedCostRange: { min: 15, max: 40 }
    },
    {
      id: "data_quality_process_fixes",
      title: "Process-Level Data Quality Improvements",
      description: "Address the highest-priority quality issues through process changes: cleanse critical reference data, enforce entry standards at source, and introduce peer-review steps for high-risk data inputs. No new tooling required.",
      effort: "low",
      impact: "medium",
      timeframe: "short_term",
      timeframeMonths: { min: 3, max: 6 },
      dependencies: ["data_quality_audit"],
      stakeholders: ["Data Team", "Finance Operations", "Business Unit Leads"],
      kpis: ["Critical quality issues resolved", "Data entry error rate", "Reconciliation exceptions"],
      estimatedCostRange: { min: 20, max: 60 }
    },
    {
      id: "data_governance_framework",
      title: "Establish Data Governance Framework and Tooling",
      description: "Formalise data governance with policies, stewardship roles, and automated quality monitoring. Deploy data profiling and quality tooling to sustain improvements and detect new issues early.",
      effort: "medium",
      impact: "high",
      timeframe: "medium_term",
      timeframeMonths: { min: 6, max: 12 },
      dependencies: ["data_quality_audit", "data_quality_process_fixes"],
      stakeholders: ["CFO", "Chief Data Officer", "Business Unit Heads"],
      kpis: ["Data quality score", "Policy compliance rate", "Automated quality checks active"],
      estimatedCostRange: { min: 75, max: 300 }
    },
    {
      id: "master_data_management",
      title: "Implement Master Data Management",
      description: "Deploy an MDM solution for critical finance data domains including chart of accounts, cost centres, and legal entities, building on the governance framework already in place.",
      effort: "high",
      impact: "high",
      timeframe: "long_term",
      timeframeMonths: { min: 12, max: 18 },
      dependencies: ["data_governance_framework"],
      stakeholders: ["IT", "Finance", "All business units"],
      kpis: ["Master data accuracy", "Duplicate record reduction", "Reference data consistency"],
      estimatedCostRange: { min: 150, max: 600 }
    }
  ],

  skills_capacity: [
    {
      id: "skills_gap_assessment",
      title: "Finance Capability and Skills Gap Assessment",
      description: "Conduct structured one-to-one assessments and team workshops to map current capabilities against the target operating model. Produce a prioritised skills development plan and hiring brief.",
      effort: "low",
      impact: "high",
      timeframe: "quick_win",
      timeframeMonths: { min: 1, max: 3 },
      dependencies: [],
      stakeholders: ["CFO", "HR", "Finance Leadership"],
      kpis: ["Assessment coverage", "Skills gap report signed off", "Development plan approved"],
      estimatedCostRange: { min: 10, max: 35 }
    },
    {
      id: "knowledge_transfer_quick_training",
      title: "Targeted Knowledge Transfer and Quick-Win Training",
      description: "Deliver focused workshops on the highest-priority capability gaps identified in the assessment. Cross-train team members to reduce single points of failure and document key processes.",
      effort: "low",
      impact: "medium",
      timeframe: "short_term",
      timeframeMonths: { min: 3, max: 6 },
      dependencies: ["skills_gap_assessment"],
      stakeholders: ["Finance Leadership", "L&D", "HR"],
      kpis: ["Workshop completion rate", "Process documentation coverage", "Single points of failure reduced"],
      estimatedCostRange: { min: 20, max: 75 }
    },
    {
      id: "upskilling_programme",
      title: "Finance Transformation Upskilling Programme",
      description: "Deliver a structured multi-module programme covering analytics, systems literacy, and modern finance practices. Supplement with targeted strategic hires for critical capability gaps that cannot be trained.",
      effort: "medium",
      impact: "high",
      timeframe: "medium_term",
      timeframeMonths: { min: 6, max: 12 },
      dependencies: ["skills_gap_assessment"],
      stakeholders: ["HR", "Finance Leadership", "L&D"],
      kpis: ["Training completion rate", "Skill assessment scores", "Vacancies filled"],
      estimatedCostRange: { min: 75, max: 400 }
    },
    {
      id: "centre_of_excellence",
      title: "Establish Finance Centre of Excellence",
      description: "Create a centre of excellence to develop, share, and scale best practices across the finance function. Provides a home for advanced analytics, process design, and continuous improvement capability.",
      effort: "high",
      impact: "high",
      timeframe: "long_term",
      timeframeMonths: { min: 9, max: 18 },
      dependencies: ["upskilling_programme"],
      stakeholders: ["CFO", "Finance Leadership"],
      kpis: ["Best practice adoption rate", "Innovation pipeline size", "Cross-team collaboration metrics"],
      estimatedCostRange: { min: 150, max: 500 }
    }
  ],

  manual_controls: [
    {
      id: "controls_inventory_assessment",
      title: "Controls Inventory and Risk Classification",
      description: "Document all manual controls, classify each by risk level and volume, and identify the highest-priority candidates for process redesign or automation. Produces the roadmap for subsequent phases.",
      effort: "low",
      impact: "high",
      timeframe: "quick_win",
      timeframeMonths: { min: 1, max: 3 },
      dependencies: [],
      stakeholders: ["Finance Operations", "Internal Audit", "Process Owners"],
      kpis: ["Controls inventoried", "Risk classification complete", "Automation candidates identified"],
      estimatedCostRange: { min: 10, max: 30 }
    },
    {
      id: "control_redesign",
      title: "Control Process Redesign",
      description: "Redesign and streamline the highest-risk manual control procedures to eliminate unnecessary steps and reduce error exposure. Achievable without new technology investment.",
      effort: "low",
      impact: "medium",
      timeframe: "short_term",
      timeframeMonths: { min: 3, max: 6 },
      dependencies: ["controls_inventory_assessment"],
      stakeholders: ["Finance Operations", "Process Owners", "Internal Audit"],
      kpis: ["Process cycle time reduction", "Manual steps eliminated", "Error rate reduction", "Control effectiveness score"],
      estimatedCostRange: { min: 25, max: 75 }
    },
    {
      id: "workflow_automation",
      title: "Workflow Automation for Priority Controls",
      description: "Deploy workflow tooling to automate approvals, reconciliations, and control processes identified as highest-volume or highest-risk in the inventory. Builds on the redesigned processes.",
      effort: "medium",
      impact: "high",
      timeframe: "medium_term",
      timeframeMonths: { min: 6, max: 9 },
      dependencies: ["controls_inventory_assessment", "control_redesign"],
      stakeholders: ["Finance Operations", "Internal Audit", "IT"],
      kpis: ["Automation rate", "Cycle time reduction", "Control effectiveness"],
      estimatedCostRange: { min: 50, max: 200 }
    },
    {
      id: "continuous_controls",
      title: "Continuous Controls Monitoring Platform",
      description: "Implement automated exception detection and continuous monitoring of key controls, providing real-time assurance and reducing reliance on periodic manual reviews.",
      effort: "medium",
      impact: "high",
      timeframe: "long_term",
      timeframeMonths: { min: 9, max: 18 },
      dependencies: ["workflow_automation"],
      stakeholders: ["Internal Audit", "Risk", "Finance"],
      kpis: ["Control coverage rate", "Exception detection time", "Audit finding reduction"],
      estimatedCostRange: { min: 75, max: 250 }
    }
  ],

  reporting_bottleneck: [
    {
      id: "reporting_inventory_assessment",
      title: "Reporting Inventory and Stakeholder Needs Assessment",
      description: "Catalogue every report produced across the finance function. Assess usage frequency, consumer satisfaction, and business value. Identify redundant, duplicate, and low-value reports for rationalisation.",
      effort: "low",
      impact: "high",
      timeframe: "quick_win",
      timeframeMonths: { min: 1, max: 3 },
      dependencies: [],
      stakeholders: ["Finance", "Report Consumers", "Business Unit Heads"],
      kpis: ["Reports catalogued", "Usage data collected", "Rationalisation candidates identified"],
      estimatedCostRange: { min: 10, max: 25 }
    },
    {
      id: "report_rationalisation",
      title: "Report Rationalisation and Standardisation",
      description: "Decommission redundant and low-value reports, consolidate overlapping outputs, and standardise templates. Reduces production burden immediately without any technology investment.",
      effort: "low",
      impact: "medium",
      timeframe: "short_term",
      timeframeMonths: { min: 3, max: 5 },
      dependencies: ["reporting_inventory_assessment"],
      stakeholders: ["Finance", "Report Owners"],
      kpis: ["Report count reduction", "Production time saved per period", "Consumer satisfaction"],
      estimatedCostRange: { min: 15, max: 50 }
    },
    {
      id: "reporting_automation",
      title: "Report Automation and Scheduled Distribution",
      description: "Automate the generation, validation, and distribution of the retained report set using workflow and scheduling tooling. Eliminates manual assembly effort for recurring outputs.",
      effort: "low",
      impact: "high",
      timeframe: "medium_term",
      timeframeMonths: { min: 5, max: 8 },
      dependencies: ["report_rationalisation"],
      stakeholders: ["Finance Operations", "Report Owners", "IT"],
      kpis: ["Report production time reduction", "Manual intervention rate", "Stakeholder satisfaction"],
      estimatedCostRange: { min: 30, max: 100 }
    },
    {
      id: "self_service_analytics",
      title: "Self-Service Analytics Platform",
      description: "Implement a BI platform enabling business users to create their own reports and dashboards, reducing demand on the central finance team and enabling faster decision-making.",
      effort: "medium",
      impact: "high",
      timeframe: "long_term",
      timeframeMonths: { min: 9, max: 15 },
      dependencies: ["reporting_automation"],
      stakeholders: ["Finance", "Business Units", "IT"],
      kpis: ["Report request reduction", "Self-service adoption rate", "Time to insight"],
      estimatedCostRange: { min: 80, max: 300 }
    }
  ],

  ai_not_ready: [
    {
      id: "ai_maturity_assessment",
      title: "AI Maturity Assessment and Use Case Prioritisation",
      description: "Evaluate current data quality, skills, and infrastructure readiness for AI. Identify and rank 3 to 5 priority use cases by value and feasibility, producing a phased AI adoption roadmap.",
      effort: "low",
      impact: "high",
      timeframe: "quick_win",
      timeframeMonths: { min: 1, max: 3 },
      dependencies: [],
      stakeholders: ["CFO", "CDO", "Finance Analytics"],
      kpis: ["Maturity assessment complete", "Use cases prioritised", "AI roadmap approved"],
      estimatedCostRange: { min: 15, max: 40 }
    },
    {
      id: "ai_skills_development",
      title: "AI Literacy and Skills Development",
      description: "Deliver targeted training on AI concepts, finance use cases, and working with data science teams. Establish clear ways of working between finance and any analytics or data science function.",
      effort: "low",
      impact: "medium",
      timeframe: "short_term",
      timeframeMonths: { min: 3, max: 6 },
      dependencies: ["ai_maturity_assessment"],
      stakeholders: ["HR", "Finance", "Data Science"],
      kpis: ["Training completion rate", "AI literacy assessment scores", "Finance-data science collaboration KPIs"],
      estimatedCostRange: { min: 25, max: 80 }
    },
    {
      id: "ai_pilots",
      title: "Targeted AI Pilot Projects",
      description: "Deliver focused AI use cases in forecasting or anomaly detection from the prioritised list. Designed to demonstrate value quickly and build internal confidence before broader rollout.",
      effort: "medium",
      impact: "medium",
      timeframe: "medium_term",
      timeframeMonths: { min: 4, max: 9 },
      dependencies: ["ai_skills_development"],
      stakeholders: ["Finance Analytics", "Data Science", "IT"],
      kpis: ["Pilot delivery on time", "Business value realised", "Team capability growth"],
      estimatedCostRange: { min: 50, max: 200 }
    },
    {
      id: "data_foundation",
      title: "Build AI-Ready Data Foundation",
      description: "Establish a clean, integrated data platform as the foundation for scaling AI and ML initiatives across the finance function, building on the governance and quality work already delivered.",
      effort: "high",
      impact: "high",
      timeframe: "long_term",
      timeframeMonths: { min: 12, max: 18 },
      dependencies: ["ai_pilots", "data_governance_framework"],
      stakeholders: ["CDO", "CIO", "CFO"],
      kpis: ["Data availability score", "Data quality score", "Integration completeness"],
      estimatedCostRange: { min: 200, max: 800 }
    }
  ]
};

/**
 * Enhance root causes with remediation paths and impact scoring
 */
export function enhanceRootCauses(
  detectedRootCauses: DetectedRootCause[],
  dimensionScores: Record<string, number>
): EnhancedRootCause[] {
  return detectedRootCauses.map(rootCause => {
    const remediationPaths = ROOT_CAUSE_REMEDIATIONS[rootCause.pattern.id] || [];
    
    // Calculate impact score based on how many dimensions are affected and their gap from target
    const affectedCount = rootCause.affectedDimensions.length;
    const avgGap = rootCause.affectedDimensions.reduce((sum, dim) => {
      const score = dimensionScores[dim] ?? 50;
      return sum + (70 - score); // Gap from "good" threshold of 70
    }, 0) / Math.max(affectedCount, 1);
    const impactScore = Math.min(100, Math.round((affectedCount * 15) + Math.max(0, avgGap)));
    
    // Urgency based on priority and number of matched indicators
    const priorityUrgency = { critical: 40, high: 30, medium: 20, low: 10 };
    const indicatorRatio = rootCause.matchedIndicators / rootCause.totalIndicators;
    const urgencyScore = Math.min(100, Math.round(
      priorityUrgency[rootCause.pattern.priority] + (indicatorRatio * 60)
    ));
    
    // Effort to resolve - average of remediation efforts
    const effortMap = { low: 1, medium: 2, high: 3 };
    const avgEffort = remediationPaths.reduce((sum, r) => sum + effortMap[r.effort], 0) / 
      Math.max(remediationPaths.length, 1);
    const effortToResolve = avgEffort <= 1.5 ? "low" : avgEffort <= 2.5 ? "medium" : "high";
    
    // Business risk narrative
    const businessRisk = rootCause.pattern.priority === "critical" 
      ? "Critical business risk requiring immediate executive attention"
      : rootCause.pattern.priority === "high"
      ? "Significant risk to finance transformation success"
      : rootCause.pattern.priority === "medium"
      ? "Moderate risk that should be addressed within 6-12 months"
      : "Lower priority issue for continuous improvement";
    
    // Stakeholder impact
    const stakeholderImpact = Array.from(new Set(
      remediationPaths.flatMap(r => r.stakeholders)
    ));
    
    return {
      ...rootCause,
      remediationPaths,
      impactScore,
      urgencyScore,
      effortToResolve,
      businessRisk,
      stakeholderImpact
    };
  });
}

// ============================================
// PHASE 4: ENHANCED EXECUTIVE BRIEF
// ============================================

export type StakeholderType = "cfo" | "cio" | "ceo" | "board" | "fpa_director" | "transformation_lead";

export type ConfidenceLevel = 
  | "validated_evidence"   // Formerly [FACT] - directly supported by assessment data
  | "advisory_judgement"   // Formerly [HYPOTHESIS] - professional interpretation
  | "indicative_outlook"   // Formerly [ESTIMATE] - projected or inferred
  | "pending_validation";  // Needs further discovery

export interface ConfidenceTaggedInsight {
  content: string;
  confidenceLevel: ConfidenceLevel;
  supportingEvidence?: string[];
  dimensionSources?: FCDimension[];
}

export interface StakeholderBrief {
  stakeholder: StakeholderType;
  executiveSummary: ConfidenceTaggedInsight;
  keyMessages: ConfidenceTaggedInsight[];
  priorityActions: ConfidenceTaggedInsight[];
  riskHighlights: ConfidenceTaggedInsight[];
  investmentConsiderations: ConfidenceTaggedInsight[];
}

export interface ExecutiveBriefContext {
  companyName: string;
  industry: string;
  companySize: string;
  overallScore: number;
  dimensionScores: Record<string, number>;
  adjustedScores: Record<string, number>;
  maturityLevels: Record<string, MaturityLevel>;
  rootCauses: EnhancedRootCause[];
  respondentContext?: RespondentContext;
  confidenceLevels?: Record<string, number>;
}

/**
 * Stakeholder-specific focus areas for tailored briefs
 */
export const STAKEHOLDER_FOCUS: Record<StakeholderType, {
  primaryDimensions: FCDimension[];
  keyMetrics: string[];
  toneGuidance: string;
}> = {
  cfo: {
    primaryDimensions: ["financial_planning_analysis", "management_reporting", "consolidation_close", "financial_controls_compliance"],
    keyMetrics: ["Close cycle time", "Forecast accuracy", "Cost of finance function", "Audit findings"],
    toneGuidance: "Strategic with clear business case and ROI focus"
  },
  cio: {
    primaryDimensions: ["technology_systems", "data_analytics", "ai_machine_learning"],
    keyMetrics: ["System integration", "Data quality", "Technology TCO", "Platform scalability"],
    toneGuidance: "Technical depth with architecture and integration focus"
  },
  ceo: {
    primaryDimensions: ["financial_planning_analysis", "management_reporting", "organisation_people"],
    keyMetrics: ["Business insight delivery", "Strategic decision support", "Organisational agility"],
    toneGuidance: "High-level strategic with competitive advantage focus"
  },
  board: {
    primaryDimensions: ["financial_controls_compliance", "management_reporting", "financial_planning_analysis"],
    keyMetrics: ["Risk exposure", "Governance maturity", "Shareholder value impact"],
    toneGuidance: "Governance-focused with risk and compliance emphasis"
  },
  fpa_director: {
    primaryDimensions: ["financial_planning_analysis", "data_analytics", "technology_systems"],
    keyMetrics: ["Planning cycle efficiency", "Model sophistication", "Driver-based planning maturity"],
    toneGuidance: "Operational detail with process improvement focus"
  },
  transformation_lead: {
    primaryDimensions: ["organisation_people", "technology_systems", "data_analytics", "ai_machine_learning"],
    keyMetrics: ["Change readiness", "Capability gaps", "Transformation roadmap progress"],
    toneGuidance: "Change management and implementation focused"
  }
};

/**
 * Generate confidence level based on data quality and source
 */
export function determineConfidenceLevel(
  insight: string,
  dimensionSources: FCDimension[],
  confidenceLevels?: Record<string, number>,
  hasDirectEvidence?: boolean
): ConfidenceLevel {
  if (hasDirectEvidence) {
    return "validated_evidence";
  }
  
  if (!confidenceLevels || dimensionSources.length === 0) {
    return "advisory_judgement";
  }
  
  const avgConfidence = dimensionSources.reduce((sum, dim) => {
    return sum + (confidenceLevels[dim] ?? 50);
  }, 0) / dimensionSources.length;
  
  if (avgConfidence >= 80) {
    return "validated_evidence";
  } else if (avgConfidence >= 60) {
    return "advisory_judgement";
  } else if (avgConfidence >= 40) {
    return "indicative_outlook";
  }
  return "pending_validation";
}

/**
 * Get stakeholder-relevant dimensions and their priority
 */
export function getStakeholderRelevantDimensions(
  stakeholder: StakeholderType,
  dimensionScores: Record<string, number>
): { dimension: FCDimension; score: number; priority: "critical" | "important" | "relevant" }[] {
  const focus = STAKEHOLDER_FOCUS[stakeholder];
  const result: { dimension: FCDimension; score: number; priority: "critical" | "important" | "relevant" }[] = [];
  
  for (const [dimension, score] of Object.entries(dimensionScores)) {
    const dim = dimension as FCDimension;
    const isPrimary = focus.primaryDimensions.includes(dim);
    
    let priority: "critical" | "important" | "relevant";
    if (isPrimary && score < 40) {
      priority = "critical";
    } else if (isPrimary || score < 50) {
      priority = "important";
    } else {
      priority = "relevant";
    }
    
    result.push({ dimension: dim, score, priority });
  }
  
  // Sort by priority then by score (lowest first for attention)
  const priorityOrder = { critical: 0, important: 1, relevant: 2 };
  return result.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.score - b.score;
  });
}

/**
 * Confidence level display metadata
 */
export const CONFIDENCE_LEVEL_METADATA: Record<ConfidenceLevel, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  validated_evidence: {
    label: "Validated Evidence",
    icon: "check-circle",
    color: "green",
    description: "Directly supported by assessment data and responses"
  },
  advisory_judgement: {
    label: "Advisory Judgement",
    icon: "lightbulb",
    color: "blue",
    description: "Professional interpretation based on patterns and experience"
  },
  indicative_outlook: {
    label: "Indicative Outlook",
    icon: "trending-up",
    color: "amber",
    description: "Projected or inferred from available data"
  },
  pending_validation: {
    label: "Pending Validation",
    icon: "help-circle",
    color: "gray",
    description: "Requires further discovery or verification"
  }
};
