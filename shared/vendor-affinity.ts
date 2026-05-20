/**
 * EPM Vendor Affinity Scoring
 * 
 * Scores and ranks EPM vendors based on assessment dimension scores,
 * organization profile, technology preferences, and transformation ambition.
 * 
 * Sources: Constancia Benchmark Database, Vendor Capability Matrices
 * Last Updated: December 2025
 */

import { FC_DIMENSIONS, type FCDimension } from "./finance-compass-schema";
import { VENDOR_BENCHMARKS, type OrganizationSizeBand, type VendorBenchmark } from "./vendor-benchmarks";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface DimensionScores {
  financial_planning_analysis?: number;
  management_reporting?: number;
  consolidation_close?: number;
  financial_controls_compliance?: number;
  technology_systems?: number;
  organisation_people?: number;
  data_analytics?: number;
  ai_machine_learning?: number;
}

export interface OrganizationProfile {
  industry?: string;
  sizeBand?: OrganizationSizeBand;
  revenueMillions?: number;
  employeeCount?: number;
  entities?: number;
  currentErp?: string;
  excelDependency?: 'low' | 'medium' | 'high';
  transformationAmbition?: 'conservative' | 'moderate' | 'aggressive';
}

export interface VendorAffinityScore {
  vendorId: string;
  vendorName: string;
  category: 'tier1' | 'tier2' | 'specialist';
  totalScore: number;
  normalizedScore: number;
  rank: number;
  breakdown: {
    dimensionScore: number;
    industryScore: number;
    sizeScore: number;
    techStackScore: number;
    ambitionScore: number;
  };
  rationale: string[];
  strengths: string[];
  considerations: string[];
  matchQuality: 'excellent' | 'good' | 'moderate' | 'fair';
}

export interface VendorRecommendation {
  vendor: VendorAffinityScore;
  primaryRationale: string;
  secondaryRationales: string[];
  fitSummary: string;
}

// ============================================
// VENDOR DIMENSION WEIGHTS
// ============================================

/**
 * Weight matrix mapping assessment dimensions to vendor strengths.
 * Higher weights indicate stronger vendor capability in that dimension.
 * Scale: 0.0 (no capability) to 1.0 (market leader)
 */
/**
 * Vendors with AI embedded in their core platform architecture — not bolt-on.
 * These receive a meaningful affinity bonus when an organisation shows high AI/ML readiness.
 */
// AI-native vendor list is now declared in shared/scoring-engine.ts
// (single source of truth) and includes Pigment and OneStream alongside
// the original three. The AI bonus magnitude is also imported from there.
import {
  AI_NATIVE_VENDORS,
  VENDOR_AFFINITY as VENDOR_AFFINITY_CONFIG,
  canonicalVendorId,
} from "./scoring-engine";

