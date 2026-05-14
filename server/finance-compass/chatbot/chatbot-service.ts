/**
 * FinanceCompass Chatbot Service
 * 
 * Main orchestrator for the AI chatbot.
 * Coordinates guardrails, research, and synthesis.
 */

import { db } from '../../db';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-chatbot-service");
import {
  fcChatSessions,
  fcChatMessages,
  fcAssessments,
  fcCompanies,
  fcContacts,
  fcResponses,
  fcQuestions,
  type FcChatSession,
  type FcChatMessage,
} from '@shared/finance-compass-schema';
import { ResearchService, buildResearchQuery } from './research-service';
import { deepResearchService } from './deep-research-service';
import { SynthesisService, generateQuickResponse } from './synthesis-service';
import { learningService } from './learning-service';
import {
  validateUserInput,
  assessResearchNeed,
  detectLeadSignals,
  calculateLeadScore,
  detectPromptInjection,
  enforceVendorFitForSME,
  SAFE_RESPONSES,
} from './guardrails';
import {
  validateAndSanitiseInput,
  prepareForExternalApi,
  sanitiseApiResponse,
  logApiCall,
  logSecurityAudit,
  checkRateLimit,
} from './security-utils';
import type {
  AssessmentContext,
  ProcessingUpdate,
  ChatbotResponse,
  MessageTier,
} from './types';

export class ChatbotService {
  private researchService: ResearchService;
  private synthesisService: SynthesisService;

  constructor() {
    this.researchService = new ResearchService();
    this.synthesisService = new SynthesisService();
  }

  /**
   * Main message handler with streaming updates
   */
  async handleMessage(
    sessionId: string,
    userMessage: string,
    onProgress?: (update: ProcessingUpdate) => void,
    responseMode: 'detailed' | 'quick' = 'detailed'
  ): Promise<ChatbotResponse> {
    const startTime = Date.now();
    const stages: ProcessingUpdate[] = [];

    const sendUpdate = (stage: ProcessingUpdate['stage'], message: string, progress: number) => {
      const update: ProcessingUpdate = { stage, message, progress, timestamp: new Date() };
      stages.push(update);
      if (onProgress) onProgress(update);
    };

    try {
      // [0] RATE LIMITING CHECK
      const rateLimitCheck = await checkRateLimit(sessionId, 15); // 15 messages per minute
      if (!rateLimitCheck.allowed) {
        return this.createBlockedResponse(
          `You're sending messages too quickly. Please wait ${rateLimitCheck.resetIn} seconds before trying again.`,
          startTime
        );
      }

      // [0.5] SANITISE AND VALIDATE INPUT
      const sanitisedInput = validateAndSanitiseInput(userMessage);
      if (!sanitisedInput.isValid) {
        log.warn({ issues: sanitisedInput.issues }, "Input validation failed");
        return this.createBlockedResponse(
          "I couldn't process that message. Please try rephrasing your question.",
          startTime
        );
      }
      const cleanMessage = sanitisedInput.sanitised;

      // [1] CHECK FOR PROMPT INJECTION ATTACKS (enhanced security)
      const injectionCheck = detectPromptInjection(cleanMessage);
      if (injectionCheck.detected) {
        log.warn({ pattern: injectionCheck.pattern }, "Prompt injection detected");
        await logSecurityAudit({
          eventType: 'injection_blocked',
          severity: 'warning',
          sessionId,
          action: 'prompt_injection_blocked',
          details: { pattern: injectionCheck.pattern },
          timestamp: new Date(),
        });
        return this.createBlockedResponse(
          "I'm unable to process that request. How can I help with your EPM or finance transformation questions?",
          startTime
        );
      }

      // [2] VALIDATE INPUT AGAINST GUARDRAILS
      const inputValidation = validateUserInput(cleanMessage);
      if (!inputValidation.passed) {
        return this.createBlockedResponse(inputValidation.reason || SAFE_RESPONSES.offTopic, startTime);
      }

      // [3] GET SESSION & CONTEXT
      const session = await this.getSession(sessionId);
      if (!session) {
        return this.createBlockedResponse(SAFE_RESPONSES.error, startTime);
      }

      const context = await this.getAssessmentContext(session.assessmentId);
      const history = await this.getConversationHistory(sessionId, 6);

      // [4] CHECK FOR QUICK RESPONSE (only use for quick mode or simple greetings)
      // In detailed mode, skip quick responses to ensure research is always performed
      if (responseMode === 'quick') {
        const quickResponse = generateQuickResponse(cleanMessage, context);
        if (quickResponse) {
          await this.saveMessage(sessionId, 'user', userMessage);
          await this.saveMessage(sessionId, 'assistant', quickResponse, {
            tier: 'local',
            processingTimeMs: Date.now() - startTime,
          });
          await this.updateSessionStats(sessionId, userMessage);
          return {
            message: quickResponse,
            researchUsed: false,
            researchTypes: [],
            sources: [],
            citations: {},
            processingTimeMs: Date.now() - startTime,
            tier: 'local',
          };
        }
      } else {
        // In detailed mode, only use quick response for basic greetings
        const lowerMessage = userMessage.toLowerCase().trim();
        const isSimpleGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening))[\s!?.,]*$/i.test(lowerMessage);
        if (isSimpleGreeting) {
          const quickResponse = generateQuickResponse(userMessage, context);
          if (quickResponse) {
            await this.saveMessage(sessionId, 'user', userMessage);
            await this.saveMessage(sessionId, 'assistant', quickResponse, {
              tier: 'local',
              processingTimeMs: Date.now() - startTime,
            });
            await this.updateSessionStats(sessionId, userMessage);
            return {
              message: quickResponse,
              researchUsed: false,
              researchTypes: [],
              sources: [],
              citations: {},
              processingTimeMs: Date.now() - startTime,
              tier: 'local',
            };
          }
        }
      }

