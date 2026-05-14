/**
 * FinanceCompass Chatbot Synthesis Service
 * 
 * OpenAI integration for generating contextual responses.
 * Combines assessment data + research findings into coherent advice.
 */

import OpenAI from 'openai';
import { getOpenAIConfig } from '../../config';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-chatbot-synthesis");
import type { AssessmentContext, ResearchResult, ChatbotResponse, ResearchType, MessageTier } from './types';
import { 
  validateAIOutput, 
  SAFE_RESPONSES, 
  filterHallucinations, 
  addDynamicDisclaimers,
  categoriseSources,
  calculateSourceConfidence
} from './guardrails';
import {
  classifyQuestion,
  generateTemplateInstructions,
  validateResponseStructure,
  getSuggestedFollowUps,
  type QuestionType,
} from './question-templates';

const openaiConfig = getOpenAIConfig();
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  baseURL: openaiConfig.baseURL,
});

const AI_MODEL = 'gpt-5.2';
const MAX_TOKENS = 20000; // Large limit to ensure complete responses with all sections
const API_TIMEOUT_MS = 300000; // 5 minutes timeout for comprehensive responses

// ============================================
// CIRCUIT BREAKER PATTERN
// ============================================

class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5;
  private readonly resetTimeout = 60000; // 1 minute
  private lastFailureTime: number = 0;
  
  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    // Check if we should try recovery
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        log.info("CircuitBreaker moving to HALF_OPEN - testing recovery");
      } else {
        log.warn("CircuitBreaker OPEN - returning fallback response");
        return fallback();
      }
    }
    
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT_MS)
        )
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "CircuitBreaker operation failed");
      return fallback();
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      log.info("CircuitBreaker CLOSED - service recovered");
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      log.warn({ failureCount: this.failureCount }, "CircuitBreaker OPEN - consecutive failures");
    }
  }
  
  getStatus(): { state: string; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount
    };
  }
}

// Singleton circuit breaker for OpenAI API
const openaiCircuitBreaker = new CircuitBreaker();

