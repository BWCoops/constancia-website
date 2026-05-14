/**
 * 1QG Historical Industry Benchmarks (2020-2024)
 * 
 * Comprehensive benchmark data using 1QG terminology:
 * - "typical" = baseline/median performance
 * - "1qg_good" = top quartile, what good looks like
 * - "1qg_best" = digital world class
 * 
 * Sources: PwC Finance Benchmarking, Hackett Group, NAO Forecasting Studies, Working Capital Studies
 * Last Updated: December 2024
 */

export type OneQGTier = 'typical' | '1qg_good' | '1qg_best';

export interface BenchmarkRange {
  min: number;
  max: number;
  median?: number;
}

export interface BenchmarkMetricData {
  metricId: string;
  metricName: string;
  unit: string;
  direction: 'lower_is_better' | 'higher_is_better';
  typical: { min: number; max: number; median: number };
  '1qg_good': { min: number; max: number };
  '1qg_best': { min: number; max: number };
  maturityMapping: Record<1 | 2 | 3 | 4 | 5, string>;
  source: string;
  sampleSize?: number;
}

export interface HistoricalBenchmark {
  year: number;
  industryId: string;
  metrics: Record<string, BenchmarkMetricData>;
}

export interface YearOverYearChange {
  metricId: string;
  metricName: string;
  year: number;
  previousYear: number;
  typicalChange: number;
  '1qg_good_change': number;
  '1qg_best_change': number;
  direction: 'lower_is_better' | 'higher_is_better';
  improvementIndicator: 'improved' | 'stable' | 'declined';
}

export interface IndustryTrend {
  industryId: string;
  metricId: string;
  metricName: string;
  startYear: number;
  endYear: number;
  dataPoints: Array<{
    year: number;
    typical: { min: number; max: number; median: number };
    '1qg_good': { min: number; max: number };
    '1qg_best': { min: number; max: number };
  }>;
  overallTrend: 'improving' | 'stable' | 'declining';
  cagr: number;
}

// ============================================
// INDUSTRY DEFINITIONS
// ============================================

export const INDUSTRY_IDS = [
  'cross_industry',
  'banking',
  'utilities',
  'manufacturing',
  'retail',
  'software_saas',
  'healthcare',
  'professional_services',
  'consumer_products',
  'distribution_transport',
] as const;

export type IndustryId = typeof INDUSTRY_IDS[number];

export const INDUSTRY_NAMES: Record<IndustryId, string> = {
  cross_industry: 'Cross-Industry Average',
  banking: 'Banking & Financial Services',
  utilities: 'Utilities & Energy',
  manufacturing: 'Manufacturing',
  retail: 'Retail & E-commerce',
  software_saas: 'Software & SaaS',
  healthcare: 'Healthcare & Life Sciences',
  professional_services: 'Professional Services',
  consumer_products: 'Consumer Products',
  distribution_transport: 'Distribution & Transport',
};

export const BENCHMARK_YEARS = [2020, 2021, 2022, 2023, 2024] as const;
export type BenchmarkYear = typeof BENCHMARK_YEARS[number];

// ============================================
// METRIC DEFINITIONS
// ============================================

export const METRIC_IDS = [
  'finance_cost_pct_revenue',
  'finance_ftes_per_1b',
  'days_to_close',
  'budget_cycle_days',
  'forecast_cycle_days',
  'forecast_accuracy_pct',
  'plan_variance_pct',
  'dso_days',
  'dpo_days',
  'dio_days',
  'cash_conversion_cycle',
  'reports_automated_pct',
  'self_service_adoption_pct',
] as const;

export type MetricId = typeof METRIC_IDS[number];

interface BaseMetricDefinition {
  id: MetricId;
  name: string;
  category: 'finance_cost' | 'cycle_time' | 'forecasting' | 'working_capital' | 'reporting';
  unit: string;
  direction: 'lower_is_better' | 'higher_is_better';
  source: string;
  maturityMapping: Record<1 | 2 | 3 | 4 | 5, string>;
}

