/**
 * Benchmark Calculation Engine for FinanceCompass
 * 
 * Calculates percentiles and aggregations from:
 * 1. Company financial data
 * 2. Macro benchmark sources (ONS, FRED, World Bank)
 * 3. Proprietary Constancia assessment data
 */

import { db } from "../db";
import { eq, and, gte, isNotNull, sql } from "drizzle-orm";
import { DIMENSION_BENCHMARKS, DIMENSION_LABELS } from "./benchmarks";
import type {
  FcIndustryBenchmark,
  FcAssessmentBenchmark,
  InsertFcIndustryBenchmark,
  InsertFcAssessmentBenchmark,
} from "@shared/finance-compass-schema";

// Percentile calculation helper
export function calculatePercentiles(values: number[]): {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
  stdDev: number;
} | null {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const percentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  return {
    p10: percentile(10),
    p25: percentile(25),
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    mean,
    stdDev,
  };
}

// Calculate percentile rank for a value
export function calculatePercentileRank(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const belowCount = sorted.filter(v => v < value).length;
  const equalCount = sorted.filter(v => v === value).length;
  return ((belowCount + 0.5 * equalCount) / sorted.length) * 100;
}

// Determine status based on percentile rank
export function getStatusFromPercentile(
  percentileRank: number,
  higherIsBetter: boolean = true
): "excellent" | "good" | "average" | "below_average" | "needs_attention" {
  const rank = higherIsBetter ? percentileRank : 100 - percentileRank;
  
  if (rank >= 80) return "excellent";
  if (rank >= 60) return "good";
  if (rank >= 40) return "average";
  if (rank >= 20) return "below_average";
  return "needs_attention";
}

// Get default industry benchmarks for a dimension
export function getDefaultDimensionBenchmarks(dimension: string): {
  industryAverage: number;
  worldClass: number;
} {
  const benchmarks = DIMENSION_BENCHMARKS[dimension as keyof typeof DIMENSION_BENCHMARKS];
  return benchmarks || { industryAverage: 3.0, worldClass: 4.0 };
}

// Get dimension label
export function getDimensionLabel(dimension: string): string {
  const label = DIMENSION_LABELS[dimension];
  return label?.full || dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Map dimension key to dimension code
export const DIMENSION_KEY_TO_CODE: Record<string, string> = {
  financial_planning_analysis: "D1_STRATEGY",
  consolidation_close: "D2_PROCESS",
  transaction_processing: "D2_PROCESS", // Alternative name for consolidation_close
  organisation_people: "D3_ORGANISATION",
  technology_systems: "D4_TECHNOLOGY",
  data_analytics: "D5_DATA",
  management_reporting: "D6_KPIS",
  financial_controls_compliance: "D7_GOVERNANCE",
  ai_machine_learning: "D8_AI",
};

export const DIMENSION_CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(DIMENSION_KEY_TO_CODE).map(([k, v]) => [v, k])
);

// Sector mapping for SIC codes to sectors
export const SIC_TO_SECTOR: Record<string, string> = {
  "62": "Technology",
  "64": "Financial Services",
  "66": "Financial Services",
  "69": "Professional Services",
  "70": "Professional Services",
  "71": "Professional Services",
  "72": "Technology",
  "73": "Professional Services",
  "10": "Manufacturing",
  "11": "Manufacturing",
  "20": "Manufacturing",
  "21": "Pharmaceuticals",
  "24": "Manufacturing",
  "25": "Manufacturing",
  "26": "Technology",
  "27": "Manufacturing",
  "28": "Manufacturing",
  "29": "Manufacturing",
  "30": "Manufacturing",
  "35": "Energy",
  "41": "Construction",
  "42": "Construction",
  "43": "Construction",
  "45": "Retail",
  "46": "Retail",
  "47": "Retail",
  "49": "Transport",
  "50": "Transport",
  "51": "Transport",
  "52": "Logistics",
  "53": "Logistics",
  "55": "Hospitality",
  "56": "Hospitality",
  "58": "Media",
  "59": "Media",
  "60": "Media",
  "61": "Telecommunications",
  "63": "Technology",
  "74": "Professional Services",
  "75": "Veterinary",
  "77": "Rental Services",
  "78": "Employment",
  "79": "Travel",
  "80": "Security",
  "81": "Facilities",
  "82": "Business Services",
  "84": "Public Administration",
  "85": "Education",
  "86": "Healthcare",
  "87": "Healthcare",
  "88": "Social Work",
  "90": "Arts",
  "91": "Culture",
  "92": "Gambling",
  "93": "Sports",
  "94": "Membership Organisations",
  "95": "Repair Services",
  "96": "Personal Services",
};

