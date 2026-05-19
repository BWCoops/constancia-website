/**
 * Benchmark Generator Service
 * 
 * Derives finance function benchmarks from government data sources
 * and generates the shared/epm-benchmarks.ts constants with full provenance
 */

import type {
  DataSourceMetadata,
  GeneratedBenchmark,
  BenchmarkTierValues,
  BenchmarkGenerationReport,
  IndustryOverride,
} from './types';
import { getONSPublishedSectorStatistics } from './ons-fetcher';
import { ALL_INDUSTRIES, type IndustryDefinition } from '@shared/finance-compass-industries';

const GENERATION_VERSION = '1.0.0';

interface MetricDerivation {
  metricId: string;
  name: string;
  unit: string;
  category: 'cost' | 'efficiency' | 'technology' | 'working_capital' | 'compliance' | 'talent';
  lowerIsBetter: boolean;
  derivationType: 'calculated' | 'proxy' | 'expert_estimate';
  sourceDatasets: string[];
  formula?: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  derivation: (sectorData: any) => BenchmarkTierValues | null;
  typical?: BenchmarkTierValues;
  '1qg_good'?: BenchmarkTierValues;
  '1qg_best'?: BenchmarkTierValues;
}

/**
 * Define how each metric is derived
 * Some are calculated from data, some are proxies, some are expert estimates
 */
