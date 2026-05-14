/**
 * Comparison Tools Service Interfaces
 * 
 * Repository and service interfaces for comparison tool functionality.
 * These interfaces define contracts for vendor data access and comparison logic.
 */

import type { Result } from '../types';
import type {
  Vendor,
  ComparisonType,
  ComparisonCriteria,
  ComparisonResult,
  ScoringMatrix,
  ScoreBreakdown,
  ExportOptions,
  ExportResult,
  OrganizationSizeBand,
  VendorTier,
} from './types';

export interface IVendorRepository {
  findAll(): Promise<Vendor[]>;
  
  findById(id: string): Promise<Vendor | null>;
  
  findByType(type: ComparisonType): Promise<Vendor[]>;
  
  findByTier(tier: VendorTier): Promise<Vendor[]>;
  
  findByOrganizationSize(size: OrganizationSizeBand): Promise<Vendor[]>;
  
  findByIndustry(industry: string): Promise<Vendor[]>;
  
  findByCriteria(criteria: ComparisonCriteria): Promise<Vendor[]>;
}

export interface IComparisonService {
  compare(
    vendorIds: string[],
    criteria: ComparisonCriteria
  ): Promise<Result<ComparisonResult>>;
  
  compareAll(
    type: ComparisonType,
    criteria: ComparisonCriteria
  ): Promise<Result<ComparisonResult>>;
  
  score(
    vendor: Vendor,
    criteria: ComparisonCriteria
  ): ScoreBreakdown;
  
  calculateOverallScore(
    breakdown: ScoreBreakdown,
    criteria: ComparisonCriteria
  ): number;
  
  rankVendors(
    vendors: Vendor[],
    scores: Map<string, ScoreBreakdown>,
    criteria: ComparisonCriteria
  ): ScoringMatrix[];
  
  getRecommendations(
    scoringMatrix: ScoringMatrix[]
  ): {
    top: ScoringMatrix | null;
    alternatives: ScoringMatrix[];
  };
  
  generateComparisonSummary(
    vendors: Vendor[],
    scoringMatrix: ScoringMatrix[]
  ): ComparisonResult['summary'];
}

export interface IExportService {
  exportToPdf(
    result: ComparisonResult,
    options?: Partial<ExportOptions>
  ): Promise<Result<ExportResult>>;
  
  exportToExcel(
    result: ComparisonResult,
    options?: Partial<ExportOptions>
  ): Promise<Result<ExportResult>>;
  
  export(
    result: ComparisonResult,
    options: ExportOptions
  ): Promise<Result<ExportResult>>;
}

export interface IComparisonReportService {
  generateExecutiveSummary(result: ComparisonResult): string;
  
  generateDetailedAnalysis(result: ComparisonResult): string;
  
  generateVendorProfiles(vendors: Vendor[]): string;
  
  generateCostAnalysis(
    vendors: Vendor[],
    criteria: ComparisonCriteria
  ): string;
}
