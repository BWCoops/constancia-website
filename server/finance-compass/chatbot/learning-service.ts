/**
 * FinanceCompass Chatbot Learning Service
 * 
 * Analyses Q&A patterns from the database to improve responses over time.
 * Learns from successful interactions while maintaining strict guardrails.
 */

import { db } from '../../db';
import { eq, desc, sql, and, gte, ilike } from 'drizzle-orm';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-chatbot-learning");
import {
  fcChatMessages,
  fcChatSessions,
  fcLearnedInsights,
  type FcLearnedInsight,
} from '@shared/finance-compass-schema';
import type { AssessmentContext } from './types';

const TOPICS = {
  VENDOR_SELECTION: 'vendor_selection',
  IMPLEMENTATION: 'implementation',
  ROI_BUSINESS_CASE: 'roi_business_case',
  READINESS_SCORE: 'readiness_score',
  DIMENSION_IMPROVEMENT: 'dimension_improvement',
  COMPARISON_TOOLS: 'comparison_tools',
  MARKET_TRENDS: 'market_trends',
  BEST_PRACTICES: 'best_practices',
} as const;

const TOPIC_PATTERNS: Record<string, RegExp[]> = {
  vendor_selection: [/vendor/i, /which.*system/i, /oracle|sap|anaplan|workday|onestream/i, /compare.*epm/i],
  implementation: [/implement/i, /timeline/i, /rollout/i, /deploy/i, /migration/i],
  roi_business_case: [/roi/i, /return.*investment/i, /business case/i, /cost.*benefit/i, /payback/i],
  readiness_score: [/score.*mean/i, /readiness/i, /what.*score/i, /assessment.*result/i],
  dimension_improvement: [/improve/i, /strengthen/i, /enhance/i, /better.*at/i, /weak/i],
  comparison_tools: [/comparison.*tool/i, /compare.*vendor/i, /epm.*tool/i, /erp.*tool/i],
  market_trends: [/trend/i, /market/i, /latest/i, /future/i, /2026/i],
  best_practices: [/best practice/i, /leading/i, /recommend/i, /should.*we/i],
};

export class LearningService {
  
