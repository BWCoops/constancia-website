/**
 * Widget Analytics Quality Validation Service
 * 
 * Validates widget session data for the EPM Comparison tool and InstantPreview.
 * Aggregates session-level quality metrics for data monetization.
 * 
 * @version 1.0
 */

import { db } from "../../../db";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { widgetAnalytics } from "@shared/schema";
import {
  COUNTRY_NAME_TO_ISO,
  SECTOR_TO_INDUSTRY,
  type FCCountryCode,
  type FCIndustry,
  type FCSourceChannel,
} from "@shared/finance-compass-schema";
import crypto from "crypto";

const MIN_COMPLETION_TIME_SECONDS = 30;
const MAX_COMPLETION_TIME_SECONDS = 30 * 60; // 30 minutes for widgets
const MIN_QUESTIONS_ANSWERED = 3;

export interface WidgetSessionSummary {
  sessionId: string;
  widget: string;
  eventCount: number;
  questionsAnswered: number;
  finalScore: number | null;
  completionTimeSeconds: number | null;
  isComplete: boolean;
  isValid: boolean;
  qualityScore: number;
  qualityFlags: string[];
  demographics: {
    countryCode: string | null;
    industry: string | null;
    sizeBand: string | null;
  };
  sourceChannel: string | null;
  deviceType: string | null;
  createdAt: Date;
}

export interface WidgetQualityStats {
  totalSessions: number;
  completeSessions: number;
  validSessions: number;
  invalidSessions: number;
  validPercentage: number;
  avgCompletionTime: number | null;
  avgQualityScore: number | null;
  byWidget: { widget: string; total: number; valid: number; avgScore: number | null }[];
  flagBreakdown: { flag: string; count: number }[];
}

export interface WidgetBackfillStats {
  totalSessions: number;
  processedSessions: number;
  validSessions: number;
  invalidSessions: number;
  errors: string[];
}

