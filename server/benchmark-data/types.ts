/**
 * Benchmark Data Pipeline Types
 * 
 * Defines structures for ingesting government data and deriving benchmarks
 */

export type DataSourceType = 'ons' | 'companies_house' | 'nao' | 'fca' | 'expert_estimate';

export interface DataSourceMetadata {
  sourceId: string;
  sourceName: string;
  sourceType: DataSourceType;
  sourceUrl: string;
  datasetId?: string;
  publicationDate?: string;
  accessedDate: string;
  version?: string;
  description?: string;
}

export interface RawONSDataPoint {
  time: string;
  geography: string;
  geographyCode?: string;
  variable: string;
  value: number;
  unit?: string;
  metadata?: DataSourceMetadata;
}

export interface IndustrySectorData {
  sicCode: string;
  sicDescription: string;
  industryId: string;
  employmentCount?: number;
  businessCount?: number;
  turnoverTotal?: number;
  labourProductivity?: number;
  averageWage?: number;
  metadata?: DataSourceMetadata;
}

export interface FinancialStatementData {
  companyNumber: string;
  accountsDate: string;
  sicCode: string;
  revenue?: number;
  grossProfit?: number;
  operatingProfit?: number;
  totalAssets?: number;
  currentAssets?: number;
  inventory?: number;
  tradeReceivables?: number;
  tradePayables?: number;
  currentLiabilities?: number;
  employeeCount?: number;
  administrativeCosts?: number;
  metadata?: DataSourceMetadata;
}

export interface DerivedBenchmarkMetric {
  metricId: string;
  industryId: string;
  sampleSize: number;
  percentile10: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  mean: number;
  standardDeviation: number;
  derivedFrom: DataSourceType;
  derivationMethod: 'calculated' | 'proxy' | 'expert_estimate';
  derivationFormula?: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  lastUpdated: string;
  sourceMetadata: DataSourceMetadata[];
}

export interface BenchmarkTierValues {
  min: number;
  max: number;
  mid: number;
}

export interface GeneratedBenchmark {
  id: string;
  name: string;
  unit: string;
  category: 'cost' | 'efficiency' | 'technology' | 'working_capital' | 'compliance' | 'talent';
  typical: BenchmarkTierValues;
  'constancia_good': BenchmarkTierValues;
  'constancia_best': BenchmarkTierValues;
  source: string;
  sourceDetails: {
    type: DataSourceType;
    derivationMethod: 'calculated' | 'proxy' | 'expert_estimate';
    formula?: string;
    sampleSize?: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    sourceDatasets: string[];
    lastUpdated: string;
  };
  lowerIsBetter: boolean;
}

export interface IndustryOverride {
  industryId: string;
  metricId: string;
  overrideValues: {
    typical?: Partial<BenchmarkTierValues>;
    'constancia_good'?: Partial<BenchmarkTierValues>;
    'constancia_best'?: Partial<BenchmarkTierValues>;
  };
  sourceMetadata: DataSourceMetadata;
}

export interface BenchmarkGenerationReport {
  generatedAt: string;
  version: string;
  totalMetrics: number;
  metricsFromData: number;
  metricsFromProxy: number;
  metricsFromEstimate: number;
  sourcesUsed: DataSourceMetadata[];
  warnings: string[];
  metrics: GeneratedBenchmark[];
  industryOverrides: IndustryOverride[];
}