  /**
   * Classify a question into a topic
   */
  classifyTopic(question: string): string {
    for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(question)) {
          return topic;
        }
      }
    }
    return 'general';
  }

  /**
   * Extract keywords from a question
   */
  extractKeywords(question: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'what', 'how', 'can', 'do', 'i', 'my', 'we', 'our', 'to', 'for', 'of', 'and', 'or', 'in', 'on', 'at', 'with']);
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Record a Q&A interaction for learning
   */
  async recordInteraction(
    question: string,
    response: string,
    context: AssessmentContext | null,
    wasSuccessful: boolean = true
  ): Promise<void> {
    try {
      const topic = this.classifyTopic(question);
      const keywords = this.extractKeywords(question);
      const pattern = this.normalisePattern(question);

      const existing = await db
        .select()
        .from(fcLearnedInsights)
        .where(eq(fcLearnedInsights.pattern, pattern))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(fcLearnedInsights)
          .set({
            frequencyCount: sql`${fcLearnedInsights.frequencyCount} + 1`,
            successRate: wasSuccessful 
              ? sql`(${fcLearnedInsights.successRate} * ${fcLearnedInsights.frequencyCount} + 1) / (${fcLearnedInsights.frequencyCount} + 1)`
              : sql`(${fcLearnedInsights.successRate} * ${fcLearnedInsights.frequencyCount}) / (${fcLearnedInsights.frequencyCount} + 1)`,
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(fcLearnedInsights.id, existing[0].id));
      } else {
        await db.insert(fcLearnedInsights).values({
          topic,
          pattern,
          keywords,
          successRate: wasSuccessful ? 1.0 : 0.0,
          bestResponseSummary: this.summariseResponse(response),
          relatedDimensions: this.extractDimensions(question),
          relevantIndustries: context?.industry ? [context.industry] : [],
          relevantScoreRanges: context?.overallScore 
            ? { min: Math.max(0, context.overallScore - 15), max: Math.min(100, context.overallScore + 15) }
            : null,
          lastUsedAt: new Date(),
        });
      }
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error recording interaction");
    }
  }

  /**
   * Get relevant learned insights for a question
   */
  async getRelevantInsights(
    question: string,
    context: AssessmentContext | null
  ): Promise<FcLearnedInsight[]> {
    try {
      const topic = this.classifyTopic(question);
      const keywords = this.extractKeywords(question);

      let insights = await db
        .select()
        .from(fcLearnedInsights)
        .where(eq(fcLearnedInsights.topic, topic))
        .orderBy(desc(fcLearnedInsights.frequencyCount))
        .limit(5);

      if (insights.length === 0 && keywords.length > 0) {
        insights = await db
          .select()
          .from(fcLearnedInsights)
          .orderBy(desc(fcLearnedInsights.frequencyCount))
          .limit(10);
        
        insights = insights.filter(insight => {
          const insightKeywords = insight.keywords || [];
          return keywords.some(kw => insightKeywords.includes(kw));
        }).slice(0, 5);
      }

      return insights;
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error getting insights");
      return [];
    }
  }

  /**
   * Get popular follow-up questions based on historical patterns
   */
  async getPopularFollowUps(
    currentTopic: string,
    context: AssessmentContext | null
  ): Promise<string[]> {
    try {
      const relatedTopics = this.getRelatedTopics(currentTopic);
      
      const insights = await db
        .select()
        .from(fcLearnedInsights)
        .where(sql`${fcLearnedInsights.topic} = ANY(ARRAY[${sql.join(relatedTopics.map(t => sql`${t}`), sql`, `)}]::text[])`)
        .orderBy(desc(fcLearnedInsights.frequencyCount))
        .limit(10);

      const followUps: string[] = [];
      for (const insight of insights) {
        if (insight.commonFollowUps) {
          followUps.push(...insight.commonFollowUps);
        }
      }

      return Array.from(new Set(followUps)).slice(0, 3);
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error getting follow-ups");
      return [];
    }
  }

  /**
   * Generate contextual follow-up suggestions based on response, conversation history, and assessment
   */
  async generateFollowUpSuggestions(
    question: string,
    response: string,
    context: AssessmentContext | null,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string[]> {
    const topic = this.classifyTopic(question);
    const learnedFollowUps = await this.getPopularFollowUps(topic, context);
    
    // Build topics already covered in conversation
    const coveredTopics = new Set<string>();
    const askedQuestions = new Set<string>();
    
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        const msgTopic = this.classifyTopic(msg.content);
        coveredTopics.add(msgTopic);
        askedQuestions.add(msg.content.toLowerCase().trim());
      }
    }
    
    // Generate progressive suggestions based on what's been covered
    const progressiveSuggestions = this.generateProgressiveSuggestions(
      topic,
      coveredTopics,
      context,
      response
    );
    
    const contextualSuggestions = this.generateContextualSuggestions(topic, context);
    
    // Combine all suggestions, prioritising progressive ones
    const allSuggestions = [...progressiveSuggestions, ...learnedFollowUps, ...contextualSuggestions];
    
    // Filter out suggestions similar to already-asked questions
    const askedArray = Array.from(askedQuestions);
    const filteredSuggestions = allSuggestions.filter(suggestion => {
      const suggestionLower = suggestion.toLowerCase();
      for (let i = 0; i < askedArray.length; i++) {
        // Skip if too similar to an already asked question
        if (this.isSimilarQuestion(suggestionLower, askedArray[i])) {
          return false;
        }
      }
      return true;
    });
    
    return Array.from(new Set(filteredSuggestions)).slice(0, 3);
  }

  /**
   * Check if two questions are similar
   */
  private isSimilarQuestion(q1: string, q2: string): boolean {
    // Extract key terms and check overlap
    const extractTerms = (q: string) => q
      .replace(/[?.,!]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .map(w => w.toLowerCase());
    
    const terms1 = extractTerms(q1);
    const terms2 = extractTerms(q2);
    
    const overlap = terms1.filter(t => terms2.includes(t));
    const similarity = overlap.length / Math.max(terms1.length, terms2.length);
    
    return similarity > 0.5;
  }

  /**
   * Generate progressive suggestions based on conversation flow and assessment data
   */
  private generateProgressiveSuggestions(
    currentTopic: string,
    coveredTopics: Set<string>,
    context: AssessmentContext | null,
    lastResponse: string
  ): string[] {
    const suggestions: string[] = [];
    
    // Define natural conversation progressions
    const topicProgression: Record<string, string[]> = {
      'readiness_score': ['dimension_improvement', 'vendor_selection', 'implementation'],
      'dimension_improvement': ['vendor_selection', 'roi_business_case', 'implementation'],
      'vendor_selection': ['implementation', 'roi_business_case', 'comparison_tools'],
      'implementation': ['roi_business_case', 'market_trends'],
      'roi_business_case': ['vendor_selection', 'implementation'],
      'comparison_tools': ['vendor_selection', 'dimension_improvement'],
      'market_trends': ['vendor_selection', 'dimension_improvement'],
    };
    
    // Get next logical topics not yet covered
    const nextTopics = topicProgression[currentTopic] || [];
    const uncoveredNextTopics = nextTopics.filter(t => !coveredTopics.has(t));
    
    // Build suggestions based on assessment data and uncovered topics
    if (context) {
      const scores = context.dimensionScores || {};
      const sortedDimensions = Object.entries(scores)
        .sort((a, b) => (a[1] as number) - (b[1] as number));
      
      // Suggest exploring weak dimensions not yet discussed
      if (!coveredTopics.has('dimension_improvement') && sortedDimensions.length > 0) {
        const weakest = sortedDimensions[0];
        const weakestName = this.formatDimensionName(weakest[0]);
        const weakestScore = (weakest[1] as number).toFixed(1);
        
        if ((weakest[1] as number) < 3) {
          suggestions.push(`My ${weakestName} scored ${weakestScore}—what's the improvement pathway?`);
        }
      }
      
      // Based on overall score, suggest appropriate next steps
      const overallScore = context.overallScore || 0;
      
      if (!coveredTopics.has('vendor_selection')) {
        if (overallScore >= 3) {
          suggestions.push('Given our maturity level, which vendors would be a strong fit?');
        } else if (overallScore >= 2) {
          suggestions.push('Should we focus on process maturity before vendor selection?');
        }
      }
      
      if (!coveredTopics.has('implementation') && coveredTopics.has('vendor_selection')) {
        suggestions.push('What does a realistic implementation timeline look like for us?');
      }
      
      if (!coveredTopics.has('roi_business_case') && (coveredTopics.has('vendor_selection') || coveredTopics.has('implementation'))) {
        suggestions.push('How should we structure the business case for the CFO?');
      }
      
      // If we've covered the basics, dive deeper
      if (coveredTopics.size >= 3) {
        if (context.challengeAreas && context.challengeAreas.length > 0 && !coveredTopics.has('quick_wins')) {
          suggestions.push('What are the quick wins we can implement in the next quarter?');
        }
        
        if (!coveredTopics.has('change_management')) {
          suggestions.push('What change management approach would you recommend?');
        }
      }
    }
    
    // Add topic-based progressive suggestions for uncovered areas
    for (const nextTopic of uncoveredNextTopics.slice(0, 2)) {
      const topicSuggestion = this.getTopicSuggestion(nextTopic, context);
      if (topicSuggestion) {
        suggestions.push(topicSuggestion);
      }
    }
    
    return suggestions;
  }

  /**
   * Get a suggestion for exploring a specific topic
   */
  private getTopicSuggestion(topic: string, context: AssessmentContext | null): string | null {
    switch (topic) {
      case 'vendor_selection':
        return context?.industry 
          ? `Which EPM vendors perform best in the ${context.industry} sector?`
          : 'Which EPM platforms should we evaluate?';
      case 'implementation':
        return 'What are the critical success factors for EPM implementation?';
      case 'roi_business_case':
        return 'What ROI timeframe is typical for EPM investments?';
      case 'dimension_improvement':
        return context?.weakestDimension
          ? `How do we address our ${this.formatDimensionName(context.weakestDimension)} gaps?`
          : 'Which capability areas should we prioritise?';
      case 'comparison_tools':
        return 'Can you walk me through the EPM comparison tool?';
      case 'market_trends':
        return 'What EPM trends should we be aware of for our planning?';
      default:
        return null;
    }
  }

  /**
   * Generate context-aware suggestions based on topic and assessment
   * Uses professional management consulting terminology
   */
  private generateContextualSuggestions(
    topic: string,
    context: AssessmentContext | null
  ): string[] {
    const suggestions: string[] = [];

    // Add dimension-specific suggestion if we have assessment context
    if (context?.weakestDimension) {
      const dimensionName = this.formatDimensionName(context.weakestDimension);
      suggestions.push(`What's the roadmap to uplift ${dimensionName}?`);
    }

    switch (topic) {
      case 'vendor_selection':
        suggestions.push('What does a typical implementation programme look like?');
        suggestions.push('How should I structure the business case and ROI model?');
        break;
      case 'implementation':
        suggestions.push('What are the key change management considerations?');
        suggestions.push('How do I drive user adoption and embed new ways of working?');
        break;
      case 'roi_business_case':
        suggestions.push('What TCO factors should I include in the evaluation?');
        suggestions.push('How do other organisations measure benefits realisation?');
        break;
      case 'readiness_score':
        suggestions.push('What quick wins can accelerate our maturity curve?');
        suggestions.push('Which vendors align best with our target operating model?');
        break;
      case 'dimension_improvement':
        suggestions.push('What does best-in-class look like for this capability?');
        suggestions.push('How should we phase the transformation journey?');
        break;
      case 'comparison_tools':
        suggestions.push('How do these vendors perform in my sector?');
        suggestions.push('What selection criteria matter most for our scale?');
        break;
      case 'market_trends':
        suggestions.push('How is AI reshaping the Office of Finance?');
        suggestions.push('What should be our strategic priorities for FY26?');
        break;
      default:
        if (context?.overallScore !== undefined) {
          if (context.overallScore < 2.5) {
            suggestions.push('Where should we focus our initial transformation efforts?');
          } else if (context.overallScore < 3.5) {
            suggestions.push('What tactical improvements can we implement now?');
          } else {
            suggestions.push('How do we move from good to best-in-class?');
          }
        }
        suggestions.push('Which EPM platforms suit our requirements profile?');
    }

    return suggestions;
  }

  /**
   * Get aggregate statistics about what people are asking
   */
  async getAggregateStats(): Promise<{
    topTopics: Array<{ topic: string; count: number }>;
    totalInteractions: number;
    averageSuccessRate: number;
  }> {
    try {
      const stats = await db
        .select({
          topic: fcLearnedInsights.topic,
          totalCount: sql<number>`SUM(${fcLearnedInsights.frequencyCount})`,
          avgSuccess: sql<number>`AVG(${fcLearnedInsights.successRate})`,
        })
        .from(fcLearnedInsights)
        .groupBy(fcLearnedInsights.topic)
        .orderBy(sql`SUM(${fcLearnedInsights.frequencyCount}) DESC`)
        .limit(10);

      const totalInteractions = stats.reduce((sum, s) => sum + (s.totalCount || 0), 0);
      const averageSuccessRate = stats.length > 0 
        ? stats.reduce((sum, s) => sum + (s.avgSuccess || 0), 0) / stats.length 
        : 0;

      return {
        topTopics: stats.map(s => ({ topic: s.topic, count: s.totalCount || 0 })),
        totalInteractions,
        averageSuccessRate,
      };
    } catch (error) {
      log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error getting stats");
      return { topTopics: [], totalInteractions: 0, averageSuccessRate: 0 };
    }
  }

  /**
   * Get learned context to enhance AI prompts
   */
  async getLearnedContext(question: string, context: AssessmentContext | null): Promise<string> {
    const insights = await this.getRelevantInsights(question, context);
    
    if (insights.length === 0) {
      return '';
    }

    const topInsight = insights[0];
    let learnedContext = '\n\n[LEARNED FROM PREVIOUS INTERACTIONS]\n';
    
    if (topInsight.bestResponseSummary) {
      learnedContext += `Similar questions have been asked ${topInsight.frequencyCount} times. Key points from successful responses: ${topInsight.bestResponseSummary}\n`;
    }

    if (topInsight.commonFollowUps && topInsight.commonFollowUps.length > 0) {
      learnedContext += `Users often follow up with: ${topInsight.commonFollowUps.slice(0, 2).join(', ')}\n`;
    }

    return learnedContext;
  }

  private normalisePattern(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  private summariseResponse(response: string): string {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 2).join('. ').substring(0, 500);
  }

  private extractDimensions(question: string): string[] {
    const dimensions: string[] = [];
    const text = question.toLowerCase();
    
    if (/planning|fpa|forecast|budget/i.test(text)) dimensions.push('financial_planning_analysis');
    if (/reporting|dashboard|visual/i.test(text)) dimensions.push('management_reporting');
    if (/consol|close|month.end/i.test(text)) dimensions.push('consolidation_close');
    if (/control|compliance|audit/i.test(text)) dimensions.push('financial_controls_compliance');
    if (/tech|system|software|tool/i.test(text)) dimensions.push('technology_systems');
    if (/people|team|skill|train/i.test(text)) dimensions.push('organisation_people');
    if (/data|analytics|insight/i.test(text)) dimensions.push('data_analytics');
    if (/ai|machine.learning|automat/i.test(text)) dimensions.push('ai_machine_learning');
    
    return dimensions;
  }

  private getRelatedTopics(topic: string): string[] {
    const related: Record<string, string[]> = {
      vendor_selection: ['implementation', 'comparison_tools', 'roi_business_case'],
      implementation: ['vendor_selection', 'best_practices', 'dimension_improvement'],
      roi_business_case: ['vendor_selection', 'implementation', 'readiness_score'],
      readiness_score: ['dimension_improvement', 'vendor_selection', 'best_practices'],
      dimension_improvement: ['best_practices', 'readiness_score', 'implementation'],
      comparison_tools: ['vendor_selection', 'market_trends'],
      market_trends: ['best_practices', 'vendor_selection'],
      best_practices: ['dimension_improvement', 'implementation'],
    };
    return [topic, ...(related[topic] || [])];
  }

  private formatDimensionName(dimension: string): string {
    const names: Record<string, string> = {
      financial_planning_analysis: 'Financial Planning & Analysis',
      management_reporting: 'Management Reporting',
      consolidation_close: 'Consolidation & Close',
      financial_controls_compliance: 'Financial Controls',
      technology_systems: 'Technology & Systems',
      organisation_people: 'Organisation & People',
      data_analytics: 'Data & Analytics',
      ai_machine_learning: 'AI & Machine Learning',
    };
    return names[dimension] || dimension;
  }
}

export const learningService = new LearningService();
