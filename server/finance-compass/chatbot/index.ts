/**
 * FinanceCompass Chatbot Module
 * 
 * AI-powered assistant for EPM advisory.
 */

export { default as chatbotRoutes } from './routes';
export { getChatbotService, ChatbotService } from './chatbot-service';
export { ResearchService, buildResearchQuery } from './research-service';
export { DeepResearchService, deepResearchService } from './deep-research-service';
export { SynthesisService, generateQuickResponse } from './synthesis-service';
export * from './guardrails';
export * from './types';
