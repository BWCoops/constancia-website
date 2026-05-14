/**
 * FinanceCompass Deep Research Service
 * 
 * Multi-turn research protocol that decomposes complex queries into
 * 4 research phases, executes sequential Perplexity API calls,
 * validates findings, and synthesizes comprehensive responses.
 * 
 * Architecture:
 * [1] DECOMPOSE → 4 research phases
 * [2] EXPLORE → Sequential Perplexity calls with context enrichment
 * [3] AGGREGATE → Combine findings
 * [4] VALIDATE → Cross-reference, detect conflicts
 * [5] SYNTHESIZE → OpenAI synthesis with Big 4 consulting templates
 */

import OpenAI from 'openai';
import { getOpenAIConfig } from '../../config';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-deep-research");
import type { AssessmentContext, ProcessingUpdate, QuestionType } from './types';
import { classifyQuestion, generateTemplateInstructions, validateResponseStructure, getTemplate } from './question-templates';
import { calculateVendorAffinity, getVendorRecommendations, type DimensionScores, type OrganizationProfile } from '@shared/vendor-affinity';

const OPENAI_SYNTHESIS_TIMEOUT_MS = 60000; // 1 minute timeout for synthesis

const openaiConfig = getOpenAIConfig();
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  baseURL: openaiConfig.baseURL,
});

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar-pro"; // Advanced search model

export interface ResearchPhase {
  name: string;
  purpose: string;
  query: string;
  findings: string;
  sources: string[];
  confidence: number;
  executionTimeMs: number;
}

export interface DeepResearchResult {
  originalQuery: string;
  phases: ResearchPhase[];
  aggregatedFindings: string;
  conflicts: string[];
  validationNotes: string;
  synthesizedResponse: string;
  allSources: string[];
  overallConfidence: number;
  totalExecutionTimeMs: number;
  methodology: string;
}

export class DeepResearchService {
  private apiKey: string | undefined;