export const VENDOR_DIMENSION_WEIGHTS: Record<string, Record<FCDimension, number>> = {
  abacum: {
    financial_planning_analysis: 0.92,
    management_reporting: 0.80,
    consolidation_close: 0.20,
    transaction_processing: 0.15,
    financial_controls_compliance: 0.45,
    technology_systems: 0.85,
    organisation_people: 0.80,
    data_analytics: 0.82,
    ai_machine_learning: 0.95,
  },
  anaplan: {
    financial_planning_analysis: 0.95,
    management_reporting: 0.75,
    consolidation_close: 0.50,
    transaction_processing: 0.50,
    financial_controls_compliance: 0.65,
    technology_systems: 0.90,
    organisation_people: 0.80,
    data_analytics: 0.85,
    ai_machine_learning: 0.90,
  },
  onestream: {
    financial_planning_analysis: 0.90,
    management_reporting: 0.85,
    consolidation_close: 0.75,
    transaction_processing: 0.75,
    financial_controls_compliance: 0.95,
    technology_systems: 0.85,
    organisation_people: 0.70,
    data_analytics: 0.90,
    ai_machine_learning: 0.75,
  },
  oracle_epm: {
    financial_planning_analysis: 0.85,
    management_reporting: 0.80,
    consolidation_close: 0.90,
    transaction_processing: 0.90,
    financial_controls_compliance: 0.95,
    technology_systems: 0.90,
    organisation_people: 0.65,
    data_analytics: 0.80,
    ai_machine_learning: 0.70,
  },
  sap_sac: {
    financial_planning_analysis: 0.85,
    management_reporting: 0.80,
    consolidation_close: 0.85,
    transaction_processing: 0.85,
    financial_controls_compliance: 0.80,
    technology_systems: 0.90,
    organisation_people: 0.65,
    data_analytics: 0.90,
    ai_machine_learning: 0.85,
  },
  board: {
    financial_planning_analysis: 0.80,
    management_reporting: 0.85,
    consolidation_close: 0.60,
    transaction_processing: 0.60,
    financial_controls_compliance: 0.65,
    technology_systems: 0.80,
    organisation_people: 0.75,
    data_analytics: 0.95,
    ai_machine_learning: 0.80,
  },
  workday_adaptive: {
    financial_planning_analysis: 0.85,
    management_reporting: 0.75,
    consolidation_close: 0.55,
    transaction_processing: 0.55,
    financial_controls_compliance: 0.60,
    technology_systems: 0.80,
    organisation_people: 0.90,
    data_analytics: 0.70,
    ai_machine_learning: 0.85,
  },
  planful: {
    financial_planning_analysis: 0.80,
    management_reporting: 0.75,
    consolidation_close: 0.55,
    transaction_processing: 0.55,
    financial_controls_compliance: 0.70,
    technology_systems: 0.75,
    organisation_people: 0.75,
    data_analytics: 0.65,
    ai_machine_learning: 0.70,
  },
  vena: {
    financial_planning_analysis: 0.75,
    management_reporting: 0.70,
    consolidation_close: 0.65,
    transaction_processing: 0.55,
    financial_controls_compliance: 0.60,
    technology_systems: 0.65,
    organisation_people: 0.85,
    data_analytics: 0.55,
    ai_machine_learning: 0.55,
  },
  prophix: {
    financial_planning_analysis: 0.75,
    management_reporting: 0.75,
    consolidation_close: 0.55,
    transaction_processing: 0.55,
    financial_controls_compliance: 0.70,
    technology_systems: 0.70,
    organisation_people: 0.70,
    data_analytics: 0.65,
    ai_machine_learning: 0.65,
  },
  jedox: {
    financial_planning_analysis: 0.75,
    management_reporting: 0.70,
    consolidation_close: 0.50,
    transaction_processing: 0.50,
    financial_controls_compliance: 0.60,
    technology_systems: 0.75,
    organisation_people: 0.75,
    data_analytics: 0.70,
    ai_machine_learning: 0.60,
  },
};

/**
 * Industry-vendor affinity mapping.
 * Higher values indicate stronger vendor presence/expertise in that industry.
 */
const INDUSTRY_VENDOR_AFFINITY: Record<string, Record<string, number>> = {
  'Financial Services': {
    abacum: 0.70,
    onestream: 0.95,
    oracle_epm: 0.90,
    anaplan: 0.85,
    workday_adaptive: 0.70,
    planful: 0.75,
    board: 0.65,
    sap_sac: 0.70,
    prophix: 0.60,
    vena: 0.65,
    jedox: 0.55,
  },
  'Manufacturing': {
    abacum: 0.40,
    anaplan: 0.90,
    board: 0.90,
    onestream: 0.80,
    sap_sac: 0.95,
    oracle_epm: 0.85,
    jedox: 0.80,
    prophix: 0.75,
    planful: 0.60,
    workday_adaptive: 0.55,
    vena: 0.65,
  },
  'Technology': {
    abacum: 0.92,  // SaaS metrics, ARR/MRR forecasting, headcount planning
    anaplan: 0.90,
    workday_adaptive: 0.90,
    planful: 0.85,
    board: 0.75,
    vena: 0.80,
    sap_sac: 0.70,
    onestream: 0.65,
    oracle_epm: 0.60,
    prophix: 0.70,
    jedox: 0.65,
  },
  'Healthcare': {
    abacum: 0.55,
    workday_adaptive: 0.85,
    planful: 0.80,
    onestream: 0.75,
    oracle_epm: 0.75,
    anaplan: 0.70,
    prophix: 0.75,
    vena: 0.70,
    board: 0.60,
    sap_sac: 0.55,
    jedox: 0.55,
  },
  'Retail': {
    abacum: 0.55,
    anaplan: 0.95,
    board: 0.90,
    sap_sac: 0.80,
    jedox: 0.75,
    oracle_epm: 0.65,
    onestream: 0.60,
    planful: 0.55,
    workday_adaptive: 0.50,
    vena: 0.50,
    prophix: 0.60,
  },
  'Professional Services': {
    abacum: 0.85,  // Workforce planning, headcount, project-based revenue forecasting
    workday_adaptive: 0.90,
    planful: 0.85,
    vena: 0.85,
    anaplan: 0.75,
    prophix: 0.75,
    board: 0.65,
    onestream: 0.55,
    oracle_epm: 0.50,
    sap_sac: 0.50,
    jedox: 0.60,
  },
  'Energy': {
    abacum: 0.40,
    onestream: 0.85,
    oracle_epm: 0.90,
    anaplan: 0.80,
    sap_sac: 0.85,
    board: 0.65,
    jedox: 0.60,
    prophix: 0.55,
    planful: 0.50,
    workday_adaptive: 0.50,
    vena: 0.45,
  },
  'Insurance': {
    abacum: 0.45,
    onestream: 0.95,
    oracle_epm: 0.85,
    anaplan: 0.75,
    sap_sac: 0.65,
    board: 0.55,
    planful: 0.60,
    prophix: 0.55,
    workday_adaptive: 0.55,
    vena: 0.50,
    jedox: 0.50,
  },
};

