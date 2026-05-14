/**
 * Dimension-to-ROI Mapping
 * 
 * Links FinanceCompass assessment dimensions to specific ROI benefit categories.
 * Enables auto-population of ROI calculator fields based on dimension scores and gaps.
 */

import type { RoiInputs } from './roi-calculator';

// The 8 canonical dimensions from FinanceCompass
export const CANONICAL_DIMENSIONS = [
  'financial_planning_analysis',
  'management_reporting', 
  'consolidation_close',
  'financial_controls_compliance',
  'technology_systems',
  'organisation_people',
  'data_analytics',
  'ai_machine_learning'
] as const;

export type CanonicalDimension = typeof CANONICAL_DIMENSIONS[number];

// Dimension display names for UI
export const DIMENSION_LABELS: Record<CanonicalDimension, string> = {
  financial_planning_analysis: 'Financial Planning & Analysis',
  management_reporting: 'Management Reporting',
  consolidation_close: 'Consolidation & Close',
  financial_controls_compliance: 'Financial Controls & Compliance',
  technology_systems: 'Technology & Systems',
  organisation_people: 'Organisation & People',
  data_analytics: 'Data & Analytics',
  ai_machine_learning: 'AI & Machine Learning'
};

// ROI benefit categories
export type RoiBenefitCategory = 
  | 'processEfficiency'
  | 'headcountRedeployment'
  | 'closeAcceleration'
  | 'consultingSavings'
  | 'revenueEnablement'
  | 'complianceRiskAvoidance'
  | 'auditEfficiency';

export const BENEFIT_LABELS: Record<RoiBenefitCategory, string> = {
  processEfficiency: 'Process Efficiency',
  headcountRedeployment: 'FTE Redeployment',
  closeAcceleration: 'Close Acceleration',
  consultingSavings: 'Consulting Savings',
  revenueEnablement: 'Revenue Enablement',
  complianceRiskAvoidance: 'Compliance Risk Avoidance',
  auditEfficiency: 'Audit Efficiency'
};

// Mapping: which dimensions drive which ROI benefits
// Weight indicates relative contribution (0-1, must sum to 1 per benefit)
export interface DimensionBenefitWeight {
  dimension: CanonicalDimension;
  weight: number; // 0-1, contribution weight
}

export const DIMENSION_BENEFIT_MAPPING: Record<RoiBenefitCategory, DimensionBenefitWeight[]> = {
  processEfficiency: [
    { dimension: 'ai_machine_learning', weight: 0.35 },
    { dimension: 'technology_systems', weight: 0.25 },
    { dimension: 'data_analytics', weight: 0.20 },
    { dimension: 'consolidation_close', weight: 0.20 }
  ],
  headcountRedeployment: [
    { dimension: 'organisation_people', weight: 0.40 },
    { dimension: 'ai_machine_learning', weight: 0.30 },
    { dimension: 'technology_systems', weight: 0.30 }
  ],
  closeAcceleration: [
    { dimension: 'consolidation_close', weight: 0.50 },
    { dimension: 'technology_systems', weight: 0.25 },
    { dimension: 'data_analytics', weight: 0.25 }
  ],
  consultingSavings: [
    { dimension: 'technology_systems', weight: 0.35 },
    { dimension: 'data_analytics', weight: 0.35 },
    { dimension: 'organisation_people', weight: 0.30 }
  ],
  revenueEnablement: [
    { dimension: 'financial_planning_analysis', weight: 0.40 },
    { dimension: 'data_analytics', weight: 0.35 },
    { dimension: 'management_reporting', weight: 0.25 }
  ],
  complianceRiskAvoidance: [
    { dimension: 'financial_controls_compliance', weight: 0.60 },
    { dimension: 'technology_systems', weight: 0.25 },
    { dimension: 'data_analytics', weight: 0.15 }
  ],
  auditEfficiency: [
    { dimension: 'financial_controls_compliance', weight: 0.45 },
    { dimension: 'management_reporting', weight: 0.35 },
    { dimension: 'consolidation_close', weight: 0.20 }
  ]
};

