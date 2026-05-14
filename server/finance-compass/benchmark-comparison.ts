/**
 * Benchmark Comparison Service for FinanceCompass
 * 
 * Compares assessment results against:
 * 1. Industry benchmarks (from fc_industry_benchmarks)
 * 2. Macro benchmarks (ONS, FRED, World Bank from fc_macro_benchmarks)
 * 3. Proprietary assessment benchmarks (from fc_assessment_benchmarks)
 */

import { db } from "../db";
import { eq, and, isNull } from "drizzle-orm";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("fc-benchmark-comparison");
import {
  calculatePercentileRank,
  getStatusFromPercentile,
  getDefaultDimensionBenchmarks,
  getDimensionLabel,
  DIMENSION_KEY_TO_CODE,
  DIMENSION_CODE_TO_KEY,
  getSectorFromSIC,
  getIndustryBenchmark,
  generateRecommendation,
  UK_SECTOR_BENCHMARKS,
  DIMENSION_BENCHMARKS,
  BENCHMARK_METRICS,
  calculateB1Score,
  calculateB3Score,
  calculateB4Score,
  calculateB5Score,
  calculateB6Score,
  calculateB7Score,
  calculateB8Score,
} from "./benchmark-engine";
import { getScoringTier, getScoringTierFromPercentile, SCORING_TIERS } from "./benchmarks";
import type {
  BenchmarkComparisonItem,
  BenchmarkComparisonReport,
} from "@shared/finance-compass-schema";
import {
  fcAssessmentBenchmarks,
  fcIndustryBenchmarks,
  fcMacroBenchmarks,
} from "@shared/finance-compass-schema";

// Cache for sector-specific benchmarks (keyed by sector, value is map of dimension -> benchmarks)
type BenchmarkData = { p25: number; p50: number; p75: number; p90: number; mean: number; industryAverage: number; worldClass: number };
const sectorBenchmarkCache: Map<string, Map<string, BenchmarkData>> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps: Map<string, number> = new Map();

/**
 * Get all dimension benchmarks for a sector in a single query (batched)
 * Uses caching to avoid repeated database hits
 */
