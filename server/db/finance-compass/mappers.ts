/**
 * Database Mappers for FinanceCompass
 * 
 * Maps between database records and domain types.
 * Handles data transformation, null coalescing, and type conversion.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type {
  Assessment,
  Contact,
  Company,
  Question,
  QuestionResponse,
  Report,
  RoiProfile,
  AiAnalysis,
  QuestionOption,
  SliderConfig,
  ReportNarratives,
  AssessmentTier,
} from '../../core/finance-compass/types';

import type {
  FcAssessment,
  FcContact,
  FcCompany,
  FcQuestion,
  FcResponse,
  FcReport,
  FcRoiProfile,
} from '@shared/finance-compass-schema';

/**
 * Cap dimension scores at 100 to prevent display issues
 */
function capDimensionScores(scores: Record<string, number> | null): Record<string, number> | null {
  if (!scores) return null;
  const capped: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    capped[key] = Math.min(100, Math.max(0, value));
  }
  return capped;
}

/**
 * Map database assessment to domain assessment
 */
export function mapDbAssessmentToDomain(db: FcAssessment): Assessment {
  return {
    id: db.id,
    contactId: db.contactId || '',
    companyId: db.companyId || '',
    tier: db.tier as AssessmentTier,
    status: db.status as Assessment['status'],
    currentQuestionId: null, // Not in current schema - derived from responses
    startedAt: db.startedAt || db.createdAt,
    completedAt: db.completedAt,
    epmReadinessScore: db.epmReadinessScore,
    dimensionScores: capDimensionScores(db.dimensionScores as Record<string, number> | null),
    overallMaturityScore: db.overallMaturityScore,
    quickWins: db.quickWins as string[] | null,
    recommendations: db.recommendations as string[] | null,
    aiAnalysis: db.aiAnalysis as AiAnalysis | null,
  };
}

/**
 * Map database contact to domain contact
 */
export function mapDbContactToDomain(db: FcContact): Contact {
  return {
    id: db.id,
    email: db.email,
    emailHash: db.emailHash || '',
    firstName: db.firstName,
    lastName: db.lastName,
    jobTitle: db.roleTitle,
    phoneNumber: db.phone,
    createdAt: db.createdAt,
  };
}

/**
 * Map database company to domain company
 */
export function mapDbCompanyToDomain(db: FcCompany): Company {
  return {
    id: db.id,
    name: db.name,
    industry: db.sector,
    size: db.sizeBand,
    revenue: db.revenueMillions ? `${db.revenueMillions}M` : null,
    country: db.country,
    createdAt: db.createdAt,
  };
}

/**
 * Map database question to domain question
 */
export function mapDbQuestionToDomain(db: FcQuestion): Question {
  return {
    id: db.id,
    tier: db.tier as AssessmentTier,
    dimension: db.dimension || 'general',
    order: db.sequence,
    prompt: db.prompt,
    helpText: db.helpText,
    questionType: db.type as Question['questionType'],
    options: db.options as QuestionOption[] | null,
    sliderConfig: extractSliderConfig(db.validation),
    required: db.isRequired,
    active: db.isActive,
  };
}

/**
 * Extract slider config from validation object
 */
function extractSliderConfig(validation: unknown): SliderConfig | null {
  if (!validation || typeof validation !== 'object') return null;
  const v = validation as Record<string, unknown>;
  if (v.min !== undefined && v.max !== undefined) {
    return {
      min: Number(v.min) || 1,
      max: Number(v.max) || 5,
      step: Number(v.step) || 1,
      labels: v.labels as Record<number, string> | undefined,
    };
  }
  return null;
}

/**
 * Map database response to domain response
 */
export function mapDbResponseToDomain(db: FcResponse): QuestionResponse {
  return {
    id: db.id,
    assessmentId: db.assessmentId,
    questionId: db.questionId,
    response: db.response as string | string[] | number,
    answeredAt: db.createdAt,
  };
}

/**
 * Map database report to domain report
 */
export function mapDbReportToDomain(db: FcReport): Report {
  return {
    id: db.id,
    assessmentId: db.assessmentId,
    contactId: '', // Not in current schema - lookup via assessment
    companyId: '', // Not in current schema - lookup via assessment
    pdfPath: db.pdfPath,
    executiveSummary: db.executiveSummary,
    narratives: {
      executiveBrief: db.executiveSummary || undefined,
      dimensionNarratives: db.dimensionNarratives as Record<string, string> | undefined,
    },
    generatedAt: db.createdAt,
  };
}

/**
 * Map database ROI profile to domain profile
 */
export function mapDbRoiProfileToDomain(db: FcRoiProfile): RoiProfile {
  return {
    id: db.id,
    assessmentId: db.assessmentId,
    contactId: db.contactId || '',
    companyId: db.companyId || '',
    currency: db.currency || 'GBP',
    horizonYears: db.horizonYears || 3,
    industry: db.industry || 'cross_industry',
    
    softwareLicenses: db.softwareLicenses || 0,
    integrationCosts: db.integrationCosts || 0,
    dataMigration: db.dataMigration || 0,
    changeManagement: db.changeManagement || 0,
    internalFteCosts: db.internalFteCosts || 0,
    trainingCosts: db.trainingCosts || 0,
    contingency: db.contingency || 0,
    
    processEfficiencyPercent: db.processEfficiencyPercent || 0,
    headcountDelta: db.headcountDelta || 0,
    closeAccelerationDays: db.closeAccelerationDays || 0,
    closeAccelerationValue: db.closeAccelerationValue || 0,
    complianceRiskAvoidance: db.complianceRiskAvoidance || 0,
    auditEfficiencySavings: db.auditEfficiencySavings || 0,
    revenueEnablement: db.revenueEnablement || 0,
    externalConsultingSavings: db.externalConsultingSavings || 0,
    
    runRateOpex: db.runRateOpex || 0,
    supportCosts: db.supportCosts || 0,
    depreciation: db.depreciation || 0,
    
    discountRate: db.discountRate || 10,
    inflationRate: db.inflationRate || 2.5,
    benefitRampYear1: db.benefitRampYear1 || 25,
    benefitRampYear2: db.benefitRampYear2 || 75,
    benefitRampYear3: db.benefitRampYear3 || 100,
  };
}