// Benchmark targets for "1QG Good" performance (score out of 100)
export const BENCHMARK_TARGET = 75;

// Industry-specific benefit multipliers (annual £k per dimension point gap)
// These are calibrated based on typical mid-market organisations (£50-250M revenue)
export interface IndustryBenefitMultipliers {
  baseProcessEfficiencyPerPoint: number; // £k per 1-point gap
  baseFteSavingsPerPoint: number; // FTEs per 10-point gap
  baseCloseValuePerPoint: number; // £k per 1-point gap
  baseConsultingPerPoint: number; // £k per 1-point gap
  baseRevenuePerPoint: number; // £k per 1-point gap
  baseCompliancePerPoint: number; // £k per 1-point gap
  baseAuditPerPoint: number; // £k per 1-point gap
}

export const DEFAULT_BENEFIT_MULTIPLIERS: IndustryBenefitMultipliers = {
  baseProcessEfficiencyPerPoint: 0.3, // 0.3% efficiency per point gap
  baseFteSavingsPerPoint: 0.05, // 0.5 FTE per 10 points
  baseCloseValuePerPoint: 1.5, // £1.5k per point
  baseConsultingPerPoint: 2.0, // £2k per point
  baseRevenuePerPoint: 5.0, // £5k per point
  baseCompliancePerPoint: 1.0, // £1k per point
  baseAuditPerPoint: 0.8 // £0.8k per point
};

// Size band multipliers to scale benefits by organisation size
export const SIZE_BAND_MULTIPLIERS: Record<string, number> = {
  'under_10m': 0.3,
  '10m_50m': 0.6,
  '50m_250m': 1.0,
  '250m_1b': 2.0,
  'over_1b': 4.0
};

// Map legacy/alternative size band names to canonical keys
const SIZE_BAND_ALIASES: Record<string, string> = {
  'mid_market': '50m_250m',
  'small': 'under_10m',
  'small_business': '10m_50m',
  'large': '250m_1b',
  'enterprise': 'over_1b',
  // Canonical names map to themselves
  'under_10m': 'under_10m',
  '10m_50m': '10m_50m',
  '50m_250m': '50m_250m',
  '250m_1b': '250m_1b',
  'over_1b': 'over_1b'
};

/**
 * Normalize size band to canonical format expected by ROI calculations.
 * Handles legacy names like 'mid_market' by mapping to canonical keys.
 */
export function normalizeSizeBand(sizeBand: string): string {
  return SIZE_BAND_ALIASES[sizeBand] ?? '50m_250m';
}

export interface DimensionScores {
  [dimension: string]: number; // 0-100 score per dimension
}

export interface DimensionGaps {
  [dimension: string]: number; // Gap to BENCHMARK_TARGET (positive = room to improve)
}

/**
 * Calculate dimension gaps from scores
 */
export function calculateDimensionGaps(scores: DimensionScores): DimensionGaps {
  const gaps: DimensionGaps = {};
  for (const dim of CANONICAL_DIMENSIONS) {
    const score = scores[dim] ?? 0;
    gaps[dim] = Math.max(0, BENCHMARK_TARGET - score);
  }
  return gaps;
}

/**
 * Calculate weighted benefit potential for a specific ROI category
 * based on dimension gaps
 */
export function calculateBenefitPotential(
  category: RoiBenefitCategory,
  gaps: DimensionGaps
): number {
  const mapping = DIMENSION_BENEFIT_MAPPING[category];
  let weightedGap = 0;
  
  for (const { dimension, weight } of mapping) {
    const gap = gaps[dimension] ?? 0;
    weightedGap += gap * weight;
  }
  
  return weightedGap;
}

/**
 * Calculate dimension contribution to each benefit category
 * Returns breakdown showing which dimensions drive which benefits
 */