/**
 * Size band weights for vendor suitability.
 * Indicates how well each vendor serves organizations of different sizes.
 */
const SIZE_VENDOR_AFFINITY: Record<OrganizationSizeBand, Record<string, number>> = {
  smb: {
    abacum: 0.68,            // Decent SMB fit but optimised for mid-market; very small orgs may be under-scaled
    vena: 0.72,              // Sweet spot is small-to-mid-market (£10M+); lighter tools win below that
    planful: 0.90,
    prophix: 0.90,
    jedox: 0.90,
    workday_adaptive: 0.55,  // Lower - more suitable for mid-market+
    board: 0.65,
    anaplan: 0.40,           // Lower - enterprise-focused
    onestream: 0.35,
    oracle_epm: 0.30,
    sap_sac: 0.35,
  },
  mid_market: {
    abacum: 0.92,            // Primary sweet spot — mid-market finance teams, modern FP&A
    workday_adaptive: 0.95,
    planful: 0.90,
    board: 0.90,
    prophix: 0.85,
    jedox: 0.85,
    vena: 0.80,
    anaplan: 0.75,
    onestream: 0.65,
    oracle_epm: 0.60,
    sap_sac: 0.65,
  },
  enterprise: {
    abacum: 0.45,            // Limited for large enterprise — no statutory consolidation
    anaplan: 0.95,
    onestream: 0.95,
    oracle_epm: 0.90,
    sap_sac: 0.90,
    board: 0.80,
    workday_adaptive: 0.75,
    planful: 0.60,
    prophix: 0.55,
    jedox: 0.65,
    vena: 0.45,
  },
  large_enterprise: {
    abacum: 0.20,            // Not suited — no group consolidation or regulatory reporting
    onestream: 0.95,
    oracle_epm: 0.95,
    anaplan: 0.90,
    sap_sac: 0.90,
    board: 0.65,
    workday_adaptive: 0.55,
    jedox: 0.50,
    planful: 0.40,
    prophix: 0.40,
    vena: 0.30,
  },
};

/**
 * ERP stack affinity - bonus scores when vendor aligns with existing ERP.
 */
const ERP_VENDOR_AFFINITY: Record<string, Record<string, number>> = {
  oracle: {
    oracle_epm: 0.30,
    onestream: 0.10,
    anaplan: 0.05,
  },
  sap: {
    sap_sac: 0.30,
    board: 0.10,
    anaplan: 0.05,
  },
  workday: {
    workday_adaptive: 0.30,
    anaplan: 0.10,
    planful: 0.05,
  },
  netsuite: {
    anaplan: 0.10,
    planful: 0.15,
    workday_adaptive: 0.10,
  },
  dynamics: {
    jedox: 0.15,
    prophix: 0.10,
    board: 0.10,
  },
  sage: {
    vena: 0.15,
    planful: 0.10,
    prophix: 0.10,
  },
};

/**
 * Transformation ambition weighting.
 * Maps ambition levels to preferred vendor categories and capabilities.
 */
