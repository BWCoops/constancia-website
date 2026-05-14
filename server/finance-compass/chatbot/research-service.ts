/**
 * FinanceCompass Chatbot Research Service
 * 
 * Perplexity API integration with caching for market research.
 * Uses strict guardrails and caches responses to reduce API costs.
 */

import crypto from 'crypto';
import { db } from '../../db';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-chatbot-research");
import { eq, and, gte } from 'drizzle-orm';
import { fcResearchCache } from '@shared/finance-compass-schema';
import type { ResearchQuery, ResearchResult, AssessmentContext } from './types';

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar-pro"; // Updated to sonar-pro for better research capabilities
const CACHE_TTL_DAYS = 7;

export class ResearchService {
  private apiKey: string | undefined;

  constructor() {
    // Trim API key to remove any whitespace that might cause auth issues
    this.apiKey = process.env.PERPLEXITY_API_KEY?.trim();
  }

  async research(query: ResearchQuery): Promise<ResearchResult> {
    const startTime = Date.now();
    
    if (!this.apiKey) {
      log.warn("Perplexity API key not configured");
      return this.getEmptyResult(startTime);
    }

    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    const cached = await this.getCachedResearch(cacheKey);
    if (cached) {
      log.info({ type: query.type }, "Cache HIT");
      return {
        ...cached,
        cached: true,
        researchTimeMs: Date.now() - startTime,
      };
    }

    log.info({ type: query.type }, "Cache MISS, calling Perplexity");
    
    try {
      const result = await this.callPerplexity(query);
      
      // Cache the result
      await this.cacheResult(cacheKey, query, result);
      
      return {
        ...result,
        cached: false,
        researchTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Perplexity API error");
      return this.getEmptyResult(startTime);
    }
  }

  private async callPerplexity(query: ResearchQuery): Promise<Omit<ResearchResult, 'cached' | 'researchTimeMs'>> {
    const systemPrompt = this.buildSystemPrompt(query.type);
    const userPrompt = this.buildUserPrompt(query);

    log.info({ model: PERPLEXITY_MODEL }, "Calling Perplexity API");

    const requestBody = {
      model: PERPLEXITY_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: query.depth === 'deep' ? 4000 : 2000,
      temperature: 0.3,
      return_citations: true, // Enable citation return
      search_recency_filter: 'year', // Focus on recent content
    };

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, errorText }, "Perplexity API failed");
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    log.info({ citationCount: data.citations?.length || 0 }, "Perplexity API success");
    
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    return {
      content,
      sources: this.extractSources(content, citations),
      citations: this.buildCitationMap(content, citations),
    };
  }

  private buildSystemPrompt(type: string): string {
    const basePrompt = `You are a finance transformation research specialist focused on Enterprise Performance Management (EPM).

CRITICAL RULES:
1. Only provide information you can verify with sources
2. If uncertain, say "Based on available data" rather than making definitive claims
3. Use British English
4. Focus on factual, data-driven insights
5. Always cite sources when making claims about statistics or trends
6. Do not speculate about future outcomes without clear disclaimers
7. Focus on EPM, finance transformation, FP&A, consolidation, and reporting topics only
8. MANDATORY: Provide at least 5 verified sources for every response - this is non-negotiable
9. Cross-reference information across multiple sources before including it
10. Prioritise Tier-1 sources: Gartner, Forrester, IDC, vendor documentation, reputable industry publications`;

    const typePrompts: Record<string, string> = {
      MARKET_TREND: `${basePrompt}

You are researching current market trends in EPM and finance transformation.
Provide:
- Current adoption rates and trends (cite sources)
- Industry benchmarks where available
- Recent developments from 2024-2026`,

      VENDOR_ANALYSIS: `${basePrompt}

You are researching EPM and CPM vendors objectively.
Provide:
- Vendor capabilities comparison (factual, not promotional)
- Typical implementation timelines based on documented cases
- Target market segments for each vendor
- Do NOT recommend one vendor over another without clear justification`,

      IMPLEMENTATION: `${basePrompt}

You are researching EPM implementation best practices.
Provide:
- Typical implementation phases and timelines
- Common challenges and success factors
- Resource requirements based on documented implementations`,

      ROI_ANALYSIS: `${basePrompt}

You are researching EPM ROI and business value.
Provide:
- Documented ROI ranges from case studies
- Common benefit categories
- Typical payback periods
- Always note that ROI varies significantly by organisation`,

      BENCHMARK: `${basePrompt}

You are researching finance function benchmarks.
Provide:
- Industry benchmarks for close cycle, forecast accuracy, etc.
- Maturity benchmarks by company size
- Cite specific sources for all statistics`,
    };

    return typePrompts[type] || basePrompt;
  }

  private buildUserPrompt(query: ResearchQuery): string {
    let prompt = query.query;

    if (query.userContext.industry) {
      prompt += `\n\nContext - Industry: ${query.userContext.industry}`;
    }
    if (query.userContext.companySize) {
      prompt += `\nCompany size: ${query.userContext.companySize}`;
    }
    if (query.userContext.challenge) {
      prompt += `\nPrimary challenge area: ${query.userContext.challenge}`;
    }

    prompt += `\n\nProvide concise, factual insights. Cite sources where possible.`;

    return prompt;
  }

  private extractSources(content: string, apiCitations: string[]): string[] {
    const sources: string[] = [...apiCitations];
    
    // Extract any inline citations [Source Name]
    const inlineCitations = content.match(/\[([^\]]+)\]/g);
    if (inlineCitations) {
      for (const cite of inlineCitations) {
        const source = cite.replace(/[\[\]]/g, '');
        if (!sources.includes(source) && source.length > 2) {
          sources.push(source);
        }
      }
    }

    return sources.slice(0, 5); // Limit to 5 sources
  }

  private buildCitationMap(content: string, apiCitations: string[]): Record<string, string> {
    const citations: Record<string, string> = {};
    
    apiCitations.forEach((cite, index) => {
      citations[`[${index + 1}]`] = cite;
    });

    return citations;
  }

  private generateCacheKey(query: ResearchQuery): string {
    const keyData = {
      type: query.type,
      query: query.query.toLowerCase().trim().substring(0, 200),
      industry: query.userContext.industry?.toLowerCase(),
    };
    
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  private async getCachedResearch(cacheKey: string): Promise<Omit<ResearchResult, 'cached' | 'researchTimeMs'> | null> {
    try {
      const [cached] = await db
        .select()
        .from(fcResearchCache)
        .where(
          and(
            eq(fcResearchCache.queryHash, cacheKey),
            gte(fcResearchCache.expiresAt, new Date())
          )
        )
        .limit(1);

      if (cached) {
        return {
          content: cached.responseContent,
          sources: cached.sources || [],
          citations: (cached.citations as Record<string, string>) || {},
        };
      }

      return null;
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Cache read error");
      return null;
    }
  }

  private async cacheResult(
    cacheKey: string,
    query: ResearchQuery,
    result: Omit<ResearchResult, 'cached' | 'researchTimeMs'>
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

      await db.insert(fcResearchCache).values({
        queryHash: cacheKey,
        query: query.query,
        researchTypes: [query.type],
        responseContent: result.content,
        sources: result.sources,
        citations: result.citations,
        metadata: query.userContext,
        expiresAt,
      }).onConflictDoUpdate({
        target: fcResearchCache.queryHash,
        set: {
          responseContent: result.content,
          sources: result.sources,
          citations: result.citations,
          expiresAt,
        },
      });
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Cache write error");
    }
  }

  private getEmptyResult(startTime: number): ResearchResult {
    return {
      content: '',
      sources: [],
      citations: {},
      cached: false,
      researchTimeMs: Date.now() - startTime,
    };
  }
}