export async function getAllSectorDimensionBenchmarks(
  sector: string | null
): Promise<Map<string, BenchmarkData>> {
  const cacheKey = sector || "__cross_sector__";
  const now = Date.now();
  
  // Check cache validity
  const cachedTimestamp = cacheTimestamps.get(cacheKey);
  if (cachedTimestamp && (now - cachedTimestamp) < CACHE_TTL_MS) {
    const cached = sectorBenchmarkCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  const result = new Map<string, BenchmarkData>();
  
  try {
    // Fetch all benchmarks for this sector in one query
    let sectorBenchmarks: any[] = [];
    if (sector) {
      sectorBenchmarks = await db
        .select()
        .from(fcAssessmentBenchmarks)
        .where(
          and(
            eq(fcAssessmentBenchmarks.sector, sector),
            eq(fcAssessmentBenchmarks.isActive, true)
          )
        );
    }
    
    // Also fetch cross-sector benchmarks for fallback
    const crossSectorBenchmarks = await db
      .select()
      .from(fcAssessmentBenchmarks)
      .where(
        and(
          isNull(fcAssessmentBenchmarks.sector),
          eq(fcAssessmentBenchmarks.isActive, true)
        )
      );
    
    // Build map with sector-specific first, then cross-sector fallback
    for (const b of crossSectorBenchmarks) {
      result.set(b.dimension, {
        p25: b.p25 ?? 2.5,
        p50: b.p50 ?? 3.0,
        p75: b.p75 ?? 3.5,
        p90: b.p90 ?? 4.0,
        mean: b.mean ?? 3.0,
        industryAverage: b.p50 ?? 3.0,
        worldClass: b.p90 ?? 4.0,
      });
    }
    
    // Override with sector-specific benchmarks
    for (const b of sectorBenchmarks) {
      result.set(b.dimension, {
        p25: b.p25 ?? 2.5,
        p50: b.p50 ?? 3.0,
        p75: b.p75 ?? 3.5,
        p90: b.p90 ?? 4.0,
        mean: b.mean ?? 3.0,
        industryAverage: b.p50 ?? 3.0,
        worldClass: b.p90 ?? 4.0,
      });
    }
    
    // Cache the result
    sectorBenchmarkCache.set(cacheKey, result);
    cacheTimestamps.set(cacheKey, now);
    
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error fetching sector dimension benchmarks");
  }
  
  return result;
}

/**
 * Get sector-specific dimension benchmarks from database (single dimension)
 * For backwards compatibility - uses cached batch lookup
 */
export async function getSectorDimensionBenchmarks(
  dimension: string,
  sector: string | null
): Promise<BenchmarkData | null> {
  const allBenchmarks = await getAllSectorDimensionBenchmarks(sector);
  return allBenchmarks.get(dimension) || null;
}

/**
 * Get finance function KPI benchmarks for a sector
 */
export async function getSectorKpiBenchmarks(sector: string): Promise<{
  financeCostPercent?: { p25: number; p50: number; p75: number; p90: number };
  financeFtePerMillion?: { p25: number; p50: number; p75: number; p90: number };
  forecastAccuracy?: { p25: number; p50: number; p75: number; p90: number };
  automationRate?: { p25: number; p50: number; p75: number; p90: number };
  dataQualityScore?: { p25: number; p50: number; p75: number; p90: number };
}> {
  try {
    const kpis = await db
      .select()
      .from(fcIndustryBenchmarks)
      .where(
        and(
          eq(fcIndustryBenchmarks.sector, sector),
          eq(fcIndustryBenchmarks.isActive, true)
        )
      );
    
    const result: any = {};
    
    for (const kpi of kpis) {
      const data = { p25: kpi.p25, p50: kpi.p50, p75: kpi.p75, p90: kpi.p90 };
      switch (kpi.metricType) {
        case 'finance_cost_percent':
          result.financeCostPercent = data;
          break;
        case 'finance_fte_per_million':
          result.financeFtePerMillion = data;
          break;
        case 'forecast_accuracy':
          result.forecastAccuracy = data;
          break;
        case 'automation_rate':
          result.automationRate = data;
          break;
        case 'data_quality_score':
          result.dataQualityScore = data;
          break;
      }
    }
    
    return result;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error fetching sector KPI benchmarks");
    return {};
  }
}

/**
 * Get macro economic benchmarks for a sector
 */
export async function getSectorMacroBenchmarks(sector: string): Promise<{
  laborProductivity?: number;
  techAdoption?: number;
  capitalIntensity?: number;
  aiAdoption?: number;
}> {
  try {
    const macros = await db
      .select()
      .from(fcMacroBenchmarks)
      .where(
        and(
          eq(fcMacroBenchmarks.sector, sector),
          eq(fcMacroBenchmarks.isActive, true)
        )
      );
    
    const result: any = {};
    
    for (const m of macros) {
      switch (m.metricType) {
        case 'labor_productivity':
          result.laborProductivity = m.value;
          break;
        case 'tech_adoption':
          result.techAdoption = m.value;
          break;
        case 'capital_intensity':
          result.capitalIntensity = m.value;
          break;
        case 'digital_maturity':
          result.aiAdoption = m.value;
          break;
      }
    }
    
    return result;
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error fetching sector macro benchmarks");
    return {};
  }
}

interface AssessmentData {
  id: string;
  companyName: string;
  sector: string | null;
  sicCode?: string | null;
  sizeBand: string | null;
  dimensionScores: Record<string, number> | null;
  overallMaturityScore: number | null;
}

/**
 * Compare assessment dimension scores against benchmarks
 * Uses sector-specific benchmarks from database with fallback to cross-sector defaults
 * Optimized: fetches all benchmarks in a single batched query with caching
 */
export async function compareDimensionsToBenchmarks(
  dimensionScores: Record<string, number>,
  sector: string | null
): Promise<BenchmarkComparisonItem[]> {
  const comparisons: BenchmarkComparisonItem[] = [];
  
  // Batch fetch all dimension benchmarks for this sector (single DB query, cached)
  const allBenchmarks = await getAllSectorDimensionBenchmarks(sector);
  
  for (const [key, rawScore] of Object.entries(dimensionScores)) {
    // Convert percentage (0-100) to 1-5 scale
    const score = rawScore / 20;
    
    // Get dimension code (D1_STRATEGY, etc.)
    const dimensionCode = DIMENSION_KEY_TO_CODE[key] || key;
    
    // Get benchmarks from cached map (no DB query in loop)
    const sectorBenchmarks = allBenchmarks.get(dimensionCode);
    
    // Use database benchmarks or fall back to static defaults
    let p25: number, p50: number, p75: number, p90: number, industryAverage: number, worldClass: number;
    
    if (sectorBenchmarks) {
      p25 = sectorBenchmarks.p25;
      p50 = sectorBenchmarks.p50;
      p75 = sectorBenchmarks.p75;
      p90 = sectorBenchmarks.p90;
      industryAverage = sectorBenchmarks.industryAverage;
      worldClass = sectorBenchmarks.worldClass;
    } else {
      // Fallback to static defaults
      const defaults = getDefaultDimensionBenchmarks(dimensionCode);
      industryAverage = defaults.industryAverage;
      worldClass = defaults.worldClass;
      p25 = Math.max(1, industryAverage - 0.5);
      p50 = industryAverage;
      p75 = Math.min(5, industryAverage + 0.5);
      p90 = Math.min(5, worldClass);
    }
    
    // Calculate percentile rank
    let percentileRank: number;
    if (score <= p25) {
      percentileRank = (score / p25) * 25;
    } else if (score <= p50) {
      percentileRank = 25 + ((score - p25) / (p50 - p25)) * 25;
    } else if (score <= p75) {
      percentileRank = 50 + ((score - p50) / (p75 - p50)) * 25;
    } else if (score <= p90) {
      percentileRank = 75 + ((score - p75) / (p90 - p75)) * 15;
    } else {
      percentileRank = 90 + ((score - p90) / (5 - p90)) * 10;
    }
    percentileRank = Math.min(100, Math.max(0, percentileRank));
    
    // Calculate gap to industry average
    const gap = industryAverage - score;
    
    // Determine status
    const status = getStatusFromPercentile(percentileRank);
    
    // Generate recommendation
    const recommendation = generateRecommendation(dimensionCode, score, industryAverage, worldClass);
    
    comparisons.push({
      metric: dimensionCode,
      metricLabel: getDimensionLabel(dimensionCode),
      yourScore: score,
      p25,
      p50,
      p75,
      p90,
      industryAverage,
      worldClass,
      percentileRank: Math.round(percentileRank),
      gap: Math.round(gap * 10) / 10,
      status,
      recommendation,
    });
  }
  
  // Sort by gap (largest gaps first for priority)
  return comparisons.sort((a, b) => b.gap - a.gap);
}

/**
 * Normalize dimension score to a plain number
 * Handles both plain numbers and objects with { score: number, level: string, ... }
 * Caps values at 100 to prevent display issues
 */
function normalizeDimensionScore(val: any): number {
  let score = 0;
  if (typeof val === 'number') score = val;
  else if (val && typeof val === 'object' && typeof val.score === 'number') score = val.score;
  // Cap at 100 to prevent scores exceeding 100%
  return Math.min(100, Math.max(0, score));
}

/**
 * Normalize all dimension scores to Record<string, number>
 */
function normalizeDimensionScores(scores: Record<string, any> | null): Record<string, number> {
  if (!scores) return {};
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(scores)) {
    result[key] = normalizeDimensionScore(val);
  }
  return result;
}