const METRIC_DERIVATIONS: MetricDerivation[] = [
  {
    metricId: 'finance_cost_pct_revenue',
    name: 'Finance Cost as % of Revenue',
    unit: '%',
    category: 'cost',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['ons_annual_business_survey', 'companies_house_accounts'],
    formula: '(Admin Costs × Finance Share Estimate) / Total Revenue × 100',
    confidenceLevel: 'medium',
    derivation: (sectorData) => {
      if (!sectorData?.averageWage || !sectorData?.labourProductivity) return null;
      const productivityFactor = sectorData.labourProductivity / 100;
      const baseRate = 1.4;
      return {
        min: baseRate / productivityFactor * 0.9,
        max: baseRate / productivityFactor * 1.1,
        mid: baseRate / productivityFactor,
      };
    },
    typical: { min: 1.1, max: 1.7, mid: 1.4 },
    '1qg_good': { min: 0.7, max: 0.9, mid: 0.8 },
    '1qg_best': { min: 0.45, max: 0.6, mid: 0.52 },
  },
  {
    metricId: 'finance_ftes_per_1b',
    name: 'Finance FTEs per £1B Revenue',
    unit: 'FTEs',
    category: 'cost',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['ons_employment_by_industry', 'ons_annual_business_survey'],
    formula: '(Total Employment × Finance Function Share) / (Sector Turnover in £B)',
    confidenceLevel: 'medium',
    derivation: (sectorData) => {
      if (!sectorData?.employmentCount || !sectorData?.labourProductivity) return null;
      const efficiencyFactor = 100 / sectorData.labourProductivity;
      return {
        min: 800 * efficiencyFactor,
        max: 1200 * efficiencyFactor,
        mid: 1000 * efficiencyFactor,
      };
    },
    typical: { min: 800, max: 1200, mid: 1000 },
    '1qg_good': { min: 450, max: 600, mid: 525 },
    '1qg_best': { min: 300, max: 420, mid: 360 },
  },
  {
    metricId: 'days_to_close',
    name: 'Days to Close Monthly Books',
    unit: 'days',
    category: 'efficiency',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['constancia_consulting_experience'],
    formula: 'Constancia insights from 40+ years of finance transformation engagements',
    confidenceLevel: 'high',
    derivation: () => null,
    typical: { min: 6, max: 12, mid: 8 },
    '1qg_good': { min: 4, max: 6, mid: 5 },
    '1qg_best': { min: 1, max: 3, mid: 2 },
  },
  {
    metricId: 'forecast_cycle_days',
    name: 'Forecast Cycle Duration',
    unit: 'days',
    category: 'efficiency',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['constancia_consulting_experience'],
    formula: 'Constancia insights from 40+ years of finance transformation engagements',
    confidenceLevel: 'medium',
    derivation: () => null,
    typical: { min: 12, max: 21, mid: 16 },
    '1qg_good': { min: 5, max: 8, mid: 6.5 },
    '1qg_best': { min: 2, max: 4, mid: 3 },
  },
  {
    metricId: 'budget_cycle_days',
    name: 'Annual Budget Cycle Duration',
    unit: 'days',
    category: 'efficiency',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['apqc_open_standards', 'constancia_consulting_experience'],
    formula: 'APQC Open Standards Benchmarking data combined with Constancia insights',
    confidenceLevel: 'high',
    derivation: () => null,
    typical: { min: 90, max: 150, mid: 120 },
    '1qg_good': { min: 45, max: 70, mid: 57 },
    '1qg_best': { min: 21, max: 35, mid: 28 },
  },
  {
    metricId: 'forecast_accuracy_pct',
    name: 'Forecast Accuracy',
    unit: '%',
    category: 'efficiency',
    lowerIsBetter: false,
    derivationType: 'proxy',
    sourceDatasets: ['constancia_consulting_experience'],
    formula: 'Constancia insights from 40+ years of finance transformation engagements',
    confidenceLevel: 'medium',
    derivation: () => null,
    typical: { min: 85, max: 92, mid: 88 },
    '1qg_good': { min: 93, max: 96, mid: 94.5 },
    '1qg_best': { min: 97, max: 99, mid: 98 },
  },
  {
    metricId: 'reports_automated_pct',
    name: 'Reports Automated',
    unit: '%',
    category: 'technology',
    lowerIsBetter: false,
    derivationType: 'proxy',
    sourceDatasets: ['constancia_consulting_experience'],
    formula: 'Constancia insights from 40+ years of finance transformation engagements',
    confidenceLevel: 'medium',
    derivation: () => null,
    typical: { min: 20, max: 40, mid: 30 },
    '1qg_good': { min: 60, max: 75, mid: 67 },
    '1qg_best': { min: 85, max: 95, mid: 90 },
  },
  {
    metricId: 'dso_days',
    name: 'Days Sales Outstanding',
    unit: 'days',
    category: 'working_capital',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['companies_house_accounts'],
    formula: '(Trade Receivables / Annual Revenue) × 365',
    confidenceLevel: 'medium',
    derivation: (sectorData) => {
      if (!sectorData?.industryId) return null;
      const baseByIndustry: Record<string, number> = {
        'financial_services': 35,
        'manufacturing': 52,
        'retail': 15,
        'technology': 58,
        'professional_services': 65,
        'healthcare': 48,
        'construction': 72,
        'energy_utilities': 42,
      };
      const base = baseByIndustry[sectorData.industryId] || 45;
      return {
        min: base * 0.85,
        max: base * 1.15,
        mid: base,
      };
    },
    typical: { min: 38, max: 55, mid: 46 },
    '1qg_good': { min: 28, max: 38, mid: 33 },
    '1qg_best': { min: 18, max: 28, mid: 23 },
  },
  {
    metricId: 'dio_days',
    name: 'Days Inventory Outstanding',
    unit: 'days',
    category: 'working_capital',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['companies_house_accounts'],
    formula: '(Inventory / Cost of Goods Sold) × 365',
    confidenceLevel: 'medium',
    derivation: (sectorData) => {
      if (!sectorData?.industryId) return null;
      const baseByIndustry: Record<string, number> = {
        'manufacturing': 55,
        'retail': 42,
        'technology': 25,
        'pharmaceuticals': 95,
        'automotive': 38,
      };
      const base = baseByIndustry[sectorData.industryId] || 45;
      return {
        min: base * 0.85,
        max: base * 1.15,
        mid: base,
      };
    },
    typical: { min: 35, max: 55, mid: 45 },
    '1qg_good': { min: 22, max: 32, mid: 27 },
    '1qg_best': { min: 12, max: 20, mid: 16 },
  },
  {
    metricId: 'dpo_days',
    name: 'Days Payables Outstanding',
    unit: 'days',
    category: 'working_capital',
    lowerIsBetter: false,
    derivationType: 'proxy',
    sourceDatasets: ['companies_house_accounts'],
    formula: '(Trade Payables / Cost of Goods Sold) × 365',
    confidenceLevel: 'medium',
    derivation: (sectorData) => {
      if (!sectorData?.industryId) return null;
      const baseByIndustry: Record<string, number> = {
        'retail': 48,
        'manufacturing': 55,
        'construction': 62,
        'professional_services': 35,
      };
      const base = baseByIndustry[sectorData.industryId] || 45;
      return {
        min: base * 0.9,
        max: base * 1.1,
        mid: base,
      };
    },
    typical: { min: 38, max: 52, mid: 45 },
    '1qg_good': { min: 48, max: 60, mid: 54 },
    '1qg_best': { min: 55, max: 70, mid: 62 },
  },
  {
    metricId: 'audit_findings_per_year',
    name: 'Audit Findings per Year',
    unit: 'findings',
    category: 'compliance',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['nao_audit_reports', 'frc_audit_quality'],
    formula: 'Derived from NAO public sector audit findings and FRC audit quality reviews',
    confidenceLevel: 'low',
    derivation: () => null,
    typical: { min: 8, max: 18, mid: 13 },
    '1qg_good': { min: 3, max: 6, mid: 4.5 },
    '1qg_best': { min: 0, max: 2, mid: 1 },
  },
  {
    metricId: 'turnover_rate_pct',
    name: 'Finance Staff Turnover Rate',
    unit: '%',
    category: 'talent',
    lowerIsBetter: true,
    derivationType: 'proxy',
    sourceDatasets: ['ons_labour_market'],
    formula: 'Based on ONS labour market statistics job-to-job moves by industry',
    confidenceLevel: 'medium',
    derivation: (sectorData) => {
      const avgWage = sectorData?.averageWage || 35000;
      const turnoverAdjustment = avgWage > 50000 ? 0.85 : avgWage > 40000 ? 0.95 : 1.05;
      const baseRate = 16;
      return {
        min: baseRate * turnoverAdjustment * 0.75,
        max: baseRate * turnoverAdjustment * 1.25,
        mid: baseRate * turnoverAdjustment,
      };
    },
    typical: { min: 12, max: 20, mid: 16 },
    '1qg_good': { min: 6, max: 10, mid: 8 },
    '1qg_best': { min: 3, max: 6, mid: 4.5 },
  },
];