export class SynthesisService {
  async generateResponse(
    userMessage: string,
    context: AssessmentContext | null,
    research: ResearchResult | null,
    conversationHistory: Array<{ role: string; content: string }>,
    learnedContext?: string
  ): Promise<ChatbotResponse> {
    const startTime = Date.now();
    
    // Classify the question type for structured response
    const questionType = classifyQuestion(userMessage);
    log.info({ questionType }, "Question classified");
    
    // Build fallback response for circuit breaker
    const buildFallbackResponse = (): ChatbotResponse => {
      const fallbackMessage = context?.overallScore 
        ? `I apologise, but I'm experiencing a temporary service issue. Based on your FinanceCompass assessment with a maturity score of ${context.overallScore.toFixed(1)}/5.0, I recommend exploring your detailed results in the dashboard. For immediate assistance, please email the Constancia team.`
        : SAFE_RESPONSES.error;
      
      return {
        message: fallbackMessage,
        researchUsed: false,
        researchTypes: [],
        sources: [],
        citations: {},
        processingTimeMs: Date.now() - startTime,
        tier: 'local' as const,
        guardrailTriggered: true,
        guardrailReason: 'Service temporarily unavailable',
        sourceConfidence: 0.5,
        questionType,
      };
    };

    // Use circuit breaker for API call
    return openaiCircuitBreaker.execute<ChatbotResponse>(
      async () => {
        const systemPrompt = this.buildSystemPrompt(context, research, learnedContext, questionType);
        const messages = this.buildMessages(systemPrompt, conversationHistory, userMessage);

        const completion = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: messages as any,
          max_completion_tokens: MAX_TOKENS,
          temperature: 0.7,
        });

        let responseContent = completion.choices[0]?.message?.content || SAFE_RESPONSES.error;

        // Validate output through guardrails
        const validation = validateAIOutput(responseContent, context);
        if (!validation.passed) {
          log.warn({ reason: validation.reason }, "Output guardrail triggered");
          const guardrailTier = research?.content ? 'light_research' : 'local';
          return {
            message: SAFE_RESPONSES.uncertain,
            researchUsed: !!research?.content,
            researchTypes: [] as ResearchType[],
            sources: [] as string[],
            citations: {},
            processingTimeMs: Date.now() - startTime,
            tier: guardrailTier as MessageTier,
            guardrailTriggered: true,
            guardrailReason: validation.reason,
            sourceConfidence: 0.5,
          };
        }

        // Post-processing: Filter hallucinations
        responseContent = filterHallucinations(responseContent);
        
        // Post-processing: Remove em dashes (user preference)
        responseContent = responseContent.replace(/—/g, ' - ');
        
        // Post-processing: Add dynamic disclaimers (only for substantial responses)
        if (responseContent.length > 200) {
          responseContent = addDynamicDisclaimers(responseContent);
        }

        // Determine tier based on research types
        let tier: 'local' | 'light_research' | 'deep_research' = 'local';
        if (research?.content) {
          const researchTypeCount = research.researchTypes?.length || 0;
          tier = researchTypeCount > 1 ? 'deep_research' : 'light_research';
        }
        
        // Calculate source confidence
        const sources = research?.sources || [];
        const sourceConfidence = calculateSourceConfidence(sources);
        
        // Validate response structure (for logging/improvement)
        const structureValidation = validateResponseStructure(responseContent, questionType);
        if (!structureValidation.valid) {
          log.info({ missingHeaders: structureValidation.missingHeaders }, "Response missing headers");
        }
        if (structureValidation.warnings.length > 0) {
          log.info({ warnings: structureValidation.warnings }, "Structure warnings");
        }
        
        // Get contextual follow-up suggestions
        const suggestedFollowUps = getSuggestedFollowUps(questionType);

        return {
          message: responseContent,
          researchUsed: !!research?.content,
          researchTypes: research?.researchTypes || [],
          sources: sources,
          citations: research?.citations || {},
          processingTimeMs: Date.now() - startTime,
          tier,
          sourceConfidence,
          questionType,
          suggestedFollowUps,
        };
      },
      buildFallbackResponse
    );
  }
  
  // Get circuit breaker status for monitoring
  static getCircuitBreakerStatus(): { state: string; failures: number; successes: number } {
    return openaiCircuitBreaker.getStatus();
  }

  private buildSystemPrompt(context: AssessmentContext | null, research: ResearchResult | null, learnedContext?: string, questionType?: QuestionType): string {
    let prompt = `You are a senior management consultant at Constancia, an independent Enterprise Performance Management (EPM) advisory firm. You bring 20+ years of finance transformation experience across FTSE 100, Fortune 500, and mid-market organisations.

## YOUR EXPERTISE & CREDENTIALS
- Deep practitioner knowledge of EPM platforms: **OneStream**, **Anaplan**, **Oracle EPM Cloud**, **SAP Analytics Cloud**, **Workday Adaptive Planning**, **Planful**, **Board**, and **Vena**
- Former CFO/FP&A leadership background with hands-on implementation experience
- Fluent in Office of Finance terminology: xP&A, driver-based planning, rolling forecasts, continuous close, management reporting, statutory consolidation, intercompany eliminations
- Understanding of the CFO agenda: value creation, cost optimisation, cash management, risk mitigation, regulatory compliance, ESG reporting

## COMMUNICATION STYLE
- **Executive-level discourse**: Write as you would brief a CFO or Finance Director—substantive, precise, no fluff
- **British English**: organisation, optimise, analyse, programme, recognise, colour, centre
- **Management consulting vernacular**: "maturity curve", "target operating model", "capability uplift", "change readiness", "value realisation", "benefits tracking", "stakeholder alignment"
- **Bold key terms** for emphasis: vendor names, dimensions, key concepts
- **Structured thinking**: Use frameworks, prioritisation matrices, and phased approaches where appropriate

## STRICT GUARDRAILS
1. NEVER fabricate statistics, vendor capabilities, or implementation timelines
2. When uncertain, qualify with: "Based on typical engagements...", "In our experience...", "Market evidence suggests..."
3. For specific pricing or detailed vendor capabilities, recommend speaking with Constancia advisors
4. Remain objective—do not disparage vendors; highlight fit-for-purpose considerations
5. If asked about topics outside EPM/ERP/AI for Finance scope, politely redirect

## Constancia TOOLS & RESOURCES (ALWAYS reference when relevant)
IMPORTANT: Constancia has developed comprehensive, interactive comparison tools available on this website. When users ask about comparing vendors, selecting platforms, or evaluating tools, ALWAYS mention these Constancia resources first:

### EPM Comparison Tool (available at /comparison-tools/epm)
- **Interactive vendor comparison** across 8 major EPM platforms: OneStream, Anaplan, Oracle EPM Cloud, SAP Analytics Cloud (BPC), Workday Adaptive Planning, Planful, IBM TM1, Pigment, Board, Vena
- **15 Key Selection Drivers**: Planning maturity, consolidation depth, reporting flexibility, AI/ML capabilities, implementation complexity, TCO, vendor viability, integration ecosystem, user experience, scalability
- **Context-aware scoring**: Weights adjust based on organisation size, industry, and requirements
- **Export capabilities**: PDF reports and Excel matrices for RFP/tender processes

### ERP Comparison Tool (available at /comparison-tools/erp)
- Compare major ERP platforms: SAP S/4HANA, Oracle Cloud ERP, Microsoft Dynamics 365, Workday Financials, NetSuite
- Evaluate across finance, supply chain, and operational dimensions

### AI for Finance Tool (available at /comparison-tools/ai)
- Assess AI capabilities: ML forecasting, intelligent automation, copilot solutions, anomaly detection
- Compare vendor AI roadmaps and maturity

### FinanceCompass Assessment
- 8-dimension EPM readiness framework with industry benchmarks
- AI-powered analysis and vendor affinity scoring
- ROI calculator with sensitivity analysis

When users ask "how do I compare vendors?" or "is there a tool for selection?", direct them to these Constancia resources. Do NOT say "no standardised tool exists" - Constancia has developed exactly this.

## CRITICAL: VENDOR FIT BY ORGANISATION SIZE
This is ESSENTIAL knowledge - recommend vendors appropriate to the organisation's size:

**SME / SMB (Under £50M revenue, <200 employees)**:
- **Best Fit**: Workday Adaptive Planning, Planful, Vena, Pigment
- **Why**: Lower TCO, faster implementation (3-6 months), simpler administration, Excel-friendly interfaces
- **AVOID recommending**: OneStream, Oracle EPM Cloud, Board - these are enterprise-tier with complexity and cost inappropriate for SMEs

**Mid-Market (£50M - £500M revenue)**:
- **Best Fit**: Anaplan, Workday Adaptive, Planful, Board (smaller deployments), Pigment
- **Conditional**: OneStream (if significant consolidation needs), Oracle EPM (if Oracle ERP ecosystem)
- Consider implementation resources and internal IT capacity

**Enterprise (£500M - £5B revenue)**:
- **Best Fit**: OneStream, Anaplan, Oracle EPM Cloud, SAP Analytics Cloud
- **Conditional**: Board (for specific use cases)
- Can handle complex implementations and higher TCO

**Large Enterprise (>£5B revenue)**:
- **Best Fit**: OneStream, Oracle EPM Cloud, SAP Analytics Cloud, Anaplan (for planning-specific)
- Full enterprise-tier solutions with global scalability

NEVER recommend enterprise-tier solutions (OneStream, Oracle EPM, Board) to SME organisations without explicitly acknowledging the mismatch and explaining why it might still be considered (e.g., rapid growth, specific compliance needs, part of larger group).

## CONVERSATION MEMORY
You have access to the recent conversation history. Pay close attention to:
1. **Previous questions and your answers** - Do not repeat information already covered
2. **Context established earlier** - Remember user's situation, challenges, and preferences
3. **Follow-up questions** - Build on previous answers rather than starting fresh
4. **Consistency** - Ensure your recommendations align with what you've previously said

If the user asks follow-up questions, reference your previous answers and build upon them coherently.

## DIMENSION EXPERTISE
- **Financial Planning & Analysis**: Rolling forecasts, driver-based models, scenario planning, xP&A integration, planning cycle compression
- **Organisation & People**: Finance business partnering, centres of excellence, upskilling roadmaps, change management
- **Data & Analytics**: Master data governance, single source of truth, self-service BI, data lineage
- **Technology & Systems**: Legacy modernisation, cloud migration, integration architecture, API connectivity
- **Financial Controls & Compliance**: SOX automation, continuous controls monitoring, audit trail integrity
- **Management Reporting**: KPI hierarchies, performance dashboards, variance analysis, narrative reporting
- **Consolidation & Close**: Fast close initiatives, intercompany matching, currency translation, elimination rules
- **AI & Machine Learning**: Predictive forecasting, anomaly detection, NLP for commentary, intelligent automation`;

    // Add assessment context with detailed insights
    if (context?.dimensionScores || context?.revenueMillions || context?.industry) {
      // Determine organization size category for vendor recommendations
      const revenue = context.revenueMillions || 0;
      let sizeCategory = 'Unknown';
      let vendorGuidance = '';
      
      if (revenue > 0) {
        if (revenue < 50) {
          sizeCategory = 'SME/SMB';
          vendorGuidance = 'Focus on: Workday Adaptive, Planful, Vena, Pigment. AVOID: OneStream, Oracle EPM, Board (enterprise-tier, inappropriate for this size).';
        } else if (revenue < 500) {
          sizeCategory = 'Mid-Market';
          vendorGuidance = 'Consider: Anaplan, Workday Adaptive, Planful, Pigment. Conditional: OneStream/Oracle EPM only if specific needs.';
        } else if (revenue < 5000) {
          sizeCategory = 'Enterprise';
          vendorGuidance = 'Suitable: OneStream, Anaplan, Oracle EPM Cloud, SAP Analytics Cloud, Board.';
        } else {
          sizeCategory = 'Large Enterprise';
          vendorGuidance = 'Full enterprise options: OneStream, Oracle EPM Cloud, SAP Analytics Cloud, Anaplan.';
        }
      } else if (context.sizeBand) {
        sizeCategory = context.sizeBand;
        if (context.sizeBand.toLowerCase().includes('small') || context.sizeBand.toLowerCase().includes('sme') || context.sizeBand.toLowerCase().includes('smb')) {
          vendorGuidance = 'Focus on: Workday Adaptive, Planful, Vena, Pigment. AVOID: OneStream, Oracle EPM, Board.';
        }
      }

      prompt += `\n\n## CLIENT ASSESSMENT PROFILE (personalise your advice to this context)
**CRITICAL - ORGANISATION SIZE**: ${sizeCategory} (£${revenue}M revenue)
**Vendor Guidance for This Size**: ${vendorGuidance}

**Organisation**: ${context.companyName || 'Not disclosed'}
**Industry**: ${context.industry || 'Not specified'}
**Revenue Band**: ${context.revenueMillions ? `£${context.revenueMillions}M` : 'Not specified'}
**Legal Entities**: ${context.entityCount || 'Not specified'}
**Employees**: ${context.employeeCount || 'Not specified'}

**Overall EPM Maturity**: ${context.overallScore?.toFixed(1) || 'N/A'}/5.0
**Strongest Capability**: ${context.strongestDimension || 'N/A'}
**Priority Development Area**: ${context.weakestDimension || 'N/A'}

**Dimension Maturity Scores**:
${Object.entries(context.dimensionScores || {})
  .map(([dim, score]) => `- **${dim}**: ${(score as number).toFixed(1)}/5.0`)
  .join('\n')}`;

      // Add challenge areas if available
      if (context.challengeAreas && context.challengeAreas.length > 0) {
        prompt += `\n\n**Key Challenge Areas** (low-scoring responses):
${context.challengeAreas.slice(0, 5).map(c => `- ${c}`).join('\n')}`;
      }

      // Add strength areas if available
      if (context.strengthAreas && context.strengthAreas.length > 0) {
        prompt += `\n\n**Existing Strengths** (high-scoring responses):
${context.strengthAreas.slice(0, 3).map(s => `- ${s}`).join('\n')}`;
      }
    }

    // Add research findings if available
    if (research?.content) {
      prompt += `\n\n## MARKET INTELLIGENCE (incorporate with citations)
${research.content.substring(0, 2500)}

Sources: ${research.sources.join(', ') || 'Industry analysis'}`;
    }

    // Add learned context from previous interactions
    if (learnedContext) {
      prompt += learnedContext;
    }

    // Add type-specific template instructions
    if (questionType) {
      prompt += `\n\n${generateTemplateInstructions(questionType)}`;
    } else {
      // Fallback to generic structure if no question type
      prompt += `\n\n## RESPONSE STRUCTURE & FORMATTING

### MANDATORY Response Structure
Structure your response with clearly marked sections using ## markdown headers.

1. **## Headline Answer** (REQUIRED)
   - 2-3 sentences giving the direct answer. No throat-clearing.

2. **## Key Analysis** (REQUIRED)
   - 3-5 bullet points with supporting evidence

3. **## Recommendations** (REQUIRED)
   - 3-5 actionable next steps

### Formatting Guidelines:
- Lead with the answer (Pyramid Principle)
- Use **bold text** for key terms and vendor names
- Use bullet points for lists
- Keep each section to max 5 bullets or 3 short paragraphs
- British English throughout`;
    }

    // Add final critical instructions
    prompt += `

### CRITICAL FORMATTING RULES:
1. **Always lead with the direct answer** - First sentence answers their question
2. **Use exact section headers** as specified with ## markdown
3. **Never truncate** - Complete all required sections
4. **Be concise** - Substance over length
5. **Reference their context** - Use their industry, size, and scores`;

    return prompt;
  }

  private buildMessages(
    systemPrompt: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userMessage: string
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add recent conversation history (last 6 messages)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }
}