/**
 * Generate full benchmark comparison report for an assessment
 * Uses sector-specific benchmarks from database
 */
export async function generateBenchmarkComparisonReport(
  assessment: AssessmentData
): Promise<BenchmarkComparisonReport> {
  const { id, companyName, sector, sicCode, sizeBand, dimensionScores, overallMaturityScore } = assessment;
  
  // Determine effective sector
  const effectiveSector = sector || getSectorFromSIC(sicCode || null) || "Other";
  
  // Normalize dimension scores to plain numbers (handles both number and {score, level, ...} formats)
  const normalizedScores = normalizeDimensionScores(dimensionScores);
  
  // Compare dimensions (now async with database lookup)
  const dimensionComparisons = Object.keys(normalizedScores).length > 0
    ? await compareDimensionsToBenchmarks(normalizedScores, effectiveSector)
    : [];
  
  // Calculate summary stats
  const strengths = dimensionComparisons.filter(c => c.status === "excellent" || c.status === "good");
  const improvements = dimensionComparisons.filter(c => c.status === "average" || c.status === "below_average");
  const criticalGaps = dimensionComparisons.filter(c => c.status === "needs_attention");
  
  // Calculate overall percentile (average of dimension percentiles)
  const overallPercentileRank = dimensionComparisons.length > 0
    ? Math.round(dimensionComparisons.reduce((sum, c) => sum + c.percentileRank, 0) / dimensionComparisons.length)
    : 50;
  
  // Generate prioritized recommendations with detailed action plans
  const priorities = dimensionComparisons
    .filter(c => c.gap > 0)
    .sort((a, b) => b.gap - a.gap) // Sort by largest gap first
    .slice(0, 5)
    .map((c, index) => {
      const detailed = getDetailedRecommendation(c.metric, c.gap);
      return {
        dimension: c.metric,
        dimensionLabel: detailed.dimensionLabel,
        gap: c.gap,
        priority: index + 1,
        workshopRecommendation: detailed.workshopRecommendation,
        keyActions: detailed.keyActions,
        expectedOutcomes: detailed.expectedOutcomes,
        timeframe: detailed.timeframe,
        investmentLevel: detailed.investmentLevel,
        quickWins: detailed.quickWins,
        riskIfIgnored: detailed.riskIfIgnored,
      };
    });
  
  return {
    assessmentId: id,
    companyName,
    sector: effectiveSector,
    sizeBand: sizeBand || "unknown",
    dimensionComparisons,
    summary: {
      overallPercentileRank,
      strengthCount: strengths.length,
      improvementCount: improvements.length,
      criticalGapCount: criticalGaps.length,
    },
    priorities,
    benchmarkDate: new Date().toISOString(),
    sampleSizes: {
      dimensionBenchmarks: Object.keys(DIMENSION_BENCHMARKS).length,
    },
  };
}