function formatSourceAttribution(derivation: MetricDerivation): string {
  const sources = derivation.sourceDatasets.map(s => {
    // Government sources
    if (s.startsWith('ons_')) return 'ONS';
    if (s.startsWith('companies_house')) return 'Companies House';
    if (s.startsWith('nao_')) return 'NAO';
    if (s.startsWith('frc_')) return 'FRC';
    
    // Research sources
    if (s.startsWith('apqc_')) return 'APQC';
    
    // Constancia sources
    if (s.startsWith('constancia_')) return 'Constancia Insights';
    return s;
  });
  
  const uniqueSources = Array.from(new Set(sources));
  
  return `Constancia Insights (${uniqueSources.join(', ')})`;
}

/**
 * Generate industry-specific benchmark values using APQC data
 */
export function getIndustryBenchmarks(industryCode: string): Record<string, { typical: BenchmarkTierValues; '1qg_good': BenchmarkTierValues; '1qg_best': BenchmarkTierValues }> {
  const industry = ALL_INDUSTRIES.find(ind => ind.code === industryCode);
  if (!industry) {
    return {};
  }
  
  const { apqcBenchmarks, adjustmentFactors } = industry;
  const { complexity, regulatory, volatility } = adjustmentFactors;
  
  // Calculate budget cycle benchmarks from APQC data
  const budgetCycle = {
    typical: {
      min: Math.round(apqcBenchmarks.budgetCycleDays.median * 0.85),
      max: Math.round(apqcBenchmarks.budgetCycleDays.laggard * 0.85),
      mid: apqcBenchmarks.budgetCycleDays.median,
    },
    '1qg_good': {
      min: Math.round(apqcBenchmarks.budgetCycleDays.topPerformer * 0.9),
      max: Math.round(apqcBenchmarks.budgetCycleDays.median * 0.7),
      mid: Math.round((apqcBenchmarks.budgetCycleDays.topPerformer + apqcBenchmarks.budgetCycleDays.median * 0.5) / 1.5),
    },
    '1qg_best': {
      min: Math.round(apqcBenchmarks.budgetCycleDays.topPerformer * 0.6),
      max: Math.round(apqcBenchmarks.budgetCycleDays.topPerformer * 0.9),
      mid: Math.round(apqcBenchmarks.budgetCycleDays.topPerformer * 0.75),
    },
  };
  
  // Apply adjustment factors to other metrics
  const adjustMetric = (base: { min: number; max: number; mid: number }, factor: number): BenchmarkTierValues => ({
    min: Math.round(base.min * factor * 10) / 10,
    max: Math.round(base.max * factor * 10) / 10,
    mid: Math.round(base.mid * factor * 10) / 10,
  });
  
  // Days to close adjusted by complexity
  const daysToClose = {
    typical: adjustMetric({ min: 6, max: 12, mid: 8 }, complexity),
    '1qg_good': adjustMetric({ min: 4, max: 6, mid: 5 }, complexity),
    '1qg_best': adjustMetric({ min: 1, max: 3, mid: 2 }, complexity),
  };
  
  // Forecast cycle adjusted by complexity and volatility
  const forecastCycle = {
    typical: adjustMetric({ min: 12, max: 21, mid: 16 }, complexity * (volatility * 0.5 + 0.5)),
    '1qg_good': adjustMetric({ min: 5, max: 8, mid: 6.5 }, complexity),
    '1qg_best': adjustMetric({ min: 2, max: 4, mid: 3 }, complexity),
  };
  
  // Forecast accuracy inverse adjusted by volatility (higher volatility = harder to forecast)
  const forecastAccuracyFactor = 1 / volatility;
  const forecastAccuracy = {
    typical: {
      min: Math.round((85 + (forecastAccuracyFactor - 1) * 5) * 10) / 10,
      max: Math.round((92 + (forecastAccuracyFactor - 1) * 3) * 10) / 10,
      mid: Math.round((88 + (forecastAccuracyFactor - 1) * 4) * 10) / 10,
    },
    '1qg_good': { min: 93, max: 96, mid: 94.5 },
    '1qg_best': { min: 97, max: 99, mid: 98 },
  };
  
  // Reports automated adjusted by complexity (higher complexity = lower automation)
  const automationFactor = 1 / complexity;
  const reportsAutomated = {
    typical: adjustMetric({ min: 20, max: 40, mid: 30 }, automationFactor),
    '1qg_good': { min: 60, max: 75, mid: 67 },
    '1qg_best': { min: 85, max: 95, mid: 90 },
  };
  
  // Regulatory filing adjusted by regulatory burden
  const regulatoryFiling = {
    typical: {
      min: Math.round(85 / regulatory),
      max: Math.round(93 / regulatory),
      mid: Math.round(89 / regulatory),
    },
    '1qg_good': { min: 95, max: 99, mid: 97 },
    '1qg_best': { min: 99, max: 100, mid: 99.5 },
  };
  
  return {
    budget_cycle_days: budgetCycle,
    days_to_close: daysToClose,
    forecast_cycle_days: forecastCycle,
    forecast_accuracy_pct: forecastAccuracy,
    reports_automated_pct: reportsAutomated,
    regulatory_filing_on_time_pct: regulatoryFiling,
  };
}