// Get sector from SIC code
export function getSectorFromSIC(sicCode: string | null): string {
  if (!sicCode) return "Other";
  const division = sicCode.substring(0, 2);
  return SIC_TO_SECTOR[division] || "Other";
}

// Map question bank industry values to benchmark sector names
export const INDUSTRY_TO_SECTOR: Record<string, string> = {
  "technology": "Technology",
  "financial_services": "Financial Services",
  "professional_services": "Professional Services",
  "manufacturing": "Manufacturing",
  "pharmaceuticals": "Pharmaceuticals",
  "retail": "Retail",
  "healthcare": "Healthcare",
  "energy": "Energy",
  "construction": "Other",
  "transport_logistics": "Other",
  "media_telecoms": "Other",
  "public_sector": "Other",
  "other": "Other",
};

// Get benchmark sector from industry selection
export function getSectorFromIndustry(industry: string | null | undefined): string {
  if (!industry) return "Other";
  return INDUSTRY_TO_SECTOR[industry] || "Other";
}

// UK Sector benchmark defaults (based on ONS/public data)
export const UK_SECTOR_BENCHMARKS: Record<string, {
  closeCycleDays: { p25: number; p50: number; p75: number };
  operatingMargin: { p25: number; p50: number; p75: number };
  assetTurnover: { p25: number; p50: number; p75: number };
}> = {
  "Technology": {
    closeCycleDays: { p25: 18, p50: 25, p75: 35 },
    operatingMargin: { p25: 15, p50: 22, p75: 32 },
    assetTurnover: { p25: 1.2, p50: 1.7, p75: 2.2 },
  },
  "Financial Services": {
    closeCycleDays: { p25: 35, p50: 45, p75: 55 },
    operatingMargin: { p25: 18, p50: 28, p75: 42 },
    assetTurnover: { p25: 0.08, p50: 0.15, p75: 0.25 },
  },
  "Professional Services": {
    closeCycleDays: { p25: 28, p50: 38, p75: 48 },
    operatingMargin: { p25: 12, p50: 20, p75: 30 },
    assetTurnover: { p25: 1.5, p50: 2.0, p75: 2.8 },
  },
  "Manufacturing": {
    closeCycleDays: { p25: 40, p50: 52, p75: 65 },
    operatingMargin: { p25: 6, p50: 12, p75: 18 },
    assetTurnover: { p25: 0.8, p50: 1.2, p75: 1.6 },
  },
  "Pharmaceuticals": {
    closeCycleDays: { p25: 38, p50: 48, p75: 60 },
    operatingMargin: { p25: 12, p50: 22, p75: 35 },
    assetTurnover: { p25: 0.5, p50: 0.8, p75: 1.2 },
  },
  "Retail": {
    closeCycleDays: { p25: 25, p50: 35, p75: 45 },
    operatingMargin: { p25: 3, p50: 6, p75: 10 },
    assetTurnover: { p25: 1.5, p50: 2.2, p75: 3.0 },
  },
  "Healthcare": {
    closeCycleDays: { p25: 30, p50: 42, p75: 55 },
    operatingMargin: { p25: 5, p50: 10, p75: 18 },
    assetTurnover: { p25: 0.6, p50: 1.0, p75: 1.5 },
  },
  "Energy": {
    closeCycleDays: { p25: 35, p50: 48, p75: 62 },
    operatingMargin: { p25: 8, p50: 15, p75: 25 },
    assetTurnover: { p25: 0.3, p50: 0.5, p75: 0.8 },
  },
  "Other": {
    closeCycleDays: { p25: 30, p50: 45, p75: 60 },
    operatingMargin: { p25: 8, p50: 15, p75: 22 },
    assetTurnover: { p25: 0.8, p50: 1.2, p75: 1.8 },
  },
};