/**
 * Priority recommendation with detailed action plan
 */
interface DetailedPriorityRecommendation {
  dimension: string;
  dimensionLabel: string;
  gap: number;
  priority: number;
  workshopRecommendation?: string;
  keyActions: string[];
  expectedOutcomes: string[];
  timeframe: string;
  investmentLevel: 'Low' | 'Medium' | 'High';
  quickWins: string[];
  riskIfIgnored: string;
}

/**
 * Get detailed recommendations for a dimension gap
 */
function getDetailedRecommendation(dimension: string, gap: number): Omit<DetailedPriorityRecommendation, 'dimension' | 'gap' | 'priority'> {
  const recommendations: Record<string, Omit<DetailedPriorityRecommendation, 'dimension' | 'gap' | 'priority'>> = {
    D1_STRATEGY: {
      dimensionLabel: "Strategy & Roadmap",
      workshopRecommendation: "Strategy & Vision Alignment Workshop",
      keyActions: [
        "Define clear 3-year finance transformation roadmap aligned with business strategy",
        "Establish executive sponsorship and governance structure",
        "Identify key performance milestones and success metrics",
        "Map current vs target operating model gaps"
      ],
      expectedOutcomes: [
        "Aligned leadership vision for finance transformation",
        "Clear investment priorities and sequencing",
        "Measurable KPIs for transformation progress"
      ],
      timeframe: gap >= 1.0 ? "6-12 months" : "3-6 months",
      investmentLevel: gap >= 1.0 ? "High" : "Medium",
      quickWins: [
        "Executive alignment session",
        "Quick capability assessment",
        "Priority matrix creation"
      ],
      riskIfIgnored: "Fragmented initiatives, wasted investment, loss of competitive advantage"
    },
    D2_PROCESS: {
      dimensionLabel: "Process & Automation",
      workshopRecommendation: "Process Automation Workshop",
      keyActions: [
        "Map end-to-end finance processes and identify automation opportunities",
        "Implement robotic process automation (RPA) for high-volume tasks",
        "Standardise close procedures across entities",
        "Reduce manual reconciliations and journal entries"
      ],
      expectedOutcomes: [
        "40-60% reduction in manual effort",
        "Faster month-end close cycle",
        "Improved accuracy and audit trail"
      ],
      timeframe: gap >= 1.0 ? "6-9 months" : "3-6 months",
      investmentLevel: gap >= 1.0 ? "High" : "Medium",
      quickWins: [
        "Automate bank reconciliation",
        "Implement approval workflows",
        "Standardise journal templates"
      ],
      riskIfIgnored: "Inefficient operations, high error rates, slow reporting, staff burnout"
    },
    D3_ORGANISATION: {
      dimensionLabel: "People & Skills",
      workshopRecommendation: "Organisation & Skills Development Workshop",
      keyActions: [
        "Assess current finance team capabilities against future needs",
        "Develop upskilling programme for analytics and technology",
        "Create centres of excellence for EPM and analytics",
        "Design hybrid operating model with shared services"
      ],
      expectedOutcomes: [
        "Skilled workforce ready for modern finance",
        "Clear career paths and retention",
        "Efficient operating model"
      ],
      timeframe: gap >= 1.0 ? "12-18 months" : "6-12 months",
      investmentLevel: gap >= 1.0 ? "High" : "Medium",
      quickWins: [
        "Skills assessment",
        "Online learning subscriptions",
        "Job rotation programme"
      ],
      riskIfIgnored: "Talent attrition, skill gaps, inability to leverage new technology"
    },
    D4_TECHNOLOGY: {
      dimensionLabel: "Technology & Platform",
      workshopRecommendation: "Technology & Data Foundation Workshop",
      keyActions: [
        "Evaluate and modernise EPM/ERP technology stack",
        "Implement cloud-based planning and consolidation",
        "Create integrated data layer across systems",
        "Establish API-based integration architecture"
      ],
      expectedOutcomes: [
        "Modern, scalable finance platform",
        "Real-time data availability",
        "Reduced IT maintenance burden"
      ],
      timeframe: gap >= 1.0 ? "12-18 months" : "6-12 months",
      investmentLevel: "High",
      quickWins: [
        "Cloud migration assessment",
        "Integration audit",
        "Vendor capability review"
      ],
      riskIfIgnored: "Technical debt, system fragmentation, inability to scale"
    },
    D5_DATA: {
      dimensionLabel: "Data & Analytics",
      workshopRecommendation: "Data Maturity Workshop",
      keyActions: [
        "Establish single source of truth for financial data",
        "Implement master data management framework",
        "Create self-service analytics capabilities",
        "Develop predictive analytics models"
      ],
      expectedOutcomes: [
        "Trusted, consistent data across the organisation",
        "Self-service reporting reducing ad-hoc requests by 50%+",
        "Predictive insights for decision support"
      ],
      timeframe: gap >= 1.0 ? "9-15 months" : "6-9 months",
      investmentLevel: gap >= 1.0 ? "High" : "Medium",
      quickWins: [
        "Data quality assessment",
        "Dashboard standardisation",
        "KPI dictionary creation"
      ],
      riskIfIgnored: "Poor decisions from bad data, audit findings, compliance risk"
    },
    D6_KPIS: {
      dimensionLabel: "Performance Management",
      workshopRecommendation: "Performance Analytics Workshop",
      keyActions: [
        "Redesign KPI framework aligned with strategy",
        "Implement driver-based planning and rolling forecasts",
        "Create integrated performance dashboards",
        "Establish variance analysis automation"
      ],
      expectedOutcomes: [
        "Strategy-aligned performance measurement",
        "Faster forecasting cycles",
        "Proactive performance management"
      ],
      timeframe: gap >= 1.0 ? "6-12 months" : "3-6 months",
      investmentLevel: gap >= 1.0 ? "Medium" : "Low",
      quickWins: [
        "KPI hierarchy review",
        "Executive dashboard pilot",
        "Forecast frequency increase"
      ],
      riskIfIgnored: "Misaligned incentives, lagging indicators, missed targets"
    },
    D7_GOVERNANCE: {
      dimensionLabel: "Governance & Controls",
      workshopRecommendation: "Governance & Controls Workshop",
      keyActions: [
        "Strengthen financial controls framework",
        "Implement continuous controls monitoring",
        "Automate compliance reporting",
        "Enhance segregation of duties"
      ],
      expectedOutcomes: [
        "Reduced audit findings",
        "Continuous assurance",
        "Regulatory compliance confidence"
      ],
      timeframe: gap >= 1.0 ? "6-12 months" : "3-6 months",
      investmentLevel: gap >= 1.0 ? "Medium" : "Low",
      quickWins: [
        "Controls inventory update",
        "Access review automation",
        "Policy documentation"
      ],
      riskIfIgnored: "Regulatory penalties, audit failures, reputational damage"
    },
    D8_AI: {
      dimensionLabel: "AI & Advanced Analytics",
      workshopRecommendation: "AI for Finance Workshop",
      keyActions: [
        "Identify high-value AI use cases for finance",
        "Pilot machine learning for forecasting and anomaly detection",
        "Implement intelligent document processing",
        "Build AI governance and ethics framework"
      ],
      expectedOutcomes: [
        "20-30% forecast accuracy improvement",
        "Automated exception handling",
        "Intelligent process automation"
      ],
      timeframe: gap >= 1.0 ? "9-15 months" : "6-9 months",
      investmentLevel: "High",
      quickWins: [
        "AI readiness assessment",
        "Use case prioritisation",
        "Pilot project selection"
      ],
      riskIfIgnored: "Competitive disadvantage, missed efficiency gains, talent expectations"
    }
  };
  
  // Default for any unmapped dimension
  const defaultRec: Omit<DetailedPriorityRecommendation, 'dimension' | 'gap' | 'priority'> = {
    dimensionLabel: dimension.replace(/_/g, ' '),
    workshopRecommendation: gap >= 0.5 ? "Targeted Improvement Workshop" : undefined,
    keyActions: ["Assess current state", "Define target state", "Create improvement roadmap"],
    expectedOutcomes: ["Improved capability", "Reduced gaps", "Better performance"],
    timeframe: "3-6 months",
    investmentLevel: "Medium",
    quickWins: ["Assessment", "Quick improvements"],
    riskIfIgnored: "Continued underperformance"
  };
  
  return recommendations[dimension] || defaultRec;
}