export const BASE_METRIC_DEFINITIONS: BaseMetricDefinition[] = [
  {
    id: 'finance_cost_pct_revenue',
    name: 'Finance Cost as % of Revenue',
    category: 'finance_cost',
    unit: '%',
    direction: 'lower_is_better',
    source: 'PwC Finance Benchmarking 2024, Hackett Group',
    maturityMapping: {
      1: 'Finance cost exceeds 2.0% of revenue with limited cost visibility',
      2: 'Finance cost between 1.5-2.0% with basic cost tracking',
      3: 'Finance cost between 1.0-1.5% with cost optimization initiatives',
      4: 'Finance cost between 0.6-0.9% with active cost management',
      5: 'Finance cost below 0.6% with world-class efficiency',
    },
  },
  {
    id: 'finance_ftes_per_1b',
    name: 'Finance FTEs per £1B Revenue',
    category: 'finance_cost',
    unit: 'FTEs',
    direction: 'lower_is_better',
    source: 'PwC Finance Benchmarking 2024, Hackett Group',
    maturityMapping: {
      1: 'Over 1,200 FTEs per £1B with fragmented processes',
      2: '1,000-1,200 FTEs with some standardization',
      3: '800-1,000 FTEs with shared services model',
      4: '400-600 FTEs with high automation',
      5: 'Under 400 FTEs with digital-first operations',
    },
  },
  {
    id: 'days_to_close',
    name: 'Monthly Close Cycle',
    category: 'cycle_time',
    unit: 'days',
    direction: 'lower_is_better',
    source: 'PwC Finance Benchmarking, Hackett Group 2024',
    maturityMapping: {
      1: 'Close takes 15+ days with significant manual intervention',
      2: 'Close takes 10-15 days with some automation',
      3: 'Close takes 8-10 days with standardized processes',
      4: 'Close takes 5-7 days with high automation',
      5: 'Close takes 3-5 days or less with continuous close capability',
    },
  },
  {
    id: 'budget_cycle_days',
    name: 'Annual Budget Cycle',
    category: 'cycle_time',
    unit: 'days',
    direction: 'lower_is_better',
    source: 'NAO Forecasting Studies, PwC Finance Benchmarking',
    maturityMapping: {
      1: 'Budget cycle exceeds 150 days with disconnected processes',
      2: 'Budget cycle 120-150 days with basic planning tools',
      3: 'Budget cycle 90-120 days with integrated planning',
      4: 'Budget cycle 60-90 days with driver-based planning',
      5: 'Budget cycle under 60 days with continuous planning',
    },
  },
  {
    id: 'forecast_cycle_days',
    name: 'Forecast Cycle Time',
    category: 'cycle_time',
    unit: 'days',
    direction: 'lower_is_better',
    source: 'NAO Forecasting Studies, Hackett Group 2024',
    maturityMapping: {
      1: 'Forecast takes 30+ days with spreadsheet-based processes',
      2: 'Forecast takes 20-30 days with basic EPM tools',
      3: 'Forecast takes 15-20 days with integrated planning',
      4: 'Forecast takes 10-15 days with rolling forecasts',
      5: 'Forecast takes 5-10 days or less with AI-augmented planning',
    },
  },
  {
    id: 'forecast_accuracy_pct',
    name: 'Forecast Accuracy',
    category: 'forecasting',
    unit: '%',
    direction: 'higher_is_better',
    source: 'NAO Forecasting Studies, Hackett Group',
    maturityMapping: {
      1: 'Forecast accuracy below 80% with reactive adjustments',
      2: 'Forecast accuracy 80-85% with periodic reviews',
      3: 'Forecast accuracy 85-88% with structured variance analysis',
      4: 'Forecast accuracy 90-93% with advanced analytics',
      5: 'Forecast accuracy 95%+ with predictive capabilities',
    },
  },
  {
    id: 'plan_variance_pct',
    name: 'Plan-to-Actual Variance',
    category: 'forecasting',
    unit: '%',
    direction: 'lower_is_better',
    source: 'PwC Finance Benchmarking, Industry Studies',
    maturityMapping: {
      1: 'Variance exceeds 30% with limited visibility',
      2: 'Variance 20-30% with basic tracking',
      3: 'Variance 15-20% with regular reviews',
      4: 'Variance 5-10% with proactive management',
      5: 'Variance 3-5% with predictive adjustments',
    },
  },
  {
    id: 'dso_days',
    name: 'Days Sales Outstanding',
    category: 'working_capital',
    unit: 'days',
    direction: 'lower_is_better',
    source: 'Working Capital Studies, Hackett Group 2024',
    maturityMapping: {
      1: 'DSO exceeds 60 days with reactive collections',
      2: 'DSO 50-60 days with basic credit management',
      3: 'DSO 40-50 days with structured AR processes',
      4: 'DSO 30-40 days with proactive credit management',
      5: 'DSO under 30 days with predictive collections',
    },
  },
  {
    id: 'dpo_days',
    name: 'Days Payables Outstanding',
    category: 'working_capital',
    unit: 'days',
    direction: 'higher_is_better',
    source: 'Working Capital Studies, Hackett Group 2024',
    maturityMapping: {
      1: 'DPO under 30 days with missed payment optimization',
      2: 'DPO 30-40 days with basic payment scheduling',
      3: 'DPO 40-50 days with supplier term negotiations',
      4: 'DPO 55-65 days with dynamic discounting',
      5: 'DPO 65-75 days with optimized working capital',
    },
  },
  {
    id: 'dio_days',
    name: 'Days Inventory Outstanding',
    category: 'working_capital',
    unit: 'days',
    direction: 'lower_is_better',
    source: 'Working Capital Studies, Industry Benchmarks',
    maturityMapping: {
      1: 'DIO exceeds 100 days with excess inventory',
      2: 'DIO 70-100 days with basic inventory management',
      3: 'DIO 50-70 days with demand planning',
      4: 'DIO 35-50 days with advanced forecasting',
      5: 'DIO 25-35 days with just-in-time principles',
    },
  },
  {
    id: 'cash_conversion_cycle',
    name: 'Cash Conversion Cycle',
    category: 'working_capital',
    unit: 'days',
    direction: 'lower_is_better',
    source: 'Working Capital Studies, Hackett Group 2024',
    maturityMapping: {
      1: 'CCC exceeds 100 days with capital inefficiency',
      2: 'CCC 70-100 days with basic working capital focus',
      3: 'CCC 40-70 days with integrated management',
      4: 'CCC 20-40 days with optimized components',
      5: 'CCC 0-20 days with world-class working capital',
    },
  },
  {
    id: 'reports_automated_pct',
    name: 'Reporting Automation Rate',
    category: 'reporting',
    unit: '%',
    direction: 'higher_is_better',
    source: 'Hackett Group 2024, PwC Finance Benchmarking',
    maturityMapping: {
      1: 'Under 20% reports automated with manual processes',
      2: '20-35% reports automated with basic templates',
      3: '35-50% reports automated with scheduled generation',
      4: '60-75% reports automated with dynamic dashboards',
      5: '75-90% reports automated with AI-powered insights',
    },
  },
  {
    id: 'self_service_adoption_pct',
    name: 'Self-Service Analytics Adoption',
    category: 'reporting',
    unit: '%',
    direction: 'higher_is_better',
    source: 'Hackett Group 2024, Industry Studies',
    maturityMapping: {
      1: 'Under 15% self-service with IT-dependent reporting',
      2: '15-25% self-service with limited access',
      3: '25-40% self-service with structured tools',
      4: '50-70% self-service with business-led analytics',
      5: '70-85% self-service with data democratization',
    },
  },
];