  constructor() {
    const rawKey = process.env.PERPLEXITY_API_KEY;
    // Clean up the API key - remove any whitespace, newlines, or quotes
    this.apiKey = rawKey?.trim().replace(/[\r\n\t"']/g, '');
    
    if (this.apiKey) {
      log.info({ keyLength: this.apiKey.length }, "API key configured");
      
      // Validate key format - Perplexity keys start with 'pplx-' and are ~40 chars
      if (!this.apiKey.startsWith('pplx-')) {
        log.warn({ keyPrefix: this.apiKey.substring(0, 10) }, "API key does not start with 'pplx-' - may be invalid");
      }
      if (this.apiKey.length > 60) {
        log.warn({ keyLength: this.apiKey.length }, "API key unusually long - checking for embedded newlines or extra data");
      }
    } else {
      log.warn("PERPLEXITY_API_KEY not configured");
    }
  }

  /**
   * Execute deep research with multi-turn protocol
   */
  async executeDeepResearch(
    userMessage: string,
    context: AssessmentContext | null,
    mode: 'quick' | 'hybrid' | 'deep' = 'hybrid',
    onProgress?: (update: ProcessingUpdate) => void
  ): Promise<DeepResearchResult> {
    const startTime = Date.now();
    
    const sendUpdate = (stage: ProcessingUpdate['stage'], message: string, progress: number) => {
      if (onProgress) {
        onProgress({ stage, message, progress, timestamp: new Date() });
      }
    };

    if (!this.apiKey) {
      log.error("No API key available");
      return this.createEmptyResult(userMessage, startTime, 'API key not configured');
    }

    try {
      // Phase 1: DECOMPOSE - Break into research phases
      sendUpdate('researching', 'Decomposing your question into research phases...', 5);
      const phases = this.decomposeQuery(userMessage, context);
      log.info({ phaseCount: phases.length }, "Decomposed into research phases");

      // Determine execution strategy based on mode
      const phasesToExecute = mode === 'quick' ? phases.slice(0, 2) : phases;
      
      // Phase 2: EXPLORE - Execute sequential API calls
      const executedPhases: ResearchPhase[] = [];
      let previousFindings = '';

      for (let i = 0; i < phasesToExecute.length; i++) {
        const phase = phasesToExecute[i];
        const progressPercent = 10 + (i * 20);
        sendUpdate('researching', `Researching: ${phase.name}...`, progressPercent);
        
        log.info({ phase: i + 1, total: phasesToExecute.length, name: phase.name }, "Executing research phase");
        
        const phaseResult = await this.executeResearchPhase(
          phase,
          previousFindings,
          context
        );
        
        executedPhases.push(phaseResult);
        
        // Build context for next phase
        if (phaseResult.findings) {
          previousFindings += `\n\n${phase.name}: ${phaseResult.findings.substring(0, 500)}...`;
        }
      }

      // Phase 3: AGGREGATE - Combine findings
      sendUpdate('analyzing', 'Aggregating research findings...', 75);
      const aggregatedFindings = this.aggregateFindings(executedPhases);
      log.info({ phaseCount: executedPhases.length }, "Aggregated research phases");

      // Phase 4: VALIDATE - Check for conflicts
      sendUpdate('analyzing', 'Validating and cross-referencing...', 85);
      const { conflicts, validationNotes } = this.validateFindings(executedPhases);
      
      if (conflicts.length > 0) {
        log.info({ conflictCount: conflicts.length }, "Found conflicts, running validation");
      }

      // Phase 5: SYNTHESIZE - Use OpenAI with Big 4 consulting templates
      sendUpdate('synthesizing', 'Synthesizing comprehensive response...', 95);
      const synthesizedResponse = await this.synthesizeWithOpenAI(
        userMessage,
        executedPhases,
        aggregatedFindings,
        conflicts,
        context
      );

      // Collect all sources
      const allSources = this.collectAllSources(executedPhases);
      
      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(executedPhases, conflicts);

      sendUpdate('complete', 'Research complete', 100);

      const result: DeepResearchResult = {
        originalQuery: userMessage,
        phases: executedPhases,
        aggregatedFindings,
        conflicts,
        validationNotes,
        synthesizedResponse,
        allSources,
        overallConfidence,
        totalExecutionTimeMs: Date.now() - startTime,
        methodology: this.describeMethodology(executedPhases)
      };

      log.info({ totalExecutionTimeMs: result.totalExecutionTimeMs, confidence: result.overallConfidence.toFixed(2) }, "Deep research complete");
      
      return result;
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Deep research error");
      return this.createEmptyResult(userMessage, startTime, String(error));
    }
  }

  /**
   * Phase 1: DECOMPOSE - Break complex query into research phases
   */
  private decomposeQuery(userMessage: string, context: AssessmentContext | null): ResearchPhase[] {
    const lowerMessage = userMessage.toLowerCase();
    
    // Create context-aware research phases
    const contextInfo = context ? this.buildContextSummary(context) : '';
    
    const phases: ResearchPhase[] = [
      {
        name: 'Current State Research',
        purpose: 'Understand current market trends and 2025-2026 developments',
        query: this.buildPhaseQuery(
          userMessage,
          'current market trends, adoption rates, and recent developments in EPM, CPM, and finance transformation. Focus on 2025-2026 data.',
          contextInfo
        ),
        findings: '',
        sources: [],
        confidence: 0,
        executionTimeMs: 0
      },
      {
        name: 'Vendor & Solution Analysis',
        purpose: 'Analyse relevant tools, platforms, and vendor capabilities',
        query: this.buildPhaseQuery(
          userMessage,
          'EPM and CPM vendor capabilities, solution comparison, pricing models, and platform strengths. Include OneStream, Anaplan, Oracle EPM, SAP, Workday Adaptive, Planful.',
          contextInfo
        ),
        findings: '',
        sources: [],
        confidence: 0,
        executionTimeMs: 0
      },
      {
        name: 'Implementation & ROI',
        purpose: 'Research implementation approaches, timelines, and business value',
        query: this.buildPhaseQuery(
          userMessage,
          'EPM implementation best practices, typical timelines, ROI metrics, success factors, and case studies. Focus on documented outcomes.',
          contextInfo
        ),
        findings: '',
        sources: [],
        confidence: 0,
        executionTimeMs: 0
      },
      {
        name: 'Industry Context',
        purpose: 'Provide industry benchmarks and best practices',
        query: this.buildPhaseQuery(
          userMessage,
          'finance function benchmarks, industry best practices, maturity models, and leading practices by sector.',
          contextInfo
        ),
        findings: '',
        sources: [],
        confidence: 0,
        executionTimeMs: 0
      }
    ];

    // Filter phases based on query content
    return this.selectRelevantPhases(phases, lowerMessage);
  }

  /**
   * Build phase-specific query with context
   */
  private buildPhaseQuery(originalQuery: string, phaseContext: string, assessmentContext: string): string {
    let query = `Research question: ${originalQuery}\n\nFocus area: ${phaseContext}`;
    
    if (assessmentContext) {
      query += `\n\nCustomer context: ${assessmentContext}`;
    }
    
    return query;
  }

  /**
   * Select relevant phases based on query content
   */
  private selectRelevantPhases(phases: ResearchPhase[], query: string): ResearchPhase[] {
    const selected: ResearchPhase[] = [];
    
    // Always include current state
    selected.push(phases[0]);
    
    // Include vendor analysis if mentioned
    if (/vendor|platform|tool|software|solution|compare|onestream|anaplan|oracle|sap|workday|planful/i.test(query)) {
      selected.push(phases[1]);
    }
    
    // Include ROI if mentioned
    if (/roi|return|benefit|cost|value|implement|timeline|project/i.test(query)) {
      selected.push(phases[2]);
    }
    
    // Include industry context if mentioned
    if (/benchmark|industry|best.?practice|maturity|peer|standard/i.test(query)) {
      selected.push(phases[3]);
    }
    
    // If only current state, add at least one more phase
    if (selected.length === 1) {
      selected.push(phases[1]); // Default to vendor analysis
    }
    
    return selected;
  }

  /**
   * Phase 2: EXPLORE - Execute a single research phase
   */
  private async executeResearchPhase(
    phase: ResearchPhase,
    previousFindings: string,
    context: AssessmentContext | null
  ): Promise<ResearchPhase> {
    const phaseStartTime = Date.now();
    
    try {
      // Build enriched query with previous findings context
      let enrichedQuery = phase.query;
      
      if (previousFindings) {
        enrichedQuery += `\n\nPrevious research findings for context:\n${previousFindings}`;
      }

      const systemPrompt = `You are a senior EPM advisory expert conducting research for a finance transformation consultation on behalf of 1QG, an independent EPM advisory firm.

RESEARCH PHASE: ${phase.name}
PURPOSE: ${phase.purpose}

CONTEXT: This research is being conducted through 1QG's FinanceCompass platform, which provides:
- Interactive EPM Comparison Tool (8+ vendors, 15 selection drivers)
- ERP Comparison Tool (SAP, Oracle, Microsoft, Workday, NetSuite)
- AI for Finance assessment tool
- 8-dimension EPM readiness framework with industry benchmarks

CRITICAL RULES:
1. Provide factual, data-driven insights with specific statistics where available
2. Cite sources for all claims - include URLs or publication names
3. Use British English throughout
4. Focus on EPM, CPM, finance transformation, FP&A, and financial close topics
5. Be specific about vendor capabilities and avoid generic statements
6. Include recent data from 2024-2026 where possible
7. Acknowledge uncertainty with phrases like "Based on available data" rather than making absolute claims
8. Do NOT say "no standardised tool exists" for vendor comparison - 1QG has developed comprehensive comparison tools`;

      const response = await this.callPerplexityAPI(systemPrompt, enrichedQuery);
      
      return {
        ...phase,
        findings: response.content,
        sources: response.sources,
        confidence: this.calculatePhaseConfidence(response),
        executionTimeMs: Date.now() - phaseStartTime
      };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)), phaseName: phase.name }, "Research phase failed");
      return {
        ...phase,
        findings: '',
        sources: [],
        confidence: 0,
        executionTimeMs: Date.now() - phaseStartTime
      };
    }
  }

  /**
   * Call Perplexity API with proper format
   */
  private async callPerplexityAPI(
    systemPrompt: string,
    userQuery: string
  ): Promise<{ content: string; sources: string[] }> {
    log.info("Calling Perplexity API");
    
    const requestBody = {
      model: PERPLEXITY_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuery }
      ],
      max_tokens: 2000,
      temperature: 0.2,
      top_p: 0.9,
      return_related_questions: false,
      search_recency_filter: 'year'
    };

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorBody: errorText.substring(0, 500) }, "Perplexity API error");
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    log.info({ citationCount: data.citations?.length || 0 }, "Perplexity API success");
    
    const content = data.choices?.[0]?.message?.content || '';
    const sources = data.citations || [];
    
    return { content, sources };
  }

  /**
   * Phase 3: AGGREGATE - Combine findings from all phases
   */
  private aggregateFindings(phases: ResearchPhase[]): string {
    const successfulPhases = phases.filter(p => p.findings);
    
    if (successfulPhases.length === 0) {
      return '';
    }

    const aggregated = successfulPhases
      .map(p => `## ${p.name}\n${p.findings}`)
      .join('\n\n---\n\n');

    return aggregated;
  }

  /**
   * Phase 4: VALIDATE - Check for conflicts between phases
   */
  private validateFindings(phases: ResearchPhase[]): { conflicts: string[]; validationNotes: string } {
    const conflicts: string[] = [];
    const successfulPhases = phases.filter(p => p.findings);
    
    // Check for timeline conflicts
    const timelinePatterns = successfulPhases.map(p => {
      const matches = p.findings.match(/(\d+)\s*(weeks?|months?|days?)/gi);
      return { phase: p.name, timelines: matches || [] };
    });
    
    // Check for ROI conflicts
    const roiPatterns = successfulPhases.map(p => {
      const matches = p.findings.match(/(\d+)%?\s*(roi|return|benefit|savings?)/gi);
      return { phase: p.name, roi: matches || [] };
    });

    // Simple conflict detection - if timelines vary significantly
    if (timelinePatterns.filter(t => t.timelines.length > 0).length > 1) {
      // Check for major discrepancies
      const allTimelines = timelinePatterns.flatMap(t => t.timelines);
      if (allTimelines.length >= 2) {
        conflicts.push('Timeline estimates vary across sources - recommend validation with specific vendor');
      }
    }

    const validationNotes = conflicts.length > 0
      ? `Found ${conflicts.length} potential conflict(s) requiring validation.`
      : 'No significant conflicts detected across research phases.';

    return { conflicts, validationNotes };
  }

  /**
   * Phase 5: SYNTHESIZE - Use OpenAI with Big 4 consulting templates
   */
  private async synthesizeWithOpenAI(
    originalQuery: string,
    phases: ResearchPhase[],
    aggregatedFindings: string,
    conflicts: string[],
    context: AssessmentContext | null
  ): Promise<string> {
    const successfulPhases = phases.filter(p => p.findings);
    
    if (successfulPhases.length === 0) {
      return 'I was unable to gather sufficient research data to provide a comprehensive response. Please try rephrasing your question or ask about a specific aspect of EPM.';
    }

    // Classify the question and get template instructions
    const questionType = classifyQuestion(originalQuery);
    log.info({ questionType }, "Question classified");
    const templateInstructions = generateTemplateInstructions(questionType);

    // Build context summary for the prompt
    let contextSummary = '';
    let vendorAffinitySection = '';
    
    if (context) {
      contextSummary = `
## USER'S ASSESSMENT CONTEXT
- Industry: ${context.industry || 'Not specified'}
- Company: ${context.companyName || 'Not specified'}
- Revenue: ${context.revenueMillions ? `£${context.revenueMillions}M` : 'Not specified'}
- Overall EPM Maturity Score: ${context.overallScore?.toFixed(0) || 'Not assessed'}%
- Number of Entities: ${context.entityCount || 'Not specified'}
- Priorities: ${context.priorities?.join(', ') || 'Not specified'}
- Weakest Dimension: ${context.weakestDimension || 'Not specified'}
- Strongest Dimension: ${context.strongestDimension || 'Not specified'}
`;

      // Calculate vendor affinity for ALL question types to ground responses in 1QG's IP
      // This ensures every response is informed by the comparison tool's vendor analysis
      if (context.dimensionScores) {
        try {
          const rawScores = context.dimensionScores;
          const scoreValues = Object.values(rawScores).filter((v): v is number => typeof v === 'number' && v > 0);
          const scoredDimensionCount = scoreValues.length;
          
          // Require at least 4 dimensions for meaningful vendor affinity calculation
          const MIN_DIMENSIONS_REQUIRED = 4;
          
          if (scoredDimensionCount >= MIN_DIMENSIONS_REQUIRED) {
            // Detect scale: if max score > 5, assume 0-100 and scale down; otherwise assume 0-5
            const maxScore = Math.max(...scoreValues);
            const needsScaling = maxScore > 5;
            
            const scaledScores: DimensionScores = {};
            for (const [dim, score] of Object.entries(rawScores)) {
              if (typeof score === 'number') {
                const scaled = needsScaling ? score / 20 : score;
                scaledScores[dim as keyof DimensionScores] = Math.min(5, Math.max(0, scaled));
              }
            }
            
            // Build OrganizationProfile with all available data from assessment context
            const orgProfile: OrganizationProfile = {
              industry: context.industry,
              revenueMillions: context.revenueMillions,
              entities: context.entityCount,
              sizeBand: context.sizeBand as OrganizationProfile['sizeBand'],
              employeeCount: context.employeeCount,
              // Map currentSystems to currentErp (use first if available)
              currentErp: context.currentSystems?.length ? context.currentSystems[0] : undefined,
            };
            
            const vendorRecommendations = getVendorRecommendations({ dimensionScores: scaledScores, orgProfile }, 5);
            
            if (vendorRecommendations.length > 0) {
              // Adjust framing based on question type
              const isVendorQuestion = questionType === 'VENDOR_TOOLING';
              vendorAffinitySection = `
## 1QG EPM COMPARISON TOOL - VENDOR LANDSCAPE CONTEXT
This analysis is derived from 1QG's proprietary EPM Comparison Tool and vendor matching algorithm.
${isVendorQuestion 
  ? 'IMPORTANT: Use these affinity scores as the PRIMARY basis for vendor recommendations.'
  : 'Use this vendor context to ground your response in practical implementation considerations and market realities.'}

**User Profile**: ${scoredDimensionCount} dimensions assessed, industry: ${context.industry || 'unspecified'}, revenue: ${context.revenueMillions ? `£${context.revenueMillions}M` : 'unspecified'}, entities: ${context.entityCount || 'unspecified'}

**Vendor Affinity Rankings (based on assessment profile):**
${vendorRecommendations.map((rec, i) => `
${i + 1}. **${rec.vendor.vendorName}** (Affinity: ${(rec.vendor.normalizedScore * 100).toFixed(0)}%, Match: ${rec.vendor.matchQuality})
   - Fit Rationale: ${rec.primaryRationale}
   - Key Strengths: ${rec.vendor.strengths.slice(0, 3).join('; ')}
   - Considerations: ${rec.vendor.considerations.slice(0, 2).join('; ')}
`).join('')}

When discussing implementation, timelines, or capabilities, reference these vendor profiles where relevant.
`;
              log.info({ vendorCount: vendorRecommendations.length, scoredDimensionCount, questionType }, "Calculated vendor affinity");
            }
          } else {
            log.info({ scoredDimensionCount, minRequired: MIN_DIMENSIONS_REQUIRED }, "Insufficient dimension scores for vendor affinity");
            vendorAffinitySection = `
## 1QG COMPARISON TOOL NOTE
Limited assessment data available (${scoredDimensionCount} dimensions scored). 
When discussing vendors or implementation specifics, encourage the user to complete their full assessment for more tailored guidance.
`;
          }
        } catch (error) {
          log.warn({ err: error instanceof Error ? error : new Error(String(error)) }, "Could not calculate vendor affinity");
        }
      }
    }

    // Build the synthesis prompt
    const systemPrompt = `You are a senior management consultant at 1QG, an independent Enterprise Performance Management (EPM) advisory firm. You bring 20+ years of finance transformation experience.

## COMMUNICATION STYLE
- Executive-level discourse: Write as you would brief a CFO or Finance Director
- British English: organisation, optimise, analyse, programme, recognise
- Management consulting vernacular: "maturity curve", "target operating model", "capability uplift"
- Bold key terms for emphasis: vendor names, dimensions, key concepts

## STRICT RULES
1. NEVER use em dashes (—). Use commas, colons, or separate sentences instead.
2. NEVER fabricate statistics or vendor capabilities
3. When uncertain, qualify with: "Based on typical engagements...", "In our experience..."
4. Remain objective - do not disparage vendors
5. Use British English throughout

${templateInstructions}

${contextSummary}
${vendorAffinitySection}
## RESEARCH FINDINGS TO SYNTHESIZE
The following research has been gathered from authoritative sources. Use this to inform your response:

${aggregatedFindings}

${conflicts.length > 0 ? `\n## CONFLICTS/CAVEATS TO ADDRESS\n${conflicts.map(c => `- ${c}`).join('\n')}` : ''}

## CRITICAL FORMATTING RULES
1. Follow the template structure EXACTLY with ## headers for each section
2. Do NOT repeat information across sections
3. Keep each section focused and concise
4. Lead with the direct answer (Pyramid Principle)
5. NEVER use em dashes (—) anywhere in your response`;

    const userPrompt = `User Question: ${originalQuery}

Please synthesize the research findings into a structured response following the template exactly. Remember: NO em dashes, use British English, and follow the section structure precisely.`;

    try {
      // Add timeout to prevent hanging
      const completionPromise = openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 4000,
        temperature: 0.7,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI synthesis timeout')), OPENAI_SYNTHESIS_TIMEOUT_MS)
      );

      const completion = await Promise.race([completionPromise, timeoutPromise]);
      let response = completion.choices[0]?.message?.content || '';
      
      // Remove any em dashes that slipped through
      response = response.replace(/—/g, ' - ');
      
      // Validate response structure
      const validation = validateResponseStructure(response, questionType);
      if (!validation.valid && validation.missingHeaders.length > 0) {
        log.warn({ missingHeaders: validation.missingHeaders }, "Response missing headers");
        // Still use the response but log the warning - partial templates are better than none
      }
      
      log.info({ length: response.length }, "OpenAI synthesis complete");
      return response;
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "OpenAI synthesis failed");
      // Fallback to structured synthesis that follows template
      return this.fallbackSynthesis(successfulPhases, context, conflicts, questionType);
    }
  }

  /**
   * Fallback synthesis if OpenAI fails - uses template structure
   */
  private fallbackSynthesis(
    phases: ResearchPhase[],
    context: AssessmentContext | null,
    conflicts: string[],
    questionType?: QuestionType
  ): string {
    // Get template for this question type to structure fallback
    const template = questionType ? getTemplate(questionType) : null;
    const requiredSections = template?.sections.filter(s => s.required) || [];
    
    let synthesis = '';
    
    // Try to follow template structure if available
    if (requiredSections.length > 0) {
      // First section - Headline/Summary
      synthesis += `## ${requiredSections[0].header}\n\n`;
      const firstPhasePoints = phases[0] ? this.extractKeyPoints(phases[0].findings) : '';
      synthesis += firstPhasePoints || 'Based on our research, here are the key findings.\n';
      synthesis += '\n\n';
      
      // Second section - Analysis/Comparison
      if (requiredSections.length > 1) {
        synthesis += `## ${requiredSections[1].header}\n\n`;
        for (const phase of phases) {
          const keyPoints = this.extractKeyPoints(phase.findings);
          if (keyPoints) {
            synthesis += `**${phase.name}:**\n${keyPoints}\n\n`;
          }
        }
      }
      
      // Third section - Context/Relevance
      if (requiredSections.length > 2 && context) {
        synthesis += `## ${requiredSections[2].header}\n\n`;
        synthesis += this.generateContextualInsights(context, phases);
        synthesis += '\n\n';
      }
      
      // Additional sections for conflicts/considerations
      if (conflicts.length > 0) {
        const considerationsSection = requiredSections.find(s => 
          s.header.toLowerCase().includes('consideration') || 
          s.header.toLowerCase().includes('criteria')
        );
        synthesis += `## ${considerationsSection?.header || 'Important Considerations'}\n\n`;
        for (const conflict of conflicts) {
          synthesis += `- ${conflict}\n`;
        }
      }
    } else {
      // Generic fallback structure
      synthesis += '## Key Findings\n\n';
      
      for (const phase of phases) {
        const keyPoints = this.extractKeyPoints(phase.findings);
        if (keyPoints) {
          synthesis += `**${phase.name}:**\n${keyPoints}\n\n`;
        }
      }

      if (context) {
        synthesis += '## Relevant to Your Situation\n\n';
        synthesis += this.generateContextualInsights(context, phases);
      }

      if (conflicts.length > 0) {
        synthesis += '\n## Important Considerations\n\n';
        for (const conflict of conflicts) {
          synthesis += `- ${conflict}\n`;
        }
      }
    }

    // Remove em dashes
    synthesis = synthesis.replace(/—/g, ' - ');

    return synthesis;
  }

  /**
   * Extract key points from findings
   */
  private extractKeyPoints(findings: string): string {
    // Take first 3 paragraphs or bullet points
    const paragraphs = findings.split(/\n\n/).filter(p => p.trim());
    const keyParagraphs = paragraphs.slice(0, 3);
    return keyParagraphs.join('\n\n');
  }

  /**
   * Generate context-specific insights
   */
  private generateContextualInsights(context: AssessmentContext, phases: ResearchPhase[]): string {
    const insights: string[] = [];
    
    if (context.overallScore !== undefined) {
      const maturityLevel = context.overallScore < 40 ? 'early-stage' : 
                           context.overallScore < 60 ? 'developing' : 
                           context.overallScore < 80 ? 'established' : 'advanced';
      
      insights.push(`Based on your EPM maturity score of ${context.overallScore}%, you are at a ${maturityLevel} level of capability.`);
    }
    
    if (context.industry) {
      insights.push(`For ${context.industry} organisations, the research findings suggest particular focus on industry-specific requirements.`);
    }

    return insights.join('\n\n');
  }

  /**
   * Collect all unique sources from phases
   */
  private collectAllSources(phases: ResearchPhase[]): string[] {
    const allSources = new Set<string>();
    
    for (const phase of phases) {
      for (const source of phase.sources) {
        allSources.add(source);
      }
    }
    
    return Array.from(allSources);
  }

  /**
   * Calculate phase confidence score
   */
  private calculatePhaseConfidence(response: { content: string; sources: string[] }): number {
    let confidence = 0.5; // Base confidence
    
    // Has sources
    if (response.sources.length > 0) {
      confidence += 0.2;
    }
    
    // Has multiple sources (Tier-1 quality indicator)
    if (response.sources.length >= 3) {
      confidence += 0.15;
    }
    
    // Check for data-backed language
    if (/\d+%|\d+ (billion|million)|according to|research shows|study found/i.test(response.content)) {
      confidence += 0.1;
    }
    
    // Penalize overconfident language
    if (/definitely|always|never|guaranteed/i.test(response.content)) {
      confidence -= 0.15;
    }
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Calculate overall confidence across all phases
   */
  private calculateOverallConfidence(phases: ResearchPhase[], conflicts: string[]): number {
    const successfulPhases = phases.filter(p => p.findings);
    
    if (successfulPhases.length === 0) {
      return 0;
    }
    
    // Weight by execution time (more thorough research = higher weight)
    const totalTime = successfulPhases.reduce((sum, p) => sum + p.executionTimeMs, 0);
    let weightedConfidence = 0;
    
    for (const phase of successfulPhases) {
      const weight = phase.executionTimeMs / totalTime;
      weightedConfidence += phase.confidence * weight;
    }
    
    // Reduce confidence for conflicts
    weightedConfidence -= conflicts.length * 0.1;
    
    return Math.min(Math.max(weightedConfidence, 0), 1);
  }

  /**
   * Describe the methodology used
   */
  private describeMethodology(phases: ResearchPhase[]): string {
    const phaseNames = phases.map(p => p.name).join(', ');
    const totalSources = phases.reduce((sum, p) => sum + p.sources.length, 0);
    
    return `Multi-phase research covering: ${phaseNames}. Cross-referenced ${totalSources} sources.`;
  }

  /**
   * Build context summary from assessment
   */
  private buildContextSummary(context: AssessmentContext): string {
    const parts: string[] = [];
    
    if (context.industry) {
      parts.push(`Industry: ${context.industry}`);
    }
    if (context.entityCount) {
      parts.push(`Entity count: ${context.entityCount}`);
    }
    if (context.revenueMillions) {
      parts.push(`Revenue: £${context.revenueMillions}M`);
    }
    if (context.overallScore !== undefined) {
      parts.push(`EPM maturity score: ${context.overallScore}%`);
    }
    if (context.dimensionScores) {
      const weakest = Object.entries(context.dimensionScores)
        .sort(([,a], [,b]) => a - b)
        .slice(0, 2)
        .map(([dim]) => dim.replace(/_/g, ' '));
      if (weakest.length > 0) {
        parts.push(`Priority areas: ${weakest.join(', ')}`);
      }
    }
    
    return parts.join('. ');
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(query: string, startTime: number, error: string): DeepResearchResult {
    return {
      originalQuery: query,
      phases: [],
      aggregatedFindings: '',
      conflicts: [],
      validationNotes: error,
      synthesizedResponse: 'I was unable to complete the research. Please try again or rephrase your question.',
      allSources: [],
      overallConfidence: 0,
      totalExecutionTimeMs: Date.now() - startTime,
      methodology: 'Research failed'
    };
  }
}

// Singleton instance
export const deepResearchService = new DeepResearchService();
