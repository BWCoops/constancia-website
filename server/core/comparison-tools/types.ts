/**
 * Comparison Tools Domain Types
 * 
 * Domain types for vendor comparison functionality.
 * These types represent core business concepts for EPM, ERP, and AI tool comparison.
 */

export enum ComparisonType {
  EPM = 'EPM',
  ERP = 'ERP',
  AI = 'AI',
}

export enum ExportFormat {
  PDF = 'PDF',
  Excel = 'Excel',
}

export type ComplexityLevel = 'low' | 'medium' | 'high';
export type OrganizationSizeBand = 'smb' | 'mid_market' | 'enterprise' | 'large_enterprise';
export type VendorTier = 'tier1' | 'tier2' | 'specialist';
export type LicenseModel = 'named_user' | 'concurrent_user' | 'capacity_based' | 'hybrid';

export interface CostRange {
  min: number;
  max: number;
  typical?: number;
}

export interface ImplementationCosts {
  smb: CostRange;
  mid_market: CostRange;
  enterprise: CostRange;
  large_enterprise: CostRange;
}

export interface LicenseCost {
  model: LicenseModel;
  perUserAnnual: CostRange;
  minimumUsers?: number;
  volumeDiscountThreshold?: number;
  volumeDiscountPercent?: number;
  platformFeeAnnual?: CostRange;
}

export interface VendorProfile {
  industryFocus: string[];
  complexityTolerance: ComplexityLevel;
  excelDependency: 'low' | 'medium' | 'high';
  aiReadiness: ComplexityLevel;
  bestFitRevenue: CostRange;
  primaryUseCases: string[];
}

export interface Vendor {
  id: string;
  name: string;
  type: ComparisonType;
  tier: VendorTier;
  description: string;
  implementationCosts: ImplementationCosts;
  licenseCosts: LicenseCost;
  implementationTimeline: ImplementationCosts;
  integrationComplexity: ComplexityLevel;
  dataMigrationComplexity: ComplexityLevel;
  bestFitProfile: VendorProfile;
  strengths: string[];
  considerations: string[];
  marketPosition: string;
}

export interface ComparisonCriteria {
  organizationSize: OrganizationSizeBand;
  industry?: string;
  budget?: CostRange;
  timeline?: CostRange;
  userCount?: number;
  requiredCapabilities?: string[];
  integrationRequirements?: string[];
  complexityTolerance?: ComplexityLevel;
  excelDependency?: 'low' | 'medium' | 'high';
  aiReadinessImportance?: ComplexityLevel;
  weightings?: CriteriaWeighting;
}

export interface CriteriaWeighting {
  cost: number;
  timeline: number;
  capabilities: number;
  integration: number;
  vendorFit: number;
  userExperience: number;
}

export const DEFAULT_WEIGHTINGS: CriteriaWeighting = {
  cost: 0.25,
  timeline: 0.15,
  capabilities: 0.25,
  integration: 0.15,
  vendorFit: 0.10,
  userExperience: 0.10,
};

export interface ScoreBreakdown {
  cost: number;
  timeline: number;
  capabilities: number;
  integration: number;
  vendorFit: number;
  userExperience: number;
}

export interface ScoringMatrix {
  vendorId: string;
  vendorName: string;
  overallScore: number;
  breakdown: ScoreBreakdown;
  rank: number;
  recommendation: 'highly_recommended' | 'recommended' | 'conditional' | 'not_recommended';
  reasoning: string[];
}

export interface ComparisonResult {
  id: string;
  type: ComparisonType;
  criteria: ComparisonCriteria;
  vendors: Vendor[];
  scoringMatrix: ScoringMatrix[];
  topRecommendation: ScoringMatrix | null;
  alternativeRecommendations: ScoringMatrix[];
  generatedAt: Date;
  summary: ComparisonSummary;
}

export interface ComparisonSummary {
  totalVendorsCompared: number;
  topVendorName: string | null;
  topVendorScore: number | null;
  averageScore: number;
  scoringSpread: number;
  keyDifferentiators: string[];
  commonStrengths: string[];
  commonConsiderations: string[];
}

export interface VendorComparisonRow {
  attribute: string;
  category: 'cost' | 'timeline' | 'capability' | 'integration' | 'profile';
  values: Record<string, string | number>;
}

export interface ExportOptions {
  format: ExportFormat;
  includeDetailedScoring: boolean;
  includeVendorProfiles: boolean;
  includeRecommendations: boolean;
  includeCostAnalysis: boolean;
  customBranding?: {
    companyName?: string;
    logoUrl?: string;
  };
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  data: Buffer | string;
  mimeType: string;
}
