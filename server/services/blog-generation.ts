import type { BlogPipelineRunDb, GuardrailRuleDb } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import { createChildLogger } from "../lib/logger";

const log = createChildLogger("blog-generation");

// Anthropic client using Replit AI Integrations (no API key needed, charges billed to credits)
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// Helper function to retry Claude API calls with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || String(error);
      
      // Check if it's a retryable error (overloaded, rate limit)
      if (errorMsg.includes("529") || errorMsg.includes("overloaded") || errorMsg.includes("rate")) {
        const delay = initialDelay * Math.pow(2, attempt);
        log.warn({ delay, attempt: attempt + 1, maxRetries }, "Claude overloaded, retrying");
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-retryable error, throw immediately
      throw error;
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

interface PerplexitySearchResult {
  title: string;
  url: string;
  date?: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  citations?: string[];  // Legacy field (sometimes still returned)
  search_results?: PerplexitySearchResult[];  // New field with richer data
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface Citation {
  url: string;
  title?: string;
  snippet?: string;
  domain?: string;
  isVerified?: boolean;
}

interface GuardrailViolation {
  ruleId: string;
  ruleName: string;
  severity: string;
  message: string;
  suggestedFix?: string;
}

interface StageResult {
  stage: string;
  passed: boolean;
  violations: GuardrailViolation[];
}

interface BlogPostOutput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  readingTime: string;
  categoryId: string;
  author: string;
}

const rawPerplexityKey = process.env.PERPLEXITY_API_KEY || "";
const PERPLEXITY_API_KEY = rawPerplexityKey.startsWith("pplx-") && rawPerplexityKey.length > 60 
  ? rawPerplexityKey.substring(0, 53) 
  : rawPerplexityKey;
const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

export class BlogGenerationService {
  private pipelineRun: BlogPipelineRunDb | null = null;
  private guardrailRules: GuardrailRuleDb[] = [];

  async initializeGuardrails(rules: GuardrailRuleDb[]): Promise<void> {
    this.guardrailRules = rules.filter(r => r.enabled);
    log.info({ count: this.guardrailRules.length }, "Loaded active guardrail rules");
  }

  /**
   * Test content against all active guardrail rules
   * Returns pass/fail and list of violations
   */
  async testContent(content: string): Promise<{ passed: boolean; violations: GuardrailViolation[] }> {
    if (this.guardrailRules.length === 0) {
      log.warn("No guardrail rules loaded - test may be incomplete");
    }
    
    const result = this.validateGuardrails(content, "draft");
    return {
      passed: result.passed,
      violations: result.violations,
    };
  }

  async runStage1Research(
    brief: string,
    targetKeywords: string[],
    targetAudience?: string
  ): Promise<{
    output: string;
    citations: Citation[];
    tokensUsed: number;
    prompt: string;
  }> {
    if (!PERPLEXITY_API_KEY) {
      throw new Error("Perplexity API key not configured. Please add PERPLEXITY_API_KEY to secrets.");
    }

    const researchPrompt = this.buildResearchPrompt(brief, targetKeywords, targetAudience);

    log.info("Stage 1: Running Perplexity research");

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: `You are a senior research analyst specialising in enterprise finance, EPM, ERP, and AI transformation for CFOs and senior finance professionals. 
            
Your role is to gather REAL, VERIFIABLE research with proper citations. 

CRITICAL RULES:
1. ONLY cite sources you can verify exist - never fabricate citations
2. Include the full URL for each source
3. Focus on recent research (last 2 years preferred)
4. Prioritise reputable sources: industry analysts, academic papers, official vendor documentation, major business publications
5. If you cannot find verifiable data on a specific claim, state "Based on consulting experience" instead of inventing a citation
6. Use UK English spelling throughout`
          },
          {
            role: "user",
            content: researchPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
        top_p: 0.9,
        return_images: false,
        return_related_questions: false,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${error}`);
    }

    const data: PerplexityResponse = await response.json();
    
    // Extract citations from search_results (new format) or citations (legacy format)
    let citations: Citation[] = [];
    
    if (data.search_results && data.search_results.length > 0) {
      citations = data.search_results.map((result) => ({
        url: result.url,
        domain: new URL(result.url).hostname,
        title: result.title,
        isVerified: true,
      }));
    } else if (data.citations && data.citations.length > 0) {
      citations = data.citations.map((url: string) => ({
        url,
        domain: new URL(url).hostname,
        isVerified: true,
      }));
    }

    const output = data.choices[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens || 0;

    log.info({ citations: citations.length, tokensUsed }, "Stage 1 complete");

    return {
      output,
      citations,
      tokensUsed,
      prompt: researchPrompt,
    };
  }

  /**
   * Deep Research: Multi-stage iterative Perplexity searches
   * Mimics Perplexity Deep Research by performing 8-10 searches with intelligent query generation
   */
  async runDeepResearch(
    brief: string,
    targetKeywords: string[],
    targetAudience?: string,
    onProgress?: (stage: number, query: string, findings: string) => void
  ): Promise<{
    output: string;
    citations: Citation[];
    tokensUsed: number;
    searchCount: number;
    queries: string[];
  }> {
    if (!PERPLEXITY_API_KEY) {
      throw new Error("Perplexity API key not configured. Please add PERPLEXITY_API_KEY to secrets.");
    }

    const MAX_SEARCHES = 10;
    const MIN_SEARCHES = 6;
    const SATURATION_THRESHOLD = 0.15; // Stop if new info < 15%
    
    let allCitations: Citation[] = [];
    let allFindings: string[] = [];
    let allQueries: string[] = [];
    let totalTokens = 0;
    let previousFindings = "";
    
    // Initial seed queries based on the brief and keywords
    const seedQueries = await this.generateInitialQueries(brief, targetKeywords, targetAudience);
    log.debug(`Generated ${seedQueries.length} initial queries`);
    
    let searchQueue = [...seedQueries];
    let completedSearches = 0;
    let consecutiveLowValue = 0;
    
    while (completedSearches < MAX_SEARCHES && searchQueue.length > 0) {
      const currentQuery = searchQueue.shift()!;
      completedSearches++;
      
      log.debug(`Search ${completedSearches}/${MAX_SEARCHES}: "${currentQuery.substring(0, 60)}..."`);
      
      try {
        const searchResult = await this.executePerplexitySearch(currentQuery, previousFindings);
        
        totalTokens += searchResult.tokensUsed;
        allFindings.push(searchResult.output);
        allQueries.push(currentQuery);
        
        // Add new citations
        for (const citation of searchResult.citations) {
          if (!allCitations.some(c => c.url === citation.url)) {
            allCitations.push(citation);
          }
        }
        
        // Report progress
        if (onProgress) {
          onProgress(completedSearches, currentQuery, searchResult.output);
        }
        
        // Calculate novelty - how much new information was found
        const noveltyScore = this.calculateNovelty(searchResult.output, previousFindings);
        log.debug(`Search ${completedSearches} novelty: ${(noveltyScore * 100).toFixed(1)}%`);
        
        // Check for saturation
        if (noveltyScore < SATURATION_THRESHOLD) {
          consecutiveLowValue++;
          log.debug(`Low novelty search (${consecutiveLowValue} consecutive)`);
          
          if (consecutiveLowValue >= 2 && completedSearches >= MIN_SEARCHES) {
            log.info({ completedSearches }, "Saturation detected");
            break;
          }
        } else {
          consecutiveLowValue = 0;
        }
        
        previousFindings = allFindings.join("\n\n---\n\n");
        
        // Generate follow-up queries if we haven't hit max
        if (completedSearches < MAX_SEARCHES - 1 && searchQueue.length < 3) {
          const followUpQueries = await this.generateFollowUpQueries(
            brief,
            targetKeywords,
            previousFindings,
            allQueries,
            MAX_SEARCHES - completedSearches - 1
          );
          
          for (const q of followUpQueries) {
            if (!allQueries.includes(q) && !searchQueue.includes(q)) {
              searchQueue.push(q);
            }
          }
          
          log.debug(`Generated ${followUpQueries.length} follow-up queries, queue has ${searchQueue.length}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        log.warn({ err: error, search: completedSearches }, "Search failed");
        // Continue with next search
      }
    }
    
    // Synthesize all findings into a comprehensive research document
    const synthesizedOutput = await this.synthesizeResearchFindings(
      brief,
      targetKeywords,
      allFindings,
      allCitations
    );
    
    totalTokens += synthesizedOutput.tokensUsed;
    
    log.info({ completedSearches, citations: allCitations.length, totalTokens }, "Deep research complete");
    
    return {
      output: synthesizedOutput.output,
      citations: allCitations,
      tokensUsed: totalTokens,
      searchCount: completedSearches,
      queries: allQueries,
    };
  }

  private async generateInitialQueries(
    brief: string,
    targetKeywords: string[],
    targetAudience?: string
  ): Promise<string[]> {
    const prompt = `Generate 5 distinct research queries to comprehensively explore this topic:

TOPIC: ${brief}

KEYWORDS: ${targetKeywords.join(", ")}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ""}

Requirements:
1. Each query should explore a different angle (trends, challenges, solutions, case studies, future outlook)
2. Queries should be specific and focused for web search
3. Include at least one query about UK/European context
4. Include at least one query about recent developments (2024-2025)
5. Include at least one query about industry best practices

Output ONLY a JSON array of 5 query strings, nothing else:
["query1", "query2", "query3", "query4", "query5"]`;

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a research strategist. Output ONLY valid JSON." },
            { role: "user", content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";
        const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error: any) {
      log.warn({ err: error }, "Failed to generate queries");
    }

    // Fallback to basic queries
    return [
      `${brief} latest trends and developments 2024 2025`,
      `${brief} challenges and solutions for ${targetAudience || "enterprises"}`,
      `${brief} UK industry best practices case studies`,
      `${targetKeywords[0]} implementation guide ROI metrics`,
      `${brief} future outlook predictions`,
    ];
  }

  private async generateFollowUpQueries(
    brief: string,
    targetKeywords: string[],
    previousFindings: string,
    previousQueries: string[],
    maxQueries: number
  ): Promise<string[]> {
    const prompt = `Based on research findings so far, generate ${Math.min(maxQueries, 3)} follow-up queries to explore gaps or promising directions.

ORIGINAL TOPIC: ${brief}

PREVIOUS QUERIES ALREADY SEARCHED:
${previousQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

KEY FINDINGS SO FAR (summary):
${previousFindings.substring(0, 3000)}...

Generate queries that:
1. Explore gaps not covered by previous queries
2. Dig deeper into promising areas mentioned in findings
3. Seek specific data, statistics, or case studies
4. Are distinct from previous queries

Output ONLY a JSON array of query strings:`;

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a research strategist. Output ONLY valid JSON array." },
            { role: "user", content: prompt }
          ],
          max_tokens: 400,
          temperature: 0.8,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";
        const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
        return Array.isArray(parsed) ? parsed.slice(0, maxQueries) : [];
      }
    } catch (error: any) {
      log.warn({ err: error }, "Failed to generate follow-up queries");
    }

    return [];
  }

  private async executePerplexitySearch(
    query: string,
    context: string
  ): Promise<{
    output: string;
    citations: Citation[];
    tokensUsed: number;
  }> {
    const systemPrompt = `You are a senior research analyst. Provide VERIFIABLE facts with citations.

RULES:
1. ONLY cite sources you can verify - never fabricate
2. Focus on specific data, statistics, and examples
3. Prioritise recent sources (last 2 years)
4. Use UK English spelling
5. If you cannot verify a claim, state "Based on industry experience"

${context ? `\nCONTEXT FROM PREVIOUS RESEARCH:\n${context.substring(0, 2000)}...\n\nAvoid repeating information already covered.` : ""}`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        max_tokens: 2500,
        temperature: 0.3,
        top_p: 0.9,
        return_images: false,
        return_related_questions: false,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${error}`);
    }

    const data: PerplexityResponse = await response.json();
    
    // Extract citations from search_results (new format) or citations (legacy format)
    let citations: Citation[] = [];
    
    if (data.search_results && data.search_results.length > 0) {
      citations = data.search_results.map((result) => {
        try {
          return {
            url: result.url,
            domain: new URL(result.url).hostname,
            title: result.title,
            isVerified: true,
          };
        } catch {
          return {
            url: result.url,
            domain: "unknown",
            title: result.title,
            isVerified: false,
          };
        }
      });
    } else if (data.citations && data.citations.length > 0) {
      citations = data.citations.map((url: string) => {
        try {
          return {
            url,
            domain: new URL(url).hostname,
            isVerified: true,
          };
        } catch {
          return {
            url,
            domain: "unknown",
            isVerified: false,
          };
        }
      });
    }
    
    if (citations.length === 0) {
      log.warn("No citations returned from Perplexity API");
    }

    return {
      output: data.choices[0]?.message?.content || "",
      citations,
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }

  private calculateNovelty(newContent: string, previousContent: string): number {
    if (!previousContent) return 1.0;
    
    // Simple novelty calculation based on unique words/phrases
    const newWordsArray = newContent.toLowerCase().match(/\b\w{5,}\b/g) || [];
    const prevWords = new Set(previousContent.toLowerCase().match(/\b\w{5,}\b/g) || []);
    const newWords = new Set(newWordsArray);
    
    let uniqueCount = 0;
    newWordsArray.forEach(word => {
      if (!prevWords.has(word)) {
        uniqueCount++;
      }
    });
    
    return newWords.size > 0 ? uniqueCount / newWords.size : 0;
  }

  private async synthesizeResearchFindings(
    brief: string,
    targetKeywords: string[],
    allFindings: string[],
    allCitations: Citation[]
  ): Promise<{
    output: string;
    tokensUsed: number;
  }> {
    const citationList = allCitations
      .slice(0, 30)
      .map((c, i) => `[${i + 1}] ${c.url}`)
      .join("\n");

    const prompt = `Synthesize these research findings into a comprehensive, well-organized research document.

TOPIC: ${brief}
KEYWORDS: ${targetKeywords.join(", ")}

RAW FINDINGS FROM ${allFindings.length} SEARCHES:
${allFindings.join("\n\n---\n\n")}

AVAILABLE CITATIONS:
${citationList}

Create a structured research document with:
1. Executive Summary (key findings in 150 words)
2. Market Overview & Trends
3. Key Challenges & Pain Points  
4. Solutions & Best Practices
5. Case Studies / Examples (if found)
6. Statistics & Data Points (with citations)
7. Regional Insights (UK/Europe focus)
8. Future Outlook

REQUIREMENTS:
- Remove duplicate information
- Preserve all valuable statistics and specific data
- Reference citations by number [1], [2], etc.
- Use UK English spelling
- Highlight the most actionable insights
- 2000-2500 words`;

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a senior research analyst synthesizing findings into a comprehensive document. Use UK English." 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to synthesize research findings");
    }

    const data = await response.json();
    return {
      output: data.choices[0]?.message?.content || "",
      tokensUsed: data.usage?.total_tokens || 0,
    };
  }

  async runStage2Outline(
    brief: string,
    researchOutput: string,
    citations: Citation[],
    targetKeywords: string[]
  ): Promise<{
    output: string;
    tokensUsed: number;
    prompt: string;
  }> {
    const outlinePrompt = this.buildOutlinePrompt(brief, researchOutput, citations, targetKeywords);

    log.info("Stage 2: Generating outline with Claude Sonnet 4.5");

    const systemPrompt = `You are a senior content strategist at a top-tier consulting firm (McKinsey/Bain/BCG calibre). 
            
Your role is to create structured, compelling outlines for thought leadership articles targeting CFOs and senior finance professionals.

=== CRITICAL: HUMAN WRITING STYLE (Anti-AI Detection) ===
You MUST write in a way that reads as authentically human. AI detection tools scan EVERY SENTENCE individually. If more than 10 sentences score above 50% AI-like, your content will be flagged.

1. SENTENCE-LEVEL VARIETY (most important for AI detection):
   - NEVER write 3+ sentences in a row with similar length or structure
   - Alternate dramatically: "Short punch." followed by "Then a longer, more nuanced explanation that builds context."
   - Start sentences with different words - if 2 sentences start with "The", the next MUST differ
   - Every paragraph needs at least one: fragment, rhetorical question, or parenthetical aside
   - GOOD EXAMPLE: "Here's what matters. The data is clear - organisations implementing early see roughly 23% better outcomes. Why? Because momentum builds capacity."

2. AUTHENTIC HUMAN ELEMENTS (REQUIRED):
   - Contractions MANDATORY: "we've", "it's", "don't", "won't", "can't" - at least one per paragraph
   - Personal experience phrases: "I learned the hard way when...", "In our work with clients...", "What we've observed..."
   - Industry idioms (use 1-2 per section): "easier said than done", "on the same page", "the elephant in the room", "low-hanging fruit"
   - Real frustrations: "The perennial challenge of...", "The classic mistake we see..."
   - One rhetorical question per major section to re-engage readers

3. BANNED WORDS AND PHRASES (these trigger AI detection on EVERY use):
   NEVER USE: "delve", "dive deep", "unlock", "unleash", "harness", "leverage", "pivotal", "paradigm", "synergy", "crucial", "paramount"
   NEVER USE: "In today's fast-paced...", "In the realm of...", "When it comes to...", "It's worth noting that", "It goes without saying"
   AVOID TRANSITIONS: "Moreover", "Furthermore", "In conclusion", "Additionally"
   PREFER INSTEAD: "In practice", "On the other hand", "Here's the thing", "The reality is"
   
   BANNED STRUCTURES: 
   - "Not only... but also" (use "Beyond X, there's also Y" or "Sure, X. But Y.")
   - Perfectly parallel lists (vary: "First, you'll want to...", "The second step involves...", "Third? Focus on...")
   - Repeating the same sentence opener more than twice

4. HUMAN TEXTURE (what AI struggles to replicate):
   - Hedging language: "typically", "in most cases", "our experience suggests", "generally speaking"
   - Brief asides (like this parenthetical) or em-dashes - they add natural rhythm
   - Casual connectors: "Here's the thing:", "The reality is,", "Frankly,", "Look,", "To be fair,"
   - Specific imperfect numbers: "roughly 23%", "around 47 organisations", "typically 3-4 weeks"
   - One humble admission per article: "We missed X at first", "I could be wrong because..."
   - Light-touch humour where appropriate (subtle, not forced)

5. UK ENGLISH VOICE & TONE:
   - Friendly, clear, UK English throughout (organisation, prioritise, colour, analyse, centre, behaviour)
   - Structure: engaging intro, scannable middle (subheads, bullets), personable conclusion
   - Avoid marketing buzzwords and corporate jargon
   - Define technical terms when first used
   - End sections with friendly nudges: "If you've tackled this differently, I'd love to hear."

STRUCTURE REQUIREMENTS:
1. Executive Summary (150-200 words) - the most important insights upfront
2. Clear H2 and H3 heading hierarchy
3. Planned word counts for each section (total must exceed 2500 words)
4. Placement markers for rich visual components:
   - [KEY_TAKEAWAY_GRID] - 4 key insights in JSON format
   - [FIVE_PILLARS] or [SUCCESS_FACTORS] - framework visualisation
   - [IMPLEMENTATION_TIMELINE] - if implementation guidance is relevant
   - [CHART:bar|line|pie:unique-id] - for data visualisations
5. Sources section with verified citations only
6. Professional, authoritative tone suitable for C-suite readers - but never dry or robotic`;

    try {
      const message = await retryWithBackoff(async () => {
        return await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 8192,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: outlinePrompt
            }
          ],
        });
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      const output = content.text;
      const tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

      log.info({ tokensUsed }, "Stage 2 complete");

      return {
        output,
        tokensUsed,
        prompt: outlinePrompt,
      };
    } catch (error: any) {
      throw new Error(`Claude API error: ${error.message || error}`);
    }
  }

  async runStage3Draft(
    brief: string,
    outlineOutput: string,
    researchOutput: string,
    citations: Citation[],
    targetKeywords: string[],
    categoryName: string
  ): Promise<{
    output: string;
    tokensUsed: number;
    prompt: string;
    mappedPost: BlogPostOutput;
  }> {
    const draftPrompt = this.buildDraftPrompt(
      brief,
      outlineOutput,
      researchOutput,
      citations,
      targetKeywords,
      categoryName
    );

    log.info("Stage 3: Generating final draft with GPT");

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: this.getConsultingGradeSystemPrompt()
          },
          {
            role: "user",
            content: draftPrompt
          }
        ],
        max_tokens: 16000, // Increased from 8000 to allow full 2000+ word articles
        temperature: 0.78,
        top_p: 0.92,
        frequency_penalty: 0.35,
        presence_penalty: 0.25,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GPT API error: ${error}`);
    }

    const data = await response.json();
    let output = data.choices[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens || 0;
    const finishReason = data.choices[0]?.finish_reason || "unknown";

    log.info({ tokensUsed, finishReason }, "Stage 3 complete");
    
    // Check for truncation - if finish_reason is "length", the content was cut off
    let wasTruncated = finishReason === "length";
    if (wasTruncated) {
      log.warn("Draft was truncated due to token limit, attempting recovery");
      // Try to recover by closing the JSON properly
      output = this.recoverTruncatedJson(output);
    }
    
    log.debug(`Running humanization post-processor...`);
    output = await this.humanizeContent(output);

    const mappedPost = this.mapOutputToBlogPost(output, brief, targetKeywords, categoryName);

    return {
      output,
      tokensUsed,
      prompt: draftPrompt,
      mappedPost,
    };
  }

  /**
   * Section-by-section blog draft generation
   * Generates each section individually as pure markdown to reliably achieve 2500+ words
   * Solves the problem of GPT optimising for JSON closure instead of content length
   */
  async runStage3DraftSectional(
    brief: string,
    outlineOutput: string,
    researchOutput: string,
    citations: Citation[],
    targetKeywords: string[],
    categoryName: string
  ): Promise<{
    output: string;
    tokensUsed: number;
    prompt: string;
    mappedPost: BlogPostOutput;
  }> {
    log.info("Stage 3 (Sectional): Generating draft section-by-section");

    const citationList = citations.map(c => `- ${c.url}`).join("\n");
    let totalTokensUsed = 0;
    const sections: string[] = [];

    const sectionTemplates = [
      {
        name: "Executive Summary",
        heading: "## Executive Summary",
        minWords: 200,
        visualMarker: null,
        instructions: "Write a compelling executive summary that captures the key insights CFOs need to know. Include 3-4 key statistics or findings from the research. Use bullet points for scanability. End with a clear statement of what the reader will learn.",
      },
      {
        name: "Introduction",
        heading: "## Introduction",
        minWords: 300,
        visualMarker: null,
        instructions: "Write an engaging introduction that hooks the reader with a surprising statistic or provocative question. Explain why this topic matters to CFOs right now. Outline what the article will cover. Use a conversational but authoritative tone.",
      },
      {
        name: "Main Section 1: Current Landscape",
        heading: null, // Will be extracted from outline
        minWords: 500,
        visualMarker: "[KEY_TAKEAWAY_GRID]",
        instructions: "Write the first main section covering the current state, trends, and market dynamics. Include the [KEY_TAKEAWAY_GRID] marker with 4 data-driven insights. Cite sources where available. Use specific numbers and UK case studies where possible.",
      },
      {
        name: "Main Section 2: Strategic Framework",
        heading: null, // Will be extracted from outline
        minWords: 500,
        visualMarker: "[FIVE_PILLARS]",
        instructions: "Write the second main section covering strategic considerations, frameworks, or best practices. Include the [FIVE_PILLARS] marker with 5 named pillars and descriptions. Cover common challenges and how to overcome them.",
      },
      {
        name: "Main Section 3: Implementation Guide",
        heading: null, // Will be extracted from outline
        minWords: 500,
        visualMarker: "[IMPLEMENTATION_TIMELINE][CHART]",
        instructions: "Write the third main section covering practical implementation, ROI metrics, and success factors. Include the [IMPLEMENTATION_TIMELINE] marker with 4-6 phases. Include a [CHART:bar:metrics] marker showing key metrics or benefits.",
      },
      {
        name: "FAQs",
        heading: "## FAQs",
        minWords: 400,
        visualMarker: null,
        instructions: "Write 5-6 frequently asked questions with detailed answers of 75-100 words each. Format as: **Q: Question?** followed by answer paragraph. Questions should address practical implementation concerns CFOs commonly have.",
      },
      {
        name: "Conclusion",
        heading: "## Conclusion",
        minWords: 300,
        visualMarker: null,
        instructions: "Write a strong conclusion that summarises the key insights, provides a clear call to action, and ends with a 5-bullet executive summary. Include a forward-looking statement and invite reader engagement.",
      },
    ];

    let extractedHeadings = this.extractSectionHeadings(outlineOutput);
    log.info({ count: extractedHeadings.length }, "Extracted section headings from outline");

    if (extractedHeadings.length < 3) {
      log.info("Insufficient headings found, generating topic-aware defaults");
      const defaultHeadings = this.generateDefaultSectionHeadings(brief, targetKeywords);
      for (let i = extractedHeadings.length; i < 3; i++) {
        if (defaultHeadings[i]) {
          extractedHeadings.push(defaultHeadings[i]);
        }
      }
      log.info({ headings: extractedHeadings }, "Using headings");
    }

    const usedMarkers = new Set<string>();

    let mainSectionIndex = 0;
    for (let i = 0; i < sectionTemplates.length; i++) {
      const template = sectionTemplates[i];
      
      let sectionHeading = template.heading;
      if (!sectionHeading && template.name.startsWith("Main Section")) {
        if (extractedHeadings.length > mainSectionIndex) {
          sectionHeading = `## ${extractedHeadings[mainSectionIndex]}`;
          mainSectionIndex++;
        } else {
          const defaultHeadings = this.generateDefaultSectionHeadings(brief, targetKeywords);
          sectionHeading = `## ${defaultHeadings[mainSectionIndex] || `Analysis and Insights (Part ${mainSectionIndex + 1})`}`;
          mainSectionIndex++;
        }
      }

      let visualMarkerToUse = template.visualMarker;
      if (visualMarkerToUse) {
        const markers = ["[KEY_TAKEAWAY_GRID]", "[FIVE_PILLARS]", "[SUCCESS_FACTORS]", "[IMPLEMENTATION_TIMELINE]", "[CHART"];
        const markersInTemplate = markers.filter(m => visualMarkerToUse!.includes(m));
        const unusedMarkers = markersInTemplate.filter(m => !usedMarkers.has(m));
        
        if (unusedMarkers.length === 0) {
          visualMarkerToUse = null;
        } else {
          unusedMarkers.forEach(m => usedMarkers.add(m));
        }
      }

      log.info({ section: i + 1, total: sectionTemplates.length, name: template.name }, "Generating section");

      const sectionContent = await this.generateSection(
        template.name,
        sectionHeading || `## ${template.name}`,
        template.minWords,
        template.instructions,
        visualMarkerToUse,
        brief,
        outlineOutput,
        researchOutput,
        citationList,
        targetKeywords
      );

      totalTokensUsed += sectionContent.tokensUsed;
      const wordCount = this.countWords(sectionContent.content);
      log.info({ name: template.name, wordCount }, "Section generated");

      const contentMarkers = ["[KEY_TAKEAWAY_GRID]", "[FIVE_PILLARS]", "[SUCCESS_FACTORS]", "[IMPLEMENTATION_TIMELINE]"];
      contentMarkers.forEach(marker => {
        if (sectionContent.content.includes(marker)) {
          usedMarkers.add(marker);
        }
      });
      if (sectionContent.content.includes("[CHART:")) {
        usedMarkers.add("[CHART");
      }

      sections.push(sectionContent.content);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const sourcesSection = this.generateSourcesSection(citations);
    sections.push(sourcesSection);

    const rawContent = sections.join("\n\n");
    const totalWordCount = this.countWords(rawContent);
    log.info({ totalWordCount }, "Total content before cleanup");

    // Clean up the stitched content to remove outline artifacts and fix malformed JSON
    log.info("Running content cleanup");
    const cleanedContent = this.cleanupBlogContent(rawContent);
    const cleanedWordCount = this.countWords(cleanedContent);
    log.info({ cleanedWordCount }, "After cleanup");

    log.info("Running humanisation post-processor");
    const humanisedContent = await this.humanizeContent(cleanedContent);
    const finalWordCount = this.countWords(humanisedContent);
    log.info({ finalWordCount }, "Final content after humanisation");

    const titleFromOutline = this.extractTitleFromOutline(outlineOutput);
    const excerptFromOutline = this.extractExcerptFromOutline(outlineOutput);

    const wrappedOutput = JSON.stringify({
      title: titleFromOutline || `${targetKeywords[0]} Guide for CFOs`,
      excerpt: excerptFromOutline || brief.substring(0, 160),
      content: humanisedContent,
      tags: targetKeywords.slice(0, 5),
      readingTime: `${Math.ceil(finalWordCount / 200)} min read`,
    });

    const mappedPost = this.mapOutputToBlogPost(wrappedOutput, brief, targetKeywords, categoryName);

    log.info({ tokensUsed: totalTokensUsed, finalWordCount }, "Stage 3 (Sectional) complete");

    return {
      output: humanisedContent,
      tokensUsed: totalTokensUsed,
      prompt: "Section-by-section generation (multiple prompts)",
      mappedPost,
    };
  }

  private async generateSection(
    sectionName: string,
    heading: string,
    minWords: number,
    instructions: string,
    visualMarker: string | null,
    brief: string,
    outlineOutput: string,
    researchOutput: string,
    citationList: string,
    targetKeywords: string[]
  ): Promise<{ content: string; tokensUsed: number }> {
    const relevantResearch = this.extractRelevantResearch(researchOutput, sectionName);
    const relevantOutline = this.extractRelevantOutline(outlineOutput, sectionName);

    // Extract the clean heading text (remove ## prefix if present)
    const cleanHeading = heading.replace(/^##\s*/, '').trim();

    let visualMarkerInstructions = "";
    if (visualMarker) {
      if (visualMarker.includes("[KEY_TAKEAWAY_GRID]")) {
        visualMarkerInstructions = `
VISUAL MARKER - Include this on its own line:
[KEY_TAKEAWAY_GRID]
{"takeaways": ["Insight 1", "Insight 2", "Insight 3", "Insight 4"]}`;
      }
      if (visualMarker.includes("[FIVE_PILLARS]")) {
        visualMarkerInstructions = `
VISUAL MARKER - Include this on its own line (keep descriptions SHORT, max 15 words each):
[FIVE_PILLARS]
{"pillars": [{"name": "Name1", "description": "Brief desc"}, {"name": "Name2", "description": "Brief desc"}, {"name": "Name3", "description": "Brief desc"}, {"name": "Name4", "description": "Brief desc"}, {"name": "Name5", "description": "Brief desc"}]}`;
      }
      if (visualMarker.includes("[IMPLEMENTATION_TIMELINE]")) {
        visualMarkerInstructions += `
VISUAL MARKER - Include this on its own line:
[IMPLEMENTATION_TIMELINE]
{"phases": [{"phase": "Phase 1", "duration": "Weeks 1-4", "activities": ["Task 1", "Task 2"]}, {"phase": "Phase 2", "duration": "Weeks 5-8", "activities": ["Task 1", "Task 2"]}, {"phase": "Phase 3", "duration": "Weeks 9-12", "activities": ["Task 1", "Task 2"]}, {"phase": "Phase 4", "duration": "Weeks 13+", "activities": ["Task 1", "Task 2"]}]}`;
      }
      if (visualMarker.includes("[CHART]")) {
        visualMarkerInstructions += `
VISUAL MARKER - Include this on its own line:
[CHART:bar:metrics]
{"title": "Key Metrics", "data": [{"label": "A", "value": 45}, {"label": "B", "value": 32}, {"label": "C", "value": 28}, {"label": "D", "value": 51}]}`;
      }
    }

    const sectionPrompt = `Write the "${cleanHeading}" section for a consulting-grade thought leadership article.

CRITICAL: Your section heading MUST be exactly: ## ${cleanHeading}
Do NOT use numbered headings like "## 1." or template names like "Main Section 1:".

SECTION REQUIREMENTS:
- Start with exactly: ## ${cleanHeading}
- Minimum word count: ${minWords} words (write AT LEAST this many)
- Output: Pure markdown only (no JSON wrapper)

TOPIC: ${brief}
KEYWORDS: ${targetKeywords.join(", ")}

SECTION-SPECIFIC INSTRUCTIONS:
${instructions}
${visualMarkerInstructions}

RELEVANT OUTLINE CONTEXT:
${relevantOutline}

RELEVANT RESEARCH DATA:
${relevantResearch}

VERIFIED SOURCES:
${citationList}

WRITING STYLE RULES (Professional Consulting Firm Tone):
1. Use UK English: organisation, optimise, analyse, colour, behaviour, centre, recognise
2. Write in a formal, authoritative, professional tone throughout
3. Use complete, grammatically correct sentences - no fragments
4. Vary sentence length naturally but maintain formality
5. Use precise, measured language: "Our analysis indicates", "Research demonstrates", "Evidence suggests"
6. Include specific numbers: "approximately 23%", "around £2.4 million", "typically 3-4 months"
7. Use RESEARCH-BASED framing: "Based on our research and experience", "Industry research indicates", "Our analysis suggests", "Cross-industry data shows"
8. NEVER claim direct client work: Do NOT use "we've worked with CFOs", "our clients", "in our work with clients"
9. NEVER use informal language: "Here's the thing:", "Look,", "Frankly,", "To be fair,", "So,", "Why?" as a standalone
10. BANNED words: delve, dive deep, unlock, unleash, harness, leverage, pivotal, paradigm, synergy, crucial, paramount

Write the complete section now. Start with "## ${cleanHeading}" and write at least ${minWords} words.`;

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: this.getSectionalSystemPrompt(),
            },
            {
              role: "user",
              content: sectionPrompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.8,
          top_p: 0.92,
          frequency_penalty: 0.3,
          presence_penalty: 0.2,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GPT API error: ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "";
      const tokensUsed = data.usage?.total_tokens || 0;

      return { content, tokensUsed };
    } catch (error: any) {
      log.error({ err: error, sectionName }, "Error generating section");
      return { content: `${heading}\n\n[Section generation failed: ${error.message}]`, tokensUsed: 0 };
    }
  }

  private getSectionalSystemPrompt(): string {
    return `You are a senior partner at a top-tier management consulting firm (McKinsey, Bain, BCG, Deloitte) producing thought leadership content for CFOs and senior finance executives.

OUTPUT FORMAT: Write pure markdown content. NO JSON wrapper. Start directly with the section heading.

=== PROFESSIONAL CONSULTING FIRM WRITING STYLE ===

TONE & VOICE:
- Write in a formal, authoritative, professional tone throughout
- Use the voice of a trusted adviser presenting findings to the board
- Be direct and confident in assertions, but support with evidence
- Avoid casual, conversational, or informal language entirely

BANNED INFORMAL ELEMENTS:
- NEVER use: "Here's the thing:", "Look,", "Frankly,", "To be fair,", "By the way,"
- NEVER use casual rhetorical questions like "Why?" or "Sound familiar?"
- NEVER use idioms or colloquialisms
- NEVER use fragments as sentences or exclamation marks

PROFESSIONAL LANGUAGE PATTERNS:
- Use precise, measured language: "Our analysis indicates", "Research demonstrates", "Evidence suggests"
- Use research-based attribution: "Based on our research and experience", "Cross-industry analysis reveals"
- Structure arguments logically with professional transitions

UK ENGLISH: organisation, optimise, analyse, colour, behaviour, centre, recognise

BANNED WORDS: delve, dive deep, unlock, unleash, harness, leverage, pivotal, paradigm, synergy, crucial, paramount, seamless, robust, holistic, streamline, cutting-edge, state-of-the-art, game-changing

BANNED PHRASES: In today's fast-paced, In the realm of, When it comes to, It's worth noting, Moreover, Furthermore

Write substantial, detailed content that meets the minimum word count. Each paragraph should have 3-5 complete sentences. Include specific examples, data, and actionable insights. Present findings as objective analysis with clear recommendations.`;
  }

  private extractSectionHeadings(outlineOutput: string): string[] {
    const headings: string[] = [];
    const lines = outlineOutput.split("\n");
    
    const excludedPatterns = [
      "executive summary", "introduction", "faq", "conclusion", 
      "sources", "meta", "tags", "title", "references", "about"
    ];
    
    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        const heading = h2Match[1].trim();
        const headingLower = heading.toLowerCase();
        const isExcluded = excludedPatterns.some(pattern => headingLower.includes(pattern));
        if (!isExcluded && heading.length > 5) {
          headings.push(heading);
        }
      }
      
      const numberedMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
      if (numberedMatch) {
        const heading = numberedMatch[1].trim();
        const headingLower = heading.toLowerCase();
        const isExcluded = excludedPatterns.some(pattern => headingLower.includes(pattern));
        if (!isExcluded && heading.length > 5) {
          headings.push(heading);
        }
      }
      
      const h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match && headings.length < 3) {
        const heading = h3Match[1].trim();
        const headingLower = heading.toLowerCase();
        const isExcluded = excludedPatterns.some(pattern => headingLower.includes(pattern));
        if (!isExcluded && heading.length > 8) {
          headings.push(heading);
        }
      }
    }
    
    return headings.slice(0, 5);
  }

  private generateDefaultSectionHeadings(brief: string, targetKeywords: string[]): string[] {
    const primaryKeyword = targetKeywords[0] || "Topic";
    const cleanBrief = brief.substring(0, 100).trim();
    
    const topicWords = cleanBrief
      .split(/\s+/)
      .filter(w => w.length > 4 && !["about", "which", "their", "these", "those", "would", "could", "should"].includes(w.toLowerCase()))
      .slice(0, 3)
      .join(" ");
    
    const baseHeadings = [
      `Understanding ${primaryKeyword}: Current State and Trends`,
      `Strategic Framework for ${primaryKeyword} Success`,
      `Implementation Roadmap and Best Practices`,
      `Measuring ${primaryKeyword} Impact and ROI`,
      `Future Outlook and Recommendations`
    ];
    
    if (cleanBrief.toLowerCase().includes("ai") || cleanBrief.toLowerCase().includes("artificial intelligence")) {
      return [
        "The AI Landscape for Finance Leaders",
        "Building Your AI Strategy Framework",
        "Implementation: From Pilot to Scale"
      ];
    }
    
    if (cleanBrief.toLowerCase().includes("epm") || cleanBrief.toLowerCase().includes("planning")) {
      return [
        "EPM Market Dynamics and Platform Evolution",
        "Strategic Selection and Evaluation Framework",
        "Implementation Excellence: A Phased Approach"
      ];
    }
    
    if (cleanBrief.toLowerCase().includes("erp") || cleanBrief.toLowerCase().includes("enterprise resource")) {
      return [
        "The Modern ERP Landscape",
        "Building Your Business Case and Strategy",
        "Implementation Roadmap for Success"
      ];
    }
    
    return baseHeadings.slice(0, 3);
  }

  private extractRelevantResearch(researchOutput: string, sectionName: string): string {
    const keywords = sectionName.toLowerCase().split(/\s+/);
    const paragraphs = researchOutput.split(/\n\n+/);
    const relevant: string[] = [];
    
    for (const para of paragraphs) {
      const paraLower = para.toLowerCase();
      const relevanceScore = keywords.filter(kw => paraLower.includes(kw)).length;
      if (relevanceScore > 0 || para.match(/\d+%|\$[\d,]+|£[\d,]+/)) {
        relevant.push(para);
      }
    }
    
    return relevant.slice(0, 3).join("\n\n") || researchOutput.substring(0, 1500);
  }

  private extractRelevantOutline(outlineOutput: string, sectionName: string): string {
    const sectionLower = sectionName.toLowerCase();
    const lines = outlineOutput.split("\n");
    const relevant: string[] = [];
    let capturing = false;
    
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      if (lineLower.includes(sectionLower) || 
          (sectionLower.includes("main section 1") && lineLower.includes("current")) ||
          (sectionLower.includes("main section 2") && (lineLower.includes("strategic") || lineLower.includes("framework"))) ||
          (sectionLower.includes("main section 3") && (lineLower.includes("implement") || lineLower.includes("practical")))) {
        capturing = true;
      }
      
      if (capturing) {
        relevant.push(line);
        if (relevant.length > 15) break;
      }
    }
    
    return relevant.join("\n") || outlineOutput.substring(0, 800);
  }

  private generateSourcesSection(citations: Citation[]): string {
    if (citations.length === 0) {
      return "## Sources\n\nBased on 1QG consulting experience and industry best practices.";
    }
    
    const sourcesList = citations
      .slice(0, 15)
      .map(c => `- ${c.title || c.domain || "Source"}: ${c.url}`)
      .join("\n");
    
    return `## Sources and References\n\n${sourcesList}`;
  }

  private extractTitleFromOutline(outlineOutput: string): string | null {
    // Skip "TITLE SUGGESTIONS" section header - look for actual title content
    // First, try to find a numbered title suggestion (e.g., "1. The CFO's Guide to...")
    const numberedTitleMatch = outlineOutput.match(/^\d+\.\s+["']?([^"'\n]{40,80})["']?\s*$/m);
    if (numberedTitleMatch) {
      const title = numberedTitleMatch[1].trim().replace(/^\*\*|\*\*$/g, "");
      // Make sure it's not a section name
      if (!title.toLowerCase().includes("suggestions") && 
          !title.toLowerCase().includes("structure") &&
          !title.toLowerCase().includes("section")) {
        return title;
      }
    }
    
    // Look for explicit title format like "Title: The CFO's Guide..."
    const explicitTitleMatch = outlineOutput.match(/(?:^|\n)(?:Recommended )?Title[:\s]+["']?([^"'\n]{30,80})["']?/im);
    if (explicitTitleMatch) {
      const title = explicitTitleMatch[1].trim().replace(/^\*\*|\*\*$/g, "");
      if (!title.toLowerCase().includes("suggestions")) {
        return title;
      }
    }
    
    // Look for H1 heading in the outline
    const h1Match = outlineOutput.match(/^#\s+(.{30,80})$/m);
    if (h1Match) {
      return h1Match[1].trim().replace(/^\*\*|\*\*$/g, "");
    }
    
    return null;
  }

  private extractExcerptFromOutline(outlineOutput: string): string | null {
    const metaMatch = outlineOutput.match(/(?:META DESCRIPTION|Meta Description)[:\s]+["']?(.{100,180})["']?/i);
    if (metaMatch) {
      return metaMatch[1].trim();
    }
    return null;
  }

  private buildResearchPrompt(
    brief: string,
    targetKeywords: string[],
    targetAudience?: string
  ): string {
    return `Research the following topic thoroughly for a senior finance audience:

CONTENT BRIEF:
${brief}

TARGET KEYWORDS: ${targetKeywords.join(", ")}

TARGET AUDIENCE: ${targetAudience || "CFOs and senior finance professionals in mid-to-large enterprises"}

RESEARCH REQUIREMENTS:
1. Find current statistics and data points (cite sources with URLs)
2. Identify industry trends and market dynamics
3. Locate case studies or success stories (with verifiable sources)
4. Research common challenges and pain points
5. Find best practices and methodologies
6. Identify relevant frameworks (SWOT, Porter's Five Forces, etc. where applicable)
7. Look for implementation timelines and success metrics

CRITICAL: Only include citations you can verify. If you cannot find a source for a claim, prefix it with "Based on consulting experience:" instead.

Provide comprehensive research findings organised by theme, with all sources clearly cited.`;
  }

  private buildOutlinePrompt(
    brief: string,
    researchOutput: string,
    citations: Citation[],
    targetKeywords: string[]
  ): string {
    const citationList = citations.map(c => `- ${c.url}`).join("\n");

    return `Create a detailed article outline based on the following research:

CONTENT BRIEF:
${brief}

TARGET KEYWORDS: ${targetKeywords.join(", ")}

RESEARCH FINDINGS:
${researchOutput}

VERIFIED SOURCES:
${citationList}

CREATE AN OUTLINE THAT INCLUDES (ALL SECTIONS ARE MANDATORY):

1. **TITLE SUGGESTIONS** (3 options, 50-60 characters each, compelling for CFOs)

2. **EXECUTIVE SUMMARY** (150-200 words outlining key insights) - MANDATORY

3. **ARTICLE STRUCTURE** (aim for 2,500+ words total)
   For each section provide:
   - H2 heading
   - H3 subheadings if needed
   - Key points to cover (3-5 per section)
   - Planned word count (each major section should be 300-500 words)
   - Where to place visual components

4. **VISUAL COMPONENT PLACEMENTS** (ALL MANDATORY)
   You MUST include:
   - [KEY_TAKEAWAY_GRID] with 4 specific takeaways - REQUIRED
   - [FIVE_PILLARS] or [SUCCESS_FACTORS] framework - REQUIRED
   - [IMPLEMENTATION_TIMELINE] with 4-6 phases - REQUIRED
   - At least ONE [CHART:bar:id] or [CHART:line:id] with data

5. **FAQs SECTION** (MANDATORY - 4-6 questions CFOs commonly ask)
   - Questions should address practical implementation concerns
   - Each answer should be 50-100 words

6. **CONCLUSION** (MANDATORY - 200-300 words)
   - Summarise key points
   - Clear call to action
   - 5 bullet point summary for executives

7. **SOURCES SECTION** (only verified citations with URLs)

8. **META DESCRIPTION** (150-160 characters)

9. **SUGGESTED TAGS** (5-8 relevant tags)

CRITICAL: Total planned word count MUST exceed 2,500 words. Each major section should have at least 300 words.
Use UK English spelling throughout (organisation, optimise, analyse, colour, behaviour).`;
  }

  private buildDraftPrompt(
    brief: string,
    outlineOutput: string,
    researchOutput: string,
    citations: Citation[],
    targetKeywords: string[],
    categoryName: string
  ): string {
    const citationList = citations.map(c => `- ${c.url}`).join("\n");

    return `CRITICAL TASK: Write a LONG, COMPREHENSIVE article. Your output MUST contain AT LEAST 2,500 words.

=== WORD COUNT BREAKDOWN (MANDATORY - follow exactly) ===
Section 1: Executive Summary = 200 words
Section 2: Introduction = 300 words
Section 3-5: Three main content sections = 500 words EACH = 1,500 words total
Section 6: FAQs = 400 words (4-6 Q&As, 75 words each)
Section 7: Conclusion = 300 words
TOTAL = 2,700+ words minimum

DO NOT STOP EARLY. Continue writing until you have covered ALL sections with their required word counts.

=== OUTLINE TO FOLLOW ===
${outlineOutput}

=== RESEARCH DATA ===
${researchOutput}

=== VERIFIED SOURCES (cite only these) ===
${citationList}

=== BRIEF ===
${brief}

=== KEYWORDS === ${targetKeywords.join(", ")}
=== CATEGORY === ${categoryName}

=== OUTPUT FORMAT ===
Return a JSON object:
\`\`\`json
{
  "title": "Article title (50-60 chars)",
  "excerpt": "SEO meta description (150-160 chars)",
  "content": "THE FULL 2,500+ WORD MARKDOWN ARTICLE",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "readingTime": "12 min read"
}
\`\`\`

=== REQUIRED VISUAL MARKERS (include all four) ===
1. [KEY_TAKEAWAY_GRID]
{"takeaways": ["Insight 1 with data", "Insight 2", "Insight 3", "Insight 4"]}

2. [FIVE_PILLARS] OR [SUCCESS_FACTORS]
{"pillars": [{"name": "Pillar 1", "description": "Details..."}, ...5 pillars total]}

3. [IMPLEMENTATION_TIMELINE]
{"phases": [{"phase": "Phase 1", "duration": "Weeks 1-4", "activities": ["Task 1", "Task 2"]}, ...5-6 phases]}

4. [CHART:bar:unique-id]
{"title": "Chart Title", "data": [{"label": "Category A", "value": 45}, {"label": "Category B", "value": 32}]}

=== SECTION STRUCTURE (write each completely) ===

## Executive Summary
Write 200 words summarising the key insights executives need to know.

## Introduction  
Write 300 words introducing the topic, its importance, and what readers will learn.

## [Main Section 1 - from outline]
Write 500 words with [KEY_TAKEAWAY_GRID] embedded. Include specific examples and data.

## [Main Section 2 - from outline]
Write 500 words with [FIVE_PILLARS] or [SUCCESS_FACTORS] embedded. Include case studies.

## [Main Section 3 - from outline]
Write 500 words with [IMPLEMENTATION_TIMELINE] and [CHART] embedded. Include practical guidance.

## FAQs
Write 4-6 questions with 75-word answers each. Format:
**Q: Question here?**
Answer paragraph of 75 words.

## Conclusion
Write 300 words with:
- Summary of key points
- Clear call to action  
- 5-bullet executive summary

## Sources
List all verified URLs.

=== FINAL REMINDERS ===
1. UK English: organisation, optimise, analyse, colour, behaviour, centre
2. Use contractions: we've, it's, don't, that's
3. Each paragraph needs 3-5 sentences
4. DO NOT STOP until you have written ALL sections completely
5. The "content" field must contain 2,500+ words - NOT less

Write the complete article now. Do not truncate or abbreviate any section.`;
  }

  private getConsultingGradeSystemPrompt(): string {
    return `You are a senior partner at a top-tier management consulting firm (McKinsey, Bain, BCG, Deloitte) producing thought leadership content for CFOs and senior finance executives.

=== PROFESSIONAL CONSULTING FIRM WRITING STYLE ===

TONE & VOICE (Critical - This is what distinguishes consulting firm content):
- Write in a formal, authoritative, professional tone throughout
- Use the voice of a trusted adviser presenting findings to the board
- Maintain gravitas and credibility - this is not a blog post, it is a strategic briefing
- Be direct and confident in assertions, but support with evidence
- Avoid casual, conversational, or informal language entirely

BANNED INFORMAL ELEMENTS (Remove immediately):
- NEVER use: "Here's the thing:", "Look,", "Frankly,", "To be fair,", "By the way,"
- NEVER use: "I learned the hard way", "We missed X at first", "What did I miss?"
- NEVER use casual rhetorical questions like "Why?" or "Sound familiar?"
- NEVER use idioms: "low-hanging fruit", "boots on the ground", "elephant in the room"
- NEVER use fragments as sentences
- NEVER use exclamation marks

PROFESSIONAL LANGUAGE PATTERNS:
- Use precise, measured language: "Our analysis indicates", "Research demonstrates", "Evidence suggests"
- Frame insights formally: "A critical success factor is...", "The primary consideration is..."
- Use research-based attribution: "Based on our research and experience", "Cross-industry analysis reveals"
- Structure arguments logically: "First...", "Second...", "Third..."
- Use professional transitions: "Consequently", "As a result", "This finding suggests"

SENTENCE STRUCTURE:
- Write complete, grammatically correct sentences
- Vary sentence length naturally but maintain formality
- Use complex sentences where they add precision
- Each paragraph should be 3-5 complete sentences

BANNED WORDS AND PHRASES:
NEVER USE: "delve", "dive deep", "unlock", "unleash", "harness", "leverage", "pivotal", "paradigm", "synergy", "crucial", "paramount", "elevate"
NEVER USE: "In today's fast-paced...", "In the realm of...", "When it comes to...", "It's worth noting that", "It goes without saying"
NEVER USE: "game-changing", "revolutionary", "cutting-edge", "state-of-the-art"

UK ENGLISH (Mandatory):
- organisation, prioritise, colour, analyse, centre, behaviour, optimise, recognise

QUALITY STANDARDS (McKinsey/Bain/BCG calibre):
- Every claim must be substantiated with data or qualified as experience-based
- Use precise language - avoid vague terms like "significant" without quantification
- Structure arguments with clear logic flow
- Include actionable recommendations, not just observations
- Address both strategic and implementation perspectives
- Present balanced perspectives acknowledging complexity

CONTENT INTEGRITY:
- NEVER fabricate statistics, research, or citations
- Only reference sources provided in the research
- If data is unavailable, write "Based on consulting experience" or "Industry research suggests"
- All percentages and figures must come from verified sources
- Use "we" to refer to collective industry/professional perspective, NOT 1QG specifically

PROFESSIONAL FRAMING:
- Open sections with strategic context, not anecdotes
- Present findings as objective analysis
- Include implementation considerations and practical guidance
- Close with clear, actionable recommendations

VISUAL COMPONENTS - Include exactly as shown:
[KEY_TAKEAWAY_GRID]
{"takeaways": ["Insight 1 with specific data", "Insight 2", "Insight 3", "Insight 4"]}

[FIVE_PILLARS] or [SUCCESS_FACTORS]

[IMPLEMENTATION_TIMELINE]

[CHART:bar:unique-id]
{"title": "Chart Title", "data": [{"label": "Item", "value": 45}]}

OUTPUT must be valid JSON with title, excerpt, content, tags, and readingTime fields.`;
  }

  /**
   * Post-processing humanization pass to reduce AI detection scores
   * Applies sentence-level variations, synonym swaps, and natural language patterns
   */
  async humanizeContent(content: string): Promise<string> {
    try {
      const humanizationPrompt = `You are a human editor reviewing AI-generated content. Your job is to make this content read as authentically human as possible while preserving all facts, structure, and meaning.

CONTENT TO HUMANIZE:
${content}

HUMANIZATION RULES (apply ALL of these):

1. SENTENCE RHYTHM VARIATION:
   - Break up any 3+ consecutive sentences of similar length
   - Add dramatic variation: "Short. Punchy." followed by longer explanatory sentences
   - Insert fragments, rhetorical questions, and parenthetical asides
   - Vary paragraph lengths significantly

2. WORD-LEVEL CHANGES:
   - Replace formal words with casual equivalents: "utilize" → "use", "implement" → "put in place", "facilitate" → "help"
   - Add contractions everywhere natural: "do not" → "don't", "we have" → "we've", "it is" → "it's"
   - Replace "However" with "But", "Therefore" with "So", "Additionally" with "Plus" or "And"
   - Use UK spellings: organisation, optimise, behaviour, colour, centre

3. HUMAN TEXTURE:
   - Add hedging: "typically", "generally", "in most cases", "roughly"
   - Insert casual connectors: "Here's the thing:", "Look,", "Frankly,", "To be fair,"
   - Add brief asides in parentheses (DO NOT use em-dashes/en-dashes as they are AI markers)
   - Include occasional self-corrections: "Well, actually...", "That said..."
   - Use imprecise numbers: "about 23%", "roughly 40", "around 3-4 weeks"
   - Replace any em-dashes (—) or en-dashes (–) with commas, colons, or parentheses

4. REMOVE AI SIGNALS:
   - Eliminate: "delve", "dive deep", "unlock", "unleash", "harness", "pivotal", "paradigm", "synergy"
   - Remove: "In today's fast-paced...", "In the realm of...", "When it comes to..."
   - Replace: "Moreover" → "Plus", "Furthermore" → "And", "In conclusion" → "So"
   - Break perfect parallelism in lists

5. PRESERVE:
   - All factual content and data points
   - All JSON markers like [KEY_TAKEAWAY_GRID], [CHART:...], etc.
   - All headings and structure
   - All citations and sources
   - The overall meaning and professional tone

Return the humanized content in the SAME format (if JSON, return JSON; if markdown with JSON wrapper, preserve that structure).`;

      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a human editor who makes AI content sound more natural and human-like. You preserve all facts and structure while making the writing voice more authentic."
            },
            {
              role: "user",
              content: humanizationPrompt
            }
          ],
          max_tokens: 16000, // Increased from 8000 to handle full 2000+ word articles
          temperature: 0.85,
          top_p: 0.95,
        }),
      });

      if (!response.ok) {
        log.warn("Humanization API call failed, returning original content");
        return content;
      }

      const data = await response.json();
      const humanizedContent = data.choices[0]?.message?.content || content;
      const finishReason = data.choices[0]?.finish_reason || "unknown";
      
      log.debug(`Humanization complete: ${data.usage?.total_tokens || 0} tokens`);
      
      if (finishReason === "length") {
        log.warn("Humanization was truncated due to token limit");
      }
      
      // Apply post-processing to remove banned patterns
      return this.enforceBannedPatterns(humanizedContent);
    } catch (error) {
      log.error({ err: error }, "Humanization error");
      return this.enforceBannedPatterns(content);
    }
  }

  /**
   * Post-processing to explicitly remove banned patterns and AI markers
   * This runs AFTER humanization to catch any remaining violations
   */
  private enforceBannedPatterns(content: string): string {
    let processed = content;
    
    // Replace em-dashes and en-dashes with appropriate punctuation
    processed = processed.replace(/—/g, ' - '); // Em dash to hyphen with spaces
    processed = processed.replace(/–/g, ' - '); // En dash to hyphen with spaces
    processed = processed.replace(/\s+-\s+-\s+/g, ', '); // Clean up double dashes
    
    // Banned AI-marker words (case-insensitive replacements)
    const bannedWordReplacements: [RegExp, string][] = [
      [/\bdelve\b/gi, 'explore'],
      [/\bdive deep\b/gi, 'look closely'],
      [/\bunlock\b/gi, 'enable'],
      [/\bunleash\b/gi, 'enable'],
      [/\bharness\b/gi, 'use'],
      [/\bleverage\b/gi, 'use'],
      [/\bpivotal\b/gi, 'important'],
      [/\bparadigm\b/gi, 'model'],
      [/\bsynergy\b/gi, 'cooperation'],
      [/\bcrucial\b/gi, 'important'],
      [/\bparamount\b/gi, 'essential'],
      [/\bseamless\b/gi, 'smooth'],
      [/\brobust\b/gi, 'strong'],
      [/\bholistic\b/gi, 'comprehensive'],
      [/\bstreamline\b/gi, 'simplify'],
      [/\bcutting-edge\b/gi, 'modern'],
      [/\bstate-of-the-art\b/gi, 'modern'],
      [/\bgame-changing\b/gi, 'significant'],
      [/\bworld-class\b/gi, 'excellent'],
    ];
    
    for (const [pattern, replacement] of bannedWordReplacements) {
      processed = processed.replace(pattern, replacement);
    }
    
    // Banned phrases (case-insensitive)
    const bannedPhraseReplacements: [RegExp, string][] = [
      [/In today's fast-paced/gi, 'In the current'],
      [/In the realm of/gi, 'In'],
      [/When it comes to/gi, 'For'],
      [/It's worth noting that/gi, ''],
      [/It goes without saying/gi, ''],
      [/At the end of the day/gi, 'Ultimately'],
      [/Moving forward/gi, 'Going forward'],
      [/In terms of/gi, 'For'],
      [/With that being said/gi, 'That said'],
      [/\bMoreover\b/g, 'Plus'],
      [/\bFurthermore\b/g, 'And'],
      [/\bAdditionally\b/g, 'Also'],
      [/In conclusion/gi, 'To summarise'],
      [/It is important to note/gi, 'Note'],
      [/It should be noted/gi, 'Note that'],
      // Informal lead-in patterns - rewrite as professional statements
      [/So,\s+here's\s+(a\s+)?question:/gi, 'A key question is:'],
      [/So,\s+here's\s+the\s+thing:/gi, 'The key point is:'],
      [/So,\s+what\s+does\s+this\s+mean\?/gi, 'This means that'],
      [/Now\s+here's\s+the\s+thing:/gi, 'The important point is:'],
      [/Here's\s+the\s+deal:/gi, 'The situation is:'],
      [/But\s+wait,/gi, 'However,'],
      // Direct client claims - replace with research-based language
      [/we've\s+worked\s+with\s+CFOs?/gi, 'based on our research with finance leaders'],
      [/we\s+have\s+dealt\s+with\s+CFOs?/gi, 'based on our experience and research'],
      [/in\s+our\s+work\s+with\s+clients/gi, 'based on industry analysis'],
      [/from\s+working\s+with\s+CFOs?/gi, 'from our research and experience'],
      [/our\s+clients\s+have\s+found/gi, 'industry research indicates'],
      [/In\s+our\s+work\s+with\s+clients/gi, 'Based on our research and experience'],
      [/What\s+we've\s+observed/gi, 'Industry research indicates'],
      // Additional collaboration claims to avoid
      [/we've\s+collaborated\s+with/gi, 'based on our research,'],
      [/we\s+collaborated\s+with/gi, 'industry research shows'],
      [/CFOs\s+we've\s+collaborated\s+with/gi, 'based on our research and experience, CFOs'],
      [/companies?\s+we\s+collaborated\s+with/gi, 'research from companies shows'],
      [/clients?\s+we've\s+worked\s+with/gi, 'based on industry research,'],
      [/organisations?\s+we've\s+partnered\s+with/gi, 'research from organisations indicates'],
      [/we've\s+seen\s+CFOs/gi, 'research indicates that CFOs'],
      [/we've\s+helped/gi, 'research shows that'],
      [/our\s+experience\s+with\s+clients/gi, 'industry experience and research'],
    ];
    
    for (const [pattern, replacement] of bannedPhraseReplacements) {
      processed = processed.replace(pattern, replacement);
    }
    
    // Clean up any double spaces created by replacements
    processed = processed.replace(/  +/g, ' ');
    
    // Count replacements for logging (dev only)
    if (process.env.NODE_ENV !== 'production') {
      const originalLength = content.length;
      const processedLength = processed.length;
      if (originalLength !== processedLength) {
        log.debug({ charsChanged: originalLength - processedLength }, "Banned patterns enforced");
      }
    }
    
    return processed;
  }

  private mapOutputToBlogPost(
    output: string,
    brief: string,
    targetKeywords: string[],
    categoryName: string
  ): BlogPostOutput {
    let parsed: any;
    
    const trimmedOutput = output.trim();
    const looksLikePureMarkdown = this.detectPureMarkdown(trimmedOutput);
    
    if (looksLikePureMarkdown) {
      log.info("Detected pure markdown input, extracting metadata");
      parsed = this.extractFromMarkdown(output, brief, targetKeywords);
    } else {
      try {
        const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          parsed = JSON.parse(output);
        }
        
        if (parsed.content && typeof parsed.content === 'string' && parsed.content.includes('```json')) {
          const nestedMatch = parsed.content.match(/```json\s*([\s\S]*?)\s*```/);
          if (nestedMatch) {
            try {
              const nestedParsed = JSON.parse(nestedMatch[1]);
              const hasValidContent = nestedParsed.content && nestedParsed.content.length > 100;
              const hasValidTitle = nestedParsed.title && nestedParsed.title.length > 10 && !nestedParsed.title.includes('create a blog');
              const hasValidExcerpt = nestedParsed.excerpt && nestedParsed.excerpt.length > 50;
              
              if (hasValidContent || (hasValidTitle && hasValidExcerpt)) {
                parsed = nestedParsed;
              }
            } catch (nestedError) {
              log.warn("Could not parse nested JSON, using outer content");
            }
          }
        }
        
        if (parsed.content && typeof parsed.content === 'string' && parsed.content.trim().startsWith('```')) {
          let cleanedContent = parsed.content.replace(/^```(?:json|markdown)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
          
          if (cleanedContent.trim().startsWith('{')) {
            try {
              const innerParsed = JSON.parse(cleanedContent);
              if (innerParsed.content && innerParsed.content.length > 100) {
                parsed = innerParsed;
              }
            } catch {
              parsed.content = cleanedContent;
            }
          } else {
            parsed.content = cleanedContent;
          }
        }
        
        const invalidTitlePatterns = [
          'create a blog', 'lets create', 'write a blog', 'write an article',
          'why it drives', 'rationale:', 'topic:', 'brief:', 'content brief'
        ];
        const titleLooksInvalid = parsed.title && (
          invalidTitlePatterns.some(p => parsed.title.toLowerCase().includes(p)) ||
          (parsed.title.length < 20 && parsed.content) ||
          parsed.title.includes('\n')
        );
        
        if (titleLooksInvalid) {
          const titleMatch = parsed.content?.match(/^#\s+(.+)$/m);
          if (titleMatch) {
            parsed.title = titleMatch[1];
          }
        }
        
      } catch (e) {
        log.warn("Could not parse JSON output, extracting from markdown");
        parsed = this.extractFromMarkdown(output, brief, targetKeywords);
      }
    }

    const title = parsed.title || `${targetKeywords[0]} Guide for CFOs`;
    const slug = this.generateSlug(title);
    const finalContent = parsed.content || output;
    const wordCount = this.countWords(finalContent);
    const readingTime = parsed.readingTime || `${Math.ceil(wordCount / 200)} min read`;

    return {
      title,
      slug,
      excerpt: parsed.excerpt || this.generateExcerptFromContent(finalContent, brief),
      content: finalContent,
      tags: parsed.tags?.length > 0 ? parsed.tags : targetKeywords,
      readingTime,
      categoryId: this.inferCategoryId(brief, targetKeywords, categoryName),
      author: "1QG Editorial Team",
    };
  }

  private inferCategoryId(brief: string, targetKeywords: string[], categoryName?: string): string {
    const contentLower = (brief + " " + targetKeywords.join(" ")).toLowerCase();
    
    // Category UUIDs from the database
    const categories = {
      "ai-technology": "ed7d8bb6-addc-4878-bf4a-b55c20804b1c",
      "epm-erp": "69564d6a-f946-47b3-b999-523042c7b1c8",
      "finance-transformation": "b29dfacd-d507-4d3b-ad74-b9d68fed846a",
      "industry-insights": "5aec6fc7-dc67-475c-8030-ce05cd623bf1",
      "case-studies": "a2b72dcf-737e-4c3f-b2fd-1dc2010bae30",
    };
    
    // If categoryName was provided, try to match it
    if (categoryName) {
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      for (const [key, id] of Object.entries(categories)) {
        if (key.includes(slug) || slug.includes(key.split('-')[0])) {
          return id;
        }
      }
    }
    
    // Infer from content
    if (contentLower.includes("ai") || contentLower.includes("artificial intelligence") || 
        contentLower.includes("machine learning") || contentLower.includes("automation")) {
      return categories["ai-technology"];
    }
    
    if (contentLower.includes("epm") || contentLower.includes("erp") || 
        contentLower.includes("enterprise performance") || contentLower.includes("planning system")) {
      return categories["epm-erp"];
    }
    
    if (contentLower.includes("cfo") || contentLower.includes("finance function") || 
        contentLower.includes("financial planning") || contentLower.includes("fp&a")) {
      return categories["finance-transformation"];
    }
    
    if (contentLower.includes("case study") || contentLower.includes("success story") || 
        contentLower.includes("implementation example")) {
      return categories["case-studies"];
    }
    
    // Default to industry insights
    return categories["industry-insights"];
  }

  private detectPureMarkdown(content: string): boolean {
    const startsWithJson = content.startsWith('{') || content.startsWith('```json');
    if (startsWithJson) return false;
    
    const hasMarkdownHeadings = /^#{1,3}\s+.+$/m.test(content);
    const hasParagraphs = content.split('\n\n').length >= 3;
    const hasNoJsonBraces = !content.includes('"title":') && !content.includes('"content":');
    
    return hasMarkdownHeadings && hasParagraphs && hasNoJsonBraces;
  }

  private extractFromMarkdown(output: string, brief: string, targetKeywords: string[] = []): any {
    const h1Match = output.match(/^#\s+(.+)$/m);
    const h2Match = output.match(/^##\s+(.+)$/m);
    
    let title = h1Match ? h1Match[1].trim() : null;
    if (!title && h2Match) {
      title = h2Match[1].trim();
    }
    if (!title) {
      title = targetKeywords[0] 
        ? `${targetKeywords[0]} Guide for CFOs`
        : brief.substring(0, 60).trim();
    }
    
    title = title.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    
    const excerpt = this.generateExcerptFromContent(output, brief);
    
    const suggestedTags = this.extractTagsFromContent(output, targetKeywords);

    return {
      title,
      excerpt,
      content: output,
      tags: suggestedTags,
      readingTime: `${Math.ceil(this.countWords(output) / 200)} min read`,
    };
  }

  private generateExcerptFromContent(content: string, brief: string): string {
    const summaryMatch = content.match(/## Executive Summary\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (summaryMatch) {
      const summaryText = summaryMatch[1]
        .replace(/\*\*[^*]+\*\*/g, '')
        .replace(/[*_`]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      
      if (summaryText.length >= 80) {
        return summaryText.substring(0, 157).trim() + (summaryText.length > 157 ? '...' : '');
      }
    }
    
    const paragraphs = content.split('\n\n')
      .map(p => p.replace(/^#+\s+.+$/m, '').trim())
      .filter(p => p.length > 50 && !p.startsWith('[') && !p.startsWith('|'));
    
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0]
        .replace(/\*\*[^*]+\*\*/g, '')
        .replace(/[*_`]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      
      if (firstPara.length >= 80) {
        return firstPara.substring(0, 157).trim() + (firstPara.length > 157 ? '...' : '');
      }
    }
    
    return brief.substring(0, 160).trim();
  }

  private extractTagsFromContent(content: string, targetKeywords: string[]): string[] {
    const tags = new Set<string>(targetKeywords.slice(0, 3));
    
    const keyTerms = [
      "AI", "EPM", "ERP", "CFO", "Finance", "Digital Transformation",
      "OneStream", "Anaplan", "Oracle", "SAP", "Implementation",
      "ROI", "Analytics", "Automation", "Planning", "Forecasting"
    ];
    
    for (const term of keyTerms) {
      if (tags.size >= 6) break;
      if (content.toLowerCase().includes(term.toLowerCase())) {
        tags.add(term);
      }
    }
    
    return Array.from(tags).slice(0, 6);
  }

  /**
   * Handle truncated output from GPT
   * SAFE: Only logs warning and returns original content
   * The mapOutputToBlogPost function handles fallback parsing
   */
  private recoverTruncatedJson(output: string): string {
    // Log truncation for monitoring
    log.warn("Content was truncated due to token limit, output may be incomplete");
    
    // Return original output unchanged - let mapOutputToBlogPost handle parsing
    // If JSON is incomplete, extractFromMarkdown will be used as fallback
    return output;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /**
   * Clean up blog content by removing outline artifacts, fixing malformed JSON markers,
   * and cleaning up section headings. Called during publishing to ensure content quality.
   */
  public cleanupBlogContent(content: string): string {
    let cleaned = content;
    
    // 0. Normalize curly quotes to straight quotes (prevents regex matching issues)
    // U+2018 (LEFT SINGLE QUOTATION MARK) and U+2019 (RIGHT SINGLE QUOTATION MARK)
    cleaned = cleaned.replace(/\u2018/g, "'").replace(/\u2019/g, "'");
    // U+201C (LEFT DOUBLE QUOTATION MARK) and U+201D (RIGHT DOUBLE QUOTATION MARK)
    cleaned = cleaned.replace(/\u201C/g, '"').replace(/\u201D/g, '"');
    
    // 0.5. Remove informal patterns and enforce professional consulting firm tone
    // Transform casual language to formal, McKinsey/Bain/Deloitte style
    const informalPatterns: [RegExp, string][] = [
      // INFORMAL LEAD-INS - Remove or replace with professional alternatives
      [/So,?\s+here's\s+a\s+question:\s*/gi, ''],
      [/So,?\s+here's\s+the\s+deal:\s*/gi, ''],
      [/So,?\s+here's\s+the\s+thing:\s*/gi, ''],
      [/But\s+here's\s+the\s+kicker:\s*/gi, 'Significantly, '],
      [/Here's\s+the\s+kicker:\s*/gi, 'Significantly, '],
      [/Here's\s+the\s+deal:\s*/gi, ''],
      [/Here's\s+the\s+reality:\s*/gi, 'The reality is that '],
      [/Here's\s+our\s+advice:\s*/gi, 'Our recommendation is to '],
      [/Here's\s+the\s+thing:\s*/gi, ''],
      [/here's\s+what\s+we've\s+seen:\s*/gi, 'Research indicates that '],
      [/here's\s+what\s+we've\s+noticed[^:]*:\s*/gi, 'Analysis reveals that '],
      [/But\s+here's\s+what\s+matters:\s*/gi, 'The critical consideration is '],
      [/Here's\s+what\s+you\s+need\s+to\s+know:\s*/gi, 'The key insight is that '],
      [/Here's\s+why:\s*/gi, 'This occurs because '],
      [/Here's\s+how:\s*/gi, 'The approach involves '],
      [/Here's\s+something\s+CFOs\s+love\s*[-–—]\s*/gi, 'CFOs particularly value '],
      [/Here's\s+something/gi, 'An important consideration is'],
      [/Here's\s+what/gi, 'What'],
      [/Here's\s+a\s+practical/gi, 'A practical'],
      [/Here's\s+a/gi, 'A'],
      [/Here's\s+an/gi, 'An'],
      
      // CASUAL CONNECTORS - Replace with professional alternatives
      [/Look,\s*/gi, ''],
      [/Frankly,\s*/gi, ''],
      [/Honestly,\s*/gi, ''],
      [/To be fair,\s*/gi, ''],
      [/To be honest,\s*/gi, ''],
      [/By the way,\s*/gi, ''],
      [/The reality is,\s*/gi, 'In practice, '],
      [/The thing is,?\s*/gi, ''],
      [/Truth be told,?\s*/gi, ''],
      [/At the end of the day,?\s*/gi, 'Ultimately, '],
      [/Let's face it,?\s*/gi, ''],
      [/Let's be honest,?\s*/gi, ''],
      [/Bottom line,?\s*/gi, 'In summary, '],
      [/Long story short,?\s*/gi, 'In brief, '],
      [/In all honesty,?\s*/gi, ''],
      [/Quite honestly,?\s*/gi, ''],
      [/That said,\s*/gi, 'However, '],
      [/Sure,\s*/gi, ''],
      [/Well,\s*/gi, ''],
      
      // CASUAL IDIOMS - Replace with professional language
      [/low-hanging fruit/gi, 'readily achievable opportunities'],
      [/boots on the ground/gi, 'operational teams'],
      [/elephant in the room/gi, 'unaddressed issue'],
      [/easier said than done/gi, 'challenging to implement'],
      [/hit the ground running/gi, 'commence rapidly'],
      [/on the same page/gi, 'aligned'],
      [/move the needle/gi, 'drive meaningful impact'],
      [/quick win/gi, 'near-term opportunity'],
      [/quick wins/gi, 'near-term opportunities'],
      
      // CASUAL RHETORICAL QUESTIONS - Remove or rephrase
      [/Why\?\s*(?=It's|Because|The)/gi, ''],
      [/Sound familiar\?\s*/gi, 'This is a common challenge. '],
      [/What gives\?\s*/gi, ''],
      [/See what I mean\?\s*/gi, ''],
      [/Make sense\?\s*/gi, ''],
      [/Get the picture\?\s*/gi, ''],
      
      // INFORMAL PRONOUNS AND PERSONAL REFERENCES
      [/I learned the hard way/gi, 'Experience demonstrates'],
      [/We missed [Xx] at first/gi, 'Initial analysis may overlook'],
      [/I could be wrong because/gi, 'A potential limitation is that'],
      [/What did I miss\?/gi, ''],
      [/If you've tackled this differently,?\s*I'd love to hear\.?/gi, ''],
      
      // DIRECT CLIENT CLAIMS (1QG is a startup - use research-based language)
      [/CFOs\s+(?:often\s+)?ask\s+us:?\s*/gi, 'CFOs frequently inquire: '],
      [/clients\s+(?:often\s+)?ask\s+us:?\s*/gi, 'Finance leaders commonly ask: '],
      [/we've\s+collaborated\s+with\s+/gi, 'Research shows that '],
      [/our\s+clients\s+have\s+found\s+/gi, 'Organisations have found '],
      [/in\s+our\s+work\s+with\s+clients,?\s*/gi, 'In practice, '],
      [/our\s+client\s+engagements\s+/gi, 'Industry experience '],
      [/working\s+with\s+our\s+clients,?\s*/gi, 'Based on industry research, '],
      [/Based\s+on\s+our\s+research\s+with\s+finance\s+leaders/gi, 'Based on research with finance leaders'],
      [/we've\s+identified\s+/gi, 'Research has identified '],
      [/we've\s+seen\s+/gi, 'Industry data demonstrates '],
      [/In\s+our\s+experience\s+working\s+with\s+/gi, 'Based on industry research, '],
      [/What we've observed is/gi, 'Analysis indicates'],
      [/In our work with/gi, 'Research with'],
      
      // EXCLAMATION MARKS - Remove for professional tone
      [/!\s*/g, '. '],
      
      // FRAGMENTS AS SENTENCES - Common ones to fix
      [/\.\s*Short punch\./gi, '.'],
      [/\.\s*Exactly\./gi, '.'],
      [/\.\s*Simple\./gi, '.'],
      [/\.\s*Full stop\./gi, '.'],
    ];
    for (const [pattern, replacement] of informalPatterns) {
      cleaned = cleaned.replace(pattern, replacement);
    }
    
    // 1. Remove outline artifact headers (numbered sections like "## 1.", "## 2.", etc.)
    cleaned = cleaned.replace(/^##\s*\d+\.\s*.*/gm, '');
    
    // 2. Remove lines containing outline artifacts
    const artifactPatterns = [
      /^.*ARTICLE STRUCTURE.*$/gim,
      /^.*OUTLINE.*$/gim,
      /^.*META DESCRIPTION.*$/gim,
      /^.*TITLE SUGGESTIONS.*$/gim,
      /^.*VISUAL COMPONENT PLACEMENTS.*$/gim,
      /^.*SUGGESTED TAGS.*$/gim,
      /^.*WORD COUNT BREAKDOWN.*$/gim,
      /^.*SECTION REQUIREMENTS.*$/gim,
    ];
    
    for (const pattern of artifactPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // 3. Clean up "Main Section X:" prefixes from headings
    cleaned = cleaned.replace(/^(##\s*)Main Section\s*\d+\s*:\s*/gim, '$1');
    
    // 4. Remove template names appearing as headings (like "Main Section 1: Current Landscape")
    cleaned = cleaned.replace(/^(##\s*)(?:Current Landscape|Strategic Framework|Implementation Guide)\s*$/gim, '');
    
    // 5. Remove "H2:" or "H3:" prefixes from headings (artifact from prompts)
    cleaned = cleaned.replace(/^(#{2,3}\s*)H\d+:\s*/gim, '$1');
    
    // 6. Remove visual markers that appear as headings (e.g., ### [FIVE_PILLARS])
    cleaned = cleaned.replace(/^#{1,6}\s*\[(KEY_TAKEAWAY_GRID|FIVE_PILLARS|SUCCESS_FACTORS|IMPLEMENTATION_TIMELINE|CHART[^\]]*)\]\s*$/gim, '');
    
    // 7. Fix malformed JSON in visual markers by validating and attempting repair
    cleaned = this.repairVisualMarkerJson(cleaned);
    
    // 7.5. Normalize visual marker JSON structure for frontend compatibility
    cleaned = this.normalizeVisualMarkerJson(cleaned);
    
    // 8. Fix heading format - ensure headings are on their own lines with proper spacing
    cleaned = this.fixHeadingFormat(cleaned);
    
    // 8.25. Fix split headings - merge headings that are split across lines
    // e.g., "## Section\n\nOne:" -> "## Section One:"
    // e.g., "### Barrier One:\n\nThe Talent Gap" -> "### Barrier One: The Talent Gap"
    cleaned = this.fixSplitHeadings(cleaned);
    
    // 8.5. Fix inline numbered lists - convert "text 1. item 2. item" to proper list format
    cleaned = this.fixInlineNumberedLists(cleaned);
    
    // 9. Remove horizontal rule separators (---) that appear as artifacts
    cleaned = cleaned.replace(/^\s*---\s*$/gm, '');
    cleaned = cleaned.replace(/\s+---\s+/g, '\n\n');
    
    // 10. Clean up duplicate blank lines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
    
    // 10. Remove any leading/trailing whitespace from lines
    cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
    
    // 11. Trim the entire content
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Fix heading format - ensure ## headings are on their own lines with proper spacing
   * This prevents issues where content appears on the same line as a heading
   */
  private fixHeadingFormat(content: string): string {
    const lines = content.split('\n');
    const fixedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip if not a heading line
      if (!line.startsWith('## ') && !line.startsWith('### ')) {
        fixedLines.push(line);
        continue;
      }
      
      // Check if this heading has content on the same line
      // Pattern: ## Heading Text followed by paragraph content (starting with capital letter after space)
      
      // For ## headings - check for common ending patterns followed by content
      if (line.startsWith('## ')) {
        // Pattern 1: Heading ending with ) followed by content
        const parenMatch = line.match(/^(##\s+[^)]+\))\s+([A-Z][a-z].*)$/);
        if (parenMatch) {
          fixedLines.push(parenMatch[1].trim());
          fixedLines.push('');
          fixedLines.push(parenMatch[2]);
          continue;
        }
        
        // Pattern 2: Simple heading followed by sentence (capital letter + lowercase)
        // e.g., "## Executive Summary AI in financial" -> split after "Summary"
        const simpleMatch = line.match(/^(##\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+([A-Z][a-z].{20,})$/);
        if (simpleMatch) {
          fixedLines.push(simpleMatch[1].trim());
          fixedLines.push('');
          fixedLines.push(simpleMatch[2]);
          continue;
        }
        
        // Pattern 3: Heading ending with common section names followed by content
        const sectionMatch = line.match(/^(##\s+(?:Executive Summary|Introduction|Conclusion|FAQs?|Sources and References|Final Thoughts))\s+(.+)$/i);
        if (sectionMatch) {
          fixedLines.push(sectionMatch[1].trim());
          fixedLines.push('');
          fixedLines.push(sectionMatch[2]);
          continue;
        }
      }
      
      // For ### headings - similar logic
      if (line.startsWith('### ')) {
        const h3Match = line.match(/^(###\s+[^:]+:?)\s+([A-Z][a-z].{20,})$/);
        if (h3Match) {
          fixedLines.push(h3Match[1].trim());
          fixedLines.push('');
          fixedLines.push(h3Match[2]);
          continue;
        }
      }
      
      // No match - keep line as is
      fixedLines.push(line);
    }
    
    let result = fixedLines.join('\n');
    
    // Ensure all headings have a blank line after them
    // Replace heading followed by non-blank line with heading + blank line + content
    result = result.replace(/^(#{2,3}\s+[^\n]+)\n(?!\n)([A-Z])/gm, '$1\n\n$2');
    
    // Ensure all headings have a blank line BEFORE them (critical for ReactMarkdown)
    // Match text followed by heading on same line or without blank line
    result = result.replace(/([^\n])\s*(#{2,3}\s+)/g, '$1\n\n$2');
    
    // Also fix headings that appear right after a period without proper line break
    result = result.replace(/\.(\s*)(#{2,3}\s+)/g, '.\n\n$2');
    
    return result;
  }

  /**
   * Fix split headings - merge headings that are split across multiple lines
   * Patterns handled:
   * - "## Section\n\nOne:" -> "## Section One:"
   * - "### Barrier One:\n\nThe Talent Gap" -> "### Barrier One: The Talent Gap"
   * - "## Key\n\nConsiderations" -> "## Key Considerations"
   */
  private fixSplitHeadings(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this is a heading that might be incomplete
      if (line.match(/^#{2,3}\s+\S/)) {
        // Check if heading ends with an incomplete pattern (word or colon)
        // and is followed by blank line(s) then a continuation
        const incompleteHeadingPatterns = [
          // Pattern 1: Heading ends with single short word (likely incomplete)
          /^(#{2,3}\s+(?:[A-Z][a-z]+\s+){0,2}[A-Z][a-z]{1,6})$/,
          // Pattern 2: Heading ends with a colon (expects continuation)
          /^(#{2,3}\s+.+:)\s*$/,
          // Pattern 3: Heading with "One/Two/Three/Four/Five:" pattern
          /^(#{2,3}\s+.+\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten):?)\s*$/,
          // Pattern 4: Heading with "Step/Phase/Barrier X:" pattern
          /^(#{2,3}\s+(?:Step|Phase|Barrier|Challenge|Factor|Pillar)\s+\w+:?)\s*$/,
        ];
        
        let isIncomplete = false;
        let matchedHeading = '';
        
        for (const pattern of incompleteHeadingPatterns) {
          const match = line.match(pattern);
          if (match) {
            isIncomplete = true;
            matchedHeading = match[1];
            break;
          }
        }
        
        if (isIncomplete) {
          // Look ahead for blank lines followed by potential continuation
          let j = i + 1;
          let blankCount = 0;
          
          // Skip blank lines
          while (j < lines.length && lines[j].trim() === '') {
            blankCount++;
            j++;
          }
          
          // Check if there's a continuation line that looks like a heading suffix
          // (starts with a word, not a full sentence)
          if (blankCount > 0 && j < lines.length) {
            const nextLine = lines[j].trim();
            
            // Continuation patterns:
            // - Single or two words ending in colon: "The Talent Gap:" or "Challenge"
            // - Short phrase that completes the heading
            const continuationPatterns = [
              /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}:?)$/,  // "The Talent Gap" or "Challenge:"
              /^([A-Z][a-z]+(?:\s+[A-Za-z]+){0,4})$/,      // "Operational Efficiency Gains"
            ];
            
            let continuation = '';
            for (const pattern of continuationPatterns) {
              const match = nextLine.match(pattern);
              if (match && nextLine.length < 50) {  // Short enough to be heading part
                continuation = match[1];
                break;
              }
            }
            
            if (continuation) {
              // Merge the heading with its continuation
              const headingPrefix = matchedHeading.endsWith(':') 
                ? matchedHeading.slice(0, -1).trim() + ' ' 
                : matchedHeading.trim() + ' ';
              const mergedHeading = headingPrefix + continuation;
              result.push(mergedHeading);
              result.push('');  // Add blank line after heading
              i = j + 1;  // Skip to after the continuation
              continue;
            }
          }
        }
      }
      
      // No merge needed, keep line as-is
      result.push(line);
      i++;
    }
    
    return result.join('\n');
  }

  /**
   * Fix inline numbered lists - convert paragraphs with embedded numbered items to proper markdown lists
   * e.g., "We observed that 1. First item 2. Second item" -> "We observed that:\n\n1. First item\n2. Second item"
   */
  private fixInlineNumberedLists(content: string): string {
    // Pattern: text followed by inline numbered list items
    // Match text ending with "that" or similar, followed by numbered items
    const inlineListPattern = /([^.!?\n]+(?:that|following|include|are|were)\s*)(\d+\.\s+\*\*[^*]+\*\*[^1-9]+)(\d+\.\s+\*\*)/gi;
    
    let result = content;
    
    // More general pattern: detect "1. **" pattern inline after regular text
    result = result.replace(/(\S+\s+)(1\.\s+\*\*[^*]+\*\*:?\s*[^1-9]*)(2\.\s+\*\*)/g, (match, prefix, first, second) => {
      // Only process if prefix doesn't look like it's already on its own line
      if (prefix.trim().length > 0 && !prefix.endsWith('\n')) {
        return prefix.trim() + ':\n\n' + first.trim() + '\n' + second;
      }
      return match;
    });
    
    // Fix all remaining inline numbered items (2., 3., 4., etc. that appear after text)
    // These should each start on a new line
    result = result.replace(/([^\n])\s+(\d+\.\s+\*\*)/g, (match, before, numbered) => {
      // Don't break if this looks like it's already properly formatted
      if (before === '\n' || before.match(/^\d$/)) return match;
      return before + '\n' + numbered;
    });
    
    return result;
  }

  /**
   * Normalize visual marker JSON structure for frontend compatibility
   * - FIVE_PILLARS: change "name" to "title" in pillars array, add top-level title if missing
   * - SUCCESS_FACTORS: change "name" to "title" in factors array, add top-level title if missing
   */
  private normalizeVisualMarkerJson(content: string): string {
    let result = content;
    
    // Helper to extract balanced JSON from content starting at a position
    const extractBalancedJson = (str: string, startIdx: number): { json: string; endIdx: number } | null => {
      if (str[startIdx] !== '{') return null;
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = startIdx; i < str.length; i++) {
        const char = str[i];
        if (escapeNext) { escapeNext = false; continue; }
        if (char === '\\' && inString) { escapeNext = true; continue; }
        if (char === '"' && !escapeNext) { inString = !inString; continue; }
        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') {
            depth--;
            if (depth === 0) return { json: str.slice(startIdx, i + 1), endIdx: i + 1 };
          }
        }
      }
      return null;
    };
    
    // Process FIVE_PILLARS markers
    const fivePillarsMarker = '[FIVE_PILLARS]';
    let searchIdx = 0;
    while (true) {
      const markerIdx = result.indexOf(fivePillarsMarker, searchIdx);
      if (markerIdx === -1) break;
      
      let jsonStart = markerIdx + fivePillarsMarker.length;
      while (jsonStart < result.length && /\s/.test(result[jsonStart])) jsonStart++;
      
      if (result[jsonStart] === '{') {
        const extracted = extractBalancedJson(result, jsonStart);
        if (extracted) {
          try {
            const data = JSON.parse(extracted.json);
            if (!data.title) data.title = "Five Pillars";
            if (Array.isArray(data.pillars)) {
              data.pillars = data.pillars.map((p: any) => ({
                title: p.title || p.name || 'Pillar',
                description: p.description || '',
                icon: p.icon
              }));
            }
            const newJson = JSON.stringify(data);
            const replacement = fivePillarsMarker + '\n' + newJson + '\n\n';
            result = result.slice(0, markerIdx) + replacement + result.slice(extracted.endIdx);
            searchIdx = markerIdx + replacement.length;
          } catch (e) {
            searchIdx = markerIdx + fivePillarsMarker.length;
          }
        } else {
          searchIdx = markerIdx + fivePillarsMarker.length;
        }
      } else {
        searchIdx = markerIdx + fivePillarsMarker.length;
      }
    }
    
    // Process SUCCESS_FACTORS markers
    const successFactorsMarker = '[SUCCESS_FACTORS]';
    searchIdx = 0;
    while (true) {
      const markerIdx = result.indexOf(successFactorsMarker, searchIdx);
      if (markerIdx === -1) break;
      
      let jsonStart = markerIdx + successFactorsMarker.length;
      while (jsonStart < result.length && /\s/.test(result[jsonStart])) jsonStart++;
      
      if (result[jsonStart] === '{') {
        const extracted = extractBalancedJson(result, jsonStart);
        if (extracted) {
          try {
            const data = JSON.parse(extracted.json);
            if (!data.title) data.title = "Success Factors";
            if (Array.isArray(data.factors)) {
              data.factors = data.factors.map((f: any) => ({
                title: f.title || f.name || 'Factor',
                description: f.description || '',
                icon: f.icon
              }));
            }
            const newJson = JSON.stringify(data);
            const replacement = successFactorsMarker + '\n' + newJson + '\n\n';
            result = result.slice(0, markerIdx) + replacement + result.slice(extracted.endIdx);
            searchIdx = markerIdx + replacement.length;
          } catch (e) {
            searchIdx = markerIdx + successFactorsMarker.length;
          }
        } else {
          searchIdx = markerIdx + successFactorsMarker.length;
        }
      } else {
        searchIdx = markerIdx + successFactorsMarker.length;
      }
    }
    
    // Process IMPLEMENTATION_TIMELINE markers
    const implTimelineMarker = '[IMPLEMENTATION_TIMELINE]';
    searchIdx = 0;
    while (true) {
      const markerIdx = result.indexOf(implTimelineMarker, searchIdx);
      if (markerIdx === -1) break;
      
      let jsonStart = markerIdx + implTimelineMarker.length;
      while (jsonStart < result.length && /\s/.test(result[jsonStart])) jsonStart++;
      
      if (result[jsonStart] === '{') {
        const extracted = extractBalancedJson(result, jsonStart);
        if (extracted) {
          try {
            const data = JSON.parse(extracted.json);
            if (Array.isArray(data.phases)) {
              data.phases = data.phases.map((p: any, i: number) => ({
                phase: p.phase ?? i + 1,
                title: p.title || p.name || `Phase ${i + 1}`,
                timeframe: p.timeframe || p.duration || '',
                description: p.description || ''
              }));
            }
            const newJson = JSON.stringify(data);
            const replacement = implTimelineMarker + '\n' + newJson + '\n\n';
            result = result.slice(0, markerIdx) + replacement + result.slice(extracted.endIdx);
            searchIdx = markerIdx + replacement.length;
          } catch (e) {
            searchIdx = markerIdx + implTimelineMarker.length;
          }
        } else {
          searchIdx = markerIdx + implTimelineMarker.length;
        }
      } else {
        searchIdx = markerIdx + implTimelineMarker.length;
      }
    }
    
    // Process KEY_TAKEAWAY_GRID markers (ensure proper formatting with newlines)
    const keyTakeawayMarker = '[KEY_TAKEAWAY_GRID]';
    searchIdx = 0;
    while (true) {
      const markerIdx = result.indexOf(keyTakeawayMarker, searchIdx);
      if (markerIdx === -1) break;
      
      let jsonStart = markerIdx + keyTakeawayMarker.length;
      while (jsonStart < result.length && /\s/.test(result[jsonStart])) jsonStart++;
      
      if (result[jsonStart] === '{') {
        const extracted = extractBalancedJson(result, jsonStart);
        if (extracted) {
          try {
            JSON.parse(extracted.json); // Just validate
            const replacement = keyTakeawayMarker + '\n' + extracted.json + '\n\n';
            result = result.slice(0, markerIdx) + replacement + result.slice(extracted.endIdx);
            searchIdx = markerIdx + replacement.length;
          } catch (e) {
            searchIdx = markerIdx + keyTakeawayMarker.length;
          }
        } else {
          searchIdx = markerIdx + keyTakeawayMarker.length;
        }
      } else {
        searchIdx = markerIdx + keyTakeawayMarker.length;
      }
    }
    
    return result;
  }

  /**
   * Repair malformed JSON in visual markers
   */
  private repairVisualMarkerJson(content: string): string {
    const markerPatterns = [
      { marker: '[KEY_TAKEAWAY_GRID]', pattern: /\[KEY_TAKEAWAY_GRID\]\s*\n?\s*(\{[\s\S]*?\})(?=\n\n|\n[^{]|$)/g },
      { marker: '[FIVE_PILLARS]', pattern: /\[FIVE_PILLARS\]\s*\n?\s*(\{[\s\S]*?\})(?=\n\n|\n[^{]|$)/g },
      { marker: '[SUCCESS_FACTORS]', pattern: /\[SUCCESS_FACTORS\]\s*\n?\s*(\{[\s\S]*?\})(?=\n\n|\n[^{]|$)/g },
      { marker: '[IMPLEMENTATION_TIMELINE]', pattern: /\[IMPLEMENTATION_TIMELINE\]\s*\n?\s*(\{[\s\S]*?\})(?=\n\n|\n[^{]|$)/g },
      { marker: '[CHART:', pattern: /\[CHART:[^\]]+\]\s*\n?\s*(\{[\s\S]*?\})(?=\n\n|\n[^{]|$)/g },
    ];

    let result = content;

    for (const { marker, pattern } of markerPatterns) {
      result = result.replace(pattern, (match, jsonPart) => {
        try {
          // Try to parse the JSON
          JSON.parse(jsonPart);
          return match; // Valid JSON, keep as-is
        } catch (e) {
          // Attempt to repair the JSON
          const repaired = this.attemptJsonRepair(jsonPart, marker);
          if (repaired) {
            return match.replace(jsonPart, repaired);
          }
          // If repair fails, remove the malformed marker entirely
          log.warn({ marker }, "Removing malformed marker - could not repair JSON");
          return '';
        }
      });
    }

    return result;
  }

  /**
   * Attempt to repair malformed JSON
   */
  private attemptJsonRepair(json: string, markerType: string): string | null {
    let repaired = json.trim();
    
    // Common repairs
    // 1. Close unclosed brackets
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;
    
    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += '}';
    }
    
    // Add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += ']';
    }
    
    // 2. Fix truncated strings (look for unclosed quotes)
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // Try to find the last string and close it
      repaired = repaired.replace(/("[^"]*$)/, '$1"');
    }
    
    // 3. Remove trailing commas before closing brackets/braces
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    // Verify the repair worked
    try {
      JSON.parse(repaired);
      log.info({ markerType }, "Successfully repaired JSON");
      return repaired;
    } catch (e) {
      // If still invalid, generate a fallback based on marker type
      return this.generateFallbackMarkerJson(markerType);
    }
  }

  /**
   * Generate fallback JSON for markers that couldn't be repaired
   */
  private generateFallbackMarkerJson(markerType: string): string | null {
    if (markerType.includes('KEY_TAKEAWAY_GRID')) {
      return '{"takeaways": ["Key insight from the research", "Strategic consideration for finance leaders", "Implementation best practice", "Measurable business impact"]}';
    }
    if (markerType.includes('FIVE_PILLARS')) {
      return '{"pillars": [{"name": "Strategic Alignment", "description": "Ensuring initiatives align with business objectives"}, {"name": "Technology Foundation", "description": "Building the right technical infrastructure"}, {"name": "Process Excellence", "description": "Optimising workflows and procedures"}, {"name": "People & Skills", "description": "Developing capabilities and expertise"}, {"name": "Governance", "description": "Establishing oversight and controls"}]}';
    }
    if (markerType.includes('SUCCESS_FACTORS')) {
      return '{"factors": [{"name": "Executive Sponsorship", "description": "Strong leadership commitment"}, {"name": "Clear Objectives", "description": "Well-defined goals and metrics"}, {"name": "Change Management", "description": "Effective stakeholder engagement"}, {"name": "Technical Expertise", "description": "Skilled implementation team"}, {"name": "Continuous Improvement", "description": "Ongoing optimisation"}]}';
    }
    if (markerType.includes('IMPLEMENTATION_TIMELINE')) {
      return '{"phases": [{"phase": "Phase 1: Discovery", "duration": "Weeks 1-4", "activities": ["Requirements gathering", "Stakeholder alignment"]}, {"phase": "Phase 2: Design", "duration": "Weeks 5-8", "activities": ["Solution design", "Process mapping"]}, {"phase": "Phase 3: Build", "duration": "Weeks 9-16", "activities": ["Development", "Testing"]}, {"phase": "Phase 4: Deploy", "duration": "Weeks 17-20", "activities": ["Go-live", "Hypercare"]}]}';
    }
    if (markerType.includes('CHART')) {
      return '{"title": "Key Metrics", "data": [{"label": "Efficiency Gain", "value": 35}, {"label": "Cost Reduction", "value": 25}, {"label": "Time Savings", "value": 40}, {"label": "ROI", "value": 50}]}';
    }
    return null;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  validateGuardrails(content: string, stage: string): StageResult {
    const violations: GuardrailViolation[] = [];
    
    // Define which rule types are structural (apply strictly to all stages)
    const structuralRuleTypes = ["structure"];
    const structuralRuleNames = [
      "H2 Headings Required", 
      "Requires H2 headings",
      "Executive Summary Required",
      "Requires Executive Summary",
      "Minimum Sections"
    ];
    
    // Critical rules that MUST block even in draft stage - word count is essential
    const criticalRuleNames = [
      "Minimum Word Count",
      "Word Count Minimum"
    ];
    
    // Content quality rules that should be warnings (not blockers) for outline and first draft
    const contentQualityRuleNames = [
      "No Guarantees",
      "No Hyperbole",
      "No Filler Phrases",
      "No Generic Statements",
      "No Weasel Words",
      "No Sales Language",
      "CFO Relevance",
      "UK Spelling",
      "Currency Formatting",
      "Change Management",
      "TCO Consideration",
      "EPM Vendor Mentions",
      "AI Hype Avoidance",
      "Objective Voice",
      "Chart Markers Present",
      "Key Takeaways Required",
      "Implementation Timeline",
      "Five Pillars Component",
      "FAQ Section Recommended"
    ];
    
    for (const rule of this.guardrailRules) {
      const violation = this.checkRule(rule, content);
      if (violation) {
        // For "final" stage, enforce ALL rules strictly - no downgrades
        if (stage === "final") {
          violations.push(violation);
          continue;
        }
        
        // For outline and draft stages, downgrade content quality rules to warnings
        // EXCEPT critical rules like word count which must always block
        if (stage === "outline" || stage === "draft") {
          const isStructuralRule = structuralRuleTypes.includes(rule.validationType) || 
                                   structuralRuleNames.includes(rule.name);
          const isCriticalRule = criticalRuleNames.includes(rule.name) ||
                                 rule.validationType === "word_count";
          const isContentQualityRule = contentQualityRuleNames.includes(rule.name);
          
          // Structural and critical rules should block outline/draft stages
          // Content quality rules are reported as warnings for improvement
          if (!isStructuralRule && !isCriticalRule && violation.severity === "error") {
            violation.severity = "warning";
          }
        }
        violations.push(violation);
      }
    }

    // Only fail on actual errors (not downgraded ones)
    const hasBlockingErrors = violations.some(v => v.severity === "error");

    return {
      stage,
      passed: !hasBlockingErrors,
      violations,
    };
  }

  private checkRule(rule: GuardrailRuleDb, content: string): GuardrailViolation | null {
    // Parse validationParams from JSON string
    let config: Record<string, any> = {};
    try {
      config = rule.validationParams ? JSON.parse(rule.validationParams) : {};
    } catch (e) {
      log.warn({ err: e, rule: rule.name }, "Failed to parse validationParams");
    }

    switch (rule.validationType) {
      case "word_count": {
        const wordCount = this.countWords(content);
        const minWords = config.minWords || 0;
        const maxWords = config.maxWords || Infinity;
        
        if (wordCount < minWords) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.errorMessage || `Content has ${wordCount} words, minimum required is ${minWords}`,
            suggestedFix: rule.suggestion || `Add more content to reach at least ${minWords} words`,
          };
        }
        if (wordCount > maxWords) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.errorMessage || `Content has ${wordCount} words, maximum allowed is ${maxWords}`,
            suggestedFix: rule.suggestion || `Reduce content to under ${maxWords} words`,
          };
        }
        break;
      }

      case "regex": {
        if (!config.pattern || typeof config.pattern !== 'string' || config.pattern.length > 500) break;
        try {
          const pattern = new RegExp(config.pattern, config.flags || "gi");
          const mustMatch = config.mustMatch ?? true;
          const matches = content.match(pattern);
          const matchCount = matches?.length || 0;
          const minOccurrences = config.minOccurrences || 0;
          const maxOccurrences = config.maxOccurrences || Infinity;

          // Check for minimum occurrence requirement (humanization rules)
          if (minOccurrences > 0 && matchCount < minOccurrences) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: rule.errorMessage || `Content only has ${matchCount} matches, minimum required is ${minOccurrences}`,
              suggestedFix: rule.suggestion ?? undefined,
            };
          }
          
          // Check for maximum occurrence limit
          if (maxOccurrences < Infinity && matchCount > maxOccurrences) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: rule.errorMessage || `Content has ${matchCount} matches, maximum allowed is ${maxOccurrences}`,
              suggestedFix: rule.suggestion ?? undefined,
            };
          }

          // Legacy mustMatch behavior (for rules without minOccurrences)
          if (minOccurrences === 0) {
            if (mustMatch && !matches) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                message: rule.errorMessage || `Content does not match required pattern: ${config.pattern}`,
                suggestedFix: rule.suggestion ?? undefined,
              };
            }
            if (!mustMatch && matches) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                message: rule.errorMessage || `Content contains forbidden pattern: ${matches.join(", ")}`,
                suggestedFix: rule.suggestion ?? undefined,
              };
            }
          }
        } catch (regexError: any) {
          log.error({ err: regexError, rule: rule.name, pattern: config.pattern }, "Invalid regex pattern in guardrail rule");
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: "warning",
            message: `Guardrail rule "${rule.name}" has invalid regex pattern and was skipped`,
            suggestedFix: `Fix the regex pattern: ${regexError.message}`,
          };
        }
        break;
      }

      case "structure": {
        if (config.requiresH2 && !content.includes("## ")) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.errorMessage || "Content must include H2 headings",
            suggestedFix: rule.suggestion || "Add section headings using ## syntax",
          };
        }
        if (config.requiresExecutiveSummary && 
            !content.toLowerCase().includes("executive summary")) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.errorMessage || "Content must include an Executive Summary",
            suggestedFix: rule.suggestion || "Add an Executive Summary section at the beginning",
          };
        }
        if (config.requiresVisualMarkers) {
          const hasKeyTakeaway = content.includes("[KEY_TAKEAWAY_GRID]");
          const hasPillars = content.includes("[FIVE_PILLARS]") || content.includes("[SUCCESS_FACTORS]");
          const hasTimeline = content.includes("[IMPLEMENTATION_TIMELINE]");
          const hasChart = content.includes("[CHART:");
          
          const missingMarkers: string[] = [];
          if (!hasKeyTakeaway) missingMarkers.push("[KEY_TAKEAWAY_GRID]");
          if (!hasPillars) missingMarkers.push("[FIVE_PILLARS] or [SUCCESS_FACTORS]");
          if (!hasTimeline) missingMarkers.push("[IMPLEMENTATION_TIMELINE]");
          if (!hasChart) missingMarkers.push("[CHART]");
          
          if (missingMarkers.length > 0) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: rule.errorMessage || `Content is missing required visual markers: ${missingMarkers.join(", ")}`,
              suggestedFix: rule.suggestion || `Add the following markers: ${missingMarkers.join(", ")}`,
            };
          }
        }
        break;
      }

      case "citations": {
        if (config.requiresVerifiedSources) {
          const hasSources = content.includes("## Sources") || content.includes("Sources & References");
          if (!hasSources) {
            return {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: rule.errorMessage || "Content must include a Sources section with verified citations",
              suggestedFix: rule.suggestion || "Add a ## Sources section with verified URLs",
            };
          }
        }
        
        if (config.forbiddenCitations) {
          const forbidden = config.forbiddenCitations as string[];
          for (const term of forbidden) {
            if (content.toLowerCase().includes(term.toLowerCase())) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: "error",
                message: `Content contains unverified citation reference: "${term}"`,
                suggestedFix: `Remove or replace the reference to "${term}" with verified sources only`,
              };
            }
          }
        }
        break;
      }

      case "tone": {
        if (config.forbiddenPhrases) {
          const forbidden = config.forbiddenPhrases as string[];
          for (const phrase of forbidden) {
            if (content.toLowerCase().includes(phrase.toLowerCase())) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                message: rule.errorMessage || `Content contains inappropriate phrase: "${phrase}"`,
                suggestedFix: rule.suggestion || `Remove or rephrase "${phrase}"`,
              };
            }
          }
        }
        break;
      }

      case "seo": {
        if (config.minTitleLength || config.maxTitleLength) {
          const titleMatch = content.match(/^#\s+(.+)$/m);
          if (titleMatch) {
            const titleLength = titleMatch[1].length;
            if (config.minTitleLength && titleLength < config.minTitleLength) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                message: `Title is ${titleLength} characters, minimum is ${config.minTitleLength}`,
                suggestedFix: "Expand the title to be more descriptive",
              };
            }
            if (config.maxTitleLength && titleLength > config.maxTitleLength) {
              return {
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                message: `Title is ${titleLength} characters, maximum is ${config.maxTitleLength}`,
                suggestedFix: "Shorten the title for better SEO",
              };
            }
          }
        }
        break;
      }
    }

    return null;
  }

  estimateCost(tokensUsed: number): string {
    const perplexityCostPer1K = 0.001;
    const claudeCostPer1K = 0.003;
    const gptCostPer1K = 0.005;
    
    const avgCost = (perplexityCostPer1K + claudeCostPer1K + gptCostPer1K) / 3;
    const estimated = (tokensUsed / 1000) * avgCost;
    
    return `$${estimated.toFixed(4)}`;
  }

  async quickFixComponent(
    prompt: string,
    model: string = "gpt-4o",
    maxTokens: number = 2000
  ): Promise<{ output: string; tokensUsed: number }> {
    log.debug(`Quick fix: Calling ${model}...`);
    
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a precise technical content editor. When asked to fix structured content markers, return ONLY the corrected marker with no additional text or explanation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GPT API error: ${error}`);
    }

    const data = await response.json();
    const output = data.choices[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens || 0;

    log.info({ tokensUsed }, "Quick fix complete");

    return { output, tokensUsed };
  }
  /**
   * Validate blog content before publishing
   * Returns list of issues found (empty array if content is valid)
   */
  public validateContentForPublishing(content: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // 1. Check for informal patterns that should not be in published content
    const informalPatterns = [
      { pattern: /\bhere's\s+(the|a|our|what|why|how|something)\s*:/i, message: "Contains informal 'Here's X:' pattern" },
      { pattern: /so,?\s+here's/i, message: "Contains informal 'So, here's' pattern" },
      { pattern: /we've\s+collaborated\s+with/i, message: "Contains client claim 'we've collaborated with'" },
      { pattern: /our\s+clients\s+have\s+found/i, message: "Contains client claim 'our clients have found'" },
      { pattern: /in\s+our\s+work\s+with\s+clients/i, message: "Contains client claim 'in our work with clients'" },
    ];
    
    for (const { pattern, message } of informalPatterns) {
      if (pattern.test(content)) {
        issues.push(message);
      }
    }
    
    // 2. Check heading format - headings should not have content on same line
    const headingWithContent = content.match(/^##\s+[^\n]+[A-Z][a-z]{2,}\s+[A-Z][a-z]/gm);
    if (headingWithContent && headingWithContent.length > 0) {
      // Check if any heading line is suspiciously long (> 100 chars might have content)
      for (const heading of headingWithContent) {
        if (heading.length > 100) {
          issues.push(`Heading may have content on same line: "${heading.substring(0, 50)}..."`);
        }
      }
    }
    
    // 3. Check for required sections
    if (!/##\s*Executive\s*Summary/i.test(content)) {
      issues.push("Missing Executive Summary section");
    }
    if (!/##\s*(?:FAQs?|Frequently Asked Questions)/i.test(content)) {
      issues.push("Missing FAQs section");
    }
    if (!/##\s*Conclusion/i.test(content)) {
      issues.push("Missing Conclusion section");
    }
    
    // 4. Check word count
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 2500) {
      issues.push(`Word count too low: ${wordCount} words (minimum 2500)`);
    }
    
    // 5. Check for visual markers
    const hasVisualMarker = /\[(KEY_TAKEAWAY_GRID|FIVE_PILLARS|SUCCESS_FACTORS|IMPLEMENTATION_TIMELINE)\]/.test(content);
    if (!hasVisualMarker) {
      issues.push("Missing visual component markers");
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export const blogGenerationService = new BlogGenerationService();

export const DEFAULT_GUARDRAIL_CATEGORIES = [
  { name: "Citation Integrity", slug: "citation-integrity", description: "Ensures only real, verifiable sources are used", priority: 1 },
  { name: "Content Structure", slug: "content-structure", description: "Enforces consulting-grade article structure", priority: 1 },
  { name: "Word Count & Length", slug: "word-count", description: "Minimum and maximum content length requirements", priority: 2 },
  { name: "Tone & Voice", slug: "tone-voice", description: "CFO-appropriate professional language", priority: 2 },
  { name: "UK English", slug: "uk-english", description: "British spelling and grammar requirements", priority: 2 },
  { name: "SEO Optimisation", slug: "seo-optimisation", description: "Search engine optimisation standards", priority: 2 },
  { name: "Visual Components", slug: "visual-components", description: "Rich visual marker requirements", priority: 3 },
  { name: "Executive Summary", slug: "executive-summary", description: "Executive summary presence and quality", priority: 3 },
  { name: "Actionable Insights", slug: "actionable-insights", description: "Ensures content provides practical value", priority: 3 },
  { name: "Data Accuracy", slug: "data-accuracy", description: "Validates statistics and figures", priority: 1 },
  { name: "Heading Hierarchy", slug: "heading-hierarchy", description: "Proper H1/H2/H3 structure", priority: 3 },
  { name: "Link Integrity", slug: "link-integrity", description: "Internal and external link quality", priority: 3 },
  { name: "Keyword Integration", slug: "keyword-integration", description: "Target keyword usage and density", priority: 3 },
  { name: "Readability", slug: "readability", description: "Content accessibility for target audience", priority: 3 },
  { name: "Forbidden Terms", slug: "forbidden-terms", description: "Blocked words and phrases", priority: 2 },
  { name: "Framework Usage", slug: "framework-usage", description: "Strategic framework inclusion", priority: 3 },
  { name: "Call to Action", slug: "call-to-action", description: "Conversion-oriented content elements", priority: 4 },
  { name: "Brand Voice", slug: "brand-voice", description: "1QG brand consistency", priority: 2 },
  { name: "Technical Accuracy", slug: "technical-accuracy", description: "EPM/ERP/AI terminology correctness", priority: 2 },
  { name: "Competitor Mentions", slug: "competitor-mentions", description: "Appropriate competitor referencing", priority: 3 },
  { name: "Date References", slug: "date-references", description: "Temporal accuracy in content", priority: 3 },
  { name: "Meta Content", slug: "meta-content", description: "Meta description and title requirements", priority: 2 },
  { name: "Image Guidelines", slug: "image-guidelines", description: "Image placement and alt text", priority: 4 },
];

export const DEFAULT_GUARDRAIL_RULES = [
  { categorySlug: "citation-integrity", name: "No fabricated Gartner citations", ruleType: "citation", severity: "error", 
    ruleConfig: { forbiddenCitations: ["Gartner reports", "Gartner predicts", "According to Gartner", "Gartner Magic Quadrant"] },
    errorMessage: "Cannot reference Gartner without verified source URL", suggestedFix: "Use 'Based on 1QG consulting experience' instead", appliesToStage: ["final"] },
  
  { categorySlug: "citation-integrity", name: "No fabricated McKinsey citations", ruleType: "citation", severity: "error",
    ruleConfig: { forbiddenCitations: ["McKinsey reports", "McKinsey research", "According to McKinsey", "McKinsey Global Institute"] },
    errorMessage: "Cannot reference McKinsey without verified source URL", suggestedFix: "Use 'Based on industry benchmarks' instead", appliesToStage: ["final"] },
  
  { categorySlug: "citation-integrity", name: "No fabricated Deloitte citations", ruleType: "citation", severity: "error",
    ruleConfig: { forbiddenCitations: ["Deloitte survey", "Deloitte research", "According to Deloitte", "Deloitte report"] },
    errorMessage: "Cannot reference Deloitte without verified source URL", suggestedFix: "Use 'Based on 1QG consulting experience' instead", appliesToStage: ["final"] },
  
  { categorySlug: "citation-integrity", name: "Requires verified sources section", ruleType: "citation", severity: "error",
    ruleConfig: { requiresVerifiedSources: true },
    errorMessage: "Article must include a Sources section with verified URLs", suggestedFix: "Add ## Sources section at the end with all citation URLs", appliesToStage: ["final"] },
  
  { categorySlug: "word-count", name: "Minimum 2500 words", ruleType: "word_count", severity: "error",
    ruleConfig: { minWords: 2500 },
    errorMessage: "Content must be at least 2500 words for consulting-grade depth and SEO", suggestedFix: "Expand sections with more detail, examples, and case studies", appliesToStage: ["final"] },
  
  { categorySlug: "word-count", name: "Maximum 5000 words", ruleType: "word_count", severity: "warning",
    ruleConfig: { maxWords: 5000 },
    errorMessage: "Content exceeds 5000 words which may reduce engagement", suggestedFix: "Consider splitting into a series", appliesToStage: ["final"] },
  
  { categorySlug: "content-structure", name: "Requires H2 headings", ruleType: "structure", severity: "error",
    ruleConfig: { requiresH2: true },
    errorMessage: "Content must include H2 section headings", suggestedFix: "Add section headings using ## syntax", appliesToStage: ["outline", "final"] },
  
  { categorySlug: "content-structure", name: "Requires Executive Summary", ruleType: "structure", severity: "error",
    ruleConfig: { requiresExecutiveSummary: true },
    errorMessage: "Content must include an Executive Summary for C-suite readers", suggestedFix: "Add Executive Summary section at the beginning", appliesToStage: ["outline", "final"] },
  
  { categorySlug: "visual-components", name: "Requires visual markers", ruleType: "structure", severity: "error",
    ruleConfig: { requiresVisualMarkers: true },
    errorMessage: "Content MUST include visual component markers - this is mandatory", suggestedFix: "Add [KEY_TAKEAWAY_GRID], [FIVE_PILLARS] or [SUCCESS_FACTORS], [IMPLEMENTATION_TIMELINE], and at least one [CHART]", appliesToStage: ["final"] },
  
  { categorySlug: "content-structure", name: "Requires FAQs section", ruleType: "regex", severity: "error",
    ruleConfig: { pattern: "## FAQ|## Frequently Asked Questions", mustMatch: true, flags: "i" },
    errorMessage: "Content must include a FAQs section with common questions and answers", suggestedFix: "Add ## FAQs section with 4-6 questions and detailed answers", appliesToStage: ["final"] },
  
  { categorySlug: "content-structure", name: "Requires Conclusion section", ruleType: "regex", severity: "error",
    ruleConfig: { pattern: "## Conclusion|## Summary|## Key Takeaways", mustMatch: true, flags: "i" },
    errorMessage: "Content must include a Conclusion section summarising key points", suggestedFix: "Add ## Conclusion section with 5-point executive summary", appliesToStage: ["final"] },
  
  { categorySlug: "uk-english", name: "Use organisation not organization", ruleType: "regex", severity: "warning",
    ruleConfig: { pattern: "\\borganization\\b", mustMatch: false },
    errorMessage: "Use UK English spelling 'organisation'", suggestedFix: "Replace 'organization' with 'organisation'", appliesToStage: ["final"] },
  
  { categorySlug: "uk-english", name: "Use optimise not optimize", ruleType: "regex", severity: "warning",
    ruleConfig: { pattern: "\\boptimize\\b", mustMatch: false },
    errorMessage: "Use UK English spelling 'optimise'", suggestedFix: "Replace 'optimize' with 'optimise'", appliesToStage: ["final"] },
  
  { categorySlug: "uk-english", name: "Use analyse not analyze", ruleType: "regex", severity: "warning",
    ruleConfig: { pattern: "\\banalyze\\b", mustMatch: false },
    errorMessage: "Use UK English spelling 'analyse'", suggestedFix: "Replace 'analyze' with 'analyse'", appliesToStage: ["final"] },
  
  { categorySlug: "tone-voice", name: "Avoid casual language", ruleType: "tone", severity: "warning",
    ruleConfig: { forbiddenPhrases: ["gonna", "wanna", "kinda", "sort of", "stuff", "things", "cool", "awesome", "great job"] },
    errorMessage: "Content contains casual language inappropriate for C-suite audience", suggestedFix: "Use professional, authoritative language", appliesToStage: ["final"] },
  
  { categorySlug: "tone-voice", name: "Avoid hyperbole", ruleType: "tone", severity: "warning",
    ruleConfig: { forbiddenPhrases: ["revolutionary", "game-changing", "unprecedented", "world-class", "best-in-class", "cutting-edge", "state-of-the-art", "paradigm shift"] },
    errorMessage: "Avoid hyperbolic marketing language in thought leadership", suggestedFix: "Use precise, substantiated claims instead", appliesToStage: ["final"] },
  
  { categorySlug: "seo-optimisation", name: "Title length 50-60 chars", ruleType: "seo", severity: "warning",
    ruleConfig: { minTitleLength: 50, maxTitleLength: 60 },
    errorMessage: "Title should be 50-60 characters for optimal SEO", suggestedFix: "Adjust title length", appliesToStage: ["final"] },
  
  { categorySlug: "forbidden-terms", name: "No AI-generated indicators", ruleType: "regex", severity: "error",
    ruleConfig: { pattern: "\\b(As an AI|I cannot|I don't have|I'm unable to|my training data)\\b", mustMatch: false, flags: "i" },
    errorMessage: "Content contains AI-generated language indicators", suggestedFix: "Remove or rephrase to sound natural", appliesToStage: ["final"] },
  
  { categorySlug: "forbidden-terms", name: "No competitor disparagement", ruleType: "tone", severity: "error",
    ruleConfig: { forbiddenPhrases: ["inferior", "worst", "terrible", "awful", "useless", "waste of money"] },
    errorMessage: "Do not disparage competitor products", suggestedFix: "Use objective comparison language", appliesToStage: ["final"] },
];