// Build research query from user message and context
export function buildResearchQuery(
  userMessage: string,
  context: AssessmentContext | null,
  researchTypes: string[]
): ResearchQuery {
  const primaryType = researchTypes[0] || 'MARKET_TREND';

  const userContext = {
    industry: context?.industry,
    companySize: context?.revenueMillions ? `£${context.revenueMillions}M revenue` : undefined,
    challenge: context?.weakestDimension,
    currentState: context?.currentSystems?.join(', '),
    assessmentId: context?.assessmentId,
  };

  let query = userMessage;
  
  // Enhance query based on type
  if (primaryType === 'VENDOR_ANALYSIS' && context?.industry) {
    query = `${userMessage}\n\nFor ${context.industry} companies${context.revenueMillions ? ` with approximately £${context.revenueMillions}M revenue` : ''}.`;
  }
  
  if (primaryType === 'MARKET_TREND' && context?.weakestDimension) {
    query = `${userMessage}\n\nFocus on ${context.weakestDimension} capabilities and trends.`;
  }

  if (primaryType === 'BENCHMARK' && context?.industry) {
    query = `${userMessage}\n\nProvide benchmarks relevant to ${context.industry} sector.`;
  }

  // Default to deep research unless user explicitly asks for quick/simple/brief answer
  const isQuick = /\b(quick|brief|simple|short|fast|basic)\b/i.test(userMessage);
  
  return {
    type: primaryType as any,
    query,
    depth: isQuick ? 'quick' : 'deep',  // Default to deep for detailed responses
    userContext,
  };
}