// Get industry benchmark for a metric
export function getIndustryBenchmark(
  sector: string,
  metricType: string
): { p25: number; p50: number; p75: number } | null {
  const sectorData = UK_SECTOR_BENCHMARKS[sector] || UK_SECTOR_BENCHMARKS["Other"];
  
  switch (metricType) {
    case "close_cycle_days":
      return sectorData.closeCycleDays;
    case "operating_margin":
      return sectorData.operatingMargin;
    case "asset_turnover":
      return sectorData.assetTurnover;
    default:
      return null;
  }
}

// Generate recommendation based on gap
export function generateRecommendation(
  dimension: string,
  score: number,
  benchmark: number,
  worldClass: number
): string {
  const gap = benchmark - score;
  const label = getDimensionLabel(dimension);
  
  if (score >= worldClass) {
    return `Your ${label} capability (${score.toFixed(1)}) is world-class. Document and share best practices across the organisation.`;
  }
  
  if (score >= benchmark) {
    return `Your ${label} capability (${score.toFixed(1)}) exceeds industry average. Continue investing to reach world-class (${worldClass.toFixed(1)}).`;
  }
  
  if (gap <= 0.5) {
    return `Your ${label} capability (${score.toFixed(1)}) is close to industry average. Minor improvements recommended to close the ${gap.toFixed(1)} point gap.`;
  }
  
  if (gap <= 1.0) {
    return `Your ${label} capability (${score.toFixed(1)}) is below industry average (${benchmark.toFixed(1)}). Workshop recommended to address the ${gap.toFixed(1)} point gap.`;
  }
  
  return `Your ${label} capability (${score.toFixed(1)}) requires urgent attention. Gap of ${gap.toFixed(1)} points to industry average. Prioritise remediation workshop.`;
}

// B1-B8 Benchmark Metric Definitions
export const BENCHMARK_METRICS = {
  B1_STRATEGIC_CLARITY: {
    id: "B1_STRATEGIC_CLARITY",
    name: "Strategic Clarity Score",
    dimension: "D1_STRATEGY",
    description: "Filing speed indicates process clarity",
    metric: "filing_days",
    higherIsBetter: false,
    scoringThresholds: [
      { max: 30, score: 4.5, label: "Excellent" },
      { max: 60, score: 3.5, label: "Good" },
      { max: 90, score: 2.5, label: "Acceptable" },
      { max: Infinity, score: 1.5, label: "Poor" },
    ],
  },
  B2_CLOSE_CYCLE: {
    id: "B2_CLOSE_CYCLE",
    name: "Close Cycle Efficiency",
    dimension: "D2_PROCESS",
    description: "Days from fiscal year-end to filing",
    metric: "close_cycle_days",
    higherIsBetter: false,
    scoringThresholds: null,
  },
  B3_REPORTING_ACCURACY: {
    id: "B3_REPORTING_ACCURACY",
    name: "Financial Reporting Accuracy",
    dimension: "D2_PROCESS",
    description: "Amendment rate percentage",
    metric: "amendment_rate",
    higherIsBetter: false,
    scoringThresholds: [
      { max: 0.5, score: 4.8, label: "Excellent controls" },
      { max: 1.0, score: 3.5, label: "Good controls" },
      { max: 2.0, score: 2.2, label: "Weak controls" },
      { max: Infinity, score: 1.0, label: "Poor controls" },
    ],
  },
  B4_WORKING_CAPITAL: {
    id: "B4_WORKING_CAPITAL",
    name: "AP/AR Efficiency (Working Capital)",
    dimension: "D2_PROCESS",
    description: "DSO days proxy",
    metric: "dso_days",
    higherIsBetter: false,
    scoringThresholds: [
      { max: 30, score: 4.5, label: "Excellent" },
      { max: 45, score: 3.8, label: "Good" },
      { max: 60, score: 3.0, label: "Acceptable" },
      { max: 90, score: 2.0, label: "Slow" },
      { max: Infinity, score: 1.0, label: "Very slow" },
    ],
  },
  B5_DATA_QUALITY: {
    id: "B5_DATA_QUALITY",
    name: "Data Quality Score",
    dimension: "D5_DATA",
    description: "Composite: filing speed + amendments",
    metric: "composite",
    higherIsBetter: true,
    scoringThresholds: null,
  },
  B6_PROFITABILITY_CONTROL: {
    id: "B6_PROFITABILITY_CONTROL",
    name: "Profitability Management KPI",
    dimension: "D6_KPIS",
    description: "Margin consistency (STDDEV)",
    metric: "margin_stddev",
    higherIsBetter: false,
    scoringThresholds: [
      { max: 2, score: 4.5, label: "Tight control" },
      { max: 5, score: 3.5, label: "Good control" },
      { max: 10, score: 2.0, label: "Weak control" },
      { max: Infinity, score: 1.0, label: "Erratic" },
    ],
  },
  B7_AUDIT_READINESS: {
    id: "B7_AUDIT_READINESS",
    name: "Audit Readiness",
    dimension: "D7_GOVERNANCE",
    description: "Amendment-free filing rate",
    metric: "amendment_free_rate",
    higherIsBetter: true,
    scoringThresholds: null,
  },
  B8_DIRECTOR_STABILITY: {
    id: "B8_DIRECTOR_STABILITY",
    name: "Finance Director/CFO Stability",
    dimension: "D3_ORGANISATION",
    description: "Average tenure years",
    metric: "tenure_years",
    higherIsBetter: true,
    scoringThresholds: [
      { min: 5, score: 4.5, label: "Stable" },
      { min: 3, score: 4.0, label: "Good" },
      { min: 2, score: 3.0, label: "Acceptable" },
      { min: 1, score: 2.0, label: "Concerning" },
      { min: 0, score: 1.0, label: "High turnover" },
    ],
  },
} as const;