export interface DimensionContribution {
  dimension: CanonicalDimension;
  label: string;
  score: number;
  gap: number;
  contributions: {
    category: RoiBenefitCategory;
    categoryLabel: string;
    weight: number;
    contribution: number; // £k annual value
  }[];
  totalContribution: number; // £k total annual value
}

export function calculateDimensionContributions(
  scores: DimensionScores,
  sizeBand: string = '50m_250m',
  multipliers: IndustryBenefitMultipliers = DEFAULT_BENEFIT_MULTIPLIERS
): DimensionContribution[] {
  const gaps = calculateDimensionGaps(scores);
  const normalizedBand = normalizeSizeBand(sizeBand);
  const sizeMultiplier = SIZE_BAND_MULTIPLIERS[normalizedBand] ?? 1.0;
  
  const contributions: DimensionContribution[] = [];
  
  for (const dimension of CANONICAL_DIMENSIONS) {
    const score = scores[dimension] ?? 0;
    const gap = gaps[dimension] ?? 0;
    const dimContribution: DimensionContribution = {
      dimension,
      label: DIMENSION_LABELS[dimension],
      score,
      gap,
      contributions: [],
      totalContribution: 0
    };
    
    // Find all benefit categories this dimension contributes to
    for (const [category, mapping] of Object.entries(DIMENSION_BENEFIT_MAPPING)) {
      const catKey = category as RoiBenefitCategory;
      const dimWeight = mapping.find(m => m.dimension === dimension);
      
      if (dimWeight) {
        // Calculate the value contribution based on the benefit type
        let baseValue = 0;
        switch (catKey) {
          case 'processEfficiency':
            baseValue = gap * multipliers.baseProcessEfficiencyPerPoint;
            break;
          case 'headcountRedeployment':
            baseValue = gap * multipliers.baseFteSavingsPerPoint * 80; // Convert FTE to £k (£80k per FTE)
            break;
          case 'closeAcceleration':
            baseValue = gap * multipliers.baseCloseValuePerPoint;
            break;
          case 'consultingSavings':
            baseValue = gap * multipliers.baseConsultingPerPoint;
            break;
          case 'revenueEnablement':
            baseValue = gap * multipliers.baseRevenuePerPoint;
            break;
          case 'complianceRiskAvoidance':
            baseValue = gap * multipliers.baseCompliancePerPoint;
            break;
          case 'auditEfficiency':
            baseValue = gap * multipliers.baseAuditPerPoint;
            break;
        }
        
        const contribution = baseValue * dimWeight.weight * sizeMultiplier;
        
        dimContribution.contributions.push({
          category: catKey,
          categoryLabel: BENEFIT_LABELS[catKey],
          weight: dimWeight.weight,
          contribution: Math.round(contribution * 10) / 10
        });
        
        dimContribution.totalContribution += contribution;
      }
    }
    
    dimContribution.totalContribution = Math.round(dimContribution.totalContribution * 10) / 10;
    contributions.push(dimContribution);
  }
  
  // Sort by total contribution descending
  return contributions.sort((a, b) => b.totalContribution - a.totalContribution);
}

/**
 * Auto-populate ROI inputs based on dimension scores
 * Returns suggested values for each benefit category
 */
export interface SuggestedRoiInputs {
  // Benefits (£k unless noted)
  processEfficiencyPercent: number; // %
  headcountDelta: number; // FTEs
  closeAccelerationDays: number; // days
  closeAccelerationValue: number; // £k
  externalConsultingSavings: number; // £k
  revenueEnablement: number; // £k
  complianceRiskAvoidance: number; // £k
  auditEfficiencySavings: number; // £k
  
  // Contribution breakdown for transparency
  dimensionContributions: DimensionContribution[];
  
  // Total estimated annual benefit
  totalEstimatedBenefit: number;
}

