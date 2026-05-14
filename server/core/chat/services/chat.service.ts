/**
 * Chat Service
 * 
 * Core business logic for AI chat orchestration.
 * This service coordinates message handling, context management,
 * lead qualification flow, and guardrail validation.
 */

import { randomUUID } from 'crypto';
import { Result, success, failure, ValidationError, NotFoundError } from '../../types';
import {
  ChatMessage,
  ChatResponse,
  ConversationState,
  KnowledgeContext,
  LeadQualificationData,
  ConversationStage,
  STAGE_ORDER,
  INITIAL_CONVERSATION_STATE,
  ChatResponseMetadata,
} from '../types';
import {
  IChatService,
  IKnowledgeBaseService,
  IGuardrailService,
  IAIClient,
  IConversationRepository,
  IChatContextBuilder,
} from '../interfaces';

export interface ChatServiceDependencies {
  knowledgeBase: IKnowledgeBaseService;
  guardrails: IGuardrailService;
  aiClient: IAIClient;
  repository: IConversationRepository;
  contextBuilder: IChatContextBuilder;
}

export class ChatService implements IChatService {
  private readonly knowledgeBase: IKnowledgeBaseService;
  private readonly guardrails: IGuardrailService;
  private readonly aiClient: IAIClient;
  private readonly repository: IConversationRepository;
  private readonly contextBuilder: IChatContextBuilder;

  constructor(deps: ChatServiceDependencies) {
    this.knowledgeBase = deps.knowledgeBase;
    this.guardrails = deps.guardrails;
    this.aiClient = deps.aiClient;
    this.repository = deps.repository;
    this.contextBuilder = deps.contextBuilder;
  }

  async startConversation(sessionId?: string): Promise<Result<ConversationState>> {
    const id = sessionId || randomUUID();
    const now = new Date();

    const state: ConversationState = {
      ...INITIAL_CONVERSATION_STATE,
      id,
      startedAt: now,
      lastActivityAt: now,
      messages: [],
    };

    const result = await this.repository.create(state);
    if (!result.success) {
      return result;
    }

    return success(state);
  }

  async sendMessage(
    conversationId: string,
    userMessage: string
  ): Promise<Result<ChatResponse>> {
    const startTime = Date.now();

    const stateResult = await this.repository.findById(conversationId);
    if (!stateResult.success) {
      return stateResult;
    }

    const state = stateResult.data;
    if (!state) {
      return failure(new NotFoundError('Conversation', conversationId));
    }

    const inputValidation = await this.guardrails.validateInput(userMessage);
    if (!inputValidation.success) {
      return inputValidation;
    }

    if (!inputValidation.data.passed) {
      const blockedMessage = this.createBlockedResponseMessage(
        inputValidation.data.reason || 'Message blocked by guardrails'
      );
      return success({
        message: blockedMessage,
        state,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          knowledgeEntriesUsed: 0,
          guardrailsApplied: inputValidation.data.violations.map(v => v.rule),
        },
      });
    }

    const userChatMessage: ChatMessage = {
      id: randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    await this.repository.addMessage(conversationId, userChatMessage);

    const updatedState = await this.processLeadQualification(state, userMessage);

    const knowledgeResult = await this.knowledgeBase.getRelevantContext(
      userMessage,
      [...state.messages, userChatMessage],
      5
    );

    const knowledgeContext: KnowledgeContext[] = knowledgeResult.success
      ? knowledgeResult.data
      : [];

    const context = this.contextBuilder.build(updatedState, knowledgeContext);
    const messages = this.contextBuilder.buildMessages(updatedState, userMessage);

    const aiResult = await this.aiClient.complete({
      messages,
      systemPrompt: context.systemPrompt,
      maxTokens: 500,
      temperature: 0.7,
    });

    if (!aiResult.success) {
      return aiResult;
    }

    let responseContent = aiResult.data.content;

    const outputValidation = await this.guardrails.validateOutput(responseContent);
    if (outputValidation.success && !outputValidation.data.passed) {
      responseContent = this.guardrails.sanitizeResponse(responseContent, 300);
    }

    const assistantMessage: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    };

    await this.repository.addMessage(conversationId, assistantMessage);

    const finalState: ConversationState = {
      ...updatedState,
      messages: [...updatedState.messages, userChatMessage, assistantMessage],
      exchangeCount: updatedState.exchangeCount + 1,
      lastActivityAt: new Date(),
      lastQuestionAsked: this.extractQuestion(responseContent),
    };

    await this.repository.update(conversationId, finalState);

    const metadata: ChatResponseMetadata = {
      processingTimeMs: Date.now() - startTime,
      tokensUsed: aiResult.data.usage?.totalTokens,
      knowledgeEntriesUsed: knowledgeContext.length,
      guardrailsApplied: outputValidation.success 
        ? outputValidation.data.violations.map(v => v.rule)
        : [],
    };

