/**
 * Centralised scoring engine — single source of truth for every scoring
 * flow on the site. EPM/ERP/AI comparison wizards, ROI calculator,
 * Finance Compass maturity, and vendor affinity all read their
 * thresholds, constants, and helpers from here. No magic numbers in
 * scoring code; every tunable lives in this file.
 *
 * Naming convention: SCREAMING_SNAKE for constants, camelCase for
 * helper functions, PascalCase for types. Sections are alphabetised
 * within each category for findability.
 */

import { canonicalEvent } from "./analytics-taxonomy";

// -- Canonical vendor IDs --------------------------------------------------
//
// Replaces the parallel IDs that lived in epm-platforms.ts (`oracle`,
// `sap-sac-gr`) and vendor-affinity.ts (`oracle_epm`, `sap_sac`). One
// list, two views (display name + slug for URLs). Lookups never miss
// because of a stray underscore.

export const VENDOR_IDS = {
  ABACUM: "abacum",
  ANAPLAN: "anaplan",
  BOARD: "board",
  CUBE: "cube",
  DATARAILS: "datarails",
  JEDOX: "jedox",
  JIRAV: "jirav",
  ONESTREAM: "onestream",
  ORACLE_EPM: "oracle_epm",
  PIGMENT: "pigment",
  PLANFUL: "planful",
  PROPHIX: "prophix",
  SAP_SAC: "sap_sac",
  SYNTELLIS: "syntellis",
  VENA: "vena",
  WORKDAY_ADAPTIVE: "workday_adaptive",
} as const;

export type VendorId = (typeof VENDOR_IDS)[keyof typeof VENDOR_IDS];

/**
 * Legacy aliases — the old IDs used in epm-platforms.ts and elsewhere.
 * Vendor-affinity recommendations link to comparison-tool cards via
 * the canonical ID; old IDs still resolve through this map so we don't
 * have to rename every static data file at once.
 */
export const VENDOR_ID_ALIASES: Record<string, VendorId> = {
  oracle: VENDOR_IDS.ORACLE_EPM,
  "oracle-epm": VENDOR_IDS.ORACLE_EPM,
  "sap-sac": VENDOR_IDS.SAP_SAC,
  "sap-sac-gr": VENDOR_IDS.SAP_SAC,
  sap: VENDOR_IDS.SAP_SAC,
  "workday-adaptive": VENDOR_IDS.WORKDAY_ADAPTIVE,
  workday: VENDOR_IDS.WORKDAY_ADAPTIVE,
};

export function canonicalVendorId(raw: string): string {
  const lower = raw.toLowerCase();
  return VENDOR_ID_ALIASES[lower] ?? lower;
}

export const VENDOR_DISPLAY_NAME: Record<VendorId, string> = {
  [VENDOR_IDS.ABACUM]: "Abacum",
  [VENDOR_IDS.ANAPLAN]: "Anaplan",
  [VENDOR_IDS.BOARD]: "Board",
  [VENDOR_IDS.CUBE]: "Cube",
  [VENDOR_IDS.DATARAILS]: "Datarails",
  [VENDOR_IDS.JEDOX]: "Jedox",
  [VENDOR_IDS.JIRAV]: "Jirav",
  [VENDOR_IDS.ONESTREAM]: "OneStream",
  [VENDOR_IDS.ORACLE_EPM]: "Oracle EPM",
  [VENDOR_IDS.PIGMENT]: "Pigment",
  [VENDOR_IDS.PLANFUL]: "Planful",
  [VENDOR_IDS.PROPHIX]: "Prophix",
  [VENDOR_IDS.SAP_SAC]: "SAP Analytics Cloud",
  [VENDOR_IDS.SYNTELLIS]: "Syntellis",
  [VENDOR_IDS.VENA]: "Vena",
  [VENDOR_IDS.WORKDAY_ADAPTIVE]: "Workday Adaptive Planning",
};

// -- AI-native vendor flag -------------------------------------------------
//
// Was a closed list of 3 in vendor-affinity. Expanded to 5 platforms
// that genuinely position AI in their core architecture, not as a
// bolt-on. Pigment and OneStream were missed previously; their
// SensibleAI and agentic capabilities are first-class.

export const AI_NATIVE_VENDORS: Set<VendorId> = new Set([
  VENDOR_IDS.ABACUM,
  VENDOR_IDS.ANAPLAN,
  VENDOR_IDS.ONESTREAM,
  VENDOR_IDS.PIGMENT,
  VENDOR_IDS.WORKDAY_ADAPTIVE,
]);