export function calculateSuggestedRoiInputs(
  dimensionScores: DimensionScores,
  sizeBand: string = '50m_250m',
  baselineOperatingCost: number = 500, // £k default
  currentCloseDays: number = 10 // days default
): SuggestedRoiInputs {
  const gaps = calculateDimensionGaps(dimensionScores);
  const normalizedBand = normalizeSizeBand(sizeBand);
  const sizeMultiplier = SIZE_BAND_MULTIPLIERS[normalizedBand] ?? 1.0;
  const multipliers = DEFAULT_BENEFIT_MULTIPLIERS;
  
  // Calculate benefit potentials
  const processGap = calculateBenefitPotential('processEfficiency', gaps);
  const fteGap = calculateBenefitPotential('headcountRedeployment', gaps);
  const closeGap = calculateBenefitPotential('closeAcceleration', gaps);
  const consultingGap = calculateBenefitPotential('consultingSavings', gaps);
  const revenueGap = calculateBenefitPotential('revenueEnablement', gaps);
  const complianceGap = calculateBenefitPotential('complianceRiskAvoidance', gaps);
  const auditGap = calculateBenefitPotential('auditEfficiency', gaps);
  
  // Calculate suggested values
  const processEfficiencyPercent = Math.min(40, Math.round(processGap * multipliers.baseProcessEfficiencyPerPoint));
  const headcountDelta = Math.round(fteGap * multipliers.baseFteSavingsPerPoint * sizeMultiplier * 10) / 10;
  
  // Close acceleration: estimate days saved based on gap and current close cycle
  const potentialDaysReduction = Math.min(currentCloseDays - 3, Math.round(closeGap * 0.1));
  const closeAccelerationDays = Math.max(0, potentialDaysReduction);
  const closeAccelerationValue = Math.round(closeGap * multipliers.baseCloseValuePerPoint * sizeMultiplier);
  
  const externalConsultingSavings = Math.round(consultingGap * multipliers.baseConsultingPerPoint * sizeMultiplier);
  const revenueEnablement = Math.round(revenueGap * multipliers.baseRevenuePerPoint * sizeMultiplier);
  const complianceRiskAvoidance = Math.round(complianceGap * multipliers.baseCompliancePerPoint * sizeMultiplier);
  const auditEfficiencySavings = Math.round(auditGap * multipliers.baseAuditPerPoint * sizeMultiplier);
  
  // Get detailed contributions
  const dimensionContributions = calculateDimensionContributions(dimensionScores, sizeBand, multipliers);
  
  // Calculate total benefit (rough estimate)
  const efficiencySavings = (processEfficiencyPercent / 100) * baselineOperatingCost;
  const headcountSavings = headcountDelta * 80; // £80k per FTE
  const totalEstimatedBenefit = Math.round(
    efficiencySavings +
    headcountSavings +
    closeAccelerationValue +
    externalConsultingSavings +
    revenueEnablement +
    complianceRiskAvoidance +
    auditEfficiencySavings
  );
  
  return {
    processEfficiencyPercent,
    headcountDelta,
    closeAccelerationDays,
    closeAccelerationValue,
    externalConsultingSavings,
    revenueEnablement,
    complianceRiskAvoidance,
    auditEfficiencySavings,
    dimensionContributions,
    totalEstimatedBenefit
  };
}

/**
 * Format dimension contribution for display
 */
export function formatContributionSummary(contributions: DimensionContribution[]): string {
  const lines = contributions
    .filter(c => c.totalContribution > 0)
    .slice(0, 5)
    .map(c => `${c.label}: £${c.totalContribution}k potential`);
  
  return lines.join('\n');
}

/**
 * Get the top contributing dimensions for a specific benefit category
 */
export function getTopContributorsForBenefit(
  category: RoiBenefitCategory,
  contributions: DimensionContribution[],
  limit: number = 3
): { dimension: string; label: string; contribution: number }[] {
  const relevant = contributions
    .map(c => {
      const catContrib = c.contributions.find(x => x.category === category);
      return {
        dimension: c.dimension,
        label: c.label,
        contribution: catContrib?.contribution ?? 0
      };
    })
    .filter(x => x.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  
  return relevant.slice(0, limit);
}