// ============================================
// INDUSTRY ADJUSTMENT FACTORS
// ============================================

interface IndustryAdjustment {
  industryId: IndustryId;
  adjustments: Partial<Record<MetricId, {
    typicalMultiplier?: number;
    '1qg_good_multiplier'?: number;
    '1qg_best_multiplier'?: number;
    typicalOffset?: number;
    '1qg_good_offset'?: number;
    '1qg_best_offset'?: number;
  }>>;
}

const INDUSTRY_ADJUSTMENTS: IndustryAdjustment[] = [
  {
    industryId: 'cross_industry',
    adjustments: {},
  },
  {
    industryId: 'banking',
    adjustments: {
      days_to_close: { typicalMultiplier: 0.85, '1qg_good_multiplier': 0.85, '1qg_best_multiplier': 0.8 },
      finance_cost_pct_revenue: { typicalMultiplier: 1.1, '1qg_good_multiplier': 1.1 },
      finance_ftes_per_1b: { typicalMultiplier: 1.15, '1qg_good_multiplier': 1.1 },
      forecast_accuracy_pct: { typicalOffset: 1, '1qg_good_offset': 1 },
      dso_days: { typicalMultiplier: 0.7, '1qg_good_multiplier': 0.7 },
      reports_automated_pct: { typicalOffset: 5, '1qg_good_offset': 5 },
    },
  },
  {
    industryId: 'utilities',
    adjustments: {
      days_to_close: { typicalMultiplier: 1.1, '1qg_good_multiplier': 1.05 },
      budget_cycle_days: { typicalMultiplier: 1.15, '1qg_good_multiplier': 1.1 },
      dso_days: { typicalMultiplier: 0.8, '1qg_good_multiplier': 0.85 },
      dpo_days: { typicalMultiplier: 1.1, '1qg_good_multiplier': 1.05 },
    },
  },
  {
    industryId: 'manufacturing',
    adjustments: {
      dio_days: { typicalMultiplier: 1.3, '1qg_good_multiplier': 1.25, '1qg_best_multiplier': 1.2 },
      cash_conversion_cycle: { typicalMultiplier: 1.2, '1qg_good_multiplier': 1.15 },
      forecast_accuracy_pct: { typicalOffset: -2, '1qg_good_offset': -1 },
      dpo_days: { typicalMultiplier: 0.9, '1qg_good_multiplier': 0.95 },
    },
  },
  {
    industryId: 'retail',
    adjustments: {
      days_to_close: { typicalMultiplier: 0.9, '1qg_good_multiplier': 0.9 },
      dio_days: { typicalMultiplier: 0.85, '1qg_good_multiplier': 0.85 },
      dso_days: { typicalMultiplier: 0.6, '1qg_good_multiplier': 0.65 },
      forecast_accuracy_pct: { typicalOffset: -1, '1qg_good_offset': -1 },
      cash_conversion_cycle: { typicalMultiplier: 0.7, '1qg_good_multiplier': 0.75 },
    },
  },
  {
    industryId: 'software_saas',
    adjustments: {
      days_to_close: { typicalMultiplier: 0.8, '1qg_good_multiplier': 0.75, '1qg_best_multiplier': 0.7 },
      finance_cost_pct_revenue: { typicalMultiplier: 0.85, '1qg_good_multiplier': 0.85 },
      finance_ftes_per_1b: { typicalMultiplier: 0.75, '1qg_good_multiplier': 0.75 },
      reports_automated_pct: { typicalOffset: 10, '1qg_good_offset': 8, '1qg_best_offset': 5 },
      self_service_adoption_pct: { typicalOffset: 10, '1qg_good_offset': 8, '1qg_best_offset': 5 },
      forecast_cycle_days: { typicalMultiplier: 0.85, '1qg_good_multiplier': 0.85 },
      dio_days: { typicalMultiplier: 0.1, '1qg_good_multiplier': 0.1, '1qg_best_multiplier': 0.1 },
    },
  },
  {
    industryId: 'healthcare',
    adjustments: {
      dso_days: { typicalMultiplier: 1.4, '1qg_good_multiplier': 1.35, '1qg_best_multiplier': 1.3 },
      finance_cost_pct_revenue: { typicalMultiplier: 1.15, '1qg_good_multiplier': 1.1 },
      budget_cycle_days: { typicalMultiplier: 1.1, '1qg_good_multiplier': 1.05 },
      forecast_accuracy_pct: { typicalOffset: -1, '1qg_good_offset': -1 },
      cash_conversion_cycle: { typicalMultiplier: 1.25, '1qg_good_multiplier': 1.2 },
    },
  },
  {
    industryId: 'professional_services',
    adjustments: {
      days_to_close: { typicalMultiplier: 0.85, '1qg_good_multiplier': 0.85 },
      dso_days: { typicalMultiplier: 1.15, '1qg_good_multiplier': 1.1 },
      dio_days: { typicalMultiplier: 0.1, '1qg_good_multiplier': 0.1, '1qg_best_multiplier': 0.1 },
      finance_ftes_per_1b: { typicalMultiplier: 0.9, '1qg_good_multiplier': 0.9 },
      forecast_accuracy_pct: { typicalOffset: 2, '1qg_good_offset': 1 },
    },
  },
  {
    industryId: 'consumer_products',
    adjustments: {
      dio_days: { typicalMultiplier: 1.15, '1qg_good_multiplier': 1.1 },
      forecast_accuracy_pct: { typicalOffset: -2, '1qg_good_offset': -1 },
      dpo_days: { typicalMultiplier: 1.05, '1qg_good_multiplier': 1.05 },
      cash_conversion_cycle: { typicalMultiplier: 1.1, '1qg_good_multiplier': 1.05 },
    },
  },
  {
    industryId: 'distribution_transport',
    adjustments: {
      dio_days: { typicalMultiplier: 0.7, '1qg_good_multiplier': 0.75 },
      dso_days: { typicalMultiplier: 0.9, '1qg_good_multiplier': 0.9 },
      cash_conversion_cycle: { typicalMultiplier: 0.85, '1qg_good_multiplier': 0.85 },
      forecast_cycle_days: { typicalMultiplier: 1.1, '1qg_good_multiplier': 1.05 },
      forecast_accuracy_pct: { typicalOffset: -1 },
    },
  },
];