    return success({
      message: assistantMessage,
      state: finalState,
      metadata,
    });
  }

  async endConversation(conversationId: string): Promise<Result<void>> {
    const stateResult = await this.repository.findById(conversationId);
    if (!stateResult.success) {
      return stateResult;
    }

    if (!stateResult.data) {
      return failure(new NotFoundError('Conversation', conversationId));
    }

    const finalState: Partial<ConversationState> = {
      stage: 'complete',
      reportReady: true,
      lastActivityAt: new Date(),
    };

    const updateResult = await this.repository.update(conversationId, finalState);
    if (!updateResult.success) {
      return updateResult;
    }

    return success(undefined);
  }

  async getHistory(conversationId: string): Promise<Result<ChatMessage[]>> {
    return this.repository.getMessages(conversationId);
  }

  async getConversationState(conversationId: string): Promise<Result<ConversationState>> {
    const result = await this.repository.findById(conversationId);
    if (!result.success) {
      return result;
    }

    if (!result.data) {
      return failure(new NotFoundError('Conversation', conversationId));
    }

    return success(result.data);
  }

  async updateLeadData(
    conversationId: string,
    data: Partial<LeadQualificationData>
  ): Promise<Result<ConversationState>> {
    const stateResult = await this.repository.findById(conversationId);
    if (!stateResult.success) {
      return stateResult;
    }

    const state = stateResult.data;
    if (!state) {
      return failure(new NotFoundError('Conversation', conversationId));
    }

    const updatedLeadData: LeadQualificationData = {
      ...state.leadData,
      ...data,
    };

    const qualificationScore = this.calculateQualificationScore(updatedLeadData);

    const updatedState: Partial<ConversationState> = {
      leadData: updatedLeadData,
      qualificationScore,
      lastActivityAt: new Date(),
    };

    return this.repository.update(conversationId, updatedState);
  }

  private async processLeadQualification(
    state: ConversationState,
    userMessage: string
  ): Promise<ConversationState> {
    const extractedData = this.extractLeadDataFromMessage(state.stage, userMessage);

    const updatedLeadData: LeadQualificationData = {
      ...state.leadData,
      ...extractedData,
    };

    const nextStage = this.getNextStage(state.stage, updatedLeadData);
    const questionsRemaining = Math.max(
      0,
      STAGE_ORDER.indexOf('complete') - STAGE_ORDER.indexOf(nextStage)
    );

    return {
      ...state,
      leadData: updatedLeadData,
      stage: nextStage,
      questionsRemaining,
      qualificationScore: this.calculateQualificationScore(updatedLeadData),
    };
  }

  private extractLeadDataFromMessage(
    stage: ConversationStage,
    message: string
  ): Partial<LeadQualificationData> {
    const trimmedMessage = message.trim();

    switch (stage) {
      case 'name':
        return this.parseName(trimmedMessage);
      case 'position':
        return { position: trimmedMessage };
      case 'email':
        return { email: this.extractEmail(trimmedMessage) || trimmedMessage };
      case 'company':
        return { company: trimmedMessage };
      case 'painpoints':
        return { painpoints: trimmedMessage };
      case 'budget':
        return { budget: trimmedMessage };
      case 'timeline':
        return { timeline: trimmedMessage };
      default:
        return {};
    }
  }

  private parseName(fullName: string): Partial<LeadQualificationData> {
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length === 0) {
      return { name: fullName };
    }

    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;

    return {
      name: fullName,
      firstName,
      lastName,
    };
  }

  private extractEmail(text: string): string | null {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  }

  private getNextStage(
    currentStage: ConversationStage,
    leadData: LeadQualificationData
  ): ConversationStage {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    if (currentIndex === -1) {
      return 'greeting';
    }

    if (currentIndex >= STAGE_ORDER.length - 1) {
      return 'complete';
    }

    const nextIndex = currentIndex + 1;
    return STAGE_ORDER[nextIndex] as ConversationStage;
  }

  private calculateQualificationScore(data: LeadQualificationData): number {
    let score = 0;
    const weights = {
      name: 10,
      email: 20,
      company: 15,
      position: 10,
      painpoints: 20,
      budget: 15,
      timeline: 10,
    };

    if (data.name) score += weights.name;
    if (data.email && this.isValidEmail(data.email)) score += weights.email;
    if (data.company) score += weights.company;
    if (data.position) score += weights.position;
    if (data.painpoints) score += weights.painpoints;
    if (data.budget) score += weights.budget;
    if (data.timeline) score += weights.timeline;

    return score;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    return emailRegex.test(email);
  }

  private extractQuestion(response: string): string | undefined {
    const questionMatch = response.match(/[^.!]*\?/);
    return questionMatch ? questionMatch[0].trim() : undefined;
  }

  private createBlockedResponseMessage(reason: string): ChatMessage {
    return {
      id: randomUUID(),
      role: 'assistant',
      content: `I apologise, but I can only help with EPM, ERP, and finance transformation topics. ${reason}. Is there anything related to enterprise performance management or ERP systems I can assist you with?`,
      timestamp: new Date(),
    };
  }
}
