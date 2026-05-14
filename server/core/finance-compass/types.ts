/**
 * FinanceCompass Domain Types
 * 
 * Pure domain types for FinanceCompass assessment, analysis, and reporting.
 * These types represent business concepts without any infrastructure concerns.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { FCAssessmentTier } from '@shared/finance-compass-schema';

/**
 * Assessment tiers
 */
export type AssessmentTier = FCAssessmentTier;

/**
 * Assessment status lifecycle
 */
export type AssessmentStatus = 
  | 'created'
  | 'in_progress'
  | 'completed'
  | 'processing'
  | 'analysed'
  | 'report_generated';

/**
 * Core assessment data
 */
export interface Assessment {
  id: string;
  contactId: string;
  companyId: string;
  tier: AssessmentTier;
  status: AssessmentStatus;
  currentQuestionId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  epmReadinessScore: number | null;
  dimensionScores: Record<string, number> | null;
  overallMaturityScore: number | null;
  quickWins: string[] | null;
  recommendations: string[] | null;
  aiAnalysis: AiAnalysis | null;
}

/**
 * AI analysis results
 */
export interface AiAnalysis {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  aiReadinessSummary?: string;
  dimensionInsights?: Record<string, DimensionInsight>;
}

/**
 * Insight for a specific dimension
 */
export interface DimensionInsight {
  score: number;
  level: string;
  summary: string;
  challenges: string[];
  opportunities: string[];
}

/**
 * Assessment question
 */
export interface Question {
  id: string;
  tier: AssessmentTier;
  dimension: string;
  order: number;
  prompt: string;
  helpText: string | null;
  questionType: 'single_select' | 'multi_select' | 'slider' | 'text';
  options: QuestionOption[] | null;
  sliderConfig: SliderConfig | null;
  required: boolean;
  active: boolean;
}

/**
 * Question option for select types
 */
export interface QuestionOption {
  value: string;
  label: string;
  score?: number;
}

/**
 * Slider configuration
 */
export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  labels?: Record<number, string>;
}

/**
 * Response to a question
 */
export interface QuestionResponse {
  id: string;
  assessmentId: string;
  questionId: string;
  response: string | string[] | number;
  answeredAt: Date;
}

/**
 * Contact information
 */
export interface Contact {
  id: string;
  email: string;
  emailHash: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  phoneNumber: string | null;
  createdAt: Date;
}

/**
 * Company information
 */
export interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  revenue: string | null;
  country: string | null;
  createdAt: Date;
}

/**
 * ROI profile for calculations
 */
export interface RoiProfile {
  id: string;
  assessmentId: string;
  contactId: string;
  companyId: string;
  currency: string;
  horizonYears: number;
  industry: string;
  
  // Costs
  softwareLicenses: number;
  integrationCosts: number;
  dataMigration: number;
  changeManagement: number;
  internalFteCosts: number;
  trainingCosts: number;
  contingency: number;
  
  // Benefits
  processEfficiencyPercent: number;
  headcountDelta: number;
  closeAccelerationDays: number;
  closeAccelerationValue: number;
  complianceRiskAvoidance: number;
  auditEfficiencySavings: number;
  revenueEnablement: number;
  externalConsultingSavings: number;
  
  // Ongoing costs
  runRateOpex: number;
  supportCosts: number;
  depreciation: number;
  
  // Financial parameters
  discountRate: number;
  inflationRate: number;
  benefitRampYear1: number;
  benefitRampYear2: number;
  benefitRampYear3: number;
}

/**
 * ROI calculation results
 */
export interface RoiMetrics {
  totalImplementationCost: number;
  totalAnnualBenefits: number;
  totalAnnualCosts: number;
  netAnnualBenefit: number;
  roiPercent: number;
  totalCostOfOwnership: number;
  paybackMonths: number;
  npvValue: number;
  benefitCostRatio: number;
}

/**
 * Report data
 */
export interface Report {
  id: string;
  assessmentId: string;
  contactId: string;
  companyId: string;
  pdfPath: string | null;
  executiveSummary: string | null;
  narratives: ReportNarratives | null;
  generatedAt: Date;
}

/**
 * AI-generated narratives for reports
 */
export interface ReportNarratives {
  executiveBrief?: string;
  implementationRoadmap?: string;
  stakeholderContent?: Record<string, string>;
  dimensionNarratives?: Record<string, string>;
}

/**
 * Dimension scoring configuration
 */
export interface DimensionConfig {
  id: string;
  name: string;
  description: string;
  weight: number;
  order: number;
}

/**
 * Vendor affinity score
 */
export interface VendorAffinity {
  vendorId: string;
  vendorName: string;
  affinityScore: number;
  strengthAreas: string[];
  gapAreas: string[];
  recommendation: string;
}

/**
 * Assessment with related data
 */
export interface AssessmentWithDetails {
  assessment: Assessment;
  contact: Contact | null;
  company: Company | null;
  responses: QuestionResponse[];
}

/**
 * Weighted maturity score breakdown
 */
export interface WeightedScoreBreakdown {
  overallScore: number;
  tierBreakdown: {
    preAssessment: { score: number; weight: number } | null;
    fullAssessment: { score: number; weight: number } | null;
  };
}