// -- EPM Wizard scoring constants -----------------------------------------
//
// Moved from inline constants in epm-comparison.tsx. Same semantics,
// one place to tune. SIZE/REVENUE multipliers split out so the
// affordability formula uses max(size, revenue) rather than stacking.

export const EPM_SCORING = {
  // Default 0-10 weight applied to a dimension slider the user hasn't touched.
  DEFAULT_WEIGHT: 5,
  // Highest slider value the UI allows; used as the normalisation ceiling.
  MAX_WEIGHT: 10,
  // Floor and cap on the final per-vendor score, in the 0-10 display range.
  SCORE_FLOOR: 0,
  SCORE_CEIL: 10,

  // Sweet-spot match modifiers (vendor's curated profile fits the user's).
  SWEET_SPOT_MATCH: 0.4,
  SWEET_SPOT_MISS: -0.4,
  SWEET_SPOT_MISS_SMB: -0.15,

  // A "price tier" is the vendor's 1-5 cost band. At or above this is
  // considered "expensive" and affordability checks fire.
  EXPENSIVE_TIER: 3,
  VERY_EXPENSIVE_TIER: 5,

  // Affordability penalty config. Penalty = BASE * (tier - threshold + 1)
  // * multiplier. The multiplier comes from whichever side of the
  // user's profile (size OR revenue) is more punitive — they do NOT
  // stack, so a small low-revenue company doesn't get hit twice.
  AFFORDABILITY_BASE_PENALTY: 0.6,
  AFFORDABILITY_SIZE_SMALL_MULT: 1.8,
  AFFORDABILITY_SIZE_MID_MULT: 1.0,
  AFFORDABILITY_REVENUE_LOW_MULT: 1.5,
  AFFORDABILITY_REVENUE_MID_MULT: 0.8,

  SIZE_REVENUE_MISMATCH_BASE: 1.0,

  // FP&A vs consolidation specialism modifiers.
  FPA_FOCUS_BONUS: 1.5,
  CONSOLIDATION_OVERHEAD_PENALTY: 1.8,
} as const;

/**
 * Affordability penalty with max() semantics (not stacking).
 * Returns a positive number; caller subtracts from the modifier.
 *
 * Old behaviour: small + low-revenue companies got penalised twice
 * (additive). New behaviour: takes the larger of the two penalties.
 */
export function affordabilityPenalty(
  priceTier: number,
  isSmallCompany: boolean,
  isLowRevenue: boolean,
  isMidMarket = false,
  isMidRevenue = false,
): number {
  if (priceTier < EPM_SCORING.EXPENSIVE_TIER) return 0;
  const tierDelta = priceTier - EPM_SCORING.EXPENSIVE_TIER + 1;
  const base = EPM_SCORING.AFFORDABILITY_BASE_PENALTY * tierDelta;

  let sizePenalty = 0;
  if (isSmallCompany) sizePenalty = base * EPM_SCORING.AFFORDABILITY_SIZE_SMALL_MULT;
  else if (isMidMarket) sizePenalty = base * EPM_SCORING.AFFORDABILITY_SIZE_MID_MULT;

  let revenuePenalty = 0;
  if (isLowRevenue) revenuePenalty = base * EPM_SCORING.AFFORDABILITY_REVENUE_LOW_MULT;
  else if (isMidRevenue) revenuePenalty = base * EPM_SCORING.AFFORDABILITY_REVENUE_MID_MULT;

  return Math.max(sizePenalty, revenuePenalty);
}

/**
 * Normalise a record of raw 0–10 weights so they sum to 1. Handles
 * the all-zero case (every dimension gets equal weight rather than
 * producing NaN). Used by the EPM wizard before computing dimension
 * contributions.
 */
export function normaliseWeights<K extends string>(
  weights: Record<K, number>,
): Record<K, number> {
  const keys = Object.keys(weights) as K[];
  if (keys.length === 0) return weights;
  const total = keys.reduce((s, k) => s + Math.max(0, weights[k] || 0), 0);
  if (total === 0) {
    const equal = 1 / keys.length;
    return keys.reduce((out, k) => ({ ...out, [k]: equal }), {} as Record<K, number>);
  }
  return keys.reduce(
    (out, k) => ({ ...out, [k]: Math.max(0, weights[k] || 0) / total }),
    {} as Record<K, number>,
  );
}

