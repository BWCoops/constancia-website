/**
 * FinanceCompass Chatbot Types
 * Strict type definitions for the AI chatbot system
 */

export type ProcessingStage = 'idle' | 'researching' | 'analyzing' | 'synthesizing' | 'complete' | 'error';

export type ResearchType = 
  | 'MARKET_TREND'
  | 'VENDOR_ANALYSIS' 
  | 'IMPLEMENTATION'
  | 'BENCHMARK'
  | 'BEST_PRACTICE'
  | 'ROI_ANALYSIS';

export type MessageTier = 'local' | 'light_research' | 'deep_research';

export interface ProcessingUpdate {
  stage: ProcessingStage;
  message: string;
  progress: number;
  timestamp: Date;
}

export interface ResearchQuery {
  type: ResearchType;
  query: string;
  depth: 'quick' | 'deep';
  userContext: {
    industry?: string;
    companySize?: string;
    challenge?: string;
    currentState?: string;
    assessmentId?: string;
  };
}

export interface ResearchResult {
  content: string;
  sources: string[];
  citations: Record<string, string>;
  cached: boolean;
  researchTimeMs: number;
  researchTypes?: ResearchType[];
}

export interface AssessmentContext {
  assessmentId: string;
  contactId?: string;
  companyName?: string;
  industry?: string;
  revenueMillions?: number;
  entityCount?: number;
  sizeBand?: string;
  employeeCount?: number;
  dimensionScores?: Record<string, number>;
  overallScore?: number;
  weakestDimension?: string;
  strongestDimension?: string;
  tier?: string;
  currentSystems?: string[];
  priorities?: string[];
  keyInsights?: string[];
  challengeAreas?: string[];
  strengthAreas?: string[];
  responseCount?: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  researchUsed?: boolean;
  researchTypes?: ResearchType[];
  sourcesCited?: string[];
  citations?: Record<string, string>;
  processingTimeMs?: number;
  processingStages?: ProcessingUpdate[];
  tier?: MessageTier;
  createdAt: Date;
}

export interface LeadSignals {
  vendorEvaluation?: boolean;
  roadmapInterest?: boolean;
  advisoryInterest?: boolean;
  problemDefinition?: boolean;
  urgencySignal?: boolean;
  budgetMention?: boolean;
}

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
  category?: 'off_topic' | 'harmful' | 'speculation' | 'confidential' | 'competitor' | 'unknown';
}

export type QuestionType = 
  | 'SCORE_EXPLANATION'
  | 'BENCHMARKING'
  | 'ROADMAP'
  | 'VENDOR_TOOLING'
  | 'ROI_BUSINESS_CASE'
  | 'HOW_TO_PRACTICE'
  | 'META_CLARIFICATION'
  | 'GENERAL';

export interface ChatbotResponse {
  message: string;
  researchUsed: boolean;
  researchTypes: ResearchType[] | string[];
  sources: string[];
  citations: Record<string, string>;
  processingTimeMs: number;
  tier: MessageTier;
  guardrailTriggered?: boolean;
  guardrailReason?: string;
  followUpSuggestions?: string[];
  sourceConfidence?: number; // 0-1 confidence score based on source quality
  confidence?: number; // Overall response confidence from deep research
  methodology?: string; // Research methodology description
  questionType?: QuestionType; // Classified question type for structured responses
  suggestedFollowUps?: string[]; // Context-aware follow-up questions
}

export interface LearnedInsight {
  id: string;
  topic: string;
  pattern: string;
  frequencyCount: number;
  successfulResponses: string[];
  commonFollowUps: string[];
  lastUsedAt: Date;
  createdAt: Date;
}