      // [5] ASSESS RESEARCH NEED & GET LEARNED CONTEXT
      sendUpdate('researching', 'Analysing your question...', 10);
      const researchNeed = assessResearchNeed(cleanMessage, context);

      // Get learned insights to enhance response quality
      const learnedContext = await learningService.getLearnedContext(cleanMessage, context);
      
      // Prepare sanitised message for external APIs (strips PII)
      const { message: apiSafeMessage, piiRemoved } = prepareForExternalApi(cleanMessage, context as unknown as Record<string, unknown> | undefined);
      if (piiRemoved) {
        log.info("PII removed before sending to external APIs");
      }

      let researchResult = null;
      let deepResearchResult = null;

      // [5] PERFORM RESEARCH IF NEEDED
      // Detailed mode: Use multi-phase deep research
      // Quick mode: Use single-phase quick research
      const shouldDoResearch = responseMode === 'detailed' 
        ? researchNeed.needsResearch // In detailed mode, research if any need is detected
        : researchNeed.needsResearch && researchNeed.confidence === 'high';

      log.info({ mode: responseMode, needsResearch: researchNeed.needsResearch, confidence: researchNeed.confidence, willResearch: shouldDoResearch }, "Research decision");

      if (shouldDoResearch) {
        const apiCallStart = Date.now();
        
        if (responseMode === 'detailed') {
          // Use multi-phase deep research for detailed mode
          log.info("Using DeepResearchService for detailed mode");
          deepResearchResult = await deepResearchService.executeDeepResearch(
            apiSafeMessage, // Use PII-sanitised message for external APIs
            context,
            'hybrid', // Use hybrid mode (2-3 phases) for balance of quality and speed
            (update) => sendUpdate(update.stage, update.message, update.progress)
          );
          
          // Log API call for security audit
          await logApiCall(sessionId, 'DeepResearch', 'execute', !!deepResearchResult, Date.now() - apiCallStart);
          
          // Convert deep research result to standard research result format
          if (deepResearchResult.synthesizedResponse) {
            researchResult = {
              content: deepResearchResult.aggregatedFindings,
              sources: deepResearchResult.allSources,
              citations: {},
              cached: false,
              researchTimeMs: deepResearchResult.totalExecutionTimeMs
            };
          }
        } else {
          // Use single-phase quick research for quick mode
          sendUpdate('researching', `Researching ${researchNeed.researchTypes[0]?.toLowerCase().replace('_', ' ')}...`, 25);

          const researchQuery = buildResearchQuery(apiSafeMessage, context, researchNeed.researchTypes);
          researchQuery.depth = 'quick';
          
          log.info("Calling single-phase research service");
          const quickResearchStart = Date.now();
          researchResult = await this.researchService.research(researchQuery);
          
          // Log API call for security audit
          await logApiCall(sessionId, 'QuickResearch', 'execute', !!researchResult?.content, Date.now() - quickResearchStart);

          if (researchResult.content) {
            // Sanitise research response
            researchResult.content = sanitiseApiResponse(researchResult.content);
            sendUpdate('analyzing', 'Analysing findings against your situation...', 55);
          }
        }
      }