/**
 * Clamp a finite number to [min, max]. Returns the fallback if the
 * input is NaN or non-finite. Used everywhere scoring assembles a
 * potentially-divergent partial result.
 */
export function clamp(value: number, min: number, max: number, fallback = min): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

// -- ROI calculator constants ---------------------------------------------
//
// Was inline in roi-calculator.ts. £80k salary baseline is now the
// DEFAULT; the ROI calculator surfaces it as a user-editable input.
// Ramp factors are tunable so a slow rollout can be modelled.

export const ROI_DEFAULTS = {
  /** Default fully-loaded annual finance FTE cost (£). User can override. */
  AVG_SALARY_GBP: 80_000,
  /** Discount rate (8%). Defensible default; user can override. */
  DISCOUNT_RATE: 0.08,
  /** Benefit realisation ramp factors: % of steady-state per year. */
  RAMP_FACTORS: [0.50, 0.85, 1.00, 1.00, 1.00] as const,
  /** Cap on accepted user inputs to prevent absurd ROIs from typos. */
  MAX_DISCOUNT_RATE: 0.5, // 50%
  MAX_HORIZON_YEARS: 10,
  MAX_HEADCOUNT_DELTA: 10_000,
} as const;

/** Apply inflation compounding to a base annual cost across N years. */
export function inflatedAnnualCost(baseCost: number, inflationRate: number, year: number): number {
  const safeRate = clamp(inflationRate, -0.2, 0.2, 0);
  return baseCost * Math.pow(1 + safeRate, Math.max(0, year - 1));
}

// -- Vendor affinity constants --------------------------------------------
//
// Was inline in vendor-affinity.ts. AI-native bonus bumped from 0.08
// (basically invisible) to 0.15 so AI-first vendors actually surface
// when the user is high on the AI/ML dimension. Range-normalisation
// guard added at the call site so identical-score sets don't NaN.

export const VENDOR_AFFINITY = {
  /** Weights for the five-factor weighted total. Must sum to 1.0. */
  WEIGHTS: {
    dimension: 0.40,
    industry: 0.20,
    size: 0.20,
    techStack: 0.10,
    ambition: 0.10,
  },
  /** Max bonus applied to AI-native vendors when user's AI score is high. */
  AI_NATIVE_BONUS_MAX: 0.15,
  /** AI/ML user score (out of 5) at which AI-native bonus starts kicking in. */
  AI_NATIVE_THRESHOLD: 3.5,
  /** Industry binary score when a vendor doesn't list the user's industry. */
  INDUSTRY_NO_MATCH_SCORE: 0.5,
  /** Match-quality cutoffs on the normalised 0–1 final score. */
  MATCH_QUALITY: {
    EXCELLENT: 0.80,
    GOOD: 0.65,
    MODERATE: 0.50,
  },
  /** Minimum score-range below which normalisation collapses to raw scores
   *  (avoids amplifying noise when all vendors cluster within 0.1). */
  RANGE_NORM_FLOOR: 0.1,
} as const;

// -- Correlation matrix application ---------------------------------------
//
// FC declares correlations between dimensions in seed-correlations.ts
// (e.g., "Tech drives Data"). Previously these were defined but never
// applied to the score. This helper applies them as a 10% adjustment —
// if a dimension is far below its predicted level given correlated
// dimensions, its score is nudged down (red-flag). If far above,
// nudged up. Bounded so corrections never dominate the actual response.

export const CORRELATION = {
  /** Maximum +/- adjustment any single correlation rule can apply, as a
   *  fraction of the dimension's raw score. */
  MAX_ADJUSTMENT_FRACTION: 0.10,
  /** Minimum predicted-vs-actual gap (in raw 0–5 scale) before a
   *  correlation correction fires. */
  GAP_THRESHOLD: 1.0,
} as const;

// -- Input validation -----------------------------------------------------
//
// Defensive guards for user-supplied numbers. Reject negative revenue,
// over-100% discount rates, etc. The UI should also validate; this is
// the server-side last line.

export function validateNonNegative(value: number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

export function validateInRange(
  value: number | null | undefined,
  min: number,
  max: number,
  fallback?: number,
): number {
  const fb = fallback ?? min;
  if (value === null || value === undefined) return fb;
  if (!Number.isFinite(value)) return fb;
  return Math.max(min, Math.min(max, value));
}

// Silence unused-import warning until correlation engine uses it.
void canonicalEvent;