// Calculate B1 Strategic Clarity Score
export function calculateB1Score(filingDays: number): number {
  if (filingDays < 30) return 4.5;
  if (filingDays < 60) return 3.5;
  if (filingDays < 90) return 2.5;
  return 1.5;
}

// Calculate B3 Reporting Accuracy Score
export function calculateB3Score(amendmentRatePct: number): number {
  if (amendmentRatePct < 0.5) return 4.8;
  if (amendmentRatePct < 1.0) return 3.5;
  if (amendmentRatePct < 2.0) return 2.2;
  return 1.0;
}

// Calculate B4 Working Capital Score
export function calculateB4Score(dsoDays: number): number {
  if (dsoDays < 30) return 4.5;
  if (dsoDays < 45) return 3.8;
  if (dsoDays < 60) return 3.0;
  if (dsoDays < 90) return 2.0;
  return 1.0;
}

// Calculate B5 Data Quality Score (composite)
export function calculateB5Score(filingDays: number, amendmentCount: number): number {
  if (filingDays <= 30 && amendmentCount === 0) return 5.0;
  if (filingDays <= 45 && amendmentCount <= 1) return 4.0;
  if (filingDays <= 60 && amendmentCount <= 2) return 3.0;
  if (filingDays <= 90) return 2.0;
  return 1.0;
}

// Calculate B6 Profitability Control Score
export function calculateB6Score(marginStddev: number): number {
  if (marginStddev < 2) return 4.5;
  if (marginStddev < 5) return 3.5;
  if (marginStddev < 10) return 2.0;
  return 1.0;
}

// Calculate B7 Audit Readiness Score
export function calculateB7Score(amendmentCount: number): number {
  if (amendmentCount === 0) return 5.0;
  if (amendmentCount === 1) return 3.5;
  return 1.5;
}

// Calculate B8 Director Stability Score
export function calculateB8Score(tenureYears: number): number {
  if (tenureYears > 5) return 4.5;
  if (tenureYears > 3) return 4.0;
  if (tenureYears > 2) return 3.0;
  if (tenureYears > 1) return 2.0;
  return 1.0;
}

export { DIMENSION_BENCHMARKS, DIMENSION_LABELS };