/**
 * Get workshop recommendation for a dimension gap (legacy support)
 */
function getWorkshopRecommendation(dimension: string, gap: number): string | undefined {
  const detailed = getDetailedRecommendation(dimension, gap);
  return detailed.workshopRecommendation;
}

/**
 * Get sector-level financial benchmarks
 */
export function getSectorFinancialBenchmarks(sector: string): {
  closeCycleDays: { p25: number; p50: number; p75: number; unit: string };
  operatingMargin: { p25: number; p50: number; p75: number; unit: string };
  assetTurnover: { p25: number; p50: number; p75: number; unit: string };
} {
  const sectorData = UK_SECTOR_BENCHMARKS[sector] || UK_SECTOR_BENCHMARKS["Other"];
  
  return {
    closeCycleDays: { ...sectorData.closeCycleDays, unit: "days" },
    operatingMargin: { ...sectorData.operatingMargin, unit: "%" },
    assetTurnover: { ...sectorData.assetTurnover, unit: "x" },
  };
}

/**
 * Compare a single metric value against sector benchmarks
 */
export function compareMetricToSector(
  value: number,
  sector: string,
  metricType: "close_cycle_days" | "operating_margin" | "asset_turnover"
): BenchmarkComparisonItem | null {
  const benchmark = getIndustryBenchmark(sector, metricType);
  if (!benchmark) return null;
  
  const metricLabels: Record<string, string> = {
    close_cycle_days: "Close Cycle",
    operating_margin: "Operating Margin",
    asset_turnover: "Asset Turnover",
  };
  
  // For close cycle, lower is better
  const higherIsBetter = metricType !== "close_cycle_days";
  
  // Estimate p10 and p90
  const range = benchmark.p75 - benchmark.p25;
  const p10 = higherIsBetter 
    ? Math.max(0, benchmark.p25 - range * 0.5)
    : benchmark.p75 + range * 0.5;
  const p90 = higherIsBetter
    ? benchmark.p75 + range * 0.5
    : Math.max(0, benchmark.p25 - range * 0.5);
  
  // Calculate percentile rank
  let percentileRank: number;
  if (higherIsBetter) {
    if (value <= benchmark.p25) {
      percentileRank = (value / benchmark.p25) * 25;
    } else if (value <= benchmark.p50) {
      percentileRank = 25 + ((value - benchmark.p25) / (benchmark.p50 - benchmark.p25)) * 25;
    } else if (value <= benchmark.p75) {
      percentileRank = 50 + ((value - benchmark.p50) / (benchmark.p75 - benchmark.p50)) * 25;
    } else {
      percentileRank = 75 + Math.min(25, ((value - benchmark.p75) / range) * 25);
    }
  } else {
    // Lower is better (e.g., close cycle days)
    if (value >= benchmark.p75) {
      percentileRank = ((benchmark.p75 + range - value) / range) * 25;
    } else if (value >= benchmark.p50) {
      percentileRank = 25 + ((benchmark.p75 - value) / (benchmark.p75 - benchmark.p50)) * 25;
    } else if (value >= benchmark.p25) {
      percentileRank = 50 + ((benchmark.p50 - value) / (benchmark.p50 - benchmark.p25)) * 25;
    } else {
      percentileRank = 75 + Math.min(25, ((benchmark.p25 - value) / range) * 25);
    }
  }
  percentileRank = Math.min(100, Math.max(0, percentileRank));
  
  const gap = higherIsBetter 
    ? benchmark.p50 - value 
    : value - benchmark.p50;
  
  const status = getStatusFromPercentile(percentileRank);
  
  return {
    metric: metricType,
    metricLabel: metricLabels[metricType],
    yourScore: value,
    p25: benchmark.p25,
    p50: benchmark.p50,
    p75: benchmark.p75,
    p90: higherIsBetter ? p90 : p10,
    percentileRank: Math.round(percentileRank),
    gap: Math.round(gap * 10) / 10,
    status,
  };
}