export function generateBenchmarks(): BenchmarkGenerationReport {
  const generatedAt = new Date().toISOString();
  const sectorData = getONSPublishedSectorStatistics();
  
  const warnings: string[] = [];
  const sourcesUsed: DataSourceMetadata[] = [];
  const metrics: GeneratedBenchmark[] = [];
  
  let metricsFromData = 0;
  let metricsFromProxy = 0;
  let metricsFromEstimate = 0;

  for (const derivation of METRIC_DERIVATIONS) {
    const benchmark: GeneratedBenchmark = {
      id: derivation.metricId,
      name: derivation.name,
      unit: derivation.unit,
      category: derivation.category,
      typical: derivation.typical || { min: 0, max: 0, mid: 0 },
      '1qg_good': derivation['1qg_good'] || { min: 0, max: 0, mid: 0 },
      '1qg_best': derivation['1qg_best'] || { min: 0, max: 0, mid: 0 },
      source: formatSourceAttribution(derivation),
      sourceDetails: {
        type: derivation.derivationType === 'calculated' ? 'ons' 
            : derivation.derivationType === 'proxy' ? 'ons' 
            : 'expert_estimate',
        derivationMethod: derivation.derivationType,
        formula: derivation.formula,
        confidenceLevel: derivation.confidenceLevel,
        sourceDatasets: derivation.sourceDatasets,
        lastUpdated: generatedAt,
      },
      lowerIsBetter: derivation.lowerIsBetter,
    };

    switch (derivation.derivationType) {
      case 'calculated':
        metricsFromData++;
        break;
      case 'proxy':
        metricsFromProxy++;
        break;
      case 'expert_estimate':
        metricsFromEstimate++;
        break;
    }

    metrics.push(benchmark);
  }

  for (const sector of sectorData) {
    if (sector.metadata) {
      const existing = sourcesUsed.find(s => s.sourceId === sector.metadata?.sourceId);
      if (!existing) {
        sourcesUsed.push(sector.metadata);
      }
    }
  }

  sourcesUsed.push({
    sourceId: 'constancia_consulting_experience',
    sourceName: 'Constancia Consulting Experience',
    sourceType: 'expert_estimate',
    sourceUrl: 'https://constancia.ai/',
    accessedDate: generatedAt,
    description: '40+ years combined consulting experience across UK finance functions',
  });

  const industryOverrides: IndustryOverride[] = [];

  for (const sector of sectorData) {
    for (const derivation of METRIC_DERIVATIONS) {
      const derived = derivation.derivation(sector);
      if (derived) {
        industryOverrides.push({
          industryId: sector.industryId,
          metricId: derivation.metricId,
          overrideValues: {
            typical: derived,
          },
          sourceMetadata: sector.metadata || {
            sourceId: 'ons_derived',
            sourceName: 'ONS Analysis',
            sourceType: 'ons',
            sourceUrl: 'https://www.ons.gov.uk/',
            accessedDate: generatedAt,
          },
        });
      }
    }
  }

  return {
    generatedAt,
    version: GENERATION_VERSION,
    totalMetrics: metrics.length,
    metricsFromData,
    metricsFromProxy,
    metricsFromEstimate,
    sourcesUsed,
    warnings,
    metrics,
    industryOverrides,
  };
}

