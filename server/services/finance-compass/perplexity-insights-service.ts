/**
 * Perplexity Insights Service
 * 
 * Uses Perplexity API for AI-powered market research insights
 * on widget analytics and assessment data
 */

import { createChildLogger } from "../../lib/logger";

const log = createChildLogger("perplexity-insights");

interface WidgetTrendData {
  totalEvents: number;
  questionAnsweredCount: number;
  qualificationCompletedCount: number;
  avgCompletionRate: number;
  topAbandonmentQuestions: { questionId: string; rate: number }[];
  deviceBreakdown: { device: string; count: number; completionRate: number }[];
  sourceBreakdown: { source: string; count: number }[];
  weeklyTrend: { week: string; events: number }[];
}

interface MarketInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  category: 'market_trend' | 'user_behaviour' | 'competitive' | 'recommendation';
  title: string;
  description: string;
  suggestedAction?: string;
  sources?: string[];
  confidence: number;
  generatedAt: string;
}

interface CachedInsights {
  insights: MarketInsight[];
  generatedAt: string;
  expiresAt: string;
  dataHash: string;
}

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const CACHE_DURATION_DAYS = 7;

let insightsCache: CachedInsights | null = null;

function generateDataHash(data: WidgetTrendData): string {
  const deviceStr = data.deviceBreakdown.map(d => `${d.device}:${d.count}:${d.completionRate.toFixed(2)}`).join(',');
  const sourceStr = data.sourceBreakdown.slice(0, 5).map(s => `${s.source}:${s.count}`).join(',');
  const abandonStr = data.topAbandonmentQuestions.slice(0, 3).map(q => `${q.questionId}:${q.rate}`).join(',');
  const key = `${data.totalEvents}-${data.avgCompletionRate.toFixed(3)}-${data.questionAnsweredCount}-${data.qualificationCompletedCount}-${deviceStr}-${sourceStr}-${abandonStr}`;
  // Simple hash using string manipulation (no crypto needed for cache keys)
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
}

function isCacheValid(): boolean {
  if (!insightsCache) return false;
  const now = new Date();
  const expiresAt = new Date(insightsCache.expiresAt);
  return now < expiresAt;
}

async function callPerplexityAPI(prompt: string): Promise<{ content: string; citations: string[] }> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: `You are a market research analyst specialising in Enterprise Performance Management (EPM), financial planning software, and finance transformation. Provide concise, actionable insights based on current market trends. Focus on practical recommendations for improving user engagement and conversion. Use British English spelling.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      top_p: 0.9,
      search_recency_filter: 'month',
      return_related_questions: false,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    citations: data.citations || [],
  };
}

function parseInsightsFromResponse(content: string, citations: string[]): MarketInsight[] {
  const insights: MarketInsight[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  
  let currentInsight: Partial<MarketInsight> | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.match(/^(###|\*\*|[0-9]+\.)\s*(Warning|Info|Success|Recommendation|Trend|Insight)/i)) {
      if (currentInsight && currentInsight.title) {
        insights.push(currentInsight as MarketInsight);
      }
      
      const isWarning = /warning|concern|risk|decline/i.test(trimmed);
      const isSuccess = /success|opportunity|growth|improve/i.test(trimmed);
      const isCritical = /critical|urgent|immediate/i.test(trimmed);
      
      currentInsight = {
        id: `insight-${Date.now()}-${insights.length}`,
        type: isCritical ? 'critical' : isWarning ? 'warning' : isSuccess ? 'success' : 'info',
        category: /market|trend/i.test(trimmed) ? 'market_trend' : 
                  /user|behaviour|engagement/i.test(trimmed) ? 'user_behaviour' :
                  /compet/i.test(trimmed) ? 'competitive' : 'recommendation',
        title: trimmed.replace(/^(###|\*\*|[0-9]+\.)\s*/i, '').replace(/\*\*/g, ''),
        description: '',
        sources: citations.slice(0, 3),
        confidence: 0.75,
        generatedAt: new Date().toISOString(),
      };
    } else if (currentInsight && trimmed.length > 10) {
      if (!currentInsight.description) {
        currentInsight.description = trimmed;
      } else if (trimmed.toLowerCase().startsWith('action:') || trimmed.toLowerCase().startsWith('recommendation:')) {
        currentInsight.suggestedAction = trimmed.replace(/^(action|recommendation):\s*/i, '');
      }
    }
  }
  
  if (currentInsight && currentInsight.title) {
    insights.push(currentInsight as MarketInsight);
  }
  
  return insights.slice(0, 6);
}

export async function generateMarketInsights(
  trendData: WidgetTrendData,
  forceRefresh: boolean = false
): Promise<{ insights: MarketInsight[]; fromCache: boolean; nextRefresh: string }> {
  const dataHash = generateDataHash(trendData);
  
  if (!forceRefresh && isCacheValid() && insightsCache?.dataHash === dataHash) {
    return {
      insights: insightsCache.insights,
      fromCache: true,
      nextRefresh: insightsCache.expiresAt,
    };
  }
  
  const prompt = `Analyse these EPM assessment widget engagement metrics and provide market research insights:

## Current Performance Data
- Total widget interactions: ${trendData.totalEvents}
- Questions answered: ${trendData.questionAnsweredCount}
- Qualification completions: ${trendData.qualificationCompletedCount}
- Average completion rate: ${(trendData.avgCompletionRate * 100).toFixed(1)}%

## Device Distribution
${trendData.deviceBreakdown.map(d => `- ${d.device}: ${d.count} sessions (${(d.completionRate * 100).toFixed(0)}% completion)`).join('\n')}

## Traffic Sources
${trendData.sourceBreakdown.slice(0, 5).map(s => `- ${s.source}: ${s.count} visitors`).join('\n')}

## Key Questions
- Top abandonment points: ${trendData.topAbandonmentQuestions.slice(0, 3).map(q => `Q${q.questionId} (${q.rate}% drop-off)`).join(', ')}

Based on current EPM/CFO software market trends, provide:
1. **Market Context**: How does this engagement compare to industry benchmarks for B2B SaaS finance tools?
2. **User Behaviour Insight**: What does the device/source breakdown suggest about the target audience?
3. **Competitive Positioning**: What are leading EPM vendors (Anaplan, Workday Adaptive, OneStream) doing to improve engagement?
4. **Actionable Recommendation**: One specific improvement to increase completion rates.

Format each as a brief insight with title and 1-2 sentence description. Include an "Action:" line for recommendations.`;

  try {
    const { content, citations } = await callPerplexityAPI(prompt);
    const insights = parseInsightsFromResponse(content, citations);
    
    if (insights.length === 0) {
      insights.push({
        id: `insight-${Date.now()}-fallback`,
        type: 'info',
        category: 'market_trend',
        title: 'EPM Market Analysis',
        description: content.substring(0, 300) + '...',
        sources: citations,
        confidence: 0.7,
        generatedAt: new Date().toISOString(),
      });
    }
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);
    
    insightsCache = {
      insights,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      dataHash,
    };
    
    return {
      insights,
      fromCache: false,
      nextRefresh: expiresAt.toISOString(),
    };
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "API error");
    
    return {
      insights: generateFallbackInsights(trendData),
      fromCache: false,
      nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}

function generateFallbackInsights(data: WidgetTrendData): MarketInsight[] {
  const insights: MarketInsight[] = [];
  const now = new Date().toISOString();
  
  if (data.avgCompletionRate < 0.3) {
    insights.push({
      id: `fallback-completion-${Date.now()}`,
      type: 'warning',
      category: 'user_behaviour',
      title: 'Low Completion Rate Detected',
      description: `Completion rate of ${(data.avgCompletionRate * 100).toFixed(1)}% is below typical B2B assessment benchmarks (40-60%). Consider reducing question count or adding progress indicators.`,
      suggestedAction: 'Review top abandonment questions and simplify or remove complex items.',
      confidence: 0.85,
      generatedAt: now,
    });
  }
  
  const mobileDevice = data.deviceBreakdown.find(d => d.device === 'mobile');
  const desktopDevice = data.deviceBreakdown.find(d => d.device === 'desktop');
  if (mobileDevice && desktopDevice && mobileDevice.completionRate < desktopDevice.completionRate * 0.7) {
    insights.push({
      id: `fallback-mobile-${Date.now()}`,
      type: 'warning',
      category: 'user_behaviour',
      title: 'Mobile Experience Gap',
      description: `Mobile completion rate is ${((1 - mobileDevice.completionRate / desktopDevice.completionRate) * 100).toFixed(0)}% lower than desktop. Mobile users represent a growing segment of finance professionals.`,
      suggestedAction: 'Prioritise mobile UX improvements for the assessment flow.',
      confidence: 0.9,
      generatedAt: now,
    });
  }
  
  if (data.topAbandonmentQuestions.length > 0 && data.topAbandonmentQuestions[0].rate > 30) {
    insights.push({
      id: `fallback-abandonment-${Date.now()}`,
      type: 'critical',
      category: 'recommendation',
      title: 'High Abandonment Question Identified',
      description: `Question ${data.topAbandonmentQuestions[0].questionId} has a ${data.topAbandonmentQuestions[0].rate}% abandonment rate. This may indicate confusing wording or sensitive content.`,
      suggestedAction: 'Review question text and consider A/B testing alternative phrasing.',
      confidence: 0.95,
      generatedAt: now,
    });
  }
  
  if (data.totalEvents > 100) {
    insights.push({
      id: `fallback-engagement-${Date.now()}`,
      type: 'success',
      category: 'market_trend',
      title: 'Healthy Engagement Volume',
      description: `With ${data.totalEvents} interactions, you have sufficient data for meaningful analysis. EPM assessment tools typically see 50-200 weekly interactions.`,
      confidence: 0.8,
      generatedAt: now,
    });
  }
  
  return insights;
}

export function clearInsightsCache(): void {
  insightsCache = null;
}

export function getCacheStatus(): { cached: boolean; expiresAt: string | null; generatedAt: string | null } {
  return {
    cached: !!insightsCache,
    expiresAt: insightsCache?.expiresAt || null,
    generatedAt: insightsCache?.generatedAt || null,
  };
}