export class WidgetQualityService {
  /**
   * Aggregate and validate all sessions from widget analytics
   */
  async aggregateAndValidateSessions(): Promise<WidgetBackfillStats> {
    const stats: WidgetBackfillStats = {
      totalSessions: 0,
      processedSessions: 0,
      validSessions: 0,
      invalidSessions: 0,
      errors: [],
    };

    try {
      // Get all unique sessions with their aggregated data
      const sessionsRaw = await db.execute(sql`
        WITH session_stats AS (
          SELECT 
            session_id,
            widget,
            COUNT(*) as event_count,
            MAX(CASE WHEN event_type = 'question_answered' THEN question_number ELSE 0 END) as max_question,
            COUNT(CASE WHEN event_type = 'question_answered' THEN 1 END) as questions_answered,
            MAX(final_score) as final_score,
            MAX(completion_time) as completion_time,
            MAX(CASE WHEN event_type IN ('preview_completed', 'comparison_completed', 'qualification_completed') THEN 1 ELSE 0 END) as is_complete,
            MAX(qualification_data->>'industry') as industry,
            MAX(qualification_data->>'companySize') as company_size,
            MAX(qualification_data->>'country') as country,
            MIN(created_at) as first_event,
            MAX(created_at) as last_event,
            MAX(user_agent) as user_agent,
            MAX(ip_address) as ip_address,
            MAX(fingerprint->>'platform') as platform,
            MAX(fingerprint->>'screen') as screen,
            MAX(referrer) as referrer,
            MAX(utm_source) as utm_source,
            MAX(utm_medium) as utm_medium
          FROM widget_analytics
          WHERE session_id IS NOT NULL
          GROUP BY session_id, widget
        )
        SELECT 
          session_id,
          widget,
          event_count,
          questions_answered,
          final_score,
          completion_time,
          is_complete,
          industry,
          company_size,
          country,
          first_event,
          last_event,
          user_agent,
          ip_address,
          platform,
          screen,
          referrer,
          utm_source,
          utm_medium,
          EXTRACT(EPOCH FROM (last_event - first_event))::int as session_duration
        FROM session_stats
        ORDER BY first_event DESC
      `);

      const sessions = sessionsRaw.rows as any[];
      stats.totalSessions = sessions.length;

      for (const session of sessions) {
        try {
          const validation = this.validateSession(session);
          
          // Determine source channel
          const sourceChannel = this.inferSourceChannel(
            session.utm_source,
            session.utm_medium,
            session.referrer
          );

          // Determine device type
          const deviceType = this.inferDeviceType(session.user_agent, session.platform);

          // Standardize demographics
          const countryCode = session.country ? this.mapCountryToISO(session.country) : null;
          const industry = session.industry ? this.mapSectorToIndustry(session.industry) : null;

          // Hash IP for duplicate detection
          const ipHash = session.ip_address 
            ? crypto.createHash('sha256').update(session.ip_address).digest('hex').substring(0, 16)
            : null;

          // Format quality flags as PostgreSQL array literal
          const qualityFlagsLiteral = validation.qualityFlags.length > 0
            ? `{${validation.qualityFlags.map(f => `"${f}"`).join(',')}}`
            : '{}';

          // Update all events in this session with aggregated data
          await db.execute(sql`
            UPDATE widget_analytics
            SET 
              widget_version = COALESCE(widget_version, '1.0'),
              source_channel = ${sourceChannel},
              device_type = ${deviceType},
              country_code = ${countryCode},
              industry = ${industry},
              size_band = ${session.company_size || null},
              is_valid_record = ${validation.isValid},
              quality_flags = ${qualityFlagsLiteral}::text[],
              quality_score = ${validation.qualityScore},
              quality_checked_at = NOW(),
              is_session_complete = ${session.is_complete === 1},
              session_completion_time = ${session.session_duration || session.completion_time},
              session_questions_answered = ${session.questions_answered},
              ip_hash = ${ipHash},
              screen_resolution = ${session.screen}
            WHERE session_id = ${session.session_id}
          `);

          stats.processedSessions++;
          if (validation.isValid) {
            stats.validSessions++;
          } else {
            stats.invalidSessions++;
          }
        } catch (err) {
          stats.errors.push(`Session ${session.session_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } catch (err) {
      stats.errors.push(`Aggregation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return stats;
  }

  /**
   * Validate a single session
   */
  private validateSession(session: any): { isValid: boolean; qualityScore: number; qualityFlags: string[] } {
    const qualityFlags: string[] = [];
    let qualityScore = 100;

    // Check completion time
    const completionTime = session.session_duration || session.completion_time;
    if (completionTime !== null) {
      if (completionTime < MIN_COMPLETION_TIME_SECONDS) {
        qualityFlags.push("too_fast");
        qualityScore -= 30;
      } else if (completionTime > MAX_COMPLETION_TIME_SECONDS) {
        qualityFlags.push("too_slow");
        qualityScore -= 15;
      }
    }

    // Check if session is complete
    if (session.is_complete !== 1) {
      qualityFlags.push("incomplete");
      qualityScore -= 20;
    }

    // Check minimum questions answered
    if (session.questions_answered < MIN_QUESTIONS_ANSWERED) {
      qualityFlags.push("missing_responses");
      qualityScore -= 20;
    }

    // Check for bot-like patterns
    if (session.event_count > 500) {
      qualityFlags.push("bot_suspected");
      qualityScore -= 40;
    }

    // Ensure score is within bounds
    qualityScore = Math.max(0, Math.min(100, qualityScore));
    const isValid = qualityFlags.length === 0 || (qualityScore >= 60 && !qualityFlags.includes("bot_suspected"));

    return { isValid, qualityScore, qualityFlags };
  }

  /**
   * Get quality statistics for widget analytics
   */
  async getQualityStats(): Promise<WidgetQualityStats> {
    const summaryRaw = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT CASE WHEN is_session_complete = true THEN session_id END) as complete_sessions,
        COUNT(DISTINCT CASE WHEN is_valid_record = true THEN session_id END) as valid_sessions,
        AVG(CASE WHEN is_session_complete = true THEN session_completion_time END) as avg_completion_time,
        AVG(quality_score) as avg_quality_score
      FROM widget_analytics
      WHERE session_id IS NOT NULL
    `);

    const byWidgetRaw = await db.execute(sql`
      SELECT 
        widget,
        COUNT(DISTINCT session_id) as total,
        COUNT(DISTINCT CASE WHEN is_valid_record = true THEN session_id END) as valid,
        AVG(CASE WHEN is_session_complete = true THEN final_score END) as avg_score
      FROM widget_analytics
      WHERE session_id IS NOT NULL
      GROUP BY widget
      ORDER BY total DESC
    `);

    const flagsRaw = await db.execute(sql`
      SELECT unnest(quality_flags) as flag, COUNT(DISTINCT session_id) as count
      FROM widget_analytics
      WHERE quality_flags IS NOT NULL AND array_length(quality_flags, 1) > 0
      GROUP BY unnest(quality_flags)
      ORDER BY count DESC
    `);

    const summary = (summaryRaw.rows as any[])[0] || {};
    const total = Number(summary.total_sessions) || 0;
    const valid = Number(summary.valid_sessions) || 0;

    return {
      totalSessions: total,
      completeSessions: Number(summary.complete_sessions) || 0,
      validSessions: valid,
      invalidSessions: total - valid,
      validPercentage: total > 0 ? Math.round((valid / total) * 100) : 0,
      avgCompletionTime: summary.avg_completion_time ? Math.round(Number(summary.avg_completion_time)) : null,
      avgQualityScore: summary.avg_quality_score ? Math.round(Number(summary.avg_quality_score)) : null,
      byWidget: (byWidgetRaw.rows as any[]).map(r => ({
        widget: r.widget,
        total: Number(r.total),
        valid: Number(r.valid),
        avgScore: r.avg_score ? Math.round(Number(r.avg_score)) : null,
      })),
      flagBreakdown: (flagsRaw.rows as any[]).map(r => ({
        flag: r.flag,
        count: Number(r.count),
      })),
    };
  }

  /**
   * Get segment counts for widget data
   */
  async getSegmentCounts(): Promise<{
    byCountry: { countryCode: string; total: number; valid: number }[];
    byIndustry: { industry: string; total: number; valid: number }[];
    bySizeBand: { sizeBand: string; total: number; valid: number }[];
    byWidget: { widget: string; total: number; valid: number }[];
  }> {
    const byCountryRaw = await db.execute(sql`
      SELECT 
        COALESCE(country_code, 'OTHER') as country_code,
        COUNT(DISTINCT session_id) as total,
        COUNT(DISTINCT CASE WHEN is_valid_record = true THEN session_id END) as valid
      FROM widget_analytics
      WHERE session_id IS NOT NULL AND is_session_complete = true
      GROUP BY COALESCE(country_code, 'OTHER')
      ORDER BY total DESC
    `);

    const byIndustryRaw = await db.execute(sql`
      SELECT 
        COALESCE(industry, 'other') as industry,
        COUNT(DISTINCT session_id) as total,
        COUNT(DISTINCT CASE WHEN is_valid_record = true THEN session_id END) as valid
      FROM widget_analytics
      WHERE session_id IS NOT NULL AND is_session_complete = true
      GROUP BY COALESCE(industry, 'other')
      ORDER BY total DESC
    `);

    const bySizeBandRaw = await db.execute(sql`
      SELECT 
        COALESCE(size_band, 'unknown') as size_band,
        COUNT(DISTINCT session_id) as total,
        COUNT(DISTINCT CASE WHEN is_valid_record = true THEN session_id END) as valid
      FROM widget_analytics
      WHERE session_id IS NOT NULL AND is_session_complete = true
      GROUP BY COALESCE(size_band, 'unknown')
      ORDER BY total DESC
    `);

    const byWidgetRaw = await db.execute(sql`
      SELECT 
        widget,
        COUNT(DISTINCT session_id) as total,
        COUNT(DISTINCT CASE WHEN is_valid_record = true THEN session_id END) as valid
      FROM widget_analytics
      WHERE session_id IS NOT NULL AND is_session_complete = true
      GROUP BY widget
      ORDER BY total DESC
    `);

    return {
      byCountry: (byCountryRaw.rows as any[]).map(r => ({
        countryCode: r.country_code,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
      byIndustry: (byIndustryRaw.rows as any[]).map(r => ({
        industry: r.industry,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
      bySizeBand: (bySizeBandRaw.rows as any[]).map(r => ({
        sizeBand: r.size_band,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
      byWidget: (byWidgetRaw.rows as any[]).map(r => ({
        widget: r.widget,
        total: Number(r.total),
        valid: Number(r.valid),
      })),
    };
  }

  /**
   * Generate anonymous export for widget data
   */
  async generateAnonymousExport(options?: {
    widget?: string;
    validOnly?: boolean;
    minQualityScore?: number;
  }): Promise<{
    version: string;
    exportDate: string;
    recordCount: number;
    validRecordCount: number;
    sessions: {
      sessionHash: string;
      widget: string;
      countryCode: string;
      industry: string;
      sizeBand: string;
      finalScore: number | null;
      completionTimeSeconds: number | null;
      questionsAnswered: number;
      sourceChannel: string | null;
      deviceType: string | null;
      isValid: boolean;
      qualityScore: number | null;
      completedDate: string;
    }[];
  }> {
    const validOnly = options?.validOnly ?? true;
    const minQualityScore = options?.minQualityScore ?? 60;

    const conditions = [
      sql`session_id IS NOT NULL`,
      sql`is_session_complete = true`,
    ];

    if (validOnly) {
      conditions.push(sql`is_valid_record = true`);
    }
    if (minQualityScore > 0) {
      conditions.push(sql`COALESCE(quality_score, 0) >= ${minQualityScore}`);
    }
    if (options?.widget) {
      conditions.push(sql`widget = ${options.widget}`);
    }

    const whereClause = sql.join(conditions, sql` AND `);

    const result = await db.execute(sql`
      SELECT DISTINCT ON (session_id)
        md5(session_id) as session_hash,
        widget,
        COALESCE(country_code, 'OTHER') as country_code,
        COALESCE(industry, 'other') as industry,
        COALESCE(size_band, 'unknown') as size_band,
        final_score,
        session_completion_time,
        session_questions_answered,
        source_channel,
        device_type,
        COALESCE(is_valid_record, false) as is_valid,
        quality_score,
        TO_CHAR(created_at, 'YYYY-MM-DD') as completed_date
      FROM widget_analytics
      WHERE ${whereClause}
      ORDER BY session_id, created_at DESC
    `);

    const sessions = (result.rows as any[]).map(row => ({
      sessionHash: row.session_hash,
      widget: row.widget,
      countryCode: row.country_code,
      industry: row.industry,
      sizeBand: row.size_band,
      finalScore: row.final_score,
      completionTimeSeconds: row.session_completion_time,
      questionsAnswered: row.session_questions_answered,
      sourceChannel: row.source_channel,
      deviceType: row.device_type,
      isValid: row.is_valid,
      qualityScore: row.quality_score,
      completedDate: row.completed_date,
    }));

    return {
      version: "1.0",
      exportDate: new Date().toISOString().split("T")[0],
      recordCount: sessions.length,
      validRecordCount: sessions.filter(s => s.isValid).length,
      sessions,
    };
  }

  // Helper methods

  private inferSourceChannel(
    utmSource?: string | null,
    utmMedium?: string | null,
    referrer?: string | null
  ): FCSourceChannel {
    const source = utmSource?.toLowerCase() || "";
    const medium = utmMedium?.toLowerCase() || "";
    const ref = referrer?.toLowerCase() || "";

    if (medium.includes("cpc") || medium.includes("ppc") || medium.includes("paid")) {
      return "paid_search";
    }
    if (medium.includes("display") || medium.includes("banner")) {
      return "display";
    }
    if (medium.includes("social") || source.includes("facebook") || source.includes("linkedin")) {
      return "social";
    }
    if (medium.includes("email") || source.includes("email")) {
      return "email";
    }
    if (medium.includes("referral") || (ref && !ref.includes("1qg.com"))) {
      return "referral";
    }
    if (source.includes("google") || source.includes("bing") || medium.includes("organic")) {
      return "organic_search";
    }
    if (!source && !medium && !ref) {
      return "direct";
    }

    return "unknown";
  }

  private inferDeviceType(userAgent?: string | null, platform?: string | null): string {
    const ua = (userAgent || "").toLowerCase();
    const plat = (platform || "").toLowerCase();

    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || plat.includes("mobile")) {
      return "mobile";
    }
    if (ua.includes("tablet") || ua.includes("ipad") || plat.includes("tablet")) {
      return "tablet";
    }
    if (ua.includes("windows") || ua.includes("macintosh") || ua.includes("linux")) {
      return "desktop";
    }

    return "unknown";
  }

  private mapCountryToISO(country: string): FCCountryCode | null {
    const normalized = country.toLowerCase().trim();
    return COUNTRY_NAME_TO_ISO[normalized] || null;
  }

  private mapSectorToIndustry(sector: string): FCIndustry | null {
    const normalized = sector.toLowerCase().trim();
    return SECTOR_TO_INDUSTRY[normalized] || null;
  }
}

export const widgetQualityService = new WidgetQualityService();