/**
 * Calculate company benchmark scores (B1-B8) based on input financial data
 * Rolls up company-level metrics to industry/sector scoring tiers
 */
export function calculateCompanyBenchmarkScores(companyData: {
  filingDays?: number;
  amendmentRate?: number;
  amendmentCount?: number;
  dsoDays?: number;
  marginStddev?: number;
  tenureYears?: number;
}): Record<string, { score: number; tier: string; tierLabel: string; metricId: string; metricName: string; dimension: string }> {
  const results: Record<string, { score: number; tier: string; tierLabel: string; metricId: string; metricName: string; dimension: string }> = {};
  
  if (companyData.filingDays !== undefined) {
    const score = calculateB1Score(companyData.filingDays);
    const tier = getScoringTier(score);
    results.B1_STRATEGIC_CLARITY = { 
      score, 
      tier, 
      tierLabel: SCORING_TIERS[tier].label,
      metricId: BENCHMARK_METRICS.B1_STRATEGIC_CLARITY.id,
      metricName: BENCHMARK_METRICS.B1_STRATEGIC_CLARITY.name,
      dimension: BENCHMARK_METRICS.B1_STRATEGIC_CLARITY.dimension,
    };
  }
  
  if (companyData.amendmentRate !== undefined) {
    const score = calculateB3Score(companyData.amendmentRate);
    const tier = getScoringTier(score);
    results.B3_REPORTING_ACCURACY = { 
      score, 
      tier, 
      tierLabel: SCORING_TIERS[tier].label,
      metricId: BENCHMARK_METRICS.B3_REPORTING_ACCURACY.id,
      metricName: BENCHMARK_METRICS.B3_REPORTING_ACCURACY.name,
      dimension: BENCHMARK_METRICS.B3_REPORTING_ACCURACY.dimension,
    };
  }
  
  if (companyData.dsoDays !== undefined) {
    const score = calculateB4Score(companyData.dsoDays);
    const tier = getScoringTier(score);
    results.B4_WORKING_CAPITAL = { 
      score, 
      tier, 
      tierLabel: SCORING_TIERS[tier].label,
      metricId: BENCHMARK_METRICS.B4_WORKING_CAPITAL.id,
      metricName: BENCHMARK_METRICS.B4_WORKING_CAPITAL.name,
      dimension: BENCHMARK_METRICS.B4_WORKING_CAPITAL.dimension,
    };
  }
  
  if (companyData.filingDays !== undefined && companyData.amendmentCount !== undefined) {
    const score = calculateB5Score(companyData.filingDays, companyData.amendmentCount);
    const tier = getScoringTier(score);
    results.B5_DATA_QUALITY = { 
      score, 
      tier, 
      tierLabel: SCORING_TIERS[tier].label,
      metricId: BENCHMARK_METRICS.B5_DATA_QUALITY.id,
      metricName: BENCHMARK_METRICS.B5_DATA_QUALITY.name,
      dimension: BENCHMARK_METRICS.B5_DATA_QUALITY.dimension,
    };
  }
  
  if (companyData.marginStddev !== undefined) {
    const score = calculateB6Score(companyData.marginStddev);
    const tier = getScoringTier(score);
    results.B6_PROFITABILITY_CONTROL = { 
      score, 
      tier, 
      tierLabel: SCORING_TIERS[tier].label,
      metricId: BENCHMARK_METRICS.B6_PROFITABILITY_CONTROL.id,
      metricName: BENCHMARK_METRICS.B6_PROFITABILITY_CONTROL.name,
      dimension: BENCHMARK_METRICS.B6_PROFITABILITY_CONTROL.dimension,
    };
  }
  
  if (companyData.amendmentCount !== undefined) {
    const score = calculateB7Score(companyData.amendmentCount);
    const tier = getScoringTier(score);
    results.B7_AUDIT_READINESS = { 
      score, 
      tier, 
      tierLabel: SCORING_TIERS[tier].label,
      metricId: BENCHMARK_METRICS.B7_AUDIT_READINESS.id,
      metricName: BENCHMARK_METRICS.B7_AUDIT_READINESS.name,
      dimension: BENCHMARK_METRICS.B7_AUDIT_READINESS.dimension,
    };
  }
  
  if (companyData.tenureYears !== undefined) {
    const score = calculateB8Score(companyData.tenureYears);
    const tier = getScoringTier(score);
    results.B8_DIRECTOR_STABILITY = { 
      score, 
      tier, 
      tierLabel: SCORING_TIERS[tier].label,
      metricId: BENCHMARK_METRICS.B8_DIRECTOR_STABILITY.id,
      metricName: BENCHMARK_METRICS.B8_DIRECTOR_STABILITY.name,
      dimension: BENCHMARK_METRICS.B8_DIRECTOR_STABILITY.dimension,
    };
  }
  
  return results;
}

