/**
 * Chat Domain Interfaces
 * 
 * Service interfaces for the AI chat system.
 * These interfaces define contracts for services without implementation details.
 */

import { Result } from '../types';
import {
  ChatMessage,
  ChatResponse,
  ConversationState,
  ChatContext,
  KnowledgeContext,
  GuardrailResult,
  LeadQualificationData,
  AICompletionRequest,
  AICompletionResponse,
  StreamChunk,
  ValidationResult,
} from './types';

export interface IChatService {
  startConversation(sessionId?: string): Promise<Result<ConversationState>>;
  
  sendMessage(
    conversationId: string,
    userMessage: string
  ): Promise<Result<ChatResponse>>;
  
  endConversation(conversationId: string): Promise<Result<void>>;
  
  getHistory(conversationId: string): Promise<Result<ChatMessage[]>>;
  
  getConversationState(conversationId: string): Promise<Result<ConversationState>>;
  
  updateLeadData(
    conversationId: string,
    data: Partial<LeadQualificationData>
  ): Promise<Result<ConversationState>>;
}

export interface IKnowledgeBaseService {
  search(query: string, limit?: number): Promise<Result<KnowledgeContext[]>>;
  
  getRelevantContext(
    userMessage: string,
    conversationHistory: ChatMessage[],
    limit?: number
  ): Promise<Result<KnowledgeContext[]>>;
  
  getByCategory(
    category: 'ERP' | 'EPM' | 'AI',
    limit?: number
  ): Promise<Result<KnowledgeContext[]>>;
  
  getByKeywords(keywords: string[]): Promise<Result<KnowledgeContext[]>>;
}

export interface IGuardrailService {
  validate(content: string): Promise<Result<GuardrailResult>>;
  
  filter(content: string): Promise<Result<string>>;
  
  validateInput(userMessage: string): Promise<Result<GuardrailResult>>;
  
  validateOutput(aiResponse: string): Promise<Result<GuardrailResult>>;
  
  checkForBlockedContent(message: string): boolean;
  
  checkForSensitiveData(message: string): { hasSensitive: boolean; type?: string };
  
  sanitizeResponse(response: string, maxLength?: number): string;
}

export interface IAIClient {
  complete(request: AICompletionRequest): Promise<Result<AICompletionResponse>>;
  
  stream(
    request: AICompletionRequest
  ): AsyncGenerator<Result<StreamChunk>, void, unknown>;
}

export interface IConversationRepository {
  create(state: ConversationState): Promise<Result<ConversationState>>;
  
  findById(id: string): Promise<Result<ConversationState | null>>;
  
  update(id: string, state: Partial<ConversationState>): Promise<Result<ConversationState>>;
  
  delete(id: string): Promise<Result<void>>;
  
  addMessage(conversationId: string, message: ChatMessage): Promise<Result<void>>;
  
  getMessages(conversationId: string): Promise<Result<ChatMessage[]>>;
}

export interface ILeadService {
  createLead(data: LeadQualificationData): Promise<Result<{ id: string }>>;
  
  updateLead(id: string, data: Partial<LeadQualificationData>): Promise<Result<void>>;
  
  qualifyLead(data: LeadQualificationData): number;
  
  sendToHubSpot(data: LeadQualificationData): Promise<Result<void>>;
}

export interface IChatContextBuilder {
  build(
    state: ConversationState,
    knowledgeContext: KnowledgeContext[]
  ): ChatContext;
  
  buildSystemPrompt(state: ConversationState): string;
  
  buildMessages(
    state: ConversationState,
    userMessage: string
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export interface IInputValidator {
  validateEmail(email: string): ValidationResult;
  
  validateName(name: string): ValidationResult;
  
  validateCompany(company: string): ValidationResult;
  
  validatePhone(phone: string): ValidationResult;
  
  validateMessage(message: string): ValidationResult;
}