const AMBITION_WEIGHTS: Record<string, { tier1Bonus: number; tier2Bonus: number; aiBonus: number }> = {
  conservative: {
    tier1Bonus: -0.10,
    tier2Bonus: 0.15,
    aiBonus: -0.10,
  },
  moderate: {
    tier1Bonus: 0.05,
    tier2Bonus: 0.05,
    aiBonus: 0.05,
  },
  aggressive: {
    tier1Bonus: 0.15,
    tier2Bonus: -0.05,
    aiBonus: 0.20,
  },
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate dimension-based score for a vendor.
 * Uses weighted average of dimension scores multiplied by vendor capability weights.
 */
function calculateDimensionScore(
  vendorId: string,
  dimensionScores: DimensionScores
): { score: number; topDimensions: string[] } {
  const weights = VENDOR_DIMENSION_WEIGHTS[vendorId];
  if (!weights) {
    return { score: 0.5, topDimensions: [] };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  const dimensionContributions: { dimension: string; contribution: number }[] = [];

  for (const dim of FC_DIMENSIONS) {
    const rawScore = dimensionScores[dim as keyof DimensionScores];
    if (rawScore === undefined || rawScore === null) continue;
    
    const numScore = typeof rawScore === 'number' ? rawScore : 0;
    if (isNaN(numScore) || numScore < 0) continue;
    
    const score = Math.max(0, Math.min(5, numScore));
    const weight = weights[dim];
    const normalizedScore = score / 5;
    const contribution = normalizedScore * weight;
    
    weightedSum += contribution;
    totalWeight += weight;
    
    if (score > 0) {
      dimensionContributions.push({
        dimension: dim,
        contribution: contribution * weight,
      });
    }
  }

  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  
  const topDimensions = dimensionContributions
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(d => d.dimension);

  return { score: finalScore, topDimensions };
}

/**
 * Calculate industry match score for a vendor.
 */
function calculateIndustryScore(
  vendorId: string,
  industry?: string
): { score: number; hasMatch: boolean } {
  if (!industry) {
    return { score: 0.5, hasMatch: false };
  }

  // Try exact match first
  const industryAffinity = INDUSTRY_VENDOR_AFFINITY[industry];
  if (industryAffinity && industryAffinity[vendorId]) {
    return { score: industryAffinity[vendorId], hasMatch: true };
  }

  // Try partial match
  for (const [ind, affinities] of Object.entries(INDUSTRY_VENDOR_AFFINITY)) {
    if (industry.toLowerCase().includes(ind.toLowerCase()) || 
        ind.toLowerCase().includes(industry.toLowerCase())) {
      if (affinities[vendorId]) {
        return { score: affinities[vendorId] * 0.9, hasMatch: true };
      }
    }
  }

  return { score: 0.5, hasMatch: false };
}

/**
 * Calculate organization size match score.
 * Includes special handling for very small companies where enterprise-focused
 * vendors like Workday Adaptive are not appropriate.
 */
function calculateSizeScore(
  vendorId: string,
  sizeBand?: OrganizationSizeBand,
  revenueMillions?: number,
  entities?: number
): number {
  // Infer size band from revenue if not provided
  let effectiveSizeBand = sizeBand;
  if (!effectiveSizeBand && revenueMillions) {
    if (revenueMillions < 250) effectiveSizeBand = 'smb';
    else if (revenueMillions < 1000) effectiveSizeBand = 'mid_market';
    else if (revenueMillions < 5000) effectiveSizeBand = 'enterprise';
    else effectiveSizeBand = 'large_enterprise';
  }

  if (!effectiveSizeBand) {
    return 0.5;
  }

  const sizeAffinity = SIZE_VENDOR_AFFINITY[effectiveSizeBand];
  if (!sizeAffinity) {
    return 0.5;
  }
  
  let score = sizeAffinity[vendorId] ?? 0.5;
  
  // Apply penalty for enterprise-focused vendors in very small companies
  // Workday Adaptive, Anaplan, OneStream, Oracle EPM, SAP SAC are not suitable
  // for micro-businesses (revenue <$10M or entities <=3)
  const enterpriseVendors = ['workday_adaptive', 'anaplan', 'onestream', 'oracle_epm', 'sap_sac'];
  const isMicroBusiness = (revenueMillions && revenueMillions < 10) || (entities && entities <= 3);
  
  if (isMicroBusiness && enterpriseVendors.includes(vendorId)) {
    // Significant penalty - these vendors are too complex/expensive for micro-businesses
    score = Math.max(0.1, score - 0.5);
  } else if (effectiveSizeBand === 'smb' && revenueMillions && revenueMillions < 50) {
    // Smaller penalty for small SMBs ($10M-$50M) for enterprise vendors
    if (enterpriseVendors.includes(vendorId)) {
      score = Math.max(0.2, score - 0.3);
    }
  }
  
  return score;
}

/**
 * Calculate tech stack alignment score.
 */
function calculateTechStackScore(
  vendorId: string,
  currentErp?: string
): { score: number; hasBonus: boolean } {
  if (!currentErp) {
    return { score: 0, hasBonus: false };
  }

  const erpLower = currentErp.toLowerCase();
  for (const [erpKey, bonuses] of Object.entries(ERP_VENDOR_AFFINITY)) {
    if (erpLower.includes(erpKey)) {
      const bonus = bonuses[vendorId] ?? 0;
      return { score: bonus, hasBonus: bonus > 0 };
    }
  }

  return { score: 0, hasBonus: false };
}

/**
 * Calculate transformation ambition alignment score.
 */
function calculateAmbitionScore(
  vendor: VendorBenchmark,
  ambition?: 'conservative' | 'moderate' | 'aggressive',
  aiScore?: number
): number {
  if (!ambition) {
    return 0;
  }

  const weights = AMBITION_WEIGHTS[ambition];
  let score = 0;

  // Apply tier bonus
  if (vendor.category === 'tier1') {
    score += weights.tier1Bonus;
  } else if (vendor.category === 'tier2') {
    score += weights.tier2Bonus;
  }

  // Apply AI bonus if high AI readiness and high AI score from assessment
  if (vendor.bestFitProfile.aiReadiness === 'high' && aiScore && aiScore >= 4) {
    score += weights.aiBonus;
  }

  return score;
}

/**
 * Generate rationale strings for a vendor recommendation.
 */
function generateRationales(
  vendor: VendorBenchmark,
  breakdown: VendorAffinityScore['breakdown'],
  topDimensions: string[],
  profile: OrganizationProfile,
  hasIndustryMatch: boolean,
  hasTechBonus: boolean
): string[] {
  const rationales: string[] = [];

  // Dimension-based rationales
  if (breakdown.dimensionScore > 0.7) {
    const dimNames = topDimensions.map(d => d.replace(/_/g, ' ')).slice(0, 2);
    rationales.push(
      `Strong alignment with your ${dimNames.join(' and ')} requirements`
    );
  }

  // Industry rationale
  if (hasIndustryMatch && profile.industry) {
    rationales.push(
      `Proven track record in the ${profile.industry} sector`
    );
  }

  // Size band rationale
  if (breakdown.sizeScore > 0.8) {
    const sizeDesc = {
      smb: 'growing mid-market',
      mid_market: 'mid-market',
      enterprise: 'enterprise',
      large_enterprise: 'large enterprise',
    };
    const desc = sizeDesc[profile.sizeBand!] || 'your organization size';
    rationales.push(
      `Well-suited for ${desc} organisations`
    );
  }

  // Tech stack rationale
  if (hasTechBonus && profile.currentErp) {
    rationales.push(
      `Native integration with ${profile.currentErp} ecosystem`
    );
  }

  // Ambition rationale
  if (profile.transformationAmbition === 'aggressive' && vendor.category === 'tier1') {
    rationales.push(
      'Enterprise-grade platform supporting aggressive transformation goals'
    );
  } else if (profile.transformationAmbition === 'conservative' && vendor.category === 'tier2') {
    rationales.push(
      'Lower complexity solution aligned with measured transformation approach'
    );
  }

  // Capability-specific rationales
  if ((AI_NATIVE_VENDORS as Set<string>).has(canonicalVendorId(vendor.id))) {
    rationales.push(
      'AI embedded in core platform architecture — not a bolt-on module'
    );
  } else if (vendor.bestFitProfile.aiReadiness === 'high') {
    rationales.push(
      'Advanced AI/ML capabilities for predictive analytics and automation'
    );
  }

  if (vendor.bestFitProfile.excelDependency === 'high' && profile.excelDependency === 'high') {
    rationales.push(
      'Excel-friendly interface for familiar user experience'
    );
  }

  return rationales.slice(0, 5);
}

/**
 * Determine match quality based on total score.
 */
function getMatchQuality(normalizedScore: number): 'excellent' | 'good' | 'moderate' | 'fair' {
  const cutoffs = VENDOR_AFFINITY_CONFIG.MATCH_QUALITY;
  if (normalizedScore >= cutoffs.EXCELLENT) return 'excellent';
  if (normalizedScore >= cutoffs.GOOD) return 'good';
  if (normalizedScore >= cutoffs.MODERATE) return 'moderate';
  return 'fair';
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Calculate vendor affinity scores for all vendors.
 * Returns a ranked list of vendors with scores and rationales.
 */
export function calculateVendorAffinity(
  dimensionScores: DimensionScores,
  orgProfile: OrganizationProfile
): VendorAffinityScore[] {
  const results: VendorAffinityScore[] = [];

  for (const vendor of VENDOR_BENCHMARKS) {
    // Calculate component scores
    const { score: dimensionScore, topDimensions } = calculateDimensionScore(
      vendor.id,
      dimensionScores
    );
    
    const { score: industryScore, hasMatch: hasIndustryMatch } = calculateIndustryScore(
      vendor.id,
      orgProfile.industry
    );
    
    const sizeScore = calculateSizeScore(
      vendor.id,
      orgProfile.sizeBand,
      orgProfile.revenueMillions,
      orgProfile.entities
    );
    
    const { score: techStackScore, hasBonus: hasTechBonus } = calculateTechStackScore(
      vendor.id,
      orgProfile.currentErp
    );
    
    const ambitionScore = calculateAmbitionScore(
      vendor,
      orgProfile.transformationAmbition,
      dimensionScores.ai_machine_learning
    );

    // AI-native bonus: vendors that genuinely lead with AI in their core
    // architecture (not a bolt-on add-on) get a lift when the user's AI/ML
    // readiness is high. Bonus magnitude is now centralised in
    // scoring-engine.ts — was 0.08 (basically invisible against the 0.40
    // dimension weight); now 0.15 max, so an AI-native vendor surfaces
    // meaningfully when the user is high on AI/ML.
    const aiMlScore = dimensionScores.ai_machine_learning ?? 0;
    const canonicalId = canonicalVendorId(vendor.id);
    // The Set is typed VendorId; check membership via string-level
    // identity (the runtime Set is just strings).
    const aiNativeBonus =
      (AI_NATIVE_VENDORS as Set<string>).has(canonicalId) &&
      aiMlScore >= VENDOR_AFFINITY_CONFIG.AI_NATIVE_THRESHOLD
        ? VENDOR_AFFINITY_CONFIG.AI_NATIVE_BONUS_MAX * (aiMlScore / 5)
        : 0;

    const weights = VENDOR_AFFINITY_CONFIG.WEIGHTS;

    const totalScore =
      dimensionScore * weights.dimension +
      industryScore * weights.industry +
      sizeScore * weights.size +
      techStackScore * weights.techStack +
      ambitionScore * weights.ambition +
      aiNativeBonus;

    // Generate rationales
    const breakdown = {
      dimensionScore,
      industryScore,
      sizeScore,
      techStackScore,
      ambitionScore,
    };

    const rationales = generateRationales(
      vendor,
      breakdown,
      topDimensions,
      orgProfile,
      hasIndustryMatch,
      hasTechBonus
    );

    results.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      totalScore,
      normalizedScore: 0, // Will be set after sorting
      rank: 0, // Will be set after sorting
      breakdown,
      rationale: rationales,
      strengths: vendor.strengths,
      considerations: vendor.considerations,
      matchQuality: 'fair', // Will be set after normalization
    });
  }

  // Sort by total score descending.
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Normalise scores and set ranks. Two guards added vs the old code:
  //   1. Empty-result guard: prevents the rest of the function from
  //      reading off an empty array.
  //   2. Range-floor guard: when all vendors cluster within
  //      RANGE_NORM_FLOOR of each other, range normalisation
  //      previously amplified tiny noise (0.01 gaps → 100% display
  //      differences). When the range is below the floor, fall back
  //      to absolute scores so ranking reflects real differences.
  if (results.length === 0) return results;

  const maxScore = results[0].totalScore;
  const minScore = results[results.length - 1].totalScore;
  const range = maxScore - minScore;
  const useAbsolute = range < VENDOR_AFFINITY_CONFIG.RANGE_NORM_FLOOR;

  results.forEach((result, index) => {
    result.rank = index + 1;
    if (useAbsolute) {
      // Absolute normalisation: where would this score fall on the
      // theoretical 0-1 range given the weight system?
      result.normalizedScore = Math.max(0, Math.min(1, result.totalScore));
    } else {
      result.normalizedScore = (result.totalScore - minScore) / range;
    }
    result.matchQuality = getMatchQuality(result.normalizedScore);
  });

  return results;
}

/**
 * Get top N vendor recommendations with detailed rationales.
 * Uses assessment data to calculate affinity and returns formatted recommendations.
 */
export function getVendorRecommendations(
  assessmentData: {
    dimensionScores?: DimensionScores;
    orgProfile?: OrganizationProfile;
  },
  top: number = 3
): VendorRecommendation[] {
  const dimensionScores = assessmentData.dimensionScores || {};
  const orgProfile = assessmentData.orgProfile || {};

  const affinityScores = calculateVendorAffinity(dimensionScores, orgProfile);
  const topVendors = affinityScores.slice(0, Math.min(top, affinityScores.length));

  return topVendors.map((vendor, index) => {
    // Generate primary rationale based on top scoring factors
    let primaryRationale: string;
    const { dimensionScore, industryScore, sizeScore } = vendor.breakdown;

    if (dimensionScore >= industryScore && dimensionScore >= sizeScore) {
      primaryRationale = `${vendor.vendorName} aligns strongly with your assessed capability needs and transformation priorities.`;
    } else if (industryScore >= sizeScore) {
      primaryRationale = `${vendor.vendorName} has deep expertise in your industry with proven implementations.`;
    } else {
      primaryRationale = `${vendor.vendorName} is well-suited for organisations of your scale and complexity.`;
    }

    // Build fit summary
    const qualityDesc = {
      excellent: 'an excellent',
      good: 'a strong',
      moderate: 'a reasonable',
      fair: 'a potential',
    };

    const fitSummary = `${vendor.vendorName} represents ${qualityDesc[vendor.matchQuality]} fit for your finance transformation, ${
      index === 0
        ? 'emerging as the top recommendation based on your assessment responses.'
        : `ranking #${vendor.rank} in overall alignment with your requirements.`
    }`;

    return {
      vendor,
      primaryRationale,
      secondaryRationales: vendor.rationale.slice(0, 3),
      fitSummary,
    };
  });
}

/**
 * Get vendor recommendations for a specific use case emphasis.
 */
export function getVendorsByUseCase(
  useCase: 'consolidation' | 'planning' | 'analytics' | 'ai_first' | 'excel_centric'
): string[] {
  const useCaseVendors: Record<string, string[]> = {
    consolidation: ['onestream', 'oracle_epm', 'planful', 'prophix'],
    planning: ['anaplan', 'workday_adaptive', 'board', 'planful'],
    analytics: ['board', 'onestream', 'sap_sac', 'anaplan'],
    ai_first: ['abacum', 'anaplan', 'workday_adaptive', 'sap_sac', 'board'],
    excel_centric: ['vena', 'jedox', 'workday_adaptive', 'planful'],
  };

  return useCaseVendors[useCase] || [];
}

/**
 * Get complexity-matched vendors for a given entity count.
 * Excludes enterprise-focused vendors for very small companies.
 */
export function getVendorsByComplexity(entities: number, consolidationRequired: boolean, revenueMillions?: number): string[] {
  // Micro-business: 1-3 entities or <$10M revenue - only recommend simple, cost-effective solutions
  const isMicroBusiness = entities <= 3 || (revenueMillions && revenueMillions < 10);
  
  if (entities > 50 || consolidationRequired) {
    return ['onestream', 'oracle_epm', 'anaplan', 'sap_sac'];
  } else if (entities > 10) {
    return ['board', 'workday_adaptive', 'planful', 'prophix', 'onestream'];
  } else if (isMicroBusiness) {
    // Very small companies - exclude enterprise-focused vendors
    return ['vena', 'jedox', 'prophix', 'planful'];
  } else {
    // Small to medium SMB (4-10 entities, $10M+ revenue)
    return ['vena', 'planful', 'prophix', 'jedox', 'board'];
  }
}
