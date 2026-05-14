/**
 * Perplexity AI Service for Finance Compass
 * 
 * Provides deep research and fact-checking capabilities for AI-generated narratives.
 * Uses Perplexity's search-enhanced LLM for real-time industry data validation.
 */

import { createChildLogger } from "../lib/logger";

const log = createChildLogger("perplexity-service");

export interface PerplexityResponse {
  content: string;
  citations: string[];
  model: string;
}

export interface FactCheckResult {
  isValid: boolean;
  confidence: number;
  corrections: string[];
  citations: string[];
  enhancedContent?: string;
}

export interface IndustryResearchResult {
  insights: string;
  benchmarks: Record<string, string>;
  trends: string[];
  citations: string[];
}

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";

async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1024
): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices?.[0]?.message?.content || "",
    citations: data.citations || [],
    model: data.model,
  };
}

/**
 * Research industry-specific EPM/finance transformation benchmarks and trends
 */
export async function researchIndustryBenchmarks(
  sector: string,
  companySize: string,
  focusAreas: string[]
): Promise<IndustryResearchResult> {
  const systemPrompt = `You are a finance transformation research analyst. Provide factual, data-driven insights about EPM (Enterprise Performance Management) and finance transformation benchmarks. Focus on recent industry data, analyst reports, and documented case studies. Always cite sources.`;

  const userPrompt = `Research current EPM and finance transformation benchmarks for:
- Industry sector: ${sector}
- Company size: ${companySize}
- Focus areas: ${focusAreas.join(", ")}

Provide:
1. Key industry benchmarks (close cycle time, forecast accuracy, planning cycle duration)
2. Current transformation trends in this sector
3. Typical ROI metrics for EPM implementations in this industry
4. Best practices from leading organisations

Format as JSON:
{
  "insights": "2-3 paragraph summary of key findings",
  "benchmarks": {
    "close_cycle_days": "benchmark value with source",
    "forecast_accuracy": "benchmark percentage with source",
    "planning_cycle_weeks": "benchmark value with source"
  },
  "trends": ["trend 1", "trend 2", "trend 3"],
  "recommendations": "brief recommendations based on research"
}`;

  try {
    const response = await callPerplexity(systemPrompt, userPrompt, 2048);
    
    let parsed: any;
    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {
        insights: response.content,
        benchmarks: {},
        trends: [],
        recommendations: "",
      };
    }

    return {
      insights: parsed.insights || response.content,
      benchmarks: parsed.benchmarks || {},
      trends: parsed.trends || [],
      citations: response.citations,
    };
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Industry research error");
    return {
      insights: "",
      benchmarks: {},
      trends: [],
      citations: [],
    };
  }
}

/**
 * Validate and enhance AI-generated content with fact-checking
 */
export async function factCheckContent(
  content: string,
  context: {
    sector?: string;
    topic: string;
    claimsToVerify: string[];
  }
): Promise<FactCheckResult> {
  const systemPrompt = `You are a fact-checking analyst specialising in finance transformation and EPM. Your role is to verify claims, identify inaccuracies, and suggest corrections based on current industry data and research.`;

  const userPrompt = `Fact-check the following content about ${context.topic}${context.sector ? ` in the ${context.sector} sector` : ""}:

CONTENT TO VERIFY:
${content}

SPECIFIC CLAIMS TO CHECK:
${context.claimsToVerify.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Provide your analysis as JSON:
{
  "isValid": true/false (overall accuracy),
  "confidence": 0-100 (confidence in your assessment),
  "corrections": ["list of specific corrections needed, if any"],
  "enhancements": "suggested improvements to make content more accurate/current"
}`;

  try {
    const response = await callPerplexity(systemPrompt, userPrompt, 1536);
    
    let parsed: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {
        isValid: true,
        confidence: 50,
        corrections: [],
        enhancements: "",
      };
    }

    return {
      isValid: parsed.isValid !== false,
      confidence: parsed.confidence || 50,
      corrections: parsed.corrections || [],
      citations: response.citations,
      enhancedContent: parsed.enhancements,
    };
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Fact-check error");
    return {
      isValid: true,
      confidence: 0,
      corrections: [],
      citations: [],
    };
  }
}

/**
 * Research EPM vendor capabilities and market positioning
 */
export async function researchVendorInsights(
  vendors: string[],
  evaluationCriteria: string[]
): Promise<{
  vendorInsights: Record<string, string>;
  marketTrends: string;
  citations: string[];
}> {
  const systemPrompt = `You are an EPM market analyst with expertise in vendor evaluation. Provide objective, factual assessments based on analyst reports (Gartner, Forrester, IDC), vendor documentation, and verified customer feedback.`;

  const userPrompt = `Research the following EPM vendors for a client evaluation:
Vendors: ${vendors.join(", ")}
Evaluation criteria: ${evaluationCriteria.join(", ")}

For each vendor, provide:
1. Key strengths relevant to the evaluation criteria
2. Notable limitations or considerations
3. Recent market developments or product updates
4. Typical customer profile/fit

Also summarise current EPM market trends affecting vendor selection.

Format as JSON:
{
  "vendors": {
    "VendorName": "2-3 sentence objective assessment"
  },
  "marketTrends": "Current EPM market trends paragraph"
}`;

  try {
    const response = await callPerplexity(systemPrompt, userPrompt, 2048);
    
    let parsed: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {
        vendors: {},
        marketTrends: response.content,
      };
    }

    return {
      vendorInsights: parsed.vendors || {},
      marketTrends: parsed.marketTrends || "",
      citations: response.citations,
    };
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Vendor research error");
    return {
      vendorInsights: {},
      marketTrends: "",
      citations: [],
    };
  }
}

/**
 * Get real-time regulatory and compliance updates for finance functions
 */
export async function researchComplianceUpdates(
  sector: string,
  region: string = "UK"
): Promise<{
  updates: string[];
  impactSummary: string;
  citations: string[];
}> {
  const systemPrompt = `You are a finance compliance specialist. Provide factual updates on regulatory changes affecting finance functions, including accounting standards, reporting requirements, and governance frameworks.`;

  const userPrompt = `What are the latest regulatory and compliance updates affecting finance functions in:
- Sector: ${sector}
- Region: ${region}

Focus on:
1. Recent or upcoming accounting standard changes
2. Regulatory reporting requirements
3. ESG/sustainability reporting obligations
4. Data governance and privacy requirements

Provide a brief summary of each update and its impact on EPM/finance transformation initiatives.

Format as JSON:
{
  "updates": ["update 1 with impact", "update 2 with impact"],
  "impactSummary": "Overall impact on finance transformation strategy"
}`;

  try {
    const response = await callPerplexity(systemPrompt, userPrompt, 1536);
    
    let parsed: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {
        updates: [],
        impactSummary: response.content,
      };
    }

    return {
      updates: parsed.updates || [],
      impactSummary: parsed.impactSummary || "",
      citations: response.citations,
    };
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Compliance research error");
    return {
      updates: [],
      impactSummary: "",
      citations: [],
    };
  }
}

/**
 * Check if Perplexity API is available
 */
export function isPerplexityAvailable(): boolean {
  return !!process.env.PERPLEXITY_API_KEY;
}