/**
 * Get B1-B8 benchmark metric definitions with sector-specific context
 * Returns benchmark definitions along with sector-relevant KPI thresholds
 */
export function getBenchmarkMetricsForSector(sector: string): {
  metrics: typeof BENCHMARK_METRICS;
  sectorBenchmarks: {
    closeCycleDays: { p25: number; p50: number; p75: number };
    operatingMargin: { p25: number; p50: number; p75: number };
    assetTurnover: { p25: number; p50: number; p75: number };
  };
  sectorName: string;
  scoringTiers: typeof SCORING_TIERS;
} {
  const sectorData = UK_SECTOR_BENCHMARKS[sector] || UK_SECTOR_BENCHMARKS["Other"];
  
  return {
    metrics: BENCHMARK_METRICS,
    sectorBenchmarks: {
      closeCycleDays: sectorData.closeCycleDays,
      operatingMargin: sectorData.operatingMargin,
      assetTurnover: sectorData.assetTurnover,
    },
    sectorName: sector,
    scoringTiers: SCORING_TIERS,
  };
}

/**
 * Enhanced comparison item with tier information
 */
export interface EnhancedBenchmarkComparisonItem extends BenchmarkComparisonItem {
  tier: string;
  tierLabel: string;
  tierColor: string;
}

/**
 * Compare dimensions to benchmarks with tier information included
 * Enhanced version that adds scoring tier data to each comparison item
 */
export async function compareDimensionsToBenchmarksWithTiers(
  dimensionScores: Record<string, number>,
  sector: string | null
): Promise<EnhancedBenchmarkComparisonItem[]> {
  const baseComparisons = await compareDimensionsToBenchmarks(dimensionScores, sector);
  
  return baseComparisons.map(comparison => {
    const tier = getScoringTier(comparison.yourScore);
    const tierFromPercentile = getScoringTierFromPercentile(comparison.percentileRank);
    
    return {
      ...comparison,
      tier,
      tierLabel: SCORING_TIERS[tier].label,
      tierColor: SCORING_TIERS[tier].color,
    };
  });
}