      // [6] SYNTHESIZE RESPONSE (with learned context)
      sendUpdate('synthesizing', 'Preparing your response...', 75);

      let response: ChatbotResponse;
      
      if (deepResearchResult && deepResearchResult.synthesizedResponse) {
        // Use deep research synthesized response directly
        log.info({ synthesizedResponseLength: deepResearchResult.synthesizedResponse?.length || 0 }, "Deep research returned, building response object");
        response = {
          message: deepResearchResult.synthesizedResponse,
          researchUsed: true,
          researchTypes: deepResearchResult.phases.map(p => p.name),
          sources: deepResearchResult.allSources,
          citations: {},
          processingTimeMs: deepResearchResult.totalExecutionTimeMs,
          tier: 'deep_research' as MessageTier,
          confidence: deepResearchResult.overallConfidence,
          methodology: deepResearchResult.methodology,
          followUpSuggestions: [],
        };
        log.info("Response object built successfully");
      } else {
        // Use standard synthesis for quick mode or when deep research fails
        const synthesisStart = Date.now();
        response = await this.synthesisService.generateResponse(
          apiSafeMessage, // Use PII-sanitised message
          context,
          researchResult,
          history.map(m => ({ role: m.role, content: m.content })),
          learnedContext
        );
        
        // Log API call for security audit
        await logApiCall(sessionId, 'OpenAI-Synthesis', 'generate', true, Date.now() - synthesisStart);
      }
      
      // Sanitise the response before returning
      log.info("Sanitising response");
      response.message = sanitiseApiResponse(response.message);
      log.info({ length: response.message?.length || 0 }, "Response sanitised");

      // [6.5] ENFORCE VENDOR FIT FOR SME CLIENTS - Replace enterprise vendors with SME alternatives
      const vendorFitResult = enforceVendorFitForSME(response.message, context);
      if (vendorFitResult.wasModified) {
        log.info({ replacements: vendorFitResult.replacements }, "Replaced enterprise vendors for SME");
        response.message = vendorFitResult.modifiedResponse;
      }

      // [7] GENERATE FOLLOW-UP SUGGESTIONS (based on conversation history and assessment)
      log.info("Generating follow-up suggestions");
      const followUpSuggestions = await learningService.generateFollowUpSuggestions(
        cleanMessage, // Use sanitised message
        response.message,
        context,
        history.map(m => ({ role: m.role, content: m.content }))
      );
      response.followUpSuggestions = followUpSuggestions;
      log.info({ count: followUpSuggestions.length }, "Follow-up suggestions generated");

      sendUpdate('complete', 'Response ready', 100);

      // [8] SAVE MESSAGES
      log.info("Saving messages");
      await this.saveMessage(sessionId, 'user', userMessage);
      await this.saveMessage(sessionId, 'assistant', response.message, {
        researchUsed: response.researchUsed,
        researchTypes: response.researchTypes,
        sourcesCited: response.sources,
        citations: response.citations,
        processingTimeMs: response.processingTimeMs,
        processingStages: stages,
        tier: response.tier,
      });

      // [9] UPDATE LEAD SCORING
      await this.updateSessionStats(sessionId, userMessage);

      // [10] RECORD INTERACTION FOR LEARNING (async, don't await)
      learningService.recordInteraction(cleanMessage, response.message, context, true)
        .catch(err => log.error({ err: err instanceof Error ? err : new Error(String(err)) }, "Learning record error"));

