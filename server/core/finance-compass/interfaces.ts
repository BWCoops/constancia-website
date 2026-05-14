/**
 * FinanceCompass Service Interfaces
 * 
 * Defines contracts for core business logic services.
 * These interfaces enable dependency injection and testability.
 * 
 * IMPORTANT: Core services MUST NOT import from /api or /db directly.
 * They receive dependencies through these interfaces.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Result } from '../types';
import type {
  Assessment,
  AssessmentWithDetails,
  AssessmentTier,
  Question,
  QuestionResponse,
  Contact,
  Company,
  RoiProfile,
  RoiMetrics,
  Report,
  ReportNarratives,
  AiAnalysis,
  VendorAffinity,
  WeightedScoreBreakdown,
} from './types';

/**
 * Assessment Repository Interface
 * Abstracts data access for assessments
 */
export interface IAssessmentRepository {
  findById(id: string): Promise<Assessment | null>;
  findByContactId(contactId: string): Promise<Assessment[]>;
  findWithDetails(id: string): Promise<AssessmentWithDetails | null>;
  create(data: CreateAssessmentData): Promise<Assessment>;
  update(id: string, data: Partial<Assessment>): Promise<Assessment | null>;
  updateStatus(id: string, status: Assessment['status']): Promise<void>;
  updateScores(id: string, scores: AssessmentScores): Promise<void>;
}

export interface CreateAssessmentData {
  contactId: string;
  companyId: string;
  tier: AssessmentTier;
}

export interface AssessmentScores {
  epmReadinessScore?: number;
  dimensionScores?: Record<string, number>;
  overallMaturityScore?: number;
  quickWins?: string[];
  recommendations?: string[];
  aiAnalysis?: AiAnalysis;
}

/**
 * Question Repository Interface
 */
export interface IQuestionRepository {
  findByTier(tier: AssessmentTier): Promise<Question[]>;
  findById(id: string): Promise<Question | null>;
  findByDimension(dimension: string, tier: AssessmentTier): Promise<Question[]>;
  getNextQuestion(assessmentId: string, currentQuestionId: string | null): Promise<Question | null>;
}

/**
 * Response Repository Interface
 */
export interface IResponseRepository {
  findByAssessmentId(assessmentId: string): Promise<QuestionResponse[]>;
  findByQuestionId(assessmentId: string, questionId: string): Promise<QuestionResponse | null>;
  save(data: SaveResponseData): Promise<QuestionResponse>;
  deleteByAssessmentId(assessmentId: string): Promise<void>;
}

export interface SaveResponseData {
  assessmentId: string;
  questionId: string;
  response: string | string[] | number;
}

/**
 * Contact Repository Interface
 */
export interface IContactRepository {
  findById(id: string): Promise<Contact | null>;
  findByEmail(email: string): Promise<Contact | null>;
  findByEmailHash(emailHash: string): Promise<Contact | null>;
  create(data: CreateContactData): Promise<Contact>;
  update(id: string, data: Partial<Contact>): Promise<Contact | null>;
}

export interface CreateContactData {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phoneNumber?: string;
}

/**
 * Company Repository Interface
 */
export interface ICompanyRepository {
  findById(id: string): Promise<Company | null>;
  findByName(name: string): Promise<Company | null>;
  create(data: CreateCompanyData): Promise<Company>;
  update(id: string, data: Partial<Company>): Promise<Company | null>;
}

export interface CreateCompanyData {
  name: string;
  industry?: string;
  size?: string;
  revenue?: string;
  country?: string;
}

/**
 * ROI Profile Repository Interface
 */
export interface IRoiProfileRepository {
  findByAssessmentId(assessmentId: string): Promise<RoiProfile | null>;
  create(data: CreateRoiProfileData): Promise<RoiProfile>;
  update(id: string, data: Partial<RoiProfile>): Promise<RoiProfile | null>;
}

export interface CreateRoiProfileData {
  assessmentId: string;
  contactId: string;
  companyId: string;
  currency?: string;
  industry?: string;
}

/**
 * Report Repository Interface
 */
export interface IReportRepository {
  findByAssessmentId(assessmentId: string): Promise<Report | null>;
  create(data: CreateReportData): Promise<Report>;
  update(id: string, data: Partial<Report>): Promise<Report | null>;
}

export interface CreateReportData {
  assessmentId: string;
  contactId: string;
  companyId: string;
  pdfPath?: string;
  executiveSummary?: string;
  narratives?: ReportNarratives;
}