// ============================================
// YEAR-OVER-YEAR IMPROVEMENT TRENDS
// ============================================

interface YearlyTrendFactor {
  metricId: MetricId;
  yearlyImprovementRate: number;
  improvementAcceleration: number;
}

const YEARLY_TREND_FACTORS: YearlyTrendFactor[] = [
  { metricId: 'finance_cost_pct_revenue', yearlyImprovementRate: 0.02, improvementAcceleration: 0.005 },
  { metricId: 'finance_ftes_per_1b', yearlyImprovementRate: 0.025, improvementAcceleration: 0.008 },
  { metricId: 'days_to_close', yearlyImprovementRate: 0.04, improvementAcceleration: 0.01 },
  { metricId: 'budget_cycle_days', yearlyImprovementRate: 0.03, improvementAcceleration: 0.005 },
  { metricId: 'forecast_cycle_days', yearlyImprovementRate: 0.045, improvementAcceleration: 0.012 },
  { metricId: 'forecast_accuracy_pct', yearlyImprovementRate: 0.008, improvementAcceleration: 0.002 },
  { metricId: 'plan_variance_pct', yearlyImprovementRate: 0.035, improvementAcceleration: 0.008 },
  { metricId: 'dso_days', yearlyImprovementRate: 0.02, improvementAcceleration: 0.004 },
  { metricId: 'dpo_days', yearlyImprovementRate: 0.015, improvementAcceleration: 0.003 },
  { metricId: 'dio_days', yearlyImprovementRate: 0.025, improvementAcceleration: 0.006 },
  { metricId: 'cash_conversion_cycle', yearlyImprovementRate: 0.03, improvementAcceleration: 0.007 },
  { metricId: 'reports_automated_pct', yearlyImprovementRate: 0.06, improvementAcceleration: 0.015 },
  { metricId: 'self_service_adoption_pct', yearlyImprovementRate: 0.07, improvementAcceleration: 0.018 },
];