      log.info("Response complete, returning to caller");
      return response;

    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error handling message");
      sendUpdate('error', 'An error occurred', 0);
      return this.createBlockedResponse(SAFE_RESPONSES.error, startTime);
    }
  }

  /**
   * Create or get a chat session
   */
  async createSession(
    sessionToken: string,
    assessmentId?: string,
    contactId?: string
  ): Promise<FcChatSession> {
    // Check for existing session
    const [existing] = await db
      .select()
      .from(fcChatSessions)
      .where(eq(fcChatSessions.sessionToken, sessionToken))
      .limit(1);

    if (existing) {
      // Update with assessment/contact if provided
      if ((assessmentId && !existing.assessmentId) || (contactId && !existing.contactId)) {
        const [updated] = await db
          .update(fcChatSessions)
          .set({
            assessmentId: assessmentId || existing.assessmentId,
            contactId: contactId || existing.contactId,
            updatedAt: new Date(),
          })
          .where(eq(fcChatSessions.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }

    // Create new session
    const [session] = await db
      .insert(fcChatSessions)
      .values({
        sessionToken,
        assessmentId,
        contactId,
        status: 'active',
      })
      .returning();

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<FcChatSession | null> {
    const [session] = await db
      .select()
      .from(fcChatSessions)
      .where(eq(fcChatSessions.id, sessionId))
      .limit(1);

    return session || null;
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<FcChatSession | null> {
    const [session] = await db
      .select()
      .from(fcChatSessions)
      .where(eq(fcChatSessions.sessionToken, token))
      .limit(1);

    return session || null;
  }

  /**
   * Get sessions by array of tokens (for chat history feature)
   */
  async getSessionsByTokens(tokens: string[]): Promise<FcChatSession[]> {
    if (tokens.length === 0) return [];
    
    const sessions = await db
      .select()
      .from(fcChatSessions)
      .where(inArray(fcChatSessions.sessionToken, tokens))
      .orderBy(desc(fcChatSessions.updatedAt));

    return sessions;
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await db
      .update(fcChatSessions)
      .set({ title, updatedAt: new Date() })
      .where(eq(fcChatSessions.id, sessionId));
  }

  /**
   * Get assessment context for personalization including actual question responses
   */
  async getAssessmentContext(assessmentId: string | null): Promise<AssessmentContext | null> {
    if (!assessmentId) return null;

    try {
      const [assessment] = await db
        .select()
        .from(fcAssessments)
        .where(eq(fcAssessments.id, assessmentId))
        .limit(1);

      if (!assessment) return null;

      // Get company info
      let company = null;
      if (assessment.companyId) {
        const [comp] = await db
          .select()
          .from(fcCompanies)
          .where(eq(fcCompanies.id, assessment.companyId))
          .limit(1);
        company = comp;
      }

      // Get actual question responses with question text for deeper context
      const responsesWithQuestions = await db
        .select({
          score: fcResponses.score,
          response: fcResponses.response,
          rawValue: fcResponses.rawValue,
          prompt: fcQuestions.prompt,
          dimension: fcQuestions.dimension,
        })
        .from(fcResponses)
        .innerJoin(fcQuestions, eq(fcResponses.questionId, fcQuestions.id))
        .where(eq(fcResponses.assessmentId, assessmentId));

      // Build key insights from responses
      const keyInsights: string[] = [];
      const challengeAreas: string[] = [];
      const strengthAreas: string[] = [];

      for (const resp of responsesWithQuestions) {
        const score = resp.score ?? 0;
        const questionText = resp.prompt || '';
        // Extract answer text from response JSON or rawValue
        let answerText = resp.rawValue || '';
        if (!answerText && resp.response) {
          const respData = resp.response as any;
          answerText = respData?.label || respData?.value || JSON.stringify(respData);
        }
        
        if (score <= 2 && questionText) {
          challengeAreas.push(`${questionText}: "${answerText}"`);
        } else if (score >= 4 && questionText) {
          strengthAreas.push(`${questionText}: "${answerText}"`);
        }
      }

      // Get dimension scores from assessment
      const dimensionScores = (assessment.dimensionScores as Record<string, number>) || {};

      // Find weakest and strongest dimensions
      let weakest = '';
      let strongest = '';
      let weakestScore = 5;
      let strongestScore = 0;

      for (const [dim, score] of Object.entries(dimensionScores)) {
        const numScore = score as number;
        if (numScore < weakestScore) {
          weakestScore = numScore;
          weakest = dim;
        }
        if (numScore > strongestScore) {
          strongestScore = numScore;
          strongest = dim;
        }
      }

      return {
        assessmentId,
        contactId: assessment.contactId || undefined,
        companyName: company?.name,
        industry: company?.sector || undefined,
        revenueMillions: company?.revenueMillions || undefined,
        entityCount: company?.entities || undefined,
        sizeBand: company?.sizeBand || undefined,
        employeeCount: company?.totalFte || undefined,
        dimensionScores,
        overallScore: assessment.overallMaturityScore || undefined,
        weakestDimension: weakest || undefined,
        strongestDimension: strongest || undefined,
        tier: assessment.tier,
        priorities: (assessment as any).priorities || [],
        keyInsights: keyInsights.slice(0, 10),
        challengeAreas: challengeAreas.slice(0, 8),
        strengthAreas: strengthAreas.slice(0, 5),
        responseCount: responsesWithQuestions.length,
      };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error getting assessment context");
      return null;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string, limit: number = 10): Promise<FcChatMessage[]> {
    const messages = await db
      .select()
      .from(fcChatMessages)
      .where(eq(fcChatMessages.sessionId, sessionId))
      .orderBy(desc(fcChatMessages.createdAt))
      .limit(limit);

    return messages.reverse();
  }

  /**
   * Save a message
   */
  private async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: {
      researchUsed?: boolean;
      researchTypes?: string[];
      sourcesCited?: string[];
      citations?: Record<string, string>;
      processingTimeMs?: number;
      processingStages?: ProcessingUpdate[];
      tier?: MessageTier;
    }
  ): Promise<FcChatMessage> {
    const [message] = await db
      .insert(fcChatMessages)
      .values({
        sessionId,
        role,
        content,
        researchUsed: metadata?.researchUsed,
        researchTypes: metadata?.researchTypes,
        sourcesCited: metadata?.sourcesCited,
        citations: metadata?.citations,
        processingTimeMs: metadata?.processingTimeMs,
        processingStages: metadata?.processingStages,
        tier: metadata?.tier,
      })
      .returning();

    return message;
  }

  /**
   * Update session stats and lead scoring
   */
  private async updateSessionStats(sessionId: string, userMessage: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const context = await this.getAssessmentContext(session.assessmentId);
    const signals = detectLeadSignals(userMessage);
    const existingSignals = (session.leadSignals as Record<string, boolean>) || {};
    const combinedSignals = { ...existingSignals, ...signals };
    const messageCount = (session.messageCount || 0) + 1;
    const leadScore = calculateLeadScore(context, combinedSignals, messageCount);

    await db
      .update(fcChatSessions)
      .set({
        messageCount: sql`${fcChatSessions.messageCount} + 1`,
        lastMessageAt: new Date(),
        leadScore,
        leadSignals: combinedSignals,
        updatedAt: new Date(),
      })
      .where(eq(fcChatSessions.id, sessionId));

    // Log high-intent leads
    if (leadScore > 0.7 && signals.advisoryInterest) {
      log.info({ sessionId, leadScore: leadScore.toFixed(2) }, "HIGH INTENT LEAD");
    }
  }

  /**
   * Create a blocked/guardrail response
   */
  private createBlockedResponse(message: string, startTime: number): ChatbotResponse {
    return {
      message,
      researchUsed: false,
      researchTypes: [],
      sources: [],
      citations: {},
      processingTimeMs: Date.now() - startTime,
      tier: 'local',
      guardrailTriggered: true,
    };
  }
}

// Singleton instance
let chatbotService: ChatbotService | null = null;

export function getChatbotService(): ChatbotService {
  if (!chatbotService) {
    chatbotService = new ChatbotService();
  }
  return chatbotService;
}