/**
 * Assessment Lifecycle Service Interface
 * Manages the assessment lifecycle from creation to completion
 */
export interface IAssessmentLifecycleService {
  createAssessment(
    contact: Contact,
    company: Company,
    tier: AssessmentTier
  ): Promise<Result<Assessment>>;
  
  getAssessment(id: string): Promise<Result<AssessmentWithDetails>>;
  
  submitResponse(
    assessmentId: string,
    questionId: string,
    response: string | string[] | number
  ): Promise<Result<{ nextQuestion: Question | null; isComplete: boolean }>>;
  
  completeAssessment(id: string): Promise<Result<Assessment>>;
  
  getProgress(id: string): Promise<Result<{
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
    currentQuestion: Question | null;
  }>>;
}

/**
 * Analysis Service Interface
 * Handles AI-powered analysis and scoring
 */
export interface IAnalysisService {
  analyseAssessment(
    assessment: Assessment,
    responses: QuestionResponse[],
    questions: Question[]
  ): Promise<Result<AiAnalysis>>;
  
  calculateDimensionScores(
    responses: QuestionResponse[],
    questions: Question[]
  ): Record<string, number>;
  
  calculateWeightedMaturityScore(
    preAssessmentScores: Record<string, number> | null,
    fullAssessmentScores: Record<string, number> | null
  ): WeightedScoreBreakdown;
  
  generateQuickWins(
    dimensionScores: Record<string, number>,
    industry: string
  ): string[];
  
  generateRecommendations(
    dimensionScores: Record<string, number>,
    companySize: string
  ): string[];
}

/**
 * ROI Service Interface
 * Handles ROI calculations and projections
 */
export interface IRoiService {
  createDefaultProfile(
    assessmentId: string,
    contactId: string,
    companyId: string,
    companySize?: string,
    industry?: string
  ): Promise<Result<RoiProfile>>;
  
  getProfile(assessmentId: string): Promise<Result<RoiProfile>>;
  
  updateProfile(
    assessmentId: string,
    updates: Partial<RoiProfile>
  ): Promise<Result<RoiProfile>>;
  
  calculateMetrics(profile: RoiProfile): RoiMetrics;
  
  runSensitivityAnalysis(
    profile: RoiProfile,
    variable: string,
    range: { min: number; max: number; steps: number }
  ): { values: number[]; metrics: RoiMetrics[] };
  
  runMonteCarloSimulation(
    profile: RoiProfile,
    iterations: number
  ): { percentiles: Record<number, RoiMetrics>; distribution: number[] };
}

/**
 * Narrative Service Interface
 * Generates AI-powered narratives for reports
 */
export interface INarrativeService {
  generateExecutiveBrief(
    assessment: Assessment,
    company: Company,
    roiMetrics: RoiMetrics
  ): Promise<Result<string>>;
  
  generateImplementationRoadmap(
    assessment: Assessment,
    company: Company | null | undefined,
    transformationAmbition: string,
    vendorRecommendation: any,
    responses?: any[],
    dimensionScores?: Record<string, number>
  ): Promise<Result<string>>;
  
  generateStakeholderContent(
    assessment: Assessment,
    stakeholderType: 'cfo' | 'cio' | 'board'
  ): Promise<Result<string>>;
  
  generateDimensionNarratives(
    assessment: Assessment,
    dimensionScores: Record<string, number>
  ): Promise<Result<Record<string, string>>>;
}

/**
 * Vendor Affinity Service Interface
 * Calculates vendor recommendations based on assessment
 */
export interface IVendorAffinityService {
  calculateAffinityScores(
    dimensionScores: Record<string, number>,
    industry: string,
    companySize: string
  ): VendorAffinity[];
  
  getTopRecommendations(
    affinityScores: VendorAffinity[],
    limit: number
  ): VendorAffinity[];
}

/**
 * Report Service Interface
 * Generates and manages PDF reports
 */
export interface IReportService {
  generateReport(assessmentId: string): Promise<Result<Report>>;
  
  getReport(assessmentId: string): Promise<Result<Report>>;
  
  regenerateNarratives(assessmentId: string): Promise<Result<ReportNarratives>>;
}

/**
 * AI Client Interface
 * Abstraction for AI API calls
 */
export interface IAiClient {
  generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<Result<string>>;
}

/**
 * Email Service Interface
 */
export interface IEmailService {
  sendOtp(email: string, otp: string): Promise<Result<void>>;
  sendReportReady(email: string, reportUrl: string): Promise<Result<void>>;
}