// ============================================
// BASE BENCHMARK VALUES (2024 Cross-Industry)
// ============================================

interface BaseBenchmarkValues {
  typical: { min: number; max: number; median: number };
  '1qg_good': { min: number; max: number };
  '1qg_best': { min: number; max: number };
}

const BASE_2024_VALUES: Record<MetricId, BaseBenchmarkValues> = {
  finance_cost_pct_revenue: {
    typical: { min: 1.4, max: 1.5, median: 1.45 },
    '1qg_good': { min: 0.6, max: 0.9 },
    '1qg_best': { min: 0.4, max: 0.6 },
  },
  finance_ftes_per_1b: {
    typical: { min: 800, max: 1000, median: 900 },
    '1qg_good': { min: 400, max: 600 },
    '1qg_best': { min: 300, max: 400 },
  },
  days_to_close: {
    typical: { min: 8, max: 12, median: 10 },
    '1qg_good': { min: 5, max: 7 },
    '1qg_best': { min: 3, max: 5 },
  },
  budget_cycle_days: {
    typical: { min: 110, max: 130, median: 120 },
    '1qg_good': { min: 60, max: 90 },
    '1qg_best': { min: 30, max: 60 },
  },
  forecast_cycle_days: {
    typical: { min: 19, max: 30, median: 24 },
    '1qg_good': { min: 10, max: 15 },
    '1qg_best': { min: 5, max: 10 },
  },
  forecast_accuracy_pct: {
    typical: { min: 87, max: 88, median: 87.5 },
    '1qg_good': { min: 90, max: 93 },
    '1qg_best': { min: 95, max: 98 },
  },
  plan_variance_pct: {
    typical: { min: 15, max: 25, median: 20 },
    '1qg_good': { min: 3, max: 5 },
    '1qg_best': { min: 1, max: 3 },
  },
  dso_days: {
    typical: { min: 35, max: 55, median: 45 },
    '1qg_good': { min: 25, max: 35 },
    '1qg_best': { min: 18, max: 25 },
  },
  dpo_days: {
    typical: { min: 35, max: 45, median: 40 },
    '1qg_good': { min: 55, max: 75 },
    '1qg_best': { min: 75, max: 90 },
  },
  dio_days: {
    typical: { min: 45, max: 90, median: 67 },
    '1qg_good': { min: 25, max: 35 },
    '1qg_best': { min: 15, max: 25 },
  },
  cash_conversion_cycle: {
    typical: { min: 40, max: 90, median: 65 },
    '1qg_good': { min: 0, max: 20 },
    '1qg_best': { min: -15, max: 0 },
  },
  reports_automated_pct: {
    typical: { min: 20, max: 40, median: 30 },
    '1qg_good': { min: 70, max: 85 },
    '1qg_best': { min: 85, max: 95 },
  },
  self_service_adoption_pct: {
    typical: { min: 20, max: 30, median: 25 },
    '1qg_good': { min: 70, max: 80 },
    '1qg_best': { min: 80, max: 92 },
  },
};

// ============================================
// SAMPLE SIZE DATA
// ============================================

const SAMPLE_SIZES: Record<MetricId, number> = {
  finance_cost_pct_revenue: 847,
  finance_ftes_per_1b: 756,
  days_to_close: 1203,
  budget_cycle_days: 634,
  forecast_cycle_days: 892,
  forecast_accuracy_pct: 1156,
  plan_variance_pct: 723,
  dso_days: 1089,
  dpo_days: 945,
  dio_days: 678,
  cash_conversion_cycle: 812,
  reports_automated_pct: 567,
  self_service_adoption_pct: 489,
};

// ============================================
// BENCHMARK GENERATION FUNCTIONS
// ============================================

function applyYearAdjustment(
  baseValues: BaseBenchmarkValues,
  metricId: MetricId,
  year: BenchmarkYear,
  direction: 'lower_is_better' | 'higher_is_better'
): BaseBenchmarkValues {
  const trendFactor = YEARLY_TREND_FACTORS.find(t => t.metricId === metricId);
  if (!trendFactor) return baseValues;

  const yearsFromBase = 2024 - year;
  const cumulativeRate = trendFactor.yearlyImprovementRate * yearsFromBase +
    (trendFactor.improvementAcceleration * yearsFromBase * (yearsFromBase - 1)) / 2;

  const adjustValue = (value: number): number => {
    if (direction === 'lower_is_better') {
      return value * (1 + cumulativeRate);
    } else {
      return value * (1 - cumulativeRate * 0.5);
    }
  };

  return {
    typical: {
      min: adjustValue(baseValues.typical.min),
      max: adjustValue(baseValues.typical.max),
      median: adjustValue(baseValues.typical.median),
    },
    '1qg_good': {
      min: adjustValue(baseValues['1qg_good'].min),
      max: adjustValue(baseValues['1qg_good'].max),
    },
    '1qg_best': {
      min: adjustValue(baseValues['1qg_best'].min),
      max: adjustValue(baseValues['1qg_best'].max),
    },
  };
}

