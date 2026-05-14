/**
 * FinanceCompass Industry Benchmarks and Scoring Framework
 * Based on 1QG Assessment Platform specifications
 * 
 * Re-exports from shared constants for backward compatibility.
 */

export {
  DIMENSION_BENCHMARKS,
  DIMENSION_LABELS_BY_CODE as DIMENSION_LABELS,
  API_KEY_TO_DIMENSION,
  CANONICAL_DIMENSIONS,
  GAP_THRESHOLDS,
  GAP_CLASSIFICATION,
  MATURITY_LEVELS_SCALE as MATURITY_LEVELS,
  SCORE_WEIGHTS,
  SCORING_TIERS,
  BENCHMARK_TARGETS,
  TARGET_MATURITY,
  classifyGap,
  getMaturityLevelFromScale as getMaturityLevel,
  getScoringTier,
  percentageToScale,
  scaleToPercentage,
  formatDimensionName,
  getStatusInfo,
  type GapClassificationType,
  type MaturityLevelScaleType,
  type ScoringTierType,
} from "@shared/finance-compass-constants";

import { 
  BENCHMARK_TARGETS, 
  DIMENSION_BENCHMARKS, 
  GAP_CLASSIFICATION, 
  SCORE_WEIGHTS,
  MATURITY_LEVELS_SCALE as MATURITY_LEVELS,
  classifyGap as sharedClassifyGap,
} from "@shared/finance-compass-constants";

export const WORLD_CLASS_BENCHMARK = BENCHMARK_TARGETS.WORLD_CLASS;

// Benefits tracking categories
export const BENEFITS_CATEGORIES = {
  FTE_SAVINGS: {
    label: 'FTE Savings',
    icon: 'Users',
    targets: {
      phase0: 0,
      phase1: { min: 10, max: 20 },
      phase2: { min: 25, max: 35 },
      phase3: { min: 40, max: 50 },
    },
    unit: '%',
  },
  COST_SAVINGS: {
    label: 'Cost Savings',
    icon: 'DollarSign',
    scenarios: {
      conservative: { reduction: { min: 10, max: 15 }, payback: '3-4 years' },
      midRange: { reduction: { min: 20, max: 25 }, payback: '2-2.5 years' },
      aggressive: { reduction: { min: 30, max: 40 }, payback: '1.5-2 years' },
    },
    unit: '%',
  },
  CYCLE_TIME: {
    label: 'Cycle Time Reduction',
    icon: 'Clock',
    targets: {
      close: { current: 'Variable', phase1: '4-5 days', phase3: '1 day' },
      planning: { current: 'Annual', phase1: 'Quarterly', phase3: 'Continuous' },
    },
    unit: 'days',
  },
  REVENUE_MARGIN: {
    label: 'Revenue/Margin Improvement',
    icon: 'TrendingUp',
    sources: {
      revenueRecognition: { min: 1, max: 2 },
      pricingInventory: { min: 2, max: 3 },
      problemResolution: { min: 1, max: 2 },
      strategic: { min: 3, max: 5 },
    },
    unit: '%',
  },
  RISK_REDUCTION: {
    label: 'Risk Reduction',
    icon: 'Shield',
    metrics: ['Data quality issues', 'Control violations', 'Audit findings', 'Fraud detection rate'],
    unit: 'score',
  },
  STRATEGIC_VALUE: {
    label: 'Strategic Value',
    icon: 'Target',
    metrics: ['Strategic work %', 'Analytics models deployed', 'Business satisfaction', 'Strategic initiatives'],
    unit: 'score',
  },
} as const;

export function calculateOverallScore(
  epmScore: number,
  aiScore: number,
  infrastructureScore: number,
  contextScore: number
): number {
  return (
    epmScore * SCORE_WEIGHTS.EPM +
    aiScore * SCORE_WEIGHTS.AI +
    infrastructureScore * SCORE_WEIGHTS.INFRASTRUCTURE +
    contextScore * SCORE_WEIGHTS.CONTEXT
  );
}

export function calculateGapAnalysis(dimensionScores: Record<string, number>) {
  const gaps: Record<string, { score: number; benchmark: number; gap: number; classification: keyof typeof GAP_CLASSIFICATION }> = {};
  
  const dimensionMapping: Record<string, keyof typeof DIMENSION_BENCHMARKS> = {
    financial_planning_analysis: 'D1_STRATEGY',
    consolidation_close: 'D2_PROCESS',
    transaction_processing: 'D2_PROCESS',
    organisation_people: 'D3_ORGANISATION',
    technology_systems: 'D4_TECHNOLOGY',
    data_analytics: 'D5_DATA',
    management_reporting: 'D6_KPIS',
    financial_controls_compliance: 'D7_GOVERNANCE',
    ai_machine_learning: 'D8_AI',
  };

  for (const [key, score] of Object.entries(dimensionScores)) {
    const benchmarkKey = dimensionMapping[key];
    if (benchmarkKey) {
      const benchmarkData = DIMENSION_BENCHMARKS[benchmarkKey];
      const normalizedScore = (score / 100) * 5;
      const gap = Math.max(0, benchmarkData.worldClass - normalizedScore);
      gaps[key] = {
        score: normalizedScore,
        benchmark: benchmarkData.industryAverage,
        gap,
        classification: sharedClassifyGap(gap),
      };
    }
  }

  return gaps;
}

export function getScoringTierFromPercentile(percentile: number): string {
  if (percentile >= 90) return "WORLD_CLASS";
  if (percentile >= 75) return "GOOD";
  if (percentile >= 50) return "AVERAGE";
  if (percentile >= 25) return "BELOW_AVERAGE";
  return "POOR";
}
