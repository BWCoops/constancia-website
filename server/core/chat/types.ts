/**
 * Chat Domain Types
 * 
 * Core domain types for the AI chat system.
 * These types represent business concepts independent of HTTP or database concerns.
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type ConversationStage = 
  | 'greeting'
  | 'name' 
  | 'position' 
  | 'email' 
  | 'company'
  | 'painpoints' 
  | 'budget' 
  | 'timeline'
  | 'complete';

export interface ConversationState {
  id: string;
  stage: ConversationStage;
  leadData: LeadQualificationData;
  messages: ChatMessage[];
  exchangeCount: number;
  questionsRemaining: number;
  qualificationScore: number;
  topicsDiscussed: string[];
  lastQuestionAsked?: string;
  insightsProvided: string[];
  reportReady: boolean;
  startedAt: Date;
  lastActivityAt: Date;
}

export interface LeadQualificationData {
  name?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  email?: string;
  company?: string;
  phone?: string;
  industry?: string;
  painpoints?: string;
  budget?: string;
  currentSystems?: string;
  problem?: string;
  timeline?: string;
  companySize?: string;
}

export interface ChatContext {
  conversationId: string;
  state: ConversationState;
  knowledgeContext: KnowledgeContext[];
  systemPrompt: string;
}

export interface KnowledgeContext {
  id: number;
  category: 'ERP' | 'EPM' | 'AI';
  topic: string;
  content: string;
  relevanceScore: number;
}

export interface ChatResponse {
  message: ChatMessage;
  state: ConversationState;
  suggestedActions?: SuggestedAction[];
  metadata?: ChatResponseMetadata;
}

export interface SuggestedAction {
  type: 'link' | 'contact' | 'resource' | 'download';
  label: string;
  url?: string;
  action?: string;
}

export interface ChatResponseMetadata {
  processingTimeMs: number;
  tokensUsed?: number;
  knowledgeEntriesUsed: number;
  guardrailsApplied: string[];
}

export interface GuardrailResult {
  passed: boolean;
  blocked: boolean;
  reason?: string;
  sanitizedContent?: string;
  violations: GuardrailViolation[];
}

export interface GuardrailViolation {
  rule: string;
  category: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type AICompletionRequest = {
  messages: Array<{ role: MessageRole; content: string }>;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
};

export type AICompletionResponse = {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export interface StreamChunk {
  content: string;
  done: boolean;
}

export const STAGE_ORDER: ConversationStage[] = [
  'greeting',
  'name', 
  'position', 
  'email', 
  'company',
  'painpoints', 
  'budget', 
  'timeline'
];

export const INITIAL_CONVERSATION_STATE: Omit<ConversationState, 'id' | 'startedAt' | 'lastActivityAt'> = {
  stage: 'greeting',
  leadData: {},
  messages: [],
  exchangeCount: 0,
  questionsRemaining: STAGE_ORDER.length - 1,
  qualificationScore: 0,
  topicsDiscussed: [],
  insightsProvided: [],
  reportReady: false,
};