function applyIndustryAdjustment(
  values: BaseBenchmarkValues,
  metricId: MetricId,
  industryId: IndustryId,
  direction: 'lower_is_better' | 'higher_is_better'
): BaseBenchmarkValues {
  const industryAdj = INDUSTRY_ADJUSTMENTS.find(i => i.industryId === industryId);
  if (!industryAdj || !industryAdj.adjustments[metricId]) return values;

  const adj = industryAdj.adjustments[metricId]!;

  const applyAdj = (value: number, multiplier?: number, offset?: number): number => {
    let result = value;
    if (multiplier !== undefined) result *= multiplier;
    if (offset !== undefined) {
      if (direction === 'higher_is_better') {
        result += offset;
      } else {
        result += offset;
      }
    }
    return result;
  };

  return {
    typical: {
      min: applyAdj(values.typical.min, adj.typicalMultiplier, adj.typicalOffset),
      max: applyAdj(values.typical.max, adj.typicalMultiplier, adj.typicalOffset),
      median: applyAdj(values.typical.median, adj.typicalMultiplier, adj.typicalOffset),
    },
    '1qg_good': {
      min: applyAdj(values['1qg_good'].min, adj['1qg_good_multiplier'], adj['1qg_good_offset']),
      max: applyAdj(values['1qg_good'].max, adj['1qg_good_multiplier'], adj['1qg_good_offset']),
    },
    '1qg_best': {
      min: applyAdj(values['1qg_best'].min, adj['1qg_best_multiplier'], adj['1qg_best_offset']),
      max: applyAdj(values['1qg_best'].max, adj['1qg_best_multiplier'], adj['1qg_best_offset']),
    },
  };
}