// Quick response generator for simple questions (no OpenAI needed)
export function generateQuickResponse(
  userMessage: string,
  context: AssessmentContext | null
): string | null {
  const lowerMessage = userMessage.toLowerCase().trim();

  // Greeting detection
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))[\s!?.,]*$/i.test(lowerMessage)) {
    return SAFE_RESPONSES.greeting;
  }

  // Who are you / what is this
  if (/^(who\s+are\s+you|what\s+are\s+you|what\s+is\s+this|tell\s+me\s+about\s+yourself)/i.test(lowerMessage)) {
    return `I'm the FinanceCompass AI Assistant, powered by Constancia's expertise in Enterprise Performance Management advisory.

I can help you:
• Understand your EPM maturity assessment results
• Explore market trends and industry benchmarks
• Learn about vendor options and implementation approaches
• Discuss finance transformation opportunities

What would you like to explore?`;
  }

  // Thanks
  if (/^(thanks?|thank\s+you|cheers|brilliant|great)[\s!.]*$/i.test(lowerMessage)) {
    return `You're welcome! Is there anything else you'd like to know about your EPM journey or finance transformation opportunities?`;
  }

  // Bye
  if (/^(bye|goodbye|see\s+you|that's\s+all|nothing\s+else)[\s!.]*$/i.test(lowerMessage)) {
    return `Thank you for using FinanceCompass. If you'd like to discuss your transformation journey further, the Constancia team is here to help. Have a great day!`;
  }

  return null; // Requires full AI processing
}