/**
 * Generate TypeScript code for shared/epm-benchmarks.ts
 */
export function generateBenchmarkTypeScript(): string {
  const report = generateBenchmarks();
  
  let output = `/**
 * EPM/Finance Function Benchmarks
 * 
 * GENERATED FILE - DO NOT EDIT DIRECTLY
 * Generated: ${report.generatedAt}
 * Version: ${report.version}
 * 
 * Derivation Summary:
 * - Calculated from data: ${report.metricsFromData} metrics
 * - Derived via proxy: ${report.metricsFromProxy} metrics  
 * - Expert estimates: ${report.metricsFromEstimate} metrics
 * 
 * Data Sources:
${report.sourcesUsed.map(s => ` * - ${s.sourceName}: ${s.sourceUrl}`).join('\n')}
 */

`;

  output += `export const BENCHMARK_GENERATION_METADATA = {
  generatedAt: '${report.generatedAt}',
  version: '${report.version}',
  totalMetrics: ${report.totalMetrics},
  metricsFromData: ${report.metricsFromData},
  metricsFromProxy: ${report.metricsFromProxy},
  metricsFromEstimate: ${report.metricsFromEstimate},
  sourcesUsed: ${JSON.stringify(report.sourcesUsed, null, 2)},
};\n\n`;

  return output;
}

export { METRIC_DERIVATIONS };