function roundValue(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function roundBenchmarkValues(values: BaseBenchmarkValues, decimals: number = 1): BaseBenchmarkValues {
  return {
    typical: {
      min: roundValue(values.typical.min, decimals),
      max: roundValue(values.typical.max, decimals),
      median: roundValue(values.typical.median, decimals),
    },
    '1qg_good': {
      min: roundValue(values['1qg_good'].min, decimals),
      max: roundValue(values['1qg_good'].max, decimals),
    },
    '1qg_best': {
      min: roundValue(values['1qg_best'].min, decimals),
      max: roundValue(values['1qg_best'].max, decimals),
    },
  };
}

function generateMetricData(
  metricId: MetricId,
  industryId: IndustryId,
  year: BenchmarkYear
): BenchmarkMetricData {
  const baseDef = BASE_METRIC_DEFINITIONS.find(m => m.id === metricId)!;
  const baseValues = BASE_2024_VALUES[metricId];

  let adjustedValues = applyYearAdjustment(baseValues, metricId, year, baseDef.direction);
  adjustedValues = applyIndustryAdjustment(adjustedValues, metricId, industryId, baseDef.direction);
  adjustedValues = roundBenchmarkValues(adjustedValues);

  const yearOffset = Math.floor((2024 - year) * 0.08);
  const sampleSize = Math.max(100, SAMPLE_SIZES[metricId] - yearOffset * 50);

  return {
    metricId: baseDef.id,
    metricName: baseDef.name,
    unit: baseDef.unit,
    direction: baseDef.direction,
    typical: adjustedValues.typical,
    '1qg_good': adjustedValues['1qg_good'],
    '1qg_best': adjustedValues['1qg_best'],
    maturityMapping: baseDef.maturityMapping,
    source: baseDef.source,
    sampleSize,
  };
}

// ============================================
// HISTORICAL BENCHMARK DATA STORE
// ============================================

const HISTORICAL_BENCHMARKS: HistoricalBenchmark[] = [];

function initializeHistoricalBenchmarks(): void {
  if (HISTORICAL_BENCHMARKS.length > 0) return;

  for (const year of BENCHMARK_YEARS) {
    for (const industryId of INDUSTRY_IDS) {
      const metrics: Record<string, BenchmarkMetricData> = {};

      for (const metricId of METRIC_IDS) {
        metrics[metricId] = generateMetricData(metricId, industryId, year);
      }

      HISTORICAL_BENCHMARKS.push({
        year,
        industryId,
        metrics,
      });
    }
  }
}

initializeHistoricalBenchmarks();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get historical benchmark data for a specific industry, year, and metric
 */
export function getHistoricalBenchmark(
  industryId: IndustryId,
  year: BenchmarkYear,
  metricId: MetricId
): BenchmarkMetricData | null {
  const benchmark = HISTORICAL_BENCHMARKS.find(
    b => b.industryId === industryId && b.year === year
  );

  if (!benchmark) return null;
  return benchmark.metrics[metricId] || null;
}

/**
 * Get trend data for a specific industry and metric over a year range
 */
export function getIndustryTrend(
  industryId: IndustryId,
  metricId: MetricId,
  startYear: BenchmarkYear,
  endYear: BenchmarkYear
): IndustryTrend | null {
  const baseDef = BASE_METRIC_DEFINITIONS.find(m => m.id === metricId);
  if (!baseDef) return null;

  const dataPoints: IndustryTrend['dataPoints'] = [];
  const years = BENCHMARK_YEARS.filter(y => y >= startYear && y <= endYear);

  for (const year of years) {
    const metric = getHistoricalBenchmark(industryId, year, metricId);
    if (metric) {
      dataPoints.push({
        year,
        typical: metric.typical,
        '1qg_good': metric['1qg_good'],
        '1qg_best': metric['1qg_best'],
      });
    }
  }

  if (dataPoints.length < 2) return null;

  const firstMedian = dataPoints[0].typical.median;
  const lastMedian = dataPoints[dataPoints.length - 1].typical.median;
  const yearSpan = endYear - startYear;

  let overallTrend: 'improving' | 'stable' | 'declining';
  const changePercent = ((lastMedian - firstMedian) / firstMedian) * 100;

  if (baseDef.direction === 'lower_is_better') {
    if (changePercent < -5) overallTrend = 'improving';
    else if (changePercent > 5) overallTrend = 'declining';
    else overallTrend = 'stable';
  } else {
    if (changePercent > 5) overallTrend = 'improving';
    else if (changePercent < -5) overallTrend = 'declining';
    else overallTrend = 'stable';
  }

  const cagr = yearSpan > 0 
    ? (Math.pow(lastMedian / firstMedian, 1 / yearSpan) - 1) * 100
    : 0;

  return {
    industryId,
    metricId,
    metricName: baseDef.name,
    startYear,
    endYear,
    dataPoints,
    overallTrend,
    cagr: roundValue(cagr, 2),
  };
}

/**
 * Get year-over-year comparison for a specific industry and metric
 */
export function getYearOverYearComparison(
  industryId: IndustryId,
  metricId: MetricId
): YearOverYearChange[] {
  const baseDef = BASE_METRIC_DEFINITIONS.find(m => m.id === metricId);
  if (!baseDef) return [];

  const changes: YearOverYearChange[] = [];

  for (let i = 1; i < BENCHMARK_YEARS.length; i++) {
    const currentYear = BENCHMARK_YEARS[i];
    const previousYear = BENCHMARK_YEARS[i - 1];

    const currentMetric = getHistoricalBenchmark(industryId, currentYear, metricId);
    const previousMetric = getHistoricalBenchmark(industryId, previousYear, metricId);

    if (!currentMetric || !previousMetric) continue;

    const typicalChange = roundValue(
      ((currentMetric.typical.median - previousMetric.typical.median) / previousMetric.typical.median) * 100,
      2
    );

    const currentGoodMid = (currentMetric['1qg_good'].min + currentMetric['1qg_good'].max) / 2;
    const previousGoodMid = (previousMetric['1qg_good'].min + previousMetric['1qg_good'].max) / 2;
    const goodChange = roundValue(
      ((currentGoodMid - previousGoodMid) / previousGoodMid) * 100,
      2
    );

    const currentBestMid = (currentMetric['1qg_best'].min + currentMetric['1qg_best'].max) / 2;
    const previousBestMid = (previousMetric['1qg_best'].min + previousMetric['1qg_best'].max) / 2;
    const bestChange = roundValue(
      ((currentBestMid - previousBestMid) / previousBestMid) * 100,
      2
    );

    let improvementIndicator: 'improved' | 'stable' | 'declined';
    if (baseDef.direction === 'lower_is_better') {
      if (typicalChange < -2) improvementIndicator = 'improved';
      else if (typicalChange > 2) improvementIndicator = 'declined';
      else improvementIndicator = 'stable';
    } else {
      if (typicalChange > 2) improvementIndicator = 'improved';
      else if (typicalChange < -2) improvementIndicator = 'declined';
      else improvementIndicator = 'stable';
    }

    changes.push({
      metricId,
      metricName: baseDef.name,
      year: currentYear,
      previousYear,
      typicalChange,
      '1qg_good_change': goodChange,
      '1qg_best_change': bestChange,
      direction: baseDef.direction,
      improvementIndicator,
    });
  }

  return changes;
}

/**
 * Get all historical benchmarks for a specific industry
 */
export function getIndustryHistoricalBenchmarks(industryId: IndustryId): HistoricalBenchmark[] {
  return HISTORICAL_BENCHMARKS.filter(b => b.industryId === industryId);
}

/**
 * Get all historical benchmarks for a specific year
 */
export function getYearBenchmarks(year: BenchmarkYear): HistoricalBenchmark[] {
  return HISTORICAL_BENCHMARKS.filter(b => b.year === year);
}

/**
 * Get all historical benchmarks
 */
export function getAllHistoricalBenchmarks(): HistoricalBenchmark[] {
  return [...HISTORICAL_BENCHMARKS];
}

/**
 * Get metric definition by ID
 */
export function getMetricDefinition(metricId: MetricId): BaseMetricDefinition | undefined {
  return BASE_METRIC_DEFINITIONS.find(m => m.id === metricId);
}

/**
 * Get all metric definitions
 */
export function getAllMetricDefinitions(): BaseMetricDefinition[] {
  return [...BASE_METRIC_DEFINITIONS];
}

/**
 * Get maturity level for a given metric value
 */
export function getMaturityLevel(
  metricId: MetricId,
  value: number,
  industryId: IndustryId = 'cross_industry',
  year: BenchmarkYear = 2024
): 1 | 2 | 3 | 4 | 5 {
  const benchmark = getHistoricalBenchmark(industryId, year, metricId);
  if (!benchmark) return 3;

  const { typical, direction } = benchmark;
  const good = benchmark['1qg_good'];
  const best = benchmark['1qg_best'];

  if (direction === 'lower_is_better') {
    if (value <= best.max) return 5;
    if (value <= good.max) return 4;
    if (value <= typical.max) return 3;
    if (value <= typical.max * 1.25) return 2;
    return 1;
  } else {
    if (value >= best.min) return 5;
    if (value >= good.min) return 4;
    if (value >= typical.min) return 3;
    if (value >= typical.min * 0.75) return 2;
    return 1;
  }
}

/**
 * Format benchmark value for display
 */
export function formatBenchmarkValue(
  value: number,
  unit: string,
  includeUnit: boolean = true
): string {
  let formatted: string;

  if (unit === '%') {
    formatted = `${value.toFixed(1)}`;
  } else if (unit === 'days') {
    formatted = `${Math.round(value)}`;
  } else if (unit === 'FTEs') {
    formatted = Math.round(value).toLocaleString();
  } else {
    formatted = value.toFixed(1);
  }

  return includeUnit ? `${formatted}${unit === '%' ? '%' : ` ${unit}`}` : formatted;
}

/**
 * Get tier classification for a value
 */
export function getTierClassification(
  metricId: MetricId,
  value: number,
  industryId: IndustryId = 'cross_industry',
  year: BenchmarkYear = 2024
): OneQGTier {
  const benchmark = getHistoricalBenchmark(industryId, year, metricId);
  if (!benchmark) return 'typical';

  const { direction } = benchmark;
  const good = benchmark['1qg_good'];
  const best = benchmark['1qg_best'];

  if (direction === 'lower_is_better') {
    if (value <= best.max) return '1qg_best';
    if (value <= good.max) return '1qg_good';
    return 'typical';
  } else {
    if (value >= best.min) return '1qg_best';
    if (value >= good.min) return '1qg_good';
    return 'typical';
  }
}

/**
 * Calculate gap to next tier
 */
export function calculateGapToNextTier(
  metricId: MetricId,
  currentValue: number,
  industryId: IndustryId = 'cross_industry',
  year: BenchmarkYear = 2024
): { currentTier: OneQGTier; nextTier: OneQGTier | null; gap: number; gapPercent: number } | null {
  const benchmark = getHistoricalBenchmark(industryId, year, metricId);
  if (!benchmark) return null;

  const currentTier = getTierClassification(metricId, currentValue, industryId, year);
  const { direction } = benchmark;
  const good = benchmark['1qg_good'];
  const best = benchmark['1qg_best'];

  let nextTier: OneQGTier | null = null;
  let targetValue: number = 0;

  if (currentTier === 'typical') {
    nextTier = '1qg_good';
    targetValue = direction === 'lower_is_better' ? good.max : good.min;
  } else if (currentTier === '1qg_good') {
    nextTier = '1qg_best';
    targetValue = direction === 'lower_is_better' ? best.max : best.min;
  }

  if (!nextTier) {
    return { currentTier, nextTier: null, gap: 0, gapPercent: 0 };
  }

  const gap = direction === 'lower_is_better'
    ? currentValue - targetValue
    : targetValue - currentValue;

  const gapPercent = (gap / currentValue) * 100;

  return {
    currentTier,
    nextTier,
    gap: roundValue(gap, 2),
    gapPercent: roundValue(gapPercent, 1),
  };
}
